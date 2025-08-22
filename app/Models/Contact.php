<?php

namespace App\Models;

use App\Models\User;
use App\Models\Company;
use App\Models\Document;
use App\Enums\ContactStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class Contact extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'company_id',
        'status',
        'email',
        'phone',
        'address',
        'user_id',
        'latitude',
        'longitude',
    ];

    /**
     * Get the user that owns the contact.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function documents(): MorphToMany
    {
        return $this->morphToMany(Document::class, 'documentable', 'documentables')
            ->withPivot('role')
            ->withTimestamps();
    }

    protected function statusLabel(): Attribute
    {
        return Attribute::get(function () {
            try {
                return ContactStatus::from($this->status)->label();
            } catch (\ValueError) {
                return ucfirst(str_replace('_', ' ', $this->status ?? ''));
            }
        });
    }
}
