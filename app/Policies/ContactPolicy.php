<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Contact;
use App\Models\Company;
use Illuminate\Auth\Access\HandlesAuthorization;

class ContactPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->can('view all contacts')) {
            return true;
        }

        if ($user->can('view contacts') || $user->can('view own contacts')) {
            return true;
        }

        return false;
    }

    public function view(User $user, Contact $contact): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->can('view all contacts')) {
            return true;
        }

        if ($user->can('view contacts')) {
            return true;
        }

        if ($user->can('view own contacts') && (int) $user->id === (int) $contact->user_id) {
            return true;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->hasAnyPermission(['manage contacts', 'create contact']);
    }

    public function update(User $user, Contact $contact): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        // manage contacts => global
        if ($user->can('manage contacts')) {
            return true;
        }

        if ($user->can('edit own contacts') && (int) $user->id === (int) $contact->user_id) {
            return true;
        }

        return false;
    }

    public function delete(User $user, Contact $contact): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->can('manage contacts')) {
            return true;
        }

        if ($user->can('delete own contacts') && (int) $user->id === (int) $contact->user_id) {
            return true;
        }

        return false;
    }

    public function restore(User $user, Contact $contact): bool
    {
        return $user->hasRole('admin');
    }

    public function forceDelete(User $user, Contact $contact): bool
    {
        return $user->hasRole('admin');
    }

    public function viewAnyForCompany(User $user, Company $company): bool
    {
        if (! $this->viewAny($user)) {
            return false;
        }
        return true;
    }

    public function createForCompany(User $user, Company $company): bool
    {
        if (! $this->create($user)) {
            return false;
        }
        return true;
    }

    public function viewForCompany(User $user, Company $company, Contact $contact): bool
    {
        if ((int) $contact->company_id !== (int) $company->id) {
            return false;
        }
        return $this->view($user, $contact);
    }

    public function updateForCompany(User $user, Company $company, Contact $contact): bool
    {
        if ((int) $contact->company_id !== (int) $company->id) {
            return false;
        }

        if ((int) $company->owner_id === (int) $user->id) {
            return true;
        }

        if ($user->can('manage company contacts')) {
            return true;
        }

        return $this->update($user, $contact);
    }

    public function deleteForCompany(User $user, Company $company, Contact $contact): bool
    {
        if ((int) $contact->company_id !== (int) $company->id) {
            return false;
        }

        if ((int) $company->owner_id === (int) $user->id) {
            return true;
        }

        if ($user->can('manage company contacts')) {
            return true;
        }

        return $this->delete($user, $contact);
    }
}
