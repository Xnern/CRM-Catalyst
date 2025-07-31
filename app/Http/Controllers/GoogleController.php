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

class GoogleController extends Controller
{
    /**
     * Display the Google Calendar page.
     */
    public function indexInertia()
    {
        return inertia('Calendar/Index');
    }

    /**
     * Get Google Calendar events for the authenticated user.
     */
    public function getGoogleCalendarEvents(Request $request)
    {
        $user = Auth::user();
        Log::info('getGoogleCalendarEvents: Attempting to fetch events for user ID: ' . ($user ? $user->id : 'N/A'));

        if (!$user || !$user->google_access_token) {
            Log::error('getGoogleCalendarEvents: User not connected or Google access_token missing.');
            return response()->json(['message' => 'Google account not connected.'], 403);
        }

        try {
            $client = new Client();
            $client->setClientId(config('services.google.client_id'));
            $client->setClientSecret(config('services.google.client_secret'));

            $accessTokenData = json_decode($user->google_access_token, true);

            if (!is_array($accessTokenData) || !isset($accessTokenData['access_token'])) {
                Log::error('getGoogleCalendarEvents: Stored Google access_token is invalid or malformed JSON.');
                return response()->json(['message' => 'Stored Google access token is invalid or corrupted.'], 401);
            }

            $client->setAccessToken($accessTokenData);
            Log::info('getGoogleCalendarEvents: Access token set from decoded JSON.');

            Log::info('getGoogleCalendarEvents: Is Access Token expired? ' . ($client->isAccessTokenExpired() ? 'YES' : 'NO'));
            Log::info('getGoogleCalendarEvents: Refresh Token available? ' . ($user->google_refresh_token ? 'YES' : 'NO'));

            if ($client->isAccessTokenExpired()) {
                Log::info('getGoogleCalendarEvents: Access Token expired. Attempting to refresh.');
                if ($user->google_refresh_token) {
                    try {
                        $client->fetchAccessTokenWithRefreshToken($user->google_refresh_token);
                        $newAccessToken = $client->getAccessToken();
                        // Google's client might not return refresh_token in subsequent calls,
                        // so we persist the original one if not provided.
                        $newAccessToken['refresh_token'] = $newAccessToken['refresh_token'] ?? $user->google_refresh_token;

                        $user->google_access_token = json_encode($newAccessToken);
                        $user->google_refresh_token = $newAccessToken['refresh_token'];
                        $user->google_expires_at = Carbon::now()->addSeconds($newAccessToken['expires_in']);
                        $user->save();
                        $client->setAccessToken($newAccessToken);
                        Log::info('getGoogleCalendarEvents: Access Token refreshed and updated successfully.');
                    } catch (Exception $e) {
                        Log::error('getGoogleCalendarEvents: Error refreshing token: ' . $e->getMessage());
                        return response()->json(['message' => 'Google refresh token invalid. Please re-authenticate.', 'error_details' => $e->getMessage()], 401);
                    }
                } else {
                    Log::error('getGoogleCalendarEvents: Google refresh token missing for user ' . $user->id . '. User needs to re-authenticate.');
                    return response()->json(['message' => 'Google refresh token missing. Please re-authenticate.'], 401);
                }
            }

            $service = new Calendar($client);
            $calendarId = 'primary';

            $optParams = [
                'orderBy' => 'startTime',
                'singleEvents' => true,
                'timeMin' => Carbon::now()->subMonth()->toRfc3339String(),
                'timeMax' => Carbon::now()->addMonths(6)->toRfc3339String(),
            ];
            $results = $service->events->listEvents($calendarId, $optParams);
            $events = $results->getItems();

            return response()->json($events);

        } catch (Exception $e) {
            Log::error('Google Calendar API Error in getGoogleCalendarEvents: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return response()->json(['message' => 'Failed to retrieve Google Calendar events.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create a Google Calendar event.
     */
    public function createGoogleCalendarEvent(Request $request)
    {
        $user = Auth::user();
        if (!$user || !$user->google_access_token) {
            return response()->json(['message' => 'Google account not connected.'], 403);
        }

        $validated = $request->validate([
            'summary' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_datetime' => 'required|date',
            'end_datetime' => 'required|date|after_or_equal:start_datetime',
            'attendees' => 'nullable|array',
            'attendees.*.email' => 'required_with:attendees|email',
            'location' => 'nullable|string|max:255', // Added location field
        ]);

        try {
            $client = new Client();
            $client->setClientId(config('services.google.client_id'));
            $client->setClientSecret(config('services.google.client_secret'));

            $accessTokenData = json_decode($user->google_access_token, true);

            if (!is_array($accessTokenData) || !isset($accessTokenData['access_token'])) {
                Log::error('createGoogleCalendarEvent: Stored Google access_token is invalid or malformed JSON.');
                return response()->json(['message' => 'Stored Google access token is invalid or corrupted.'], 401);
            }
            $client->setAccessToken($accessTokenData);

            if ($client->isAccessTokenExpired()) {
                 if ($user->google_refresh_token) {
                    $client->fetchAccessTokenWithRefreshToken($user->google_refresh_token);
                    $newAccessToken = $client->getAccessToken();
                    $newAccessToken['refresh_token'] = $newAccessToken['refresh_token'] ?? $user->google_refresh_token;

                    $user->google_access_token = json_encode($newAccessToken);
                    $user->google_refresh_token = $newAccessToken['refresh_token'];
                    $user->google_expires_at = Carbon::now()->addSeconds($newAccessToken['expires_in']);
                    $user->save();
                    $client->setAccessToken($newAccessToken);
                } else {
                    return response()->json(['message' => 'Google refresh token missing or expired. Re-authenticate.'], 401);
                }
            }

            $service = new Calendar($client);
            $calendarId = 'primary';

            $event = new \Google_Service_Calendar_Event([
                'summary' => $validated['summary'],
                'description' => $validated['description'] ?? null,
                'location' => $validated['location'] ?? null, // Added location
            ]);

            // Determine if it's an all-day event or a timed event
            $isAllDay = (substr($validated['start_datetime'], 10, 1) === 'T') ? false : true;

            if ($isAllDay) {
                // For all-day events, Google expects 'date' format (YYYY-MM-DD)
                // And the end date should be exclusive, meaning the day AFTER the last day.
                $startDate = (new Carbon($validated['start_datetime']))->toDateString();
                $endDate = (new Carbon($validated['end_datetime']))->addDay()->toDateString(); // Google Calendar end date for all-day is exclusive
                $event->setStart(new \Google_Service_Calendar_EventDateTime(['date' => $startDate]));
                $event->setEnd(new \Google_Service_Calendar_EventDateTime(['date' => $endDate]));
            } else {
                // For timed events, Google expects 'dateTime' format (ISO 8601 with timezone)
                $startDateTime = new \Google_Service_Calendar_EventDateTime();
                $startDateTime->setDateTime( (new Carbon($validated['start_datetime']))->toIso8601ZuluString() );
                $startDateTime->setTimeZone('Europe/Paris'); // Use a specific timezone or allow user to choose

                $endDateTime = new \Google_Service_Calendar_EventDateTime();
                $endDateTime->setDateTime( (new Carbon($validated['end_datetime']))->toIso8601ZuluString() );
                $endDateTime->setTimeZone('Europe/Paris'); // Use a specific timezone

                $event->setStart($startDateTime);
                $event->setEnd($endDateTime);
            }

            if (!empty($validated['attendees'])) {
                $attendees = [];
                foreach ($validated['attendees'] as $attendee) {
                    $attendees[] = new \Google_Service_Calendar_EventAttendee(['email' => $attendee['email']]);
                }
                $event->setAttendees($attendees);
            }

            $createdEvent = $service->events->insert($calendarId, $event);

            return response()->json($createdEvent, 201);

        } catch (GoogleServiceException $e) {
            Log::error('Google Calendar Event Creation Error (Service): ' . $e->getMessage() . ' Code: ' . $e->getCode() . ' Errors: ' . json_encode($e->getErrors()));
            return response()->json(['message' => 'Failed to create Google Calendar event.', 'error' => $e->getMessage(), 'google_errors' => $e->getErrors()], $e->getCode());
        } catch (Exception $e) {
            Log::error('Google Calendar Event Creation Error: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return response()->json(['message' => 'Failed to create Google Calendar event.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update a Google Calendar event.
     *
     * @param Request $request
     * @param string $eventId
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateGoogleCalendarEvent(Request $request, string $eventId)
    {
        $user = Auth::user();
        if (!$user || !$user->google_access_token) {
            return response()->json(['message' => 'Google account not connected.'], 403);
        }

        $validated = $request->validate([
            'summary' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_datetime' => 'required|date',
            'end_datetime' => 'required|date|after_or_equal:start_datetime',
            'attendees' => 'nullable|array',
            'attendees.*.email' => 'required_with:attendees|email',
            'location' => 'nullable|string|max:255', // Added location field
        ]);

        try {
            $client = new Client();
            $client->setClientId(config('services.google.client_id'));
            $client->setClientSecret(config('services.google.client_secret'));

            $accessTokenData = json_decode($user->google_access_token, true);
            if (!is_array($accessTokenData) || !isset($accessTokenData['access_token'])) {
                Log::error('updateGoogleCalendarEvent: Stored Google access_token is invalid or malformed JSON.');
                return response()->json(['message' => 'Stored Google access token is invalid or corrupted.'], 401);
            }
            $client->setAccessToken($accessTokenData);

            if ($client->isAccessTokenExpired()) {
                if ($user->google_refresh_token) {
                    $client->fetchAccessTokenWithRefreshToken($user->google_refresh_token);
                    $newAccessToken = $client->getAccessToken();
                    $newAccessToken['refresh_token'] = $newAccessToken['refresh_token'] ?? $user->google_refresh_token;

                    $user->google_access_token = json_encode($newAccessToken);
                    $user->google_refresh_token = $newAccessToken['refresh_token'];
                    $user->google_expires_at = Carbon::now()->addSeconds($newAccessToken['expires_in']);
                    $user->save();
                    $client->setAccessToken($newAccessToken);
                } else {
                    return response()->json(['message' => 'Google refresh token missing or expired. Re-authenticate.'], 401);
                }
            }

            $service = new Calendar($client);
            $calendarId = 'primary';

            // Get the existing event to merge updates (important for partial updates)
            try {
                $event = $service->events->get($calendarId, $eventId);
            } catch (GoogleServiceException $e) {
                if ($e->getCode() == 404) {
                    return response()->json(['message' => 'Event not found.'], 404);
                }
                throw $e; // Re-throw if it's another type of Google API error
            }

            // Update event properties
            $event->setSummary($validated['summary']);
            $event->setDescription($validated['description'] ?? null);
            $event->setLocation($validated['location'] ?? null);

            // Handle start and end times/dates
            $isAllDay = (substr($validated['start_datetime'], 10, 1) === 'T') ? false : true;

            if ($isAllDay) {
                $startDate = (new Carbon($validated['start_datetime']))->toDateString();
                $endDate = (new Carbon($validated['end_datetime']))->addDay()->toDateString();
                $event->setStart(new \Google_Service_Calendar_EventDateTime(['date' => $startDate]));
                $event->setEnd(new \Google_Service_Calendar_EventDateTime(['date' => $endDate]));
            } else {
                $startDateTime = new \Google_Service_Calendar_EventDateTime();
                $startDateTime->setDateTime( (new Carbon($validated['start_datetime']))->toIso8601ZuluString() );
                $startDateTime->setTimeZone('Europe/Paris');

                $endDateTime = new \Google_Service_Calendar_EventDateTime();
                $endDateTime->setDateTime( (new Carbon($validated['end_datetime']))->toIso8601ZuluString() );
                $endDateTime->setTimeZone('Europe/Paris');

                $event->setStart($startDateTime);
                $event->setEnd($endDateTime);
            }

            // Handle attendees
            if (isset($validated['attendees'])) {
                $attendees = [];
                foreach ($validated['attendees'] as $attendee) {
                    $attendees[] = new \Google_Service_Calendar_EventAttendee(['email' => $attendee['email']]);
                }
                $event->setAttendees($attendees);
            } else {
                $event->setAttendees([]); // Clear attendees if none provided
            }


            // Call the update method
            $updatedEvent = $service->events->update($calendarId, $eventId, $event);

            return response()->json($updatedEvent);

        } catch (GoogleServiceException $e) {
            Log::error('Google Calendar Event Update Error (Service): ' . $e->getMessage() . ' Code: ' . $e->getCode() . ' Errors: ' . json_encode($e->getErrors()));
            return response()->json(['message' => 'Failed to update Google Calendar event.', 'error' => $e->getMessage(), 'google_errors' => $e->getErrors()], $e->getCode());
        } catch (Exception $e) {
            Log::error('Google Calendar Event Update Error: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return response()->json(['message' => 'Failed to update Google Calendar event.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete a Google Calendar event.
     *
     * @param string $eventId
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteGoogleCalendarEvent(string $eventId)
    {
        $user = Auth::user();
        if (!$user || !$user->google_access_token) {
            return response()->json(['message' => 'Google account not connected.'], 403);
        }

        try {
            $client = new Client();
            $client->setClientId(config('services.google.client_id'));
            $client->setClientSecret(config('services.google.client_secret'));

            $accessTokenData = json_decode($user->google_access_token, true);
            if (!is_array($accessTokenData) || !isset($accessTokenData['access_token'])) {
                Log::error('deleteGoogleCalendarEvent: Stored Google access_token is invalid or malformed JSON.');
                return response()->json(['message' => 'Stored Google access token is invalid or corrupted.'], 401);
            }
            $client->setAccessToken($accessTokenData);

            if ($client->isAccessTokenExpired()) {
                if ($user->google_refresh_token) {
                    $client->fetchAccessTokenWithRefreshToken($user->google_refresh_token);
                    $newAccessToken = $client->getAccessToken();
                    $newAccessToken['refresh_token'] = $newAccessToken['refresh_token'] ?? $user->google_refresh_token;

                    $user->google_access_token = json_encode($newAccessToken);
                    $user->google_refresh_token = $newAccessToken['refresh_token'];
                    $user->google_expires_at = Carbon::now()->addSeconds($newAccessToken['expires_in']);
                    $user->save();
                    $client->setAccessToken($newAccessToken);
                } else {
                    return response()->json(['message' => 'Google refresh token missing or expired. Re-authenticate.'], 401);
                }
            }

            $service = new Calendar($client);
            $calendarId = 'primary';

            $service->events->delete($calendarId, $eventId);

            // Google API returns 204 No Content for successful deletion.
            return response()->json(null, 204);

        } catch (GoogleServiceException $e) {
            Log::error('Google Calendar Event Deletion Error (Service): ' . $e->getMessage() . ' Code: ' . $e->getCode() . ' Errors: ' . json_encode($e->getErrors()));
            return response()->json(['message' => 'Failed to delete Google Calendar event.', 'error' => $e->getMessage(), 'google_errors' => $e->getErrors()], $e->getCode());
        } catch (Exception $e) {
            Log::error('Google Calendar Event Deletion Error: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return response()->json(['message' => 'Failed to delete Google Calendar event.', 'error' => $e->getMessage()], 500);
        }
    }

}
