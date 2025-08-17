<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;

use App\Models\User;

use App\Http\Controllers\MetaController;
use App\Http\Controllers\GoogleController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\CompanyContactController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\LocalCalendarEventsController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| These routes are loaded by the RouteServiceProvider within a group
| which is assigned the "api" middleware group.
*/

/**
 * CSRF cookie for SPAs (Sanctum).
 * Note: In production, use Sanctum's built-in /sanctum/csrf-cookie controller.
 */
Route::get('/sanctum/csrf-cookie', function (Request $request) {
    return response()->noContent();
});

/**
 * Register
 */
Route::post('/register', function (Request $request) {
    $request->validate([
        'name' => ['required', 'string', 'max:255'],
        'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
        'password' => ['required', 'string', 'min:8', 'confirmed'],
    ]);

    $user = User::create([
        'name' => $request->string('name'),
        'email' => $request->string('email'),
        'password' => bcrypt($request->string('password')),
    ]);

    Auth::login($user);

    return response()->json([
        'message' => 'User registered and logged in successfully!',
        'user' => $user,
    ]);
})->name('auth.register');

/**
 * Login
 */
Route::post('/login', function (Request $request) {
    $request->validate([
        'email' => ['required', 'email'],
        'password' => ['required'],
    ]);

    if (! Auth::attempt($request->only('email', 'password'), $request->boolean('remember'))) {
        throw ValidationException::withMessages([
            'email' => ["Les informations d'identification fournies sont incorrectes."],
        ]);
    }

    $request->session()->regenerate();

    return response()->json([
        'message' => 'Logged in successfully!',
        'user' => Auth::user(),
    ]);
})->name('auth.login');

/**
 * Logout (protected)
 */
Route::post('/logout', function (Request $request) {
    Auth::guard('web')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();

    return response()->json(['message' => 'Logged out successfully!']);
})->middleware('auth:sanctum')->name('auth.logout');

/**
 * Protected API routes
 */
