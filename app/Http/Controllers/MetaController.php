<?php

namespace App\Http\Controllers;

use App\Enums\CompanyStatus;

class MetaController extends Controller
{
    public function companyStatuses()
    {
        return response()->json([
            'data' => CompanyStatus::options(),
        ]);
    }
}
