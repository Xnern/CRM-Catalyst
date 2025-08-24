<?php

namespace App\Http\Controllers;

use App\Http\Requests\Contacts\StoreContactRequest;
use App\Http\Requests\Contacts\UpdateContactRequest;
use App\Http\Resources\ContactResource;
use App\Models\Contact;
use App\Notifications\ImportFinishedNotification;
use Illuminate\Bus\Batch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Gate; // For Batch callbacks
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use League\Csv\Reader;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder; // For AllowedFilter::callback type hinting
use Throwable;

class ContactController extends Controller
{
    public function __construct()
    {
        $this->middleware('can:view contacts')->only(['indexInertia', 'showInertia', 'index', 'show', 'search']);
        $this->middleware('can:create contacts')->only(['store']);
        $this->middleware('can:edit contacts')->only(['update']);
        $this->middleware('can:delete contacts')->only(['destroy']);
        $this->middleware('can:import contacts')->only(['importCsv']);
    }

    /**
     * Render the contacts page via Inertia.
     */
    public function indexInertia(Request $request)
    {
        return Inertia::render('Contacts/Index', [
            'canCreateContact' => $request->user()->can('create contacts'),
        ]);
    }

    /**
     * Render the contact show page via Inertia.
     */
    public function showInertia(int $id)
    {
        return Inertia::render('Contacts/Show', [
            'id' => $id,
        ]);
    }

