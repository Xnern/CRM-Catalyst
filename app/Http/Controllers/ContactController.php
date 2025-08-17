<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use League\Csv\Reader;
use App\Models\Contact;
use Illuminate\Bus\Batch;
use Illuminate\Http\Request;
use App\Jobs\ProcessContactImport;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Gate;
use Spatie\QueryBuilder\AllowedSort;
use Spatie\QueryBuilder\QueryBuilder;
use Throwable; // For Batch callbacks
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Illuminate\Support\Facades\Notification;
use App\Notifications\ImportFinishedNotification;
use App\Http\Requests\Contacts\StoreContactRequest;
use App\Http\Requests\Contacts\UpdateContactRequest;
use App\Http\Requests\Contacts\UpdateContactStatusRequest;
use Illuminate\Database\Eloquent\Builder; // For AllowedFilter::callback type hinting

class ContactController extends Controller
{
    /**
     * Display the contacts page via Inertia.
     */
    public function indexInertia(Request $request)
    {
        Gate::authorize('viewAny', Contact::class);

        return Inertia::render('Contacts/Index', [
            'canCreateContact' => $request->user()->can('create', Contact::class),
        ]);
    }

    /**
     * Fetch a paginated list of contacts for RTK Query.
     */
    public function index(Request $request)
    {
        // Maps frontend search/filter parameters to Spatie Query Builder's 'filter' format.
        $filterParams = [];
        $spatieCompatibleParams = ['search', 'name', 'email', 'phone', 'user_id'];

        foreach ($spatieCompatibleParams as $param) {
            if ($request->has($param)) {
                $filterParams[$param] = $request->input($param);
            }
        }

        $existingFilters = $request->input('filter', []);
        $mergedFilters = array_merge($existingFilters, $filterParams);

        $request->merge([
            'filter' => $mergedFilters,
        ]);

        Gate::authorize('viewAny', Contact::class);

        $perPage = (int) $request->input('per_page', 15);
        $perPage = min($perPage, 100); // Limit per_page to a reasonable maximum

        $baseQuery = Contact::query();

        // Scope: limite aux non assignés si demandé
        $scope = (string) $request->input('scope', '');
        if ($scope === 'unassigned') {
            $baseQuery->whereNull('company_id');
        }
        // si $scope === 'all' ou vide, pas de filtre ici

        // RBAC sales: ne voir que ses propres contacts
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
                // Optionnel: autoriser le filtrage explicite company_id=null depuis le front
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
                AllowedInclude::relationship('user')
            ])
            ->allowedSorts([
                'name',
                'email',
                'created_at',
            ]);

        $contacts = $contactsQuery->paginate($perPage);

        return response()->json($contacts);
    }

    /**
     * Fetch a paginated list of contacts filtered by status for RTK Query.
     * This is an optimized endpoint for the Kanban board.
     */
    public function getContactsByStatus(Request $request, string $status)
    {
        Gate::authorize('viewAny', Contact::class);

        // Utilisez `cursor_page` au lieu de `per_page` pour la pagination par curseur
        $perPage = $request->input('per_page', 15);
        $perPage = min((int) $perPage, 10000);

        $baseQuery = Contact::query();

        // Apply RBAC filtering for 'sales' role if applicable
        if ($request->user()->hasRole('sales') && $request->user()->can('view own contacts')) {
            $baseQuery->where('user_id', $request->user()->id);
        }

        $contactsQuery = QueryBuilder::for($baseQuery)
            ->where('status', $status)
            ->allowedFilters([
                AllowedFilter::partial('name'),
                AllowedFilter::exact('email'),
                AllowedFilter::exact('phone'),
                AllowedFilter::exact('user_id'),
                AllowedFilter::callback('search', function (Builder $query, $value) {
                    $query->where(function ($q) use ($value) {
                        $q->where('name', 'LIKE', "%{$value}%")
                        ->orWhere('email', 'LIKE', "%{$value}%")
                        ->orWhere('phone', 'LIKE', "%{$value}%");
                    });
                }),
            ])
            ->allowedIncludes([
                AllowedInclude::relationship('user')
            ])
            ->allowedSorts([
                'name',
                'email',
                'created_at',
            ]);

        // Remplacer `paginate` par `cursorPaginate`
        $contacts = $contactsQuery->cursorPaginate($perPage);

        return response()->json($contacts);
    }


    /**
     * Store a newly created contact.
     */
    public function store(StoreContactRequest $request)
    {
        Gate::authorize('create', Contact::class); // Authorize action via Gate/Policy

        $validatedData = $request->validated();

        $contact = $request->user()->contacts()->create($validatedData);
        // Store latitude and longitude if provided by the frontend
        $contact->latitude = $request->input('latitude');
        $contact->longitude = $request->input('longitude');
        $contact->save(); // Save again if lat/lng are not in validatedData directly

        return response()->json($contact->load('user'), 201); // Return created contact with user relationship
    }

    /**
     * Display the specified contact.
     */
    public function show(Contact $contact)
    {
        Gate::authorize('view', $contact);

        return response()->json($contact->load('user'));
    }

    /**
     * Update the specified contact.
     */
    public function update(UpdateContactRequest $request, Contact $contact)
    {
        Gate::authorize('update', $contact); // Authorize action via Gate/Policy

        $validatedData = $request->validated();

        // Update the contact with validated data without latitude/longitude
        $contact->fill($validatedData);

        // if latitude and longitude are not null, update them
        if ($request->has('latitude') && $request->input('latitude') !== null) {
            $contact->latitude = $request->input('latitude');
        }else{
            $contact->latitude = null; // Set to null if not provided
        }

        if ($request->has('longitude') && $request->input('longitude') !== null) {
            $contact->longitude = $request->input('longitude');
        }else{
            $contact->longitude = null; // Set to null if not provided
        }

        $contact->save(); // Save again if lat/lng are not in validatedData directly

        return response()->json($contact->load('user'));
    }

    /**
     * Remove the specified contact.
     */
    public function destroy(Contact $contact)
    {
        Gate::authorize('delete', $contact);

        $contact->delete();

        return response()->noContent(); // 204 No Content for successful deletion
    }

    /**
     * Handle the CSV import process.
     * Dispatches jobs to process each CSV row.
     */
    public function importCsv(Request $request)
    {
        Gate::authorize('create', Contact::class); // Authorize import action

        $request->validate([
            'csv_file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'], // 10MB max file size
        ]);

        $file = $request->file('csv_file');
        $filePath = $file->getRealPath();

        try {
            $csv = Reader::createFromPath($filePath, 'r');
            $csv->setHeaderOffset(0); // Assume first row is header

            $records = $csv->getRecords();

            $jobs = [];
            $totalRows = 0;
            $currentUser = $request->user();

            foreach ($records as $offset => $row) {
                $totalRows++;
                $sanitizedRow = array_change_key_case($row, CASE_LOWER); // Convert keys to lowercase for robustness
                $jobs[] = new \App\Jobs\ProcessContactImport($sanitizedRow, $currentUser->id, $currentUser);
            }

            if (empty($jobs)) {
                return back()->with('error', 'CSV file is empty or contains no valid data.');
            }

            // Dispatch jobs in a batch for progress tracking and unified notifications
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
                        'error_message' => $e->getMessage()
                    ]));
                })
                ->finally(function (Batch $batch) use ($currentUser, $totalRows) {
                    if ($batch->cancelled()) {
                        Notification::send($currentUser, new ImportFinishedNotification([
                            'status' => 'cancelled',
                            'message' => 'Your CSV import was cancelled.'
                        ]));
                    } else if ($batch->failedJobs > 0) {
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
            Log::error('CSV parsing error: ' . $e->getMessage());
            return back()->with('error', 'Error reading CSV file: ' . $e->getMessage());
        } catch (\Exception $e) {
            Log::error('CSV import error: ' . $e->getMessage());
            return back()->with('error', 'An unexpected error occurred during import: ' . $e->getMessage());
        }
    }

    /**
     * Update the specified contact's status.
     */
    public function updateStatus(UpdateContactStatusRequest $request, Contact $contact)
    {
        Gate::authorize('update', $contact); // Authorize action via Gate/Policy

        $validatedData = $request->validated();
        $contact->status = $validatedData['status'];
        $contact->save();

        return response()->json($contact, 200);
    }

    public function search(Request $request)
    {
        $q = trim((string) $request->get('q', ''));
        $res = \App\Models\Contact::query()
            ->when($q, fn($qq) => $qq->where('name', 'like', "%{$q}%"))
            ->limit(15)
            ->get(['id','name']);
        return response()->json($res);
    }
}
