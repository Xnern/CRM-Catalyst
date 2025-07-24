<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class ImportFinishedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $importResult;

    /**
     * Create a new notification instance.
     *
     * @param array $importResult Contient des infos sur le résultat global ou les erreurs
     */
    public function __construct(array $importResult)
    {
        $this->importResult = $importResult;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function via($notifiable)
    {
        return ['mail', 'database']; // Peut aussi être 'database' pour des notifications in-app
    }

    /**
     * Get the mail representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return \Illuminate\Notifications\Messages\MailMessage
     */
    public function toMail($notifiable)
    {
        $status = $this->importResult['status'] ?? 'unknown';
        $message = $this->importResult['message'] ?? 'Votre importation CSV est terminée.';

        $mail = (new MailMessage)
                    ->line($message);

        if ($status === 'success') {
            $mail->subject('Importation CSV terminée avec succès');
            $mail->line('Nombre total de lignes traitées : ' . ($this->importResult['total_rows'] ?? 'N/A'));
            $mail->line('Nombre de contacts importés : ' . ($this->importResult['imported_rows'] ?? 'N/A'));
            $mail->action('Voir vos contacts', url('/contacts')); // Lien vers la page des contacts
        } elseif ($status === 'partial_success') {
            $mail->subject('Importation CSV terminée avec des avertissements');
            $mail->line('Votre fichier CSV a été traité, mais certaines lignes ont été ignorées en raison d\'erreurs.');
            $mail->line('Nombre de contacts importés : ' . ($this->importResult['imported_rows'] ?? 'N/A'));
            $mail->line('Nombre de lignes ignorées : ' . ($this->importResult['skipped_rows'] ?? 'N/A'));
            $mail->action('Voir les détails', url('/contacts/import-logs')); // Si tu as une page de logs
        } else {
            $mail->subject('Échec de l\'importation CSV');
            $mail->line('Une erreur est survenue lors de l\'importation de votre fichier CSV.');
            $mail->line('Détails de l\'erreur : ' . ($this->importResult['error_message'] ?? 'Aucun détail fourni.'));
        }

        return $mail;
    }

    /**
     * Get the array representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function toArray($notifiable)
    {
        return [
            'type' => 'csv_import',
            'status' => $this->importResult['status'],
            'message' => $this->importResult['message'],
            'details' => $this->importResult,
        ];
    }
}
