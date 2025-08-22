<?php

namespace App\Providers;

use App\Models\Company;
use App\Models\Contact;
use App\Models\Document;
use App\Policies\ContactPolicy;
use App\Observers\CompanyObserver;
use App\Observers\ContactObserver;
use App\Observers\DocumentObserver;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Spatie\QueryBuilder\QueryBuilderRequest;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
        Gate::policy(Contact::class, ContactPolicy::class);
        Contact::observe(ContactObserver::class);
        Company::observe(CompanyObserver::class);
        Document::observe(DocumentObserver::class);
    }
}
