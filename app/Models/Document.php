<?php

namespace App\Models;

use App\Models\Company;
use App\Models\Contact;
use App\Models\DocumentVersion;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class Document extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid','name','original_filename','mime_type','extension',
        'size_bytes','storage_disk','storage_path','owner_id',
        'visibility','description','tags',
    ];

    protected $casts = [
        'tags' => 'array',
    ];

    // Relationships

    public function owner() {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function companies(): MorphToMany {
        return $this->morphedByMany(Company::class, 'documentable')->withTimestamps()->withPivot('role');
    }

    public function contacts(): MorphToMany {
        return $this->morphedByMany(Contact::class, 'documentable')->withTimestamps()->withPivot('role');
    }

    public function versions() {
        return $this->hasMany(DocumentVersion::class)->orderBy('version', 'desc');
    }

    // Accessors

    protected function sizeHuman(): Attribute {
        return Attribute::get(function () {
            $size = (int) $this->size_bytes;
            $units = ['B','KB','MB','GB','TB'];
            $i = $size > 0 ? (int) floor(log($size, 1024)) : 0;
            return $size > 0 ? round($size / (1024 ** $i), 1) . $units[$i] : '0B';
        });
    }
}
