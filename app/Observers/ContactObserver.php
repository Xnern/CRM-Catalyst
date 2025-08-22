<?php

namespace App\Observers;

use App\Models\Contact;
use App\Services\ActivityLogger;

class ContactObserver
{
    public function created(Contact $contact): void
    {
        ActivityLogger::contactCreated($contact);
    }

    public function updated(Contact $contact): void
    {
        $changes = $contact->getChanges();
        unset($changes['updated_at']); // Ne pas logger updated_at

        if (!empty($changes)) {
            ActivityLogger::contactUpdated($contact, $changes);
        }
    }

    public function deleting(Contact $contact): void
    {
        ActivityLogger::contactDeleted($contact->name, $contact->id);
    }
}
