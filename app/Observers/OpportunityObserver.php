<?php

namespace App\Observers;

use App\Models\Opportunity;
use App\Services\ActivityLogger;

class OpportunityObserver
{
    /**
     * Handle the Opportunity "created" event.
     */
    public function created(Opportunity $opportunity): void
    {
        // Don't create log here as the LogsActivity trait already handles it
        // We could add a more detailed log if necessary, but to avoid
        // duplication, we let the trait handle basic creation
    }

    /**
     * Handle the Opportunity "updated" event.
     */
    public function updated(Opportunity $opportunity): void
    {
        // The LogsActivity trait already handles update logs
    }

    /**
     * Handle the Opportunity "deleted" event.
     */
    public function deleted(Opportunity $opportunity): void
    {
        // The LogsActivity trait already handles deletion logs
    }

    /**
     * Handle the Opportunity "restored" event.
     */
    public function restored(Opportunity $opportunity): void
    {
        //
    }

    /**
     * Handle the Opportunity "force deleted" event.
     */
    public function forceDeleted(Opportunity $opportunity): void
    {
        //
    }
}
