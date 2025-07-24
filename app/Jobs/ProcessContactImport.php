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
use App\Traits\CleansPhoneNumbers; // Trait for phone number cleaning

class ProcessContactImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, Batchable, CleansPhoneNumbers; // Use Batchable and CleansPhoneNumbers traits

    protected $data; // CSV row data
    protected $user_id;
    protected $notificationUser; // User to notify

    /**
     * Create a new job instance.
     *
     * @param array $data CSV row data (e.g., ['name' => '...', 'email' => '...'])
     * @param int $user_id The ID of the user who imported the contacts
     * @param User $notificationUser The User object to notify
     */
    public function __construct(array $data, int $user_id, User $notificationUser)
    {
        // Clean phone number in the row data before job construction/serialization
        if (isset($data['phone'])) {
            $data['phone'] = $this->cleanPhoneNumber($data['phone']); // Uses method from CleansPhoneNumbers trait
        }
        // Normalize email to lowercase for consistent unique validation
        if (isset($data['email'])) {
             $data['email'] = strtolower($data['email']);
        }

        $this->data = $data;
        $this->user_id = $user_id;
        $this->notificationUser = $notificationUser;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Do not process job if the batch has been cancelled
        if ($this->batch()->cancelled()) {
            return;
        }

        $row = $this->data;

        // Validate row data
        $validator = Validator::make($row, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:contacts,email'],
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^\+?\d{10,15}$/'], // Regex applied to already cleaned number
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            Log::warning('Import CSV: Validation failed for row', [
                'row_data' => $row,
                'errors' => $validator->errors()->toArray()
            ]);
            // Mark this job as failed within the batch for accurate counting
            $this->batch()->recordFailedJob($this->job->getRawBody());
            return;
        }

        try {
            // Create the contact
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
            // Mark this job as failed within the batch
            $this->batch()->recordFailedJob($this->job->getRawBody());
        }
    }

    /**
     * Handle a job failure.
     * This method is called if the job itself fails to execute (e.g., environment issue).
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Import CSV: Job failed for row (handled by failed method)', [
            'row_data' => $this->data,
            'exception' => $exception->getMessage()
        ]);
        // Notify the user about the job failure
        Notification::send($this->notificationUser, new ImportFinishedNotification([
            'status' => 'job_failed',
            'message' => 'An internal error occurred during row import.',
            'data' => $this->data,
            'error_message' => $exception->getMessage()
        ]));
    }
}
