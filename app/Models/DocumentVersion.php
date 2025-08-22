<?php

namespace App\Models;

use App\Models\User;
use App\Models\Document;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DocumentVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_id','version','storage_path','mime_type','size_bytes','created_by',
    ];

    public function document() {
        return $this->belongsTo(Document::class);
    }

    public function author() {
        return $this->belongsTo(User::class, 'created_by');
    }
}