Route::middleware('auth:sanctum')->group(function () {
    // Current user
    Route::get('/user', function (Request $request) {
        return response()->json($request->user());
    })->name('user.me');

    /**
     * Contacts
     * IMPORTANT: Declare "search" BEFORE any parameterized routes to avoid collisions.
     */
    Route::get('/contacts/search', [ContactController::class, 'search']); // ?q=

    // Resource routes (index, store, show, update, destroy)
    Route::apiResource('contacts', ContactController::class)->names([
        'index'   => 'contacts.index',
        'store'   => 'contacts.store',
        'show'    => 'contacts.show',
        'update'  => 'contacts.update',
        'destroy' => 'contacts.destroy',
    ]);

    // Constrain parameterized routes to numeric IDs to avoid collisions with "search"
    Route::put('/contacts/{contact}/status', [ContactController::class, 'updateStatus'])
        ->whereNumber('contact')
        ->name('contacts.update-status');

    Route::get('/contacts/by-status/{status}', [ContactController::class, 'getContactsByStatus'])
        ->name('contacts.by-status');

    /**
     * Google Calendar
     */
    Route::prefix('google-calendar')->name('google.')->group(function () {
        Route::post('/logout', [GoogleAuthController::class, 'logout'])->name('logout');
        Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirectToGoogle'])->name('redirect');

        Route::get('/events', [GoogleController::class, 'getGoogleCalendarEvents'])->name('events.index');
        Route::post('/events', [GoogleController::class, 'createGoogleCalendarEvent'])->name('events.store');
        Route::put('/events/{eventId}', [GoogleController::class, 'updateGoogleCalendarEvent'])
            ->whereNumber('eventId')
            ->name('events.update');
        Route::delete('/events/{eventId}', [GoogleController::class, 'deleteGoogleCalendarEvent'])
            ->whereNumber('eventId')
            ->name('events.destroy');
    });

    /**
     * Local events
     */
    Route::get('/events/local', [LocalCalendarEventsController::class, 'getLocalEvents'])->name('local-events.index');
    Route::post('/events/local', [LocalCalendarEventsController::class, 'store'])->name('local-events.store');
    Route::put('/events/local/{event}', [LocalCalendarEventsController::class, 'update'])
        ->whereNumber('event')
        ->name('local-events.update');
    Route::delete('/events/local/{event}', [LocalCalendarEventsController::class, 'destroy'])
        ->whereNumber('event')
        ->name('local-events.destroy');

    /**
     * Companies (CRUD)
     * IMPORTANT: Declare "search" BEFORE any parameterized routes to avoid collisions.
     */
    Route::get('/companies/search', [CompanyController::class, 'search']); // ?q=

    Route::get('/companies', [CompanyController::class, 'index'])->name('companies.index');
    Route::post('/companies', [CompanyController::class, 'store'])->name('companies.store');

    Route::get('/companies/{company}', [CompanyController::class, 'show'])
        ->whereNumber('company')
        ->name('companies.show');
    Route::put('/companies/{company}', [CompanyController::class, 'update'])
        ->whereNumber('company')
        ->name('companies.update');
    Route::delete('/companies/{company}', [CompanyController::class, 'destroy'])
        ->whereNumber('company')
        ->name('companies.destroy');

    /**
     * Company-scoped contacts (no collisions; all routes named for Ziggy)
     */
    Route::get('/companies/{company}/contacts', [CompanyContactController::class, 'index'])
        ->whereNumber('company')
        ->name('companies.contacts.index');

    Route::post('/companies/{company}/contacts', [CompanyContactController::class, 'store'])
        ->whereNumber('company')
        ->name('companies.contacts.store');

    Route::get('/companies/{company}/contacts/{contact}', [CompanyContactController::class, 'show'])
        ->whereNumber('company')
        ->whereNumber('contact')
        ->name('companies.contacts.show');

    Route::put('/companies/{company}/contacts/{contact}', [CompanyContactController::class, 'update'])
        ->whereNumber('company')
        ->whereNumber('contact')
        ->name('companies.contacts.update');

    Route::delete('/companies/{company}/contacts/{contact}', [CompanyContactController::class, 'destroy'])
        ->whereNumber('company')
        ->whereNumber('contact')
        ->name('companies.contacts.destroy');

    // Attach existing contact to company (body: { contact_id })
    Route::post('/companies/{company}/contacts/attach', [CompanyContactController::class, 'attach'])
        ->whereNumber('company')
        ->name('companies.contacts.attach');

    // Detach a contact from company (set company_id to null)
    Route::post('/companies/{company}/contacts/{contact}/detach', [CompanyContactController::class, 'detach'])
        ->whereNumber('company')
        ->whereNumber('contact')
        ->name('companies.contacts.detach');

    /**
     * Meta
     */
    Route::get('/meta/contact-statuses', [MetaController::class, 'contactStatuses']);
    Route::get('/meta/company-statuses', [MetaController::class, 'companyStatuses']);

    /**
     * Documents
     */
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::get('/documents/{document}', [DocumentController::class, 'show'])
        ->whereNumber('document');
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::patch('/documents/{document}', [DocumentController::class, 'update'])
        ->whereNumber('document');
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy'])
        ->whereNumber('document');

    Route::get('/documents/{document}/download', [DocumentController::class, 'download'])
        ->whereNumber('document');

    Route::get('/documents/{document}/preview', [DocumentController::class, 'preview'])
        ->whereNumber('document');

    Route::post('/documents/{document}/links', [DocumentController::class, 'attachLink'])
        ->whereNumber('document');
    Route::delete('/documents/{document}/unlinks', [DocumentController::class, 'detachLink'])
        ->whereNumber('document');

    // Optional versions
    Route::post('/documents/{document}/versions', [DocumentController::class, 'storeVersion'])
        ->whereNumber('document');
    Route::get('/documents/{document}/versions', [DocumentController::class, 'listVersions'])
        ->whereNumber('document');
});
