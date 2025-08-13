<?php

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GoogleController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\GoogleAuthController;
use Illuminate\Validation\ValidationException;
use App\Http\Controllers\LocalCalendarEventsController;

// Route pour obtenir le CSRF cookie (important pour les SPAs)
Route::get('/sanctum/csrf-cookie', function (Request $request) {
    return response()->noContent();
});

// Route d'enregistrement
Route::post('/register', function (Request $request) {
    $request->validate([
        'name' => ['required', 'string', 'max:255'],
        'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
        'password' => ['required', 'string', 'min:8', 'confirmed'],
    ]);

    $user = User::create([
        'name' => $request->name,
        'email' => $request->email,
        'password' => bcrypt($request->password),
    ]);

    Auth::login($user); // Connecter l'utilisateur après l'enregistrement

    return response()->json(['message' => 'User registered and logged in successfully!', 'user' => $user]);
});

// Route de connexion
Route::post('/login', function (Request $request) {
    $request->validate([
        'email' => ['required', 'email'],
        'password' => ['required'],
    ]);

    if (!Auth::attempt($request->only('email', 'password'), $request->boolean('remember'))) {
        throw ValidationException::withMessages([
            'email' => ['Les informations d\'identification fournies sont incorrectes.'],
        ]);
    }

    $request->session()->regenerate(); // Régénérer la session pour la sécurité

    return response()->json(['message' => 'Logged in successfully!', 'user' => Auth::user()]);
});

// Route de déconnexion (protégée)
Route::post('/logout', function (Request $request) {
    Auth::guard('web')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();

    return response()->json(['message' => 'Logged out successfully!']);
})->middleware('auth:sanctum'); // Nécessite d'être authentifié pour se déconnecter

Route::middleware('auth:sanctum')->group(function () {
    // Rouute for user
    Route::get('/user', function (Request $request) {
        return response()->json($request->user());
    });


    Route::apiResource('contacts', ContactController::class);
    Route::put('/contacts/{contact}/status', [ContactController::class, 'updateStatus']);
    Route::get('/contacts/by-status/{status}', [ContactController::class, 'getContactsByStatus']);

    Route::prefix('google-calendar')->group(function () {
        Route::post('/logout', [GoogleAuthController::class, 'logout'])->name('google.logout'); // NOUVELLE ROUTE
        Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirectToGoogle'])->name('google.redirect');
        Route::get('/events', [GoogleController::class, 'getGoogleCalendarEvents']);
        Route::post('/events', [GoogleController::class, 'createGoogleCalendarEvent']);
        Route::put('/events/{eventId}', [GoogleController::class, 'updateGoogleCalendarEvent']);
        Route::delete('/events/{eventId}', [GoogleController::class, 'deleteGoogleCalendarEvent']);
    });

    Route::get('/events/local', [LocalCalendarEventsController::class, 'getLocalEvents']);
    Route::post('/events/local', [LocalCalendarEventsController::class, 'store']);
    Route::put('/events/local/{event}', [LocalCalendarEventsController::class, 'update']);
    Route::delete('/events/local/{event}', [LocalCalendarEventsController::class, 'destroy']);

    // Route for company
    Route::get('/companies', [CompaniesController::class, 'index']);
    Route::post('/companies', [CompaniesController::class, 'store']);
    Route::get('/companies/{company}', [CompaniesController::class, 'show']);
    Route::put('/companies/{company}', [CompaniesController::class, 'update']);
    Route::delete('/companies/{company}', [CompaniesController::class, 'destroy']);
    
    Route::get('/companies/{company}/contacts', [CompaniesController::class, 'contacts']);

});
