<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class Reminder extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'opportunity_id',
        'contact_id',
        'title',
        'description',
        'reminder_date',
        'type',
        'priority',
        'status',
        'completed_at',
        'snoozed_until',
        'is_recurring',
        'recurrence_pattern',
        'recurrence_interval',
        'recurrence_end_date',
    ];

    protected $casts = [
        'reminder_date' => 'datetime',
        'completed_at' => 'datetime',
        'snoozed_until' => 'datetime',
        'recurrence_end_date' => 'date',
        'is_recurring' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(Opportunity::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeOverdue($query)
    {
        return $query->pending()
            ->where('reminder_date', '<', Carbon::now());
    }

    public function scopeUpcoming($query, $days = 7)
    {
        return $query->pending()
            ->whereBetween('reminder_date', [
                Carbon::now(),
                Carbon::now()->addDays($days)
            ]);
    }

    public function scopeToday($query)
    {
        return $query->pending()
            ->whereDate('reminder_date', Carbon::today());
    }

    // Helpers
    public function isOverdue(): bool
    {
        return $this->status === 'pending' && $this->reminder_date->isPast();
    }

    public function isDueToday(): bool
    {
        return $this->status === 'pending' && $this->reminder_date->isToday();
    }

    public function isDueSoon(): bool
    {
        return $this->status === 'pending' && 
               $this->reminder_date->isFuture() && 
               $this->reminder_date->diffInHours(Carbon::now()) <= 24;
    }

    public function markAsCompleted(): void
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => Carbon::now(),
        ]);

        // Create next recurring reminder if applicable
        if ($this->is_recurring && $this->recurrence_pattern) {
            $this->createNextRecurrence();
        }
    }

    public function snooze($minutes = 60): void
    {
        // On ajoute le temps de report à la date actuelle du rappel, pas à maintenant
        // Sauf si le rappel est déjà passé (en retard), dans ce cas on part de maintenant
        $baseTime = $this->reminder_date->isPast() ? Carbon::now() : $this->reminder_date;
        
        $this->update([
            'reminder_date' => $baseTime->copy()->addMinutes($minutes),
            'snoozed_until' => $baseTime->copy()->addMinutes($minutes),
            // On garde le statut 'pending' pour que le rappel reste visible
            'status' => 'pending',
        ]);
    }

    protected function createNextRecurrence(): void
    {
        if (!$this->is_recurring || !$this->recurrence_pattern) return;

        $nextDate = match($this->recurrence_pattern) {
            'daily' => $this->reminder_date->addDays($this->recurrence_interval ?? 1),
            'weekly' => $this->reminder_date->addWeeks($this->recurrence_interval ?? 1),
            'monthly' => $this->reminder_date->addMonths($this->recurrence_interval ?? 1),
            default => null,
        };

        if ($nextDate && (!$this->recurrence_end_date || $nextDate->lte($this->recurrence_end_date))) {
            self::create([
                'user_id' => $this->user_id,
                'opportunity_id' => $this->opportunity_id,
                'contact_id' => $this->contact_id,
                'title' => $this->title,
                'description' => $this->description,
                'reminder_date' => $nextDate,
                'type' => $this->type,
                'priority' => $this->priority,
                'status' => 'pending',
                'is_recurring' => true,
                'recurrence_pattern' => $this->recurrence_pattern,
                'recurrence_interval' => $this->recurrence_interval,
                'recurrence_end_date' => $this->recurrence_end_date,
            ]);
        }
    }

    // Type labels
    public static function typeLabels(): array
    {
        return [
            'follow_up' => 'Suivi',
            'meeting' => 'Réunion',
            'call' => 'Appel',
            'email' => 'Email',
            'deadline' => 'Échéance',
            'other' => 'Autre',
        ];
    }

    // Priority labels
    public static function priorityLabels(): array
    {
        return [
            'low' => 'Faible',
            'medium' => 'Moyenne',
            'high' => 'Haute',
        ];
    }
}