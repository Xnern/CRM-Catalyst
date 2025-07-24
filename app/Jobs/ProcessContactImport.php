<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Bus\Batchable;

use App\Models\Contact;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use App\Notifications\ImportFinishedNotification;
use App\Traits\CleansPhoneNumbers; // Importer le trait

class ProcessContactImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, Batchable, CleansPhoneNumbers; // Utiliser le trait

    protected $data; // Le tableau de données d'une ligne CSV
    protected $user_id;
    protected $notificationUser;

    public function __construct(array $data, int $user_id, User $notificationUser)
    {
        // Nettoyer le numéro de téléphone de la ligne de données AVANT la construction du Job
        // C'est important car les données sont sérialisées.
        if (isset($data['phone'])) {
            $data['phone'] = $this->cleanPhoneNumber($data['phone']);
        }

        $this->data = $data;
        $this->user_id = $user_id;
        $this->notificationUser = $notificationUser;
    }

    /**
     * Execute the job.
     */
    public function handle()
    {
        if ($this->batch()->cancelled()) {
            return;
        }

        $row = $this->data;

        $validator = Validator::make($row, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:contacts,email'],
            // La regex est appliquée au numéro déjà nettoyé
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^\+?\d{10,15}$/'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            Log::warning('Import CSV: Validation failed for row', [
                'row_data' => $row,
                'errors' => $validator->errors()->toArray()
            ]);
            // Marquez ce job comme "échoué" dans le batch pour qu'il soit compté
            $this->batch()->recordFailedJob($this->job->getRawBody());
            return;
        }

        try {
            Contact::create([
                'name' => $row['name'],
                'email' => $row['email'],
                'phone' => $row['phone'] ?? null,
                'address' => $row['address'] ?? null,
                'user_id' => $this->user_id,
            ]);
        } catch (\Exception $e) {
            Log::error('Import CSV: Error creating contact for row', [
                'row_data' => $row,
                'error' => $e->getMessage()
            ]);
            $this->batch()->recordFailedJob($this->job->getRawBody());
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception)
    {
        Log::error('Import CSV: Job failed for row (handled by failed method)', [
            'row_data' => $this->data,
            'exception' => $exception->getMessage()
        ]);
        Notification::send($this->notificationUser, new ImportFinishedNotification([
            'status' => 'job_failed',
            'message' => 'Une erreur interne est survenue lors de l\'importation d\'une ligne.',
            'data' => $this->data,
            'error_message' => $exception->getMessage()
        ]));
    }
}
