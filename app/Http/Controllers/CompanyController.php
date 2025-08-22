<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\Company;
use Illuminate\Http\Request;
use App\Http\Requests\Companies\StoreCompanyRequest;
use App\Http\Requests\Companies\UpdateCompanyRequest;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\ContactResource;

class CompanyController extends Controller
{
    /**
     * Render the Company list page (Inertia React).
     */
    public function indexInertia()
    {
        return Inertia::render('Companies/Index');
    }

    /**
     * Render the Company details page (Inertia React).
     */
    public function showInertia($id)
    {
        return Inertia::render('Companies/Show', [
            'id' => (int) $id
        ]);
    }

    /**
     * List companies with optional search, filters and sorting.
     * Returns a paginated collection serialized with CompanyResource.
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->input('per_page', 15);
        $perPage = min(max($perPage, 1), 100); // sane bounds

        $query = Company::query()
            ->withCount('contacts')
            // Load minimal owner info only when front might need it in list
            ->with(['owner:id,name,email']);

        // Search by name/domain/industry
        if ($search = $request->input('search')) {
            $s = trim((string) $search);
            if ($s !== '') {
                $query->where(function ($q) use ($s) {
                    $q->where('name', 'like', "%{$s}%")
                      ->orWhere('domain', 'like', "%{$s}%")
                      ->orWhere('industry', 'like', "%{$s}%");
                });
            }
        }

        // Filter by status (kept as-is; your accessor Company::getStatusLabelAttribute exposes label)
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        // Filter by owner_id
        if ($ownerId = $request->input('owner_id')) {
            $query->where('owner_id', (int) $ownerId);
        }

        // Sorting
        if ($sort = $request->input('sort')) {
            $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
            $field = ltrim($sort, '-');
            if (in_array($field, ['name', 'created_at', 'contacts_count'], true)) {
                $query->orderBy($field, $direction);
            }
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $paginator = $query->paginate($perPage);

        // Keep paginator shape (data/meta/links) while serializing items
        return CompanyResource::collection($paginator)
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Store a new company.
     * Returns the created company with CompanyResource.
     */
    public function store(StoreCompanyRequest $request)
    {
        $data = $request->validated();

        // Default owner to authenticated user if not provided
        if (!array_key_exists('owner_id', $data) || empty($data['owner_id'])) {
            $data['owner_id'] = (int) $request->user()->id;
        }

        $company = Company::create($data);

        // Load minimal relations for consistency (owner)
        $company->load(['owner:id,name,email'])
                ->loadCount('contacts');

        return (new CompanyResource($company))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Show a specific company with owner and a minimal contacts collection if needed.
     * Returns CompanyResource.
     */
    public function show(Company $company)
    {
        // Load relations: owner (minimal) and contacts (minimal)
        $company->load([
            'owner:id,name,email',
            'contacts:id,name,email,phone,company_id',
        ])->loadCount('contacts');

        return (new CompanyResource($company))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Update an existing company.
     * Returns the updated company with CompanyResource.
     */
    public function update(UpdateCompanyRequest $request, Company $company)
    {
        $company->update($request->validated());

        $company->load(['owner:id,name,email'])
                ->loadCount('contacts');

        return (new CompanyResource($company))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Delete a company.
     * Returns 204 No Content.
     */
    public function destroy(Company $company)
    {
        $company->delete();
        return response()->json(null, 204);
    }

    /**
     * Paginated list of contacts for a company.
     * Returns ContactResource::collection to keep output consistent.
     */
    public function contacts(Company $company)
    {
        $perPage = 15;

        $paginator = $company->contacts()
            ->with(['user:id,name,email', 'company:id,name'])
            ->latest()
            ->paginate($perPage);

        return ContactResource::collection($paginator)
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Lightweight search endpoint for companies (id + name).
     */
    public function search(Request $request)
    {
        $q = trim((string) $request->get('q', ''));

        $res = Company::query()
            ->when($q, fn ($qq) => $qq->where('name', 'like', "%{$q}%"))
            ->limit(15)
            ->get(['id', 'name']);

        return response()->json($res, 200);
    }
}
