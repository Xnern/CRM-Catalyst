<?php

use Inertia\Inertia;
use Illuminate\Support\Facades\Route;
use Illuminate\Foundation\Application;
use App\Http\Controllers\GoogleController;
use App\Http\Controllers\KanbanController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\CompanyController;

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
    // Route pour la page des contacts
    Route::get('/contacts', [ContactController::class, 'indexInertia'])->name('contacts.indexInertia');
    Route::post('/contacts/import', [ContactController::class, 'importCsv'])->name('contacts.import');
    Route::get('/kanban', [KanbanController::class, 'indexInertia'])->name('kanban.indexInertia');
    Route::get('/calendrier', [GoogleController::class, 'indexInertia'])->name('calendar.indexInertia');

    Route::get('/entreprises', [CompanyController::class, 'indexInertia'])->name('companies.indexInertia');
    Route::get('/entreprises/{id}', [CompanyController::class, 'showInertia'])->name('companies.showInertia');
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
