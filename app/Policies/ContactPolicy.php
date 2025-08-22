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
        return $user->hasRole('admin')
            || $user->can('view all contacts')
            || $user->can('view contacts')
            || $user->can('view own contacts');
    }

    public function view(User $user, Contact $contact): bool
    {
        if ($user->hasRole('admin') || $user->can('view all contacts')) {
            return true;
        }

        // Own scope
        if ($user->can('view own contacts') && $this->isOwner($user, $contact)) {
            return true;
        }

        // Scoped viewers
        if ($user->can('view contacts')) {
            if ($this->isSameTeam($user, $contact)) return true;
            if ($this->isSameTenant($user, $contact)) return true;
            // If contact is tied to a company user can view, allow:
            if ($this->canViewLinkedCompany($user, $contact)) return true;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin') || $user->can('create contact');
    }

    public function update(User $user, Contact $contact): bool
    {
        if ($user->hasRole('admin')) return true;

        // Manage within scope
        if ($user->can('manage contacts')) {
            if ($this->isOwner($user, $contact)) return true;
            if ($this->isSameTeam($user, $contact)) return true;
            if ($this->isSameTenant($user, $contact)) return true;
            if ($this->canViewLinkedCompany($user, $contact)) return true;
        }

        return false;
    }

    public function delete(User $user, Contact $contact): bool
    {
        if ($user->hasRole('admin')) return true;

        if ($user->can('delete contacts')) {
            if ($this->isOwner($user, $contact)) return true;
            if ($this->isSameTeam($user, $contact)) return true;
            if ($this->isSameTenant($user, $contact)) return true;
            if ($this->canViewLinkedCompany($user, $contact)) return true;
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

    // Company-scoped helpers (if you keep your forCompany methods)
    public function viewAnyForCompany(User $user, Company $company): bool
    {
        return $this->viewAny($user)
            && $this->canViewCompany($user, $company);
    }

    public function createForCompany(User $user, Company $company): bool
    {
        return $this->create($user)
            && $this->canViewCompany($user, $company);
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
        if ((int) $contact->company_id !== (int) $company->id) return false;
        return $this->update($user, $contact);
    }

    public function deleteForCompany(User $user, Company $company, Contact $contact): bool
    {
        if ((int) $contact->company_id !== (int) $company->id) return false;
        return $this->delete($user, $contact);
    }

    protected function isOwner(User $user, Contact $contact): bool
    {
        return (int) $user->id === (int) $contact->user_id;
    }

    protected function isSameTeam(User $user, Contact $contact): bool
    {
        // Example:
        // return $user->team_id && $contact->team_id && $user->team_id === $contact->team_id;
        return false;
    }

    protected function isSameTenant(User $user, Contact $contact): bool
    {
        // Example for multi-tenant:
        // return $user->tenant_id && $contact->tenant_id && $user->tenant_id === $contact->tenant_id;
        return false;
    }

    protected function canViewCompany(User $user, Company $company): bool
    {
        // Delegate to CompanyPolicy via Gate if defined, or replicate logic
        return $user->hasRole('admin')
            || $user->can('view all companies')
            || ($user->can('view companies') && ($this->sameTeamCompany($user, $company) || $this->sameTenantCompany($user, $company)))
            || ($user->can('view own companies') && (int)$company->owner_id === (int)$user->id);
    }

    protected function sameTeamCompany(User $user, Company $company): bool
    {
        // return $user->team_id && $company->team_id && $user->team_id === $company->team_id;
        return false;
    }

    protected function sameTenantCompany(User $user, Company $company): bool
    {
        // return $user->tenant_id && $company->tenant_id && $user->tenant_id === $company->tenant_id;
        return false;
    }

    protected function canViewLinkedCompany(User $user, Contact $contact): bool
    {
        if (!$contact->company_id) return false;
        // Fast check without Gate call; replace with Gate::allows('view', $company) if you prefer
        $company = $contact->company ?? null;
        if (!$company) return false;

        return $this->canViewCompany($user, $company);
    }
}
