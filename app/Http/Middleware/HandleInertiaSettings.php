<?php

namespace App\Http\Middleware;

use App\Helpers\SettingsHelper;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class HandleInertiaSettings
{
    public function handle(Request $request, Closure $next): Response
    {
        // Share settings with all Inertia views
        Inertia::share([
            'appSettings' => SettingsHelper::getSettingsForFrontend(),
        ]);

        return $next($request);
    }
}
