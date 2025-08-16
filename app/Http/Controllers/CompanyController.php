<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\Company;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Http\Requests\Companies\StoreCompanyRequest;
use App\Http\Requests\Companies\UpdateCompanyRequest;

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

    public function index(Request $request)
    {
        $query = Company::query()->withCount('contacts');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('domain', 'like', "%{$search}%")
                  ->orWhere('industry', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($ownerId = $request->input('owner_id')) {
            $query->where('owner_id', $ownerId);
        }

        if ($sort = $request->input('sort')) {
            $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
            $field = ltrim($sort, '-');
            if (in_array($field, ['name', 'created_at', 'contacts_count'])) {
                $query->orderBy($field, $direction);
            }
        } else {
            $query->orderBy('created_at', 'desc');
        }

        return response()->json($query->paginate($request->input('per_page', 15)));
    }

    public function store(StoreCompanyRequest $request)
    {
        $data = $request->validated();

        if (! array_key_exists('owner_id', $data) || empty($data['owner_id'])) {
            $data['owner_id'] = (int) $request->user()->id;
        }

        $company = Company::create($data);

        return response()->json($company, 201);
    }

    public function show(Company $company)
    {
        $company->load(['owner:id,name', 'contacts:id,name,email,phone,company_id']);
        return response()->json($company);
    }

    public function update(UpdateCompanyRequest $request, Company $company)
    {
        $company->update($request->validated());
        return response()->json($company);
    }

    public function destroy(Company $company)
    {
        $company->delete();
        return response()->json(null, 204);
    }

    public function contacts(Company $company)
    {
        return response()->json($company->contacts()->latest()->paginate(15));
    }
}
