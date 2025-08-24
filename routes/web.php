<?php

use App\Http\Controllers\CompanyController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\CrmSettingsController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\GoogleController;
use App\Http\Controllers\KanbanController;
use App\Http\Controllers\ReminderController;
use App\Http\Controllers\OpportunityController;
use App\Http\Controllers\OpportunityExportController;
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/auth/google/callback', [GoogleAuthController::class, 'handleGoogleCallback'])->name('google.callback');

Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('/tableau-de-bord', [DashboardController::class, 'indexInertia'])->name('dashboard');

    Route::get('/tableau-de-bord/redirection-objet/{type}/{id}', [DashboardController::class, 'redirectToObject'])
        ->name('dashboard.redirect-object')
        ->whereNumber('id');

    Route::get('/parametres', [CrmSettingsController::class, 'indexInertia'])->name('settings.indexInertia');

    // Route pour la page des contacts
    Route::get('/contacts', [ContactController::class, 'indexInertia'])->name('contacts.indexInertia');
    Route::get('/contacts/{id}', [ContactController::class, 'showInertia'])
        ->whereNumber('id')
        ->name('contacts.showInertia');
    Route::post('/contacts/import', [ContactController::class, 'importCsv'])->name('contacts.import');
    Route::get('/kanban', [KanbanController::class, 'indexInertia'])->name('kanban.indexInertia');
    Route::get('/kanban/stats', [KanbanController::class, 'stats'])->name('kanban.stats');
    Route::get('/previsions', [App\Http\Controllers\ForecastController::class, 'index'])->name('forecast.index');
    
    // Import/Export routes
    Route::get('/opportunites/exporter', [OpportunityExportController::class, 'export'])->name('opportunities.export');
    Route::post('/opportunites/importer', [OpportunityExportController::class, 'import'])->name('opportunities.import');
    Route::get('/opportunites/modele', [OpportunityExportController::class, 'downloadTemplate'])->name('opportunities.template');
    
    Route::get('/rappels', [ReminderController::class, 'index'])->name('reminders.index');
    Route::post('/rappels', [ReminderController::class, 'store'])->name('reminders.store');
    Route::put('/rappels/{reminder}', [ReminderController::class, 'update'])->name('reminders.update');
    Route::delete('/rappels/{reminder}', [ReminderController::class, 'destroy'])->name('reminders.destroy');
    
    // Email Templates
    Route::get('/modeles-email', [App\Http\Controllers\EmailTemplateController::class, 'index'])->name('email-templates.index');
    Route::post('/modeles-email', [App\Http\Controllers\EmailTemplateController::class, 'store'])->name('email-templates.store');
    Route::put('/modeles-email/{template}', [App\Http\Controllers\EmailTemplateController::class, 'update'])->name('email-templates.update');
    Route::delete('/modeles-email/{template}', [App\Http\Controllers\EmailTemplateController::class, 'destroy'])->name('email-templates.destroy');
    Route::post('/modeles-email/{template}/dupliquer', [App\Http\Controllers\EmailTemplateController::class, 'duplicate'])->name('email-templates.duplicate');
    Route::get('/calendrier', [GoogleController::class, 'indexInertia'])->name('calendar.indexInertia');

    Route::get('/entreprises', [CompanyController::class, 'indexInertia'])->name('companies.indexInertia');
    Route::get('/entreprises/{id}', [CompanyController::class, 'showInertia'])->name('companies.showInertia');
    Route::get('/documents', [DocumentController::class, 'indexInertia'])->name('documents.indexInertia');

    // User Management (Admin only)
    Route::get('/utilisateurs', [App\Http\Controllers\UserManagementController::class, 'index'])->name('users.index');
});

Route::middleware('auth')->group(function () {
    Route::get('/profil', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profil', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/mot-de-passe', [ProfileController::class, 'updatePassword'])->name('password.update');
    Route::delete('/profil', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Opportunities (Sales)
    Route::resource('opportunites', OpportunityController::class, [
        'names' => [
            'index' => 'opportunities.index',
            'create' => 'opportunities.create',
            'store' => 'opportunities.store',
            'show' => 'opportunities.show',
            'edit' => 'opportunities.edit',
            'update' => 'opportunities.update',
            'destroy' => 'opportunities.destroy'
        ],
        'parameters' => [
            'opportunites' => 'opportunity'
        ]
    ]);
    Route::post('/opportunites/{opportunity}/dupliquer', [OpportunityController::class, 'duplicate'])->name('opportunities.duplicate');
    Route::post('/opportunites/{opportunity}/activites', [OpportunityController::class, 'addActivity'])->name('opportunities.activities.store');
    Route::patch('/activites/{activity}/terminer', [OpportunityController::class, 'completeActivity'])->name('activities.complete');
});

require __DIR__.'/auth.php';
