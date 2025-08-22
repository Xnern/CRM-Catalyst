<?php

namespace App\Observers;

use App\Models\Document;
use App\Services\ActivityLogger;

class DocumentObserver
{
    public function created(Document $document): void
    {
        ActivityLogger::documentUploaded($document);
    }

    public function deleting(Document $document): void
    {
        ActivityLogger::documentDeleted($document->name, $document->id);
    }
}
