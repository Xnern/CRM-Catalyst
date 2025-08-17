<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Company;

class CompanyPolicy
{
    // Comments in English only

    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin')
            || $user->can('view all companies')
            || $user->can('view companies')
            || $user->can('view own companies');
    }

    public function view(User $user, Company $company): bool
    {
        if ($user->hasRole('admin') || $user->can('view all companies')) {
            return true;
        }

        if ($user->can('view own companies') && (int)$user->id === (int)$company->owner_id) {
            return true;
        }

        if ($user->can('view companies')) {
            if ($this->isSameTeam($user, $company)) return true;
            if ($this->isSameTenant($user, $company)) return true;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin') || $user->can('create company');
    }

    public function update(User $user, Company $company): bool
    {
        if ($user->hasRole('admin')) return true;

        if ($user->can('manage companies')) {
            if ($this->isOwner($user, $company)) return true;
            if ($this->isSameTeam($user, $company)) return true;
            if ($this->isSameTenant($user, $company)) return true;
        }

        return false;
    }

    public function delete(User $user, Company $company): bool
    {
        if ($user->hasRole('admin')) return true;

        if ($user->can('delete companies')) {
            if ($this->isOwner($user, $company)) return true;
            if ($this->isSameTeam($user, $company)) return true;
            if ($this->isSameTenant($user, $company)) return true;
        }

        return false;
    }

    // Helpers: adapt to your schema
    protected function isOwner(User $user, Company $company): bool
    {
        return (int)$user->id === (int)$company->owner_id;
    }

    protected function isSameTeam(User $user, Company $company): bool
    {
        // return $user->team_id && $company->team_id && $user->team_id === $company->team_id;
        return false;
    }

    protected function isSameTenant(User $user, Company $company): bool
    {
        // return $user->tenant_id && $company->tenant_id && $user->tenant_id === $company->tenant_id;
        return false;
    }
}
