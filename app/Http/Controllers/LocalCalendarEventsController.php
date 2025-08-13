<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LocalCalendarEventsController extends Controller
{
    /**
     * Récupère tous les événements du calendrier local.
     */
    public function getLocalEvents()
    {
        // Récupère les événements de l'utilisateur authentifié
        $events = Auth::user()->events;

        return response()->json($events);
    }

    /**
     * Crée un nouvel événement pour l'utilisateur connecté.
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_datetime' => 'required|date',
            'end_datetime' => 'required|date|after:start_datetime',
        ]);

        $event = new Event($validatedData);
        $event->user()->associate(Auth::user());
        $event->save();

        return response()->json($event, 201);
    }

    /**
     * Met à jour un événement existant pour l'utilisateur connecté.
     */
    public function update(Request $request, Event $event)
    {
        // Vérifier si l'utilisateur est le propriétaire de l'événement
        if ($event->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validatedData = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_datetime' => 'required|date',
            'end_datetime' => 'required|date|after:start_datetime',
        ]);

        $event->update($validatedData);

        return response()->json($event);
    }

    /**
     * Supprime un événement existant pour l'utilisateur connecté.
     */
    public function destroy(Event $event)
    {
        // Vérifier si l'utilisateur est le propriétaire de l'événement
        if ($event->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $event->delete();

        return response()->json(null, 204);
    }
}
