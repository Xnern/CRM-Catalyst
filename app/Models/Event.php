<?php

namespace App\Models;

use App\Models\User;
use App\Models\Contact;
use App\Models\Company;
use App\Models\Opportunity;
use App\Models\Reminder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Event extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'title',
        'description',
        'start_datetime',
        'end_datetime',
        'user_id',
        'type',
        'priority',
        'color',
        'all_day',
        'location',
        'attendees',
        'contact_id',
        'company_id',
        'opportunity_id',
        'reminder_id',
        'is_recurring',
        'recurrence_config',
        'notes',
        'meeting_link',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'start_datetime' => 'datetime',
        'end_datetime' => 'datetime',
        'all_day' => 'boolean',
        'is_recurring' => 'boolean',
        'attendees' => 'array',
        'recurrence_config' => 'array',
    ];

    /**
     * Event types with their display labels and default colors
     */
    const TYPES = [
        'meeting' => ['label' => 'Réunion', 'color' => '#3b82f6'],
        'call' => ['label' => 'Appel', 'color' => '#10b981'],
        'deadline' => ['label' => 'Échéance', 'color' => '#ef4444'],
        'task' => ['label' => 'Tâche', 'color' => '#f59e0b'],
        'follow_up' => ['label' => 'Suivi', 'color' => '#8b5cf6'],
        'presentation' => ['label' => 'Présentation', 'color' => '#ec4899'],
        'other' => ['label' => 'Autre', 'color' => '#6b7280'],
    ];

    /**
     * Priority levels with their display labels
     */
    const PRIORITIES = [
        'low' => ['label' => 'Basse', 'color' => '#6b7280'],
        'medium' => ['label' => 'Moyenne', 'color' => '#f59e0b'],
        'high' => ['label' => 'Haute', 'color' => '#ef4444'],
    ];

    /**
     * Get the user that owns the event.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the contact associated with the event.
     */
    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * Get the company associated with the event.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the opportunity associated with the event.
     */
    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(Opportunity::class);
    }

    /**
     * Get the reminder associated with the event.
     */
    public function reminder(): BelongsTo
    {
        return $this->belongsTo(Reminder::class);
    }

    /**
     * Get the type label for this event
     */
    public function getTypeLabelAttribute(): string
    {
        return self::TYPES[$this->type]['label'] ?? $this->type;
    }

    /**
     * Get the priority label for this event
     */
    public function getPriorityLabelAttribute(): string
    {
        return self::PRIORITIES[$this->priority]['label'] ?? $this->priority;
    }

    /**
     * Get the default color for this event type
     */
    public function getDefaultColorAttribute(): string
    {
        return self::TYPES[$this->type]['color'] ?? '#6b7280';
    }

    /**
     * Get the effective color (custom color or default)
     */
    public function getEffectiveColorAttribute(): string
    {
        return $this->color ?: $this->default_color;
    }
}
