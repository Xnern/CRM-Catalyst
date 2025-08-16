<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Contact;
use Illuminate\Http\Request;
use App\Http\Requests\CompanyContact\StoreCompanyContactRequest;
use App\Http\Requests\CompanyContact\UpdateCompanyContactRequest;

class CompanyContactController extends Controller
{
    /**
     * List company contacts with optional search and pagination.
     */
    public function index(Request $request, Company $company)
    {
        // Authorization: user must be able to view contacts for this company
        $this->authorize('viewAnyForCompany', [Contact::class, $company]);

        $perPage = (int)($request->get('per_page', 10));
        $search = trim((string)$request->get('search', ''));

        $q = $company->contacts()
            ->with('user')
            ->orderByDesc('created_at');

        // Apply search on name/email/phone
        if ($search !== '') {
            $q->where(function ($sub) use ($search) {
                $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        return response()->json($q->paginate($perPage));
    }

    /**
     * Create a new contact for the company.
     */
    public function store(StoreCompanyContactRequest $request, Company $company)
    {
        // Authorization (policy already guards roles/permissions)
        $this->authorize('createForCompany', [Contact::class, $company]);

        $data = $request->validated();

        // Inject company_id from route (never trust client)
        $data['company_id'] = $company->id;

        if (array_key_exists('user_id', $data) && $data['user_id']) {
            $data['user_id'] = (int) $data['user_id'];
        } else {
            $data['user_id'] = $request->user()->id;
        }

        $contact = Contact::create($data);

        return response()->json($contact->load('user'), 201);
    }


    /**
     * Show a specific contact (company-scoped).
     */
    public function show(Company $company, Contact $contact)
    {
        // Ensure the contact belongs to the company
        abort_unless($contact->company_id === $company->id, 404);

        // Authorization
        $this->authorize('viewForCompany', [$company, $contact]);

        return response()->json($contact->load('user'));
    }

    /**
     * Update a contact (company-scoped).
     */
    public function update(UpdateCompanyContactRequest $request, Company $company, Contact $contact)
    {
        abort_unless((int) $contact->company_id === (int) $company->id, 404);

        $this->authorize('updateForCompany', [Contact::class, $company, $contact]);

        $data = $request->validated();

        if (array_key_exists('user_id', $data)) {
            if (! $request->user()->can('manage contacts') && ! $request->user()->can('manage company contacts')) {
                unset($data['user_id']);
            }
        }

        $contact->update($data);

        return response()->json($contact->load('user'));
    }



    /**
     * Delete a contact (company-scoped).
     */
    public function destroy(Company $company, Contact $contact)
    {
        abort_unless($contact->company_id === $company->id, 404);

        $this->authorize('deleteForCompany', [Contact::class, $company, $contact]);

        $contact->delete();

        return response()->json(['deleted' => true]);
    }

    /**
     * Attach an existing contact to the company without exposing company_id in the body.
     * Body: { contact_id: number }
     */
    public function attach(Request $request, Company $company)
    {
        $this->authorize('createForCompany', [Contact::class, $company]);

        $validated = $request->validate([
            'contact_id' => ['required', 'integer', 'exists:contacts,id'],
        ]);

        $contact = Contact::findOrFail($validated['contact_id']);

        // Optional: prevent attaching if already attached to another company
        if (! is_null($contact->company_id)) {
            // If you want to allow re-association, remove this check.
            throw ValidationException::withMessages([
                'contact_id' => ['This contact is already attached to a company.'],
            ]);
        }

        $contact->company_id = $company->id;
        $contact->save();

        return response()->json(['attached' => true, 'contact' => $contact->fresh('user')], 200);
    }

    /**
     * Detach a contact from the company (set company_id to null).
     * Useful if you allow moving contacts between companies via attach after detach.
     */
    public function detach(Request $request, Company $company, Contact $contact)
    {
        abort_unless($contact->company_id === $company->id, 404);

        // Choose the right ability. If "update" or a dedicated "detach" ability is required, adjust here.
        $this->authorize('updateForCompany', [Contact::class, $company, $contact]);

        $contact->company_id = null;
        $contact->save();

        return response()->json(['detached' => true], 200);
    }
}
