<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Contact;
use Illuminate\Auth\Access\HandlesAuthorization;

class ContactPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     * Cette méthode contrôle l'accès à la liste des contacts.
     */
    public function viewAny(User $user): bool
    {
        // Un administrateur peut voir tous les contacts sans restriction.
        if ($user->hasRole('admin')) {
            return true;
        }

        // Un utilisateur ayant la permission 'view all contacts' (ex: manager de haut niveau)
        if ($user->can('view all contacts')) {
            return true;
        }

        // Un utilisateur ayant la permission 'view contacts' (ex: manager d'équipe ou commercial voyant ses propres contacts)
        // La granularité exacte de ce que "view contacts" signifie est ensuite affinée dans le contrôleur (filtre sur user_id).
        if ($user->can('view contacts') || $user->can('view own contacts')) {
            return true;
        }

        return false; // Par défaut, l'accès est refusé
    }

    /**
     * Determine whether the user can view the model.
     * Cette méthode contrôle l'accès à un contact spécifique.
     */
    public function view(User $user, Contact $contact): bool
    {
        // Un administrateur peut voir n'importe quel contact.
        if ($user->hasRole('admin')) {
            return true;
        }

        // Si l'utilisateur a la permission de voir "tous les contacts" (pour un manager par exemple)
        if ($user->can('view all contacts')) {
            return true;
        }

        // Si l'utilisateur a la permission de voir "view contacts" et est autorisé à le voir (logique à affiner si nécessaire)
        // Pour un manager, 'view contacts' pourrait signifier qu'il voit tous les contacts de son équipe.
        // Pour l'instant, on suppose que 'view contacts' permet de voir n'importe quel contact via ID si la politique le gère.
        if ($user->can('view contacts')) {
            // Ici, vous pourriez ajouter une logique comme :
            // return $user->id === $contact->user_id || $user->isManagerOf($contact->user);
            return true; // Simple, suppose que 'view contacts' permet de voir tout contact si l'ID est connu
        }

        // Si l'utilisateur peut voir ses propres contacts ET qu'il est le propriétaire de ce contact.
        if ($user->can('view own contacts') && $user->id === $contact->user_id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Un administrateur, manager ou sales peut créer un contact
        return $user->hasAnyPermission(['manage contacts', 'create contact']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Contact $contact): bool
    {
        // Un administrateur peut modifier n'importe quel contact
        if ($user->hasRole('admin')) {
            return true;
        }

        // Un utilisateur avec 'manage contacts' peut modifier s'il est le propriétaire ou si c'est autorisé par sa portée
        if ($user->can('manage contacts')) {
            // Exemple : Un manager peut modifier les contacts de son équipe.
            // Pour l'instant, on suppose qu'un user avec 'manage contacts' peut modifier ses propres contacts.
            return $user->id === $contact->user_id;
        }

        // Un utilisateur avec 'edit own contacts' peut modifier ses propres contacts
        if ($user->can('edit own contacts') && $user->id === $contact->user_id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Contact $contact): bool
    {
        // Un administrateur peut supprimer n'importe quel contact
        if ($user->hasRole('admin')) {
            return true;
        }

        // Un utilisateur avec 'manage contacts' peut supprimer s'il est le propriétaire
        if ($user->can('manage contacts')) {
            return $user->id === $contact->user_id;
        }

        // Un utilisateur avec 'delete own contacts' peut supprimer ses propres contacts
        if ($user->can('delete own contacts') && $user->id === $contact->user_id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Contact $contact): bool
    {
        // Généralement, seuls les admins peuvent restaurer
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Contact $contact): bool
    {
        // Généralement, seuls les admins peuvent supprimer définitivement
        return $user->hasRole('admin');
    }
}
