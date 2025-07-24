<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Contact;
use Illuminate\Auth\Access\HandlesAuthorization;

class ContactPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any contacts.
     */
    public function viewAny(User $user): bool
    {
        // Admins can view all contacts.
        if ($user->hasRole('admin')) {
            return true;
        }

        // Users with 'view all contacts' permission (e.g., high-level managers) can view all.
        if ($user->can('view all contacts')) {
            return true;
        }

        // Users with 'view contacts' (e.g., team managers) or 'view own contacts' (e.g., sales)
        // are authorized. Specific filtering is handled in the controller (e.g., by user_id).
        if ($user->can('view contacts') || $user->can('view own contacts')) {
            return true;
        }

        return false; // Access denied by default
    }

    /**
     * Determine whether the user can view a specific contact.
     */
    public function view(User $user, Contact $contact): bool
    {
        // Admins can view any contact.
        if ($user->hasRole('admin')) {
            return true;
        }

        // Users with 'view all contacts' permission can view any contact.
        if ($user->can('view all contacts')) {
            return true;
        }

        // Users with 'view contacts' can generally view any specific contact.
        // If more granular logic is needed (e.g., team-specific), it would go here.
        if ($user->can('view contacts')) {
            return true;
        }

        // Users with 'view own contacts' can view their own contacts.
        if ($user->can('view own contacts') && $user->id === $contact->user_id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can create contacts.
     */
    public function create(User $user): bool
    {
        // Admins, managers, or sales can create contacts.
        return $user->hasAnyPermission(['manage contacts', 'create contact']);
    }

    /**
     * Determine whether the user can update a contact.
     */
    public function update(User $user, Contact $contact): bool
    {
        // Admins can update any contact.
        if ($user->hasRole('admin')) {
            return true;
        }

        // Users with 'manage contacts' can update if they own the contact.
        // Extend logic here for team-specific management if needed.
        if ($user->can('manage contacts')) {
            return $user->id === $contact->user_id;
        }

        // Users with 'edit own contacts' can update their own contacts.
        if ($user->can('edit own contacts') && $user->id === $contact->user_id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can delete a contact.
     */
    public function delete(User $user, Contact $contact): bool
    {
        // Admins can delete any contact.
        if ($user->hasRole('admin')) {
            return true;
        }

        // Users with 'manage contacts' can delete if they own the contact.
        // Extend logic here for team-specific management if needed.
        if ($user->can('manage contacts')) {
            return $user->id === $contact->user_id;
        }

        // Users with 'delete own contacts' can delete their own contacts.
        if ($user->can('delete own contacts') && $user->id === $contact->user_id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can restore a contact (soft deletes).
     */
    public function restore(User $user, Contact $contact): bool
    {
        // Typically, only admins can restore contacts.
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can permanently delete a contact.
     */
    public function forceDelete(User $user, Contact $contact): bool
    {
        // Typically, only admins can permanently delete contacts.
        return $user->hasRole('admin');
    }
}
