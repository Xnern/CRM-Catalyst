<?php

namespace App\Http\Controllers;

use League\Csv\Reader;
use App\Models\Contact;
use Illuminate\Bus\Batch;
use Illuminate\Http\Request;
use App\Jobs\ProcessContactImport;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Gate;
use Spatie\QueryBuilder\AllowedSort;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia; // Pour les vues Inertia
use Illuminate\Validation\ValidationException;
use App\Notifications\ImportFinishedNotification;
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
        // [DÉBUT] Mapping des paramètres
        $filterParams = [];
        $spatieCompatibleParams = ['search', 'name', 'email', 'phone', 'user_id'];

        foreach ($spatieCompatibleParams as $param) {
            if ($request->has($param)) {
                $filterParams[$param] = $request->input($param);
            }
        }

        $existingFilters = $request->input('filter', []);
        $mergedFilters = array_merge($existingFilters, $filterParams);

        $request->merge([
            'filter' => $mergedFilters,
            ...array_fill_keys($spatieCompatibleParams, null)
        ]);
        // [FIN] Mapping

        Gate::authorize('viewAny', Contact::class);

        $perPage = $request->input('per_page', 15);
        $perPage = min($perPage, 100);

        $baseQuery = Contact::query();

        if ($request->user()->hasRole('sales') && $request->user()->can('view own contacts')) {
            $baseQuery->where('user_id', $request->user()->id);
        }

        $contactsQuery = QueryBuilder::for($baseQuery)
            ->allowedFilters([
                AllowedFilter::partial('name'),
                AllowedFilter::exact('email'),
                AllowedFilter::exact('phone'),
                AllowedFilter::exact('user_id'),
                // Correction spécifique pour QueryBuilder
                AllowedFilter::callback('search', function ($query, $value) {
                    $query->where(function ($q) use ($value) {
                        $q->where('name', 'LIKE', "%{$value}%")
                        ->orWhere('email', 'LIKE', "%{$value}%")
                        ->orWhere('phone', 'LIKE', "%{$value}%");
                    });
                }),
            ])
            ->allowedIncludes([
                AllowedInclude::relationship('user')
            ])
            ->allowedSorts([
                'name',
                'email',
                'created_at',
            ]);

        $contacts = $contactsQuery->paginate($perPage);

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

    /**
     * Handle the CSV import.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function importCsv(Request $request)
    {
        Gate::authorize('create', Contact::class); // Ou une autre permission plus spécifique

        $request->validate([
            'csv_file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'], // 10MB max
        ]);

        $file = $request->file('csv_file');
        $filePath = $file->getRealPath();

        try {
            // Utiliser League\Csv pour une meilleure gestion des fichiers CSV
            $csv = Reader::createFromPath($filePath, 'r');
            $csv->setHeaderOffset(0); // Assumer que la première ligne est l'en-tête

            $records = $csv->getRecords();

            $jobs = [];
            $totalRows = 0;
            $currentUser = $request->user(); // L'utilisateur qui lance l'import

            foreach ($records as $offset => $row) {
                $totalRows++;
                // Convertir les clés en minuscules pour la robustesse (si l'en-tête est sensible à la casse)
                $sanitizedRow = array_change_key_case($row, CASE_LOWER);

                // Dispatchez chaque ligne vers le job de file d'attente
                $jobs[] = new ProcessContactImport($sanitizedRow, $currentUser->id, $currentUser);
            }

            if (empty($jobs)) {
                return back()->with('error', 'Le fichier CSV est vide ou ne contient pas de données valides.');
            }

            // Utiliser des Batches de Jobs pour suivre la progression globale
            // Nécessite une table 'job_batches'. Lancez `php artisan queue:batches-table` puis `php artisan migrate`
            Bus::batch($jobs)
                ->then(function (Batch $batch) use ($currentUser, $totalRows) {
                    // Tous les jobs du batch ont été terminés avec succès
                    Notification::send($currentUser, new ImportFinishedNotification([
                        'status' => 'success',
                        'message' => 'Votre importation CSV est terminée avec succès.',
                        'total_rows' => $totalRows,
                        'imported_rows' => $totalRows - $batch->failedJobs // Simple estimation
                    ]));
                })
                ->catch(function (Batch $batch, Throwable $e) use ($currentUser) {
                    // Un ou plusieurs jobs du batch ont échoué
                    Notification::send($currentUser, new ImportFinishedNotification([
                        'status' => 'failed',
                        'message' => 'Votre importation CSV a échoué. Veuillez vérifier les logs.',
                        'error_message' => $e->getMessage()
                    ]));
                })
                ->finally(function (Batch $batch) use ($currentUser) {
                    // Exécuté que le batch réussisse ou échoue
                    // Si tu veux un état plus granulaire (partiellement réussi), tu peux compter les jobs réussis/échoués ici
                    // et ajuster la notification finale. Pour cela, il faudrait que les jobs eux-mêmes
                    // mettent à jour un compteur ou une table de logs pour le batch.
                    if ($batch->cancelled()) {
                        Notification::send($currentUser, new ImportFinishedNotification([
                            'status' => 'cancelled',
                            'message' => 'L\'importation CSV a été annulée.'
                        ]));
                    } else if ($batch->failedJobs > 0) {
                         Notification::send($currentUser, new ImportFinishedNotification([
                            'status' => 'partial_success', // Ou 'failed' si tous échouent
                            'message' => 'Votre importation CSV est terminée, mais certaines lignes ont échoué.',
                            'total_rows' => $batch->totalJobs,
                            'imported_rows' => $batch->totalJobs - $batch->failedJobs,
                            'skipped_rows' => $batch->failedJobs,
                        ]));
                    }
                })
                ->dispatch();

            return back()->with('success', 'Votre fichier CSV est en cours d\'importation. Vous serez notifié une fois l\'opération terminée.');

        } catch (\League\Csv\Exception $e) {
            Log::error('CSV parsing error: ' . $e->getMessage());
            return back()->with('error', 'Erreur lors de la lecture du fichier CSV : ' . $e->getMessage());
        } catch (\Exception $e) {
            Log::error('CSV import error: ' . $e->getMessage());
            return back()->with('error', 'Une erreur inattendue est survenue lors de l\'importation : ' . $e->getMessage());
        }
    }
}
