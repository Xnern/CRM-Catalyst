<?php

namespace App\Http\Controllers;

use Exception;
use Google\Client;
use App\Models\User;
use Google\Service\Oauth2;
use Google\Service\Calendar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Google\Service\Exception as GoogleServiceException;
use Google\Exception as GoogleClientException;
use Carbon\Carbon;

class GoogleAuthController extends Controller
{
    /**
     * Redirect the user to the Google authentication page.
     */
    public function redirectToGoogle()
    {
        $client = new Client();
        $client->setClientId(config('services.google.client_id'));
        $client->setClientSecret(config('services.google.client_secret'));
        $client->setRedirectUri(config('services.google.redirect_uri'));
        $client->addScope(Calendar::CALENDAR);
        $client->addScope(Oauth2::USERINFO_EMAIL);
        $client->addScope(Oauth2::USERINFO_PROFILE);
        $client->setAccessType('offline');
        $client->setPrompt('consent');

        $authUrl = $client->createAuthUrl();
        return response()->json(['auth_url' => $authUrl]);
    }

    /**
     * Obtain the user information from Google and handle login/registration/linking.
     */
    public function handleGoogleCallback(Request $request)
    {
        Log::info('handleGoogleCallback: Début du traitement.');

        // --- LOGS DE DÉBOGAGE CLÉS ---
        Log::info('DEBUG: Auth::check() au début du callback: ' . (Auth::check() ? 'TRUE' : 'FALSE'));
        if (Auth::check()) {
            Log::info('DEBUG: Utilisateur actuellement authentifié ID: ' . Auth::id() . ' Email: ' . Auth::user()->email);
            Log::info('DEBUG: Utilisateur actuellement authentifié Google ID: ' . (Auth::user()->google_id ?? 'N/A'));
            Log::info('DEBUG: Utilisateur actuellement authentifié Google Email: ' . (Auth::user()->google_email ?? 'N/A'));
        }
        Log::info('DEBUG: Requête Google Callback Code: ' . $request->get('code', 'N/A'));
        Log::info('DEBUG: Requête Google Callback Error: ' . $request->get('error', 'N/A'));
        // --- FIN DES LOGS DE DÉBOGAGE ---


        if ($request->has('error')) {
            $errorMessage = $request->get('error_description') ?: $request->get('error');
            Log::error('Google OAuth Callback Error: ' . $errorMessage);
            return redirect(env('APP_URL', 'http://127.0.0.1:8000') . '/calendrier?google_auth=failed&message=' . urlencode($errorMessage));
        }

        if (!$request->has('code')) {
            Log::error('Google OAuth Callback: "code" parameter missing.');
            return redirect(env('APP_URL', 'http://127.0.0.1:8000') . '/calendrier?google_auth=failed&message=Authorization code missing.');
        }

        try {
            $client = new Client();
            $client->setClientId(config('services.google.client_id'));
            $client->setClientSecret(config('services.google.client_secret'));
            $client->setRedirectUri(config('services.google.redirect_uri'));

            $accessToken = $client->fetchAccessTokenWithAuthCode($request->get('code'));

            if (!isset($accessToken['access_token'])) {
                Log::error('Google Auth Error: Access token not found in response from Google.', ['response' => $accessToken]);
                return redirect(env('APP_URL', 'http://127.0.0.1:8000') . '/calendrier?google_auth=failed&message=Failed to retrieve access token from Google.');
            }

            $client->setAccessToken($accessToken);
            $oauth2 = new Oauth2($client);
            $googleUser = $oauth2->userinfo->get();

            Log::info('Google User Info retrieved:', ['email' => $googleUser->email, 'id' => $googleUser->id]);

            // --- LOGS DE DÉBOGAGE CLÉS APRÈS RÉCUPÉRATION INFOS GOOGLE ---
            Log::info('DEBUG: Google User Email: ' . $googleUser->email);
            Log::info('DEBUG: Google User ID: ' . $googleUser->id);
            // --- FIN DES LOGS DE DÉBOGAGE ---

            $user = null; // L'utilisateur que nous allons authentifier ou mettre à jour

            // --- SCÉNARIO 1 : L'utilisateur est DÉJÀ CONNECTÉ à l'application CRM ---
            // C'est le cas de "lier mon compte Google à mon compte CRM existant"
            if (Auth::check()) {
                $user = Auth::user();
                Log::info('SCENARIO: User already authenticated (ID: ' . $user->id . '). Attempting to link Google account.');

                // Vérifier si ce compte Google n'est pas déjà lié à un autre compte utilisateur
                $existingGoogleLink = User::where('google_id', $googleUser->id)->first();
                if ($existingGoogleLink && $existingGoogleLink->id !== $user->id) {
                    Log::warning('Google Auth: Google account (ID: ' . $googleUser->id . ') is already linked to another user (ID: ' . $existingGoogleLink->id . ').');
                    return redirect(env('APP_URL', 'http://127.0.0.1:8000') . '/calendrier?google_auth=failed&message=' . urlencode('Ce compte Google est déjà lié à un autre utilisateur. Veuillez le délier de cet autre compte d\'abord.'));
                }

                // Mettre à jour les infos Google de l'utilisateur connecté
                $user->google_id = $googleUser->id;
                $user->google_email = $googleUser->email; // Stocker l'email Google
                $user->google_access_token = json_encode($accessToken);
                // Gérer le refresh token
                if (isset($accessToken['refresh_token'])) {
                    $user->google_refresh_token = $accessToken['refresh_token'];
                    Log::info('Google Auth: New refresh token obtained and set for user ID: ' . $user->id);
                } else {
                    Log::info('Google Auth: No new refresh token provided, keeping existing one if any for user ID: ' . $user->id);
                }
                $user->google_expires_at = Carbon::now()->addSeconds($accessToken['expires_in']);
                $user->save();
                Log::info('Google Auth: Google account successfully linked and tokens saved for user ID: ' . $user->id);

                return redirect(env('APP_URL', 'http://127.0.0.1:8000') . '/calendrier?google_auth=success&message=' . urlencode('Votre compte Google a été lié avec succès !'));

            } else {
                // --- SCÉNARIO 2 : L'utilisateur n'est PAS CONNECTÉ à l'application CRM ---
                // C'est le cas de "se connecter / s'inscrire via Google"

                Log::info('SCENARIO: User NOT authenticated. Attempting to login/register via Google.');

                // 2a. Tenter de trouver l'utilisateur par son google_id (si déjà lié)
                $user = User::where('google_id', $googleUser->id)->first();

                if ($user) {
                    Log::info('Google Auth: User found by google_id (ID: ' . $user->id . '). Logging in.');
                    // Mettre à jour les tokens (car la session Google est nouvelle)
                    $user->google_access_token = json_encode($accessToken);
                    if (isset($accessToken['refresh_token'])) {
                        $user->google_refresh_token = $accessToken['refresh_token'];
                    }
                    $user->google_expires_at = Carbon::now()->addSeconds($accessToken['expires_in']);
                    $user->save();
                } else {
                    // 2b. L'utilisateur n'a pas été trouvé par google_id.
                    // Chercher par l'email Google dans la colonne 'email' OU 'google_email'
                    // C'est ici que votre cas d'e-mail CRM différent de l'e-mail Google doit être géré.
                    $user = User::where('email', $googleUser->email) // Correspondance sur l'email principal (moins probable si différent)
                                ->orWhere('google_email', $googleUser->email) // Correspondance sur l'email Google stocké
                                ->first();

                    if ($user) {
                        Log::info('Google Auth: User found by email/google_email (ID: ' . $user->id . '). Linking Google ID.');
                        // Mettre à jour le google_id et les tokens pour ce compte existant
                        $user->google_id = $googleUser->id;
                        $user->google_email = $googleUser->email; // Assurer que l'email Google est enregistré
                        $user->google_access_token = json_encode($accessToken);
                        if (isset($accessToken['refresh_token'])) {
                            $user->google_refresh_token = $accessToken['refresh_token'];
                        }
                        $user->google_expires_at = Carbon::now()->addSeconds($accessToken['expires_in']);
                        $user->save();
                    } else {
                        // Option B (si pas trouvé par google_id ni par email/google_email, on crée)
                        Log::info('Google Auth: User not found by any criteria. Creating new user.');
                        $user = User::create([
                            'name' => $googleUser->name,
                            'email' => $googleUser->email, // L'email Google devient l'email principal pour le nouveau compte
                            'google_id' => $googleUser->id,
                            'google_email' => $googleUser->email, // Stocke aussi l'email Google
                            'password' => bcrypt(uniqid()), // Mot de passe aléatoire
                        ]);
                        Log::info('Google Auth: New user created with ID: ' . $user->id);
                    }
                }

                // Connecter l'utilisateur (qu'il ait été trouvé ou créé)
                Auth::login($user);
                Log::info('Google Auth: User ' . $user->id . ' successfully logged in to Laravel.');
                return redirect(env('APP_URL', 'http://127.0.0.1:8000') . '/calendrier?google_auth=success');
            }

        } catch (GoogleServiceException $e) {
            Log::error('Google Service Error in handleGoogleCallback: ' . $e->getMessage() . ' Code: ' . $e->getCode() . ' Trace: ' . $e->getTraceAsString());
            return redirect(env('APP_URL', 'http://127.0.0.1:8000') . '/calendrier?google_auth=error&message=' . urlencode('Erreur de service Google: ' . $e->getMessage()));
        } catch (GoogleClientException $e) {
            Log::error('Google Client Error in handleGoogleCallback: ' . $e->getMessage() . ' Code: ' . $e->getCode() . ' Trace: ' . $e->getTraceAsString());
            return redirect(env('APP_URL', 'http://127.0.0.1:8000') . '/calendrier?google_auth=error&message=' . urlencode('Erreur de connexion Google: ' . $e->getMessage()));
        } catch (Exception $e) {
            Log::error('General Exception in handleGoogleCallback: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return redirect(env('APP_URL', 'http://127.0.0.1:8000') . '/calendrier?google_auth=error&message=' . urlencode('Une erreur inattendue est survenue: ' . $e->getMessage()));
        }
    }
}
