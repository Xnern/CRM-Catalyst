<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'domain',
        'industry',
        'size',
        'status',
        'owner_id',
        'address',
        'city',
        'zipcode',
        'country',
        'notes'
    ];

    /**
     * Owner of the company (User)
     */
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * All contacts related to this company
     */
    public function contacts()
    {
        return $this->hasMany(Contact::class);
    }
}
