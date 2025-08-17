<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;

class DocumentPolicy
{

    public function viewAny(User $user): bool
    {
        // Allow listing documents if user can view at least some scope
        return $user->can('view all documents') || $user->can('view documents') || $user->can('view own documents');
    }

    public function view(User $user, Document $document): bool
    {
        // 1) Global override
        if ($user->can('view all documents')) {
            return true;
        }

        // 2) Owner can view if has "view own" or "manage" in own scope
        if ($this->isOwner($user, $document) && ($user->can('view own documents') || $user->can('manage documents'))) {
            return true;
        }

        // 3) Visibility-based access for broader viewers
        if ($user->can('view documents')) {
            // Private: only owner (already handled) or explicit link-based policies you might add later
            if ($document->visibility === 'private') {
                // Optionally, allow if user can view linked company/contact; implement if needed.
                return false;
            }

            // Team: allow if user shares team with the document scope
            if ($document->visibility === 'team') {
                return $this->isSameTeam($user, $document);
            }

            // Company: allow if user belongs to same company scope or can view linked company/contact
            if ($document->visibility === 'company') {
                return $this->isSameCompanyScope($user, $document);
            }
        }

        // 4) Fallback deny
        return false;
    }

    public function download(User $user, Document $document): bool
    {
        // Download follows the same rules as view
        return $this->view($user, $document);
    }

    public function create(User $user): bool
    {
        // Users with create document can upload
        return $user->can('create document');
    }

    public function update(User $user, Document $document): bool
    {
        // Admin/managers with manage documents can update any in their scope; here we keep it simple:
        if ($user->can('manage documents')) {
            // If you need to restrict to scope, add checks similar to view() for team/company
            return $this->inEditableScope($user, $document);
        }

        // Owners with manage documents can update own
        if ($this->isOwner($user, $document) && $user->can('manage documents')) {
            return true;
        }

        return false;
    }

    public function delete(User $user, Document $document): bool
    {
        // Delete is usually stricter; grant if can delete documents in scope or is owner with manage
        if ($user->can('delete documents')) {
            return $this->inEditableScope($user, $document);
        }

        if ($this->isOwner($user, $document) && $user->can('manage documents')) {
            return true;
        }

        return false;
    }

    // Helpers

    protected function isOwner(User $user, Document $document): bool
    {
        return $document->owner_id === $user->id;
    }

    protected function isSameTeam(User $user, Document $document): bool
    {
        // Implement your own logic:
        // Example if you have user->team_id and document is associated to team scope:
        // return $document->team_id && $user->team_id === $document->team_id;

        // If you define "team" as: user and document linked via a company/contact the user can view,
        // add checks here (e.g., via gates on linked companies/contacts).
        return false;
    }

    protected function isSameCompanyScope(User $user, Document $document): bool
    {
        // Implement your own company scope logic:
        // Example if user->company_id and document has company links:
        // return $document->companies()->where('companies.id', $user->company_id)->exists();

        // Alternatively, if the user can view at least one linked company/contact, let pass:
        // foreach ($document->companies as $company) {
        //     if ($user->can('view', $company)) return true;
        // }
        // foreach ($document->contacts as $contact) {
        //     if ($user->can('view', $contact)) return true;
        // }

        return false;
    }

    protected function inEditableScope(User $user, Document $document): bool
    {
        // This centralizes the "scope" for update/delete actions
        if ($this->isOwner($user, $document)) return true;

        // For team/company scoped editing, mirror the visibility checks:
        if ($document->visibility === 'team') {
            return $this->isSameTeam($user, $document);
        }
        if ($document->visibility === 'company') {
            return $this->isSameCompanyScope($user, $document);
        }

        return false;
    }
}
