<?php

use App\Http\Controllers\CompanyContactController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\CrmSettingsController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\GoogleController;
use App\Http\Controllers\LocalCalendarEventsController;
use App\Http\Controllers\MetaController;
use App\Http\Controllers\ReminderController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;

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

    /**
     * Dashboard
     */
    Route::prefix('tableau-de-bord')->name('dashboard.')->group(function () {
        Route::get('/stats', [DashboardController::class, 'getStats'])->name('stats');
        Route::get('/contacts-by-status', [DashboardController::class, 'getContactsByStatus'])->name('contacts-by-status');
        Route::get('/companies-by-status', [DashboardController::class, 'getCompaniesByStatus'])->name('companies-by-status');
        Route::get('/opportunities-by-stage', [DashboardController::class, 'getOpportunitiesByStage'])->name('opportunities-by-stage');
        Route::get('/contacts-timeline', [DashboardController::class, 'getContactsTimeline'])->name('contacts-timeline');
        Route::get('/documents-timeline', [DashboardController::class, 'getDocumentsTimeline'])->name('documents-timeline');
        Route::get('/recent-activities', [DashboardController::class, 'getRecentActivities'])->name('recent-activities');

        Route::get('/export-pdf', [DashboardController::class, 'exportPdf'])->name('export-pdf');
    });

    Route::prefix('settings')->group(function () {
        Route::get('/', [CrmSettingsController::class, 'index']);
        Route::get('/public', [CrmSettingsController::class, 'public']);
        Route::post('/', [CrmSettingsController::class, 'update']);
        Route::post('/single', [CrmSettingsController::class, 'updateSetting']);
        Route::post('/reset', [CrmSettingsController::class, 'reset']);
    });

    // Current user
    Route::get('/user', function (Request $request) {
        return response()->json($request->user());
    })->name('user.me');

    /**
     * Contacts - Routes CRUD génériques (à utiliser partout)
     * IMPORTANT: Declare "search" BEFORE any parameterized routes to avoid collisions.
     */
    Route::get('/contacts/search', [ContactController::class, 'search']); // ?q=

    // Resource routes (index, store, show, update, destroy)
    Route::apiResource('contacts', ContactController::class)->names([
        'index' => 'contacts.index',
        'store' => 'contacts.store',
        'show' => 'contacts.show',
        'update' => 'contacts.update',
        'destroy' => 'contacts.destroy',
    ]);

    // Constrain parameterized routes to numeric IDs to avoid collisions with "search"

    Route::get('/companies/by-status/{status}', [CompanyController::class, 'getCompaniesByStatus'])
        ->name('companies.by-status');

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
    Route::prefix('local-calendar-events')->name('local-events.')->group(function () {
        Route::get('/', [LocalCalendarEventsController::class, 'getLocalEvents'])->name('index');
        Route::post('/', [LocalCalendarEventsController::class, 'store'])->name('store');
        Route::put('/{event}', [LocalCalendarEventsController::class, 'update'])
            ->whereNumber('event')
            ->name('update');
        Route::delete('/{event}', [LocalCalendarEventsController::class, 'destroy'])
            ->whereNumber('event')
            ->name('destroy');
        
        // Event configuration
        Route::get('/types', [LocalCalendarEventsController::class, 'getEventTypes'])->name('types');
        Route::get('/priorities', [LocalCalendarEventsController::class, 'getPriorityLevels'])->name('priorities');
    });
    
    // Keep backward compatibility with old routes
    Route::get('/events/local', [LocalCalendarEventsController::class, 'getLocalEvents']);
    Route::post('/events/local', [LocalCalendarEventsController::class, 'store']);
    Route::put('/events/local/{event}', [LocalCalendarEventsController::class, 'update'])->whereNumber('event');
    Route::delete('/events/local/{event}', [LocalCalendarEventsController::class, 'destroy'])->whereNumber('event');

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
     * Company-Contact Relations (seulement les opérations spécifiques aux relations)
     */
    // List contacts of a company
    Route::get('/companies/{company}/contacts', [CompanyContactController::class, 'index'])
        ->whereNumber('company')
        ->name('companies.contacts.index');

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
    Route::get('/meta/company-statuses', [MetaController::class, 'companyStatuses']);

    /**
     * Profile
     */
    Route::post('/profil/avatar', [ProfileController::class, 'updateAvatar'])->name('profile.avatar.update');

    /**
     * User Management (Admin only)
     */
    Route::prefix('users')->group(function () {
        Route::get('/', [App\Http\Controllers\UserManagementController::class, 'apiIndex']);
        Route::get('/roles-permissions', [App\Http\Controllers\UserManagementController::class, 'getRolesAndPermissions']);
        Route::get('/{id}', [App\Http\Controllers\UserManagementController::class, 'show']);
        Route::post('/', [App\Http\Controllers\UserManagementController::class, 'store']);
        Route::put('/{id}', [App\Http\Controllers\UserManagementController::class, 'update']);
        Route::put('/{id}/roles', [App\Http\Controllers\UserManagementController::class, 'updateRoles']);
        Route::put('/{id}/permissions', [App\Http\Controllers\UserManagementController::class, 'updatePermissions']);
        Route::post('/{id}/send-verification', [App\Http\Controllers\UserManagementController::class, 'sendVerificationEmail']);
        Route::delete('/{id}', [App\Http\Controllers\UserManagementController::class, 'destroy']);
    });

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

    /**
     * Opportunities (Sales)
     * IMPORTANT: Declare "search" BEFORE any parameterized routes to avoid collisions.
     */
    Route::get('/opportunites/search', [App\Http\Controllers\OpportunityController::class, 'search']);
    
    Route::get('/opportunites', [App\Http\Controllers\OpportunityController::class, 'index'])
        ->name('opportunities.index');
    Route::post('/opportunites', [App\Http\Controllers\OpportunityController::class, 'store'])
        ->name('opportunities.store');
    Route::get('/opportunites/{opportunity}', [App\Http\Controllers\OpportunityController::class, 'show'])
        ->whereNumber('opportunity')
        ->name('opportunities.show');
    Route::put('/opportunites/{opportunity}', [App\Http\Controllers\OpportunityController::class, 'update'])
        ->whereNumber('opportunity')
        ->name('opportunities.update');
    Route::delete('/opportunites/{opportunity}', [App\Http\Controllers\OpportunityController::class, 'destroy'])
        ->whereNumber('opportunity')
        ->name('opportunities.destroy');

    // Opportunity activities
    Route::post('/opportunites/{opportunity}/activites', [App\Http\Controllers\OpportunityController::class, 'addActivity'])
        ->whereNumber('opportunity')
        ->name('opportunities.activities.store');
    Route::post('/opportunites-activites/{activity}/terminer', [App\Http\Controllers\OpportunityController::class, 'completeActivity'])
        ->whereNumber('activity')
        ->name('opportunities.activities.complete');
    
    // Opportunity timeline
    Route::get('/opportunites/{opportunity}/timeline', [App\Http\Controllers\OpportunityTimelineController::class, 'index'])
        ->whereNumber('opportunity')
        ->name('opportunities.timeline');
    Route::post('/opportunites/{opportunity}/timeline/note', [App\Http\Controllers\OpportunityTimelineController::class, 'addQuickNote'])
        ->whereNumber('opportunity')
        ->name('opportunities.timeline.note');
    
    /**
     * Reminders
     * IMPORTANT: Declare "search" BEFORE any parameterized routes to avoid collisions.
     */
    Route::get('/rappels/search', [ReminderController::class, 'search']);
    
    Route::get('/rappels/upcoming', [ReminderController::class, 'apiUpcoming'])
        ->name('reminders.upcoming');
    Route::get('/rappels/count', [ReminderController::class, 'apiCount'])
        ->name('reminders.count');
    Route::post('/rappels/{reminder}/complete', [ReminderController::class, 'complete'])
        ->whereNumber('reminder')
        ->name('reminders.complete');
    Route::post('/rappels/{reminder}/snooze', [ReminderController::class, 'snooze'])
        ->whereNumber('reminder')
        ->name('reminders.snooze');
    
    /**
     * Email Templates
     */
    Route::get('/email-templates', [App\Http\Controllers\EmailTemplateController::class, 'apiIndex'])
        ->name('email-templates.api.index');
    Route::get('/email-templates/{template}/preview', [App\Http\Controllers\EmailTemplateController::class, 'preview'])
        ->whereNumber('template')
        ->name('email-templates.preview');
    Route::post('/email-templates/{template}/send', [App\Http\Controllers\EmailTemplateController::class, 'send'])
        ->whereNumber('template')
        ->name('email-templates.send');
});
