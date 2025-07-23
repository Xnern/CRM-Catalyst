<?php

namespace App\Jobs;

use App\Models\Contact;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Validator;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Notification;
use App\Notifications\ImportFinishedNotification;
use App\Models\User; // Assurez-vous d'importer le modèle User

class ProcessContactImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, Batchable;

    protected $data;
    protected $user_id;
    protected $notificationUser; // L'utilisateur à notifier

    /**
     * Create a new job instance.
     *
     * @param array $data Le tableau de données d'une ligne CSV (ex: ['name' => '...', 'email' => '...'])
     * @param int $user_id L'ID de l'utilisateur qui importe les contacts
     * @param User $notificationUser L'objet User à notifier (celui qui a lancé l'import)
     */
    public function __construct(array $data, int $user_id, User $notificationUser)
    {
        $this->data = $data;
        $this->user_id = $user_id;
        $this->notificationUser = $notificationUser;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        $row = $this->data;

        $validator = Validator::make($row, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:contacts,email'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:255'],
            // Ajoute d'autres règles de validation si nécessaire
        ]);

        if ($validator->fails()) {
            Log::warning('Import CSV: Validation failed for row', [
                'row_data' => $row,
                'errors' => $validator->errors()->toArray()
            ]);
            // Optionnel: Envoyer une notification plus détaillée avec les erreurs
            // Notification::send($this->notificationUser, new ImportFinishedNotification([
            //     'status' => 'failed_row',
            //     'message' => 'Ligne ignorée : ' . implode(', ', $validator->errors()->all()),
            //     'data' => $row
            // ]));
            return; // Passer à la ligne suivante si la validation échoue
        }

        try {
            Contact::create([
                'name' => $row['name'],
                'email' => $row['email'],
                'phone' => $row['phone'] ?? null,
                'address' => $row['address'] ?? null,
                'user_id' => $this->user_id, // L'utilisateur qui a importé
            ]);
        } catch (\Exception $e) {
            Log::error('Import CSV: Error creating contact for row', [
                'row_data' => $row,
                'error' => $e->getMessage()
            ]);
            // Gérer les erreurs de base de données (ex: email déjà existant même après unique:contacts)
            // Optionnel: Envoyer une notification d'erreur spécifique
            // Notification::send($this->notificationUser, new ImportFinishedNotification([
            //     'status' => 'db_error',
            //     'message' => 'Erreur base de données pour la ligne : ' . $e->getMessage(),
            //     'data' => $row
            // ]));
        }
    }

    /**
     * Handle a job failure.
     *
     * @param  \Throwable  $exception
     * @return void
     */
    public function failed(\Throwable $exception)
    {
        Log::error('Import CSV: Job failed for row', [
            'row_data' => $this->data,
            'exception' => $exception->getMessage()
        ]);
        // Notifier l'utilisateur d'un échec de job (rare, souvent lié à l'environnement ou config queue)
        Notification::send($this->notificationUser, new ImportFinishedNotification([
            'status' => 'job_failed',
            'message' => 'Une erreur interne est survenue lors de l\'importation d\'une ligne.',
            'data' => $this->data,
            'error_message' => $exception->getMessage()
        ]));
    }
}
