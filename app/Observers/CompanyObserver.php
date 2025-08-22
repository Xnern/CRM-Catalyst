<?php

namespace App\Observers;

use App\Models\Company;
use App\Services\ActivityLogger;

class CompanyObserver
{
    public function created(Company $company): void
    {
        ActivityLogger::companyCreated($company);
    }

    public function updated(Company $company): void
    {
        $changes = $company->getChanges();
        unset($changes['updated_at']);

        if (!empty($changes)) {
            ActivityLogger::companyUpdated($company, $changes);
        }
    }

    public function deleting(Company $company): void
    {
        ActivityLogger::companyDeleted($company->name, $company->id);
    }
}
