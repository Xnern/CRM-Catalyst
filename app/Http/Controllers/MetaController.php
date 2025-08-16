<?php

namespace App\Http\Controllers;

use App\Enums\CompanyStatus;
use App\Enums\ContactStatus;

class MetaController extends Controller
{
    /**
     * Return status of contact in form: [{value, label}, ...]
     */
    public function contactStatuses()
    {
        return response()->json([
            'data' => ContactStatus::options(),
        ]);
    }

    public function companyStatuses()
    {
        return response()->json([
            'data' => CompanyStatus::options(),
        ]);
    }
}