    /**
     * Fetch a paginated list of contacts for RTK Query.
     * - Supports Spatie Query Builder filters/sorts/includes.
     * - RBAC: restricts to own contacts for 'sales' when applicable.
     * - Scope 'unassigned': only contacts with null company_id.
     * Returns a paginator serialized with ContactResource.
     */
    public function index(Request $request)
    {
        // Map frontend params into Spatie's filter structure.
        $filterParams = [];
        $spatieCompatibleParams = ['search', 'name', 'email', 'phone', 'user_id'];

        foreach ($spatieCompatibleParams as $param) {
            if ($request->has($param)) {
                $filterParams[$param] = $request->input($param);
            }
        }

        $existingFilters = $request->input('filter', []);
        $mergedFilters = array_merge($existingFilters, $filterParams);

        $request->merge(['filter' => $mergedFilters]);

        Gate::authorize('viewAny', Contact::class);

        $perPage = (int) $request->input('per_page', 15);
        $perPage = min(max($perPage, 1), 100); // reasonable max

        $baseQuery = Contact::query();

        // Scope: limit to unassigned if requested
        $scope = (string) $request->input('scope', '');
        if ($scope === 'unassigned') {
            $baseQuery->whereNull('company_id');
        }

        // RBAC: 'sales' can see only own contacts if policy allows
        if ($request->user()->hasRole('sales') && $request->user()->can('view own contacts')) {
            $baseQuery->where('user_id', $request->user()->id);
        }

        // Spatie Query Builder
        $contactsQuery = QueryBuilder::for($baseQuery)
            ->allowedFilters([
                AllowedFilter::partial('name'),
                AllowedFilter::exact('email'),
                AllowedFilter::exact('phone'),
                AllowedFilter::exact('user_id'),
                // Optionally allow explicit filter company_id from frontend:
                // AllowedFilter::exact('company_id'),
                AllowedFilter::callback('search', function (Builder $query, $value) {
                    $query->where(function ($q) use ($value) {
                        $q->where('name', 'LIKE', "%{$value}%")
                            ->orWhere('email', 'LIKE', "%{$value}%")
                            ->orWhere('phone', 'LIKE', "%{$value}%");
                    });
                }),
            ])
            ->allowedIncludes([
                // Keep includes minimal; front usually needs user; company can be loaded via show
                AllowedInclude::relationship('user'),
                // AllowedInclude::relationship('company'),
            ])
            ->allowedSorts([
                'name',
                'email',
                'created_at',
            ])
            // Eager-load minimal user for list consistency (optional)
            ->with(['user:id,name,email']);

        $paginator = $contactsQuery->paginate($perPage);

        return ContactResource::collection($paginator)
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Store a newly created contact.
     * Returns the created contact serialized with ContactResource.
     */
    public function store(StoreContactRequest $request)
    {
        Gate::authorize('create', Contact::class);

        $validatedData = $request->validated();

        // Create via relation ensures user_id is set as owner of the contact
        $contact = $request->user()->contacts()->create($validatedData);

        // Persist latitude/longitude if provided outside validated data
        $contact->latitude = $request->input('latitude');
        $contact->longitude = $request->input('longitude');
        $contact->save();

        $contact->load(['user:id,name,email', 'company:id,name']);

        return (new ContactResource($contact))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified contact.
     * Returns the contact serialized with ContactResource (includes user and company).
     */
    public function show(Contact $contact)
    {
        Gate::authorize('view', $contact);

        $contact->load(['user:id,name,email', 'company:id,name', 'documents']);

        return (new ContactResource($contact))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Update the specified contact.
     * Returns the updated contact serialized with ContactResource.
     */
    public function update(UpdateContactRequest $request, Contact $contact)
    {
        Gate::authorize('update', $contact);

        $validatedData = $request->validated();

        // Update core attributes
        $contact->fill($validatedData);

        // Manage latitude/longitude explicitly (nullable)
        if ($request->has('latitude')) {
            $contact->latitude = $request->input('latitude') !== null ? $request->input('latitude') : null;
        }
        if ($request->has('longitude')) {
            $contact->longitude = $request->input('longitude') !== null ? $request->input('longitude') : null;
        }

        $contact->save();

        $contact->load(['user:id,name,email', 'company:id,name', 'documents']);

        return (new ContactResource($contact))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Remove the specified contact.
     * Returns 204 No Content on success.
     */
    public function destroy(Contact $contact)
    {
        Gate::authorize('delete', $contact);

        $contact->delete();

        return response()->noContent(); // 204 No Content
    }

    /**
     * Handle the CSV import process by dispatching a job per row in a batch.
     * Sends notifications on completion/failure/partial.
     */
    public function importCsv(Request $request)
    {
        Gate::authorize('create', Contact::class);

        $request->validate([
            'csv_file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'], // 10MB max
        ]);

        $file = $request->file('csv_file');
        $filePath = $file->getRealPath();

        try {
            $csv = Reader::createFromPath($filePath, 'r');
            $csv->setHeaderOffset(0); // first row as header

            $records = $csv->getRecords();

            $jobs = [];
            $totalRows = 0;
            $currentUser = $request->user();

            foreach ($records as $offset => $row) {
                $totalRows++;
                // Normalize headers (lowercase)
                $sanitizedRow = array_change_key_case($row, CASE_LOWER);
                $jobs[] = new \App\Jobs\ProcessContactImport($sanitizedRow, $currentUser->id, $currentUser);
            }

            if (empty($jobs)) {
                return back()->with('error', 'CSV file is empty or contains no valid data.');
            }

            Bus::batch($jobs)
                ->then(function (Batch $batch) use ($currentUser, $totalRows) {
                    $importedCount = $totalRows - $batch->failedJobs;
                    Notification::send($currentUser, new ImportFinishedNotification([
                        'status' => 'success',
                        'message' => 'Your CSV import completed successfully.',
                        'total_rows' => $totalRows,
                        'imported_rows' => $importedCount,
                    ]));
                })
                ->catch(function (Batch $batch, Throwable $e) use ($currentUser) {
                    Notification::send($currentUser, new ImportFinishedNotification([
                        'status' => 'failed',
                        'message' => 'Your CSV import failed. Please check logs for details.',
                        'error_message' => $e->getMessage(),
                    ]));
                })
                ->finally(function (Batch $batch) use ($currentUser, $totalRows) {
                    if ($batch->cancelled()) {
                        Notification::send($currentUser, new ImportFinishedNotification([
                            'status' => 'cancelled',
                            'message' => 'Your CSV import was cancelled.',
                        ]));
                    } elseif ($batch->failedJobs > 0) {
                        $importedCount = $totalRows - $batch->failedJobs;
                        Notification::send($currentUser, new ImportFinishedNotification([
                            'status' => 'partial_success',
                            'message' => 'Your CSV import finished, but some rows failed.',
                            'total_rows' => $batch->totalJobs,
                            'imported_rows' => $importedCount,
                            'skipped_rows' => $batch->failedJobs,
                        ]));
                    }
                })
                ->dispatch();

            return back()->with('success', 'Your CSV file is being imported. You will be notified when complete.');
        } catch (\League\Csv\Exception $e) {
            Log::error('CSV parsing error: '.$e->getMessage());

            return back()->with('error', 'Error reading CSV file: '.$e->getMessage());
        } catch (\Exception $e) {
            Log::error('CSV import error: '.$e->getMessage());

            return back()->with('error', 'An unexpected error occurred during import: '.$e->getMessage());
        }
    }

    /**
     * Lightweight search endpoint for contacts (id + name).
     */
    public function search(Request $request)
    {
        $q = trim((string) $request->get('q', ''));
        $res = \App\Models\Contact::query()
            ->with('company:id,name')
            ->when($q, fn ($qq) => $qq->where('name', 'like', "%{$q}%")
                ->orWhere('email', 'like', "%{$q}%"))
            ->limit(15)
            ->get(['id', 'name', 'email', 'company_id']);

        return response()->json(['data' => $res], 200);
    }
}
