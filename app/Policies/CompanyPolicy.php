<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Company;

class CompanyPolicy
{
    /**
     * Show all companies.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Show a specific company.
     */
    public function view(User $user, Company $company): bool
    {
        return $user->id === $company->owner_id || $user->is_admin;
    }

    /**
     * Create a new company.
     */
    public function create(User $user): bool
    {
        return true; 
    }

    /**
     * Update company data.
     */
    public function update(User $user, Company $company): bool
    {
        return $user->id === $company->owner_id || $user->is_admin;
    }

    /**
     * Delete a company.
     */
    public function delete(User $user, Company $company): bool
    {
        return $user->id === $company->owner_id || $user->is_admin;
    }
}
