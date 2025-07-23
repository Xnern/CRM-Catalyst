<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Spatie\QueryBuilder\AllowedSort;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Inertia\Inertia; // Pour les vues Inertia
use Illuminate\Validation\ValidationException;
use App\Http\Requests\Contacts\StoreContactRequest;
use App\Http\Requests\Contacts\UpdateContactRequest;

class ContactController extends Controller
{
    /**
     * Display a listing of the contacts for Inertia page.
     */
    public function indexInertia(Request $request)
    {
        Gate::authorize('viewAny', Contact::class); // Optionnel ici si déjà fait dans la méthode API

        // La page Inertia ne charge pas les données directement depuis cette méthode,
        // elle affichera le composant React qui fera les requêtes API via RTK Query.
        return Inertia::render('Contacts/Index', [
            'canCreateContact' => $request->user()->can('create', Contact::class),
            // Vous pouvez passer d'autres props initiales si nécessaire.
        ]);
    }

    /**
     * Display a listing of the resource (API for RTK Query).
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Contact::class);

        $query = QueryBuilder::for(Contact::class)
            // Filtres autorisés
            ->allowedFilters([
                AllowedFilter::partial('name'),
                AllowedFilter::exact('email'),
                AllowedFilter::exact('phone'),
                // Filtre par ID utilisateur, utile pour les managers/admins
                AllowedFilter::exact('user_id'),
            ])
            // Relations à inclure (ex: ?include=user)
            ->allowedIncludes([
                AllowedInclude::relationship('user')
            ])
            // Champs autorisés pour le tri (ex: ?sort=name, ?sort=-created_at)
            ->allowedSorts([
                'name',
                'email',
                'created_at',
                // Ajoutez d'autres champs si triables
            ]);

        // Appliquer le filtrage RBAC basé sur les permissions de l'utilisateur
        // Ces conditions sont ajoutées en PLUS des filtres de QueryBuilder si elles sont présentes.
        if ($request->user()->hasRole('sales') && $request->user()->can('view own contacts')) {
            $query->where('user_id', $request->user()->id);
        }
        // Exemple pour les managers si la logique est plus complexe (ex: voir les contacts de leur équipe)
        // else if ($request->user()->hasRole('manager') && $request->user()->can('view team contacts')) {
        //     $teamUserIds = $request->user()->team->users->pluck('id')->toArray(); // Exemple: supposons une relation 'team'
        //     $query->whereIn('user_id', $teamUserIds);
        // }
        // Les admins et les managers avec 'view contacts' n'ont pas de filtre spécifique ici,
        // car ils sont autorisés à voir tous les contacts (ou une portée plus large) par la politique.

        $contacts = $query->with('user') // Eager load the user relationship for all contacts
                        ->paginate($request->input('per_page', 15));

        return response()->json($contacts);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreContactRequest $request)
    {
        Gate::authorize('create', Contact::class);

        $validatedData = $request->validated();


        // Assurez-vous que l'utilisateur connecté est assigné comme propriétaire du contact
        $contact = $request->user()->contacts()->create($validatedData);

        return response()->json($contact->load('user'), 201); // 201 Created
    }

    /**
     * Display the specified resource.
     */
    public function show(Contact $contact)
    {
        Gate::authorize('view', $contact);

        return response()->json($contact->load('user'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateContactRequest $request, Contact $contact)
    {
        Gate::authorize('update', $contact);

        $validatedData = $request->validated();

        $contact->update($validatedData);

        return response()->json($contact->load('user'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Contact $contact)
    {
        Gate::authorize('delete', $contact);

        $contact->delete();

        return response()->noContent(); // 204 No Content
    }
}
