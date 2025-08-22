<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use App\Http\Resources\ContactResource;

class CompanyContactController extends Controller
{
    /**
     * List company contacts with optional search and pagination.
     * Returns a paginated collection serialized with ContactResource.
     */
    public function index(Request $request, Company $company)
    {
        // Authorization: user must be able to view contacts for this company
        $this->authorize('viewAnyForCompany', [Contact::class, $company]);

        $perPage = (int) ($request->get('per_page', 10));
        $perPage = min(max($perPage, 1), 100); // sanity bounds
        $search = trim((string) $request->get('search', ''));

        $q = $company->contacts()
            ->with(['user:id,name,email', 'company:id,name']) // eager minimal fields
            ->orderByDesc('created_at');

        // Apply search on name/email/phone
        if ($search !== '') {
            $q->where(function ($sub) use ($search) {
                $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $paginator = $q->paginate($perPage);

        // Keep Laravel paginator shape (data/meta/links) while serializing items
        return ContactResource::collection($paginator)
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Attach an existing contact to the company without exposing company_id in the body.
     * Body: { contact_id: number }
     * Returns the attached contact serialized with ContactResource.
     */
    public function attach(Request $request, Company $company)
    {
        $this->authorize('createForCompany', [Contact::class, $company]);

        $validated = $request->validate([
            'contact_id' => ['required', 'integer', 'exists:contacts,id'],
        ]);

        $contact = Contact::findOrFail($validated['contact_id']);

        // Optional: prevent attaching if already attached to another company
        if (!is_null($contact->company_id) && (int) $contact->company_id !== (int) $company->id) {
            // If you want to allow re-association, remove/adjust this check.
            throw ValidationException::withMessages([
                'contact_id' => ['This contact is already attached to a company.'],
            ]);
        }

        // Assign the company if not already the same
        if ((int) $contact->company_id !== (int) $company->id) {
            $contact->company_id = $company->id;
            $contact->save();
        }

        $contact->load(['user:id,name,email', 'company:id,name']);

        return response()->json([
            'attached' => true,
            'contact' => (new ContactResource($contact))->toArray($request),
        ], 200);
    }

    /**
     * Detach a contact from the company (set company_id to null).
     * Useful if you allow moving contacts between companies via attach after detach.
     * Returns a simple status payload.
     */
    public function detach(Request $request, Company $company, Contact $contact)
    {
        abort_unless((int) $contact->company_id === (int) $company->id, 404);

        // Choose the right ability. If "update" or a dedicated "detach" ability is required, adjust here.
        $this->authorize('updateForCompany', [Contact::class, $company, $contact]);

        $contact->company_id = null;
        $contact->save();

        return response()->json(['detached' => true], 200);
    }
}
