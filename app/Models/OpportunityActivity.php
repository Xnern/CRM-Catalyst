<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpportunityActivity extends Model
{
    use HasFactory;

    protected $fillable = [
        'opportunity_id',
        'user_id',
        'type',
        'title',
        'description',
        'old_value',
        'new_value',
        'scheduled_at',
        'completed_at',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Get the opportunity that owns the activity
     */
    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(Opportunity::class);
    }

    /**
     * Get the user who created the activity
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope for pending tasks
     */
    public function scopePendingTasks($query)
    {
        return $query->where('type', 'task')
            ->whereNull('completed_at')
            ->whereNotNull('scheduled_at');
    }

    /**
     * Scope for completed activities
     */
    public function scopeCompleted($query)
    {
        return $query->whereNotNull('completed_at');
    }

    /**
     * Mark activity as completed
     */
    public function markAsCompleted(): void
    {
        $this->update(['completed_at' => now()]);
    }
}