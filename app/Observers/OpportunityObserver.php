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
        // Ne pas créer de log ici car le trait LogsActivity le fait déjà
        // On pourrait ajouter un log plus détaillé si nécessaire, mais pour éviter
        // la duplication, on laisse le trait gérer la création basique
    }

    /**
     * Handle the Opportunity "updated" event.
     */
    public function updated(Opportunity $opportunity): void
    {
        // Le trait LogsActivity gère déjà les logs de mise à jour
    }

    /**
     * Handle the Opportunity "deleted" event.
     */
    public function deleted(Opportunity $opportunity): void
    {
        // Le trait LogsActivity gère déjà les logs de suppression
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
