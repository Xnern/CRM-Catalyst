<?php
// app/Services/ActivityLogger.php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class ActivityLogger
{
    public static function log(
        string $description,
        ?Model $subject = null,
        ?Model $causer = null,
        ?string $logName = 'default',
        array $properties = []
    ): ActivityLog {
        $causer = $causer ?? Auth::user();

        return ActivityLog::create([
            'log_name' => $logName,
            'description' => $description,
            'subject_type' => $subject ? get_class($subject) : null,
            'subject_id' => $subject?->getKey(),
            'causer_type' => $causer ? get_class($causer) : null,
            'causer_id' => $causer?->getKey(),
            'properties' => $properties,
        ]);
    }

    // Méthodes de convenance
    public static function contactCreated(Model $contact): ActivityLog
    {
        return self::log(
            "Contact '{$contact->name}' créé",
            $contact,
            null,
            'contact',
            ['action' => 'created']
        );
    }

    public static function contactUpdated(Model $contact, array $changes = []): ActivityLog
    {
        return self::log(
            "Contact '{$contact->name}' modifié",
            $contact,
            null,
            'contact',
            ['action' => 'updated', 'changes' => $changes]
        );
    }

    public static function contactDeleted(string $contactName, int $contactId): ActivityLog
    {
        return self::log(
            "Contact '{$contactName}' supprimé",
            null,
            null,
            'contact',
            ['action' => 'deleted', 'contact_id' => $contactId]
        );
    }

    public static function companyCreated(Model $company): ActivityLog
    {
        return self::log(
            "Entreprise '{$company->name}' créée",
            $company,
            null,
            'company',
            ['action' => 'created']
        );
    }

    public static function companyUpdated(Model $company, array $changes = []): ActivityLog
    {
        return self::log(
            "Entreprise '{$company->name}' modifiée",
            $company,
            null,
            'company',
            ['action' => 'updated', 'changes' => $changes]
        );
    }

    public static function companyDeleted(string $companyName, int $companyId): ActivityLog
    {
        return self::log(
            "Entreprise '{$companyName}' supprimée",
            null,
            null,
            'company',
            ['action' => 'deleted', 'company_id' => $companyId]
        );
    }

    public static function documentUploaded(Model $document): ActivityLog
    {
        return self::log(
            "Document '{$document->name}' ajouté",
            $document,
            null,
            'document',
            ['action' => 'uploaded', 'size' => $document->size_bytes]
        );
    }

    public static function documentDeleted(string $documentName, int $documentId): ActivityLog
    {
        return self::log(
            "Document '{$documentName}' supprimé",
            null,
            null,
            'document',
            ['action' => 'deleted', 'document_id' => $documentId]
        );
    }
}
