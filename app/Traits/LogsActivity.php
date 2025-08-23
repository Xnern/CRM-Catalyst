<?php

namespace App\Traits;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;

trait LogsActivity
{
    protected static function bootLogsActivity()
    {
        static::created(function ($model) {
            $model->logActivity('created', 'Créé');
        });

        static::updated(function ($model) {
            $changes = $model->getChanges();
            unset($changes['updated_at']); // Ignorer le timestamp
            
            if (!empty($changes)) {
                $model->logActivity('updated', 'Mis à jour', [
                    'attributes' => $changes,
                    'old' => $model->getOriginal(),
                ]);
            }
        });

        static::deleted(function ($model) {
            $model->logActivity('deleted', 'Supprimé');
        });
    }

    public function activityLogs()
    {
        return $this->morphMany(ActivityLog::class, 'subject');
    }

    protected function logActivity(string $logName, string $description, array $properties = [])
    {
        ActivityLog::create([
            'log_name' => $logName,
            'description' => $description,
            'subject_type' => get_class($this),
            'subject_id' => $this->id,
            'causer_type' => Auth::check() ? get_class(Auth::user()) : null,
            'causer_id' => Auth::id(),
            'properties' => $properties,
        ]);
    }

    public function logCustomActivity(string $description, array $properties = [])
    {
        $this->logActivity('custom', $description, $properties);
    }
}