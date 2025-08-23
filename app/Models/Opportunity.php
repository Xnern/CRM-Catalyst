<?php

namespace App\Models;

use App\Enums\OpportunityStage;
use App\Traits\LogsActivity;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Opportunity extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'name',
        'description',
        'contact_id',
        'company_id',
        'user_id',
        'amount',
        'currency',
        'probability',
        'stage',
        'expected_close_date',
        'actual_close_date',
        'lead_source',
        'loss_reason',
        'next_step',
        'products',
        'competitors',
        'custom_fields',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'probability' => 'integer',
        'expected_close_date' => 'date',
        'actual_close_date' => 'date',
        'products' => 'array',
        'custom_fields' => 'array',
    ];

    protected $appends = ['stage_label', 'days_until_close', 'is_overdue'];

    /**
     * Get the contact associated with the opportunity
     */
    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * Get the company associated with the opportunity
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the user (sales rep) who owns the opportunity
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the activities for the opportunity
     */
    public function activities(): HasMany
    {
        return $this->hasMany(OpportunityActivity::class)->orderBy('created_at', 'desc');
    }

    /**
     * Get the stage label
     */
    protected function stageLabel(): Attribute
    {
        return Attribute::get(function () {
            try {
                return OpportunityStage::from($this->stage)->label();
            } catch (\ValueError) {
                return ucfirst(str_replace('_', ' ', $this->stage ?? ''));
            }
        });
    }

    /**
     * Get days until expected close date
     */
    protected function daysUntilClose(): Attribute
    {
        return Attribute::get(function () {
            if (! $this->expected_close_date) {
                return null;
            }

            return Carbon::now()->diffInDays($this->expected_close_date, false);
        });
    }

    /**
     * Check if opportunity is overdue
     */
    protected function isOverdue(): Attribute
    {
        return Attribute::get(function () {
            if (! $this->expected_close_date) {
                return false;
            }
            if (in_array($this->stage, ['converti', 'perdu'])) {
                return false;
            }

            return Carbon::now()->isAfter($this->expected_close_date);
        });
    }

    /**
     * Calculate weighted amount (amount * probability)
     */
    public function getWeightedAmountAttribute(): float
    {
        return ($this->amount * $this->probability) / 100;
    }

    /**
     * Scope for open opportunities
     */
    public function scopeOpen($query)
    {
        return $query->whereNotIn('stage', ['converti', 'perdu']);
    }

    /**
     * Scope for won opportunities
     */
    public function scopeWon($query)
    {
        return $query->where('stage', 'converti');
    }

    /**
     * Scope for lost opportunities
     */
    public function scopeLost($query)
    {
        return $query->where('stage', 'perdu');
    }

    /**
     * Scope for opportunities closing this month
     */
    public function scopeClosingThisMonth($query)
    {
        return $query->whereBetween('expected_close_date', [
            Carbon::now()->startOfMonth(),
            Carbon::now()->endOfMonth(),
        ]);
    }

    /**
     * Scope for overdue opportunities
     */
    public function scopeOverdue($query)
    {
        return $query->open()
            ->where('expected_close_date', '<', Carbon::now())
            ->whereNotNull('expected_close_date');
    }

    /**
     * Log an activity when stage changes
     */
    protected static function booted()
    {
        static::updating(function ($opportunity) {
            if ($opportunity->isDirty('stage')) {
                OpportunityActivity::create([
                    'opportunity_id' => $opportunity->id,
                    'user_id' => auth()->id() ?? 1,
                    'type' => 'stage_change',
                    'title' => 'Changement d\'étape',
                    'description' => "L'étape a été modifiée",
                    'old_value' => $opportunity->getOriginal('stage'),
                    'new_value' => $opportunity->stage,
                ]);
            }

            if ($opportunity->isDirty('amount')) {
                OpportunityActivity::create([
                    'opportunity_id' => $opportunity->id,
                    'user_id' => auth()->id() ?? 1,
                    'type' => 'amount_change',
                    'title' => 'Changement de montant',
                    'description' => 'Le montant a été modifié',
                    'old_value' => $opportunity->getOriginal('amount'),
                    'new_value' => $opportunity->amount,
                ]);
            }

            // Update actual close date when marked as won or lost
            if ($opportunity->isDirty('stage')) {
                if (in_array($opportunity->stage, ['converti', 'perdu'])) {
                    $opportunity->actual_close_date = Carbon::now();
                }
            }
        });
    }
}
