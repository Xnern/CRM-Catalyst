<?php

namespace App\Providers;

use App\Services\SettingsService;
use Illuminate\Support\ServiceProvider;

class SettingsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton('settings', function ($app) {
            return SettingsService::getInstance();
        });
    }

    public function boot(): void
    {
        //
    }
}
