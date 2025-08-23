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

    Route::get('/dashboard', [DashboardController::class, 'indexInertia'])->name('dashboard');

    Route::get('/dashboard/redirect-object/{type}/{id}', [DashboardController::class, 'redirectToObject'])
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
    
    // Import/Export routes
    Route::get('/opportunities/export', [OpportunityExportController::class, 'export'])->name('opportunities.export');
    Route::post('/opportunities/import', [OpportunityExportController::class, 'import'])->name('opportunities.import');
    Route::get('/opportunities/template', [OpportunityExportController::class, 'downloadTemplate'])->name('opportunities.template');
    
    Route::get('/reminders', [ReminderController::class, 'index'])->name('reminders.index');
    Route::post('/reminders', [ReminderController::class, 'store'])->name('reminders.store');
    Route::put('/reminders/{reminder}', [ReminderController::class, 'update'])->name('reminders.update');
    Route::delete('/reminders/{reminder}', [ReminderController::class, 'destroy'])->name('reminders.destroy');
    Route::get('/calendrier', [GoogleController::class, 'indexInertia'])->name('calendar.indexInertia');

    Route::get('/entreprises', [CompanyController::class, 'indexInertia'])->name('companies.indexInertia');
    Route::get('/entreprises/{id}', [CompanyController::class, 'showInertia'])->name('companies.showInertia');
    Route::get('/documents', [DocumentController::class, 'indexInertia'])->name('documents.indexInertia');

    // User Management (Admin only)
    Route::get('/utilisateurs', [App\Http\Controllers\UserManagementController::class, 'index'])->name('users.index');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/password', [ProfileController::class, 'updatePassword'])->name('password.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Opportunities (Sales)
    Route::resource('opportunities', OpportunityController::class);
    Route::post('/opportunities/{opportunity}/activities', [OpportunityController::class, 'addActivity'])->name('opportunities.activities.store');
    Route::patch('/activities/{activity}/complete', [OpportunityController::class, 'completeActivity'])->name('activities.complete');
});

require __DIR__.'/auth.php';
