<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LocalCalendarEventsController extends Controller
{
    /**
     * Get all local calendar events with CRM relationships.
     */
    public function getLocalEvents()
    {
        // Get events with related CRM data
        $events = Auth::user()->events()
            ->with(['contact', 'company', 'opportunity', 'reminder'])
            ->get()
            ->map(function ($event) {
                return [
                    'id' => $event->id,
                    'title' => $event->title,
                    'description' => $event->description,
                    'start_datetime' => $event->start_datetime,
                    'end_datetime' => $event->end_datetime,
                    'type' => $event->type,
                    'type_label' => $event->type_label,
                    'priority' => $event->priority,
                    'priority_label' => $event->priority_label,
                    'color' => $event->effective_color,
                    'all_day' => $event->all_day,
                    'location' => $event->location,
                    'attendees' => $event->attendees,
                    'notes' => $event->notes,
                    'meeting_link' => $event->meeting_link,
                    'is_recurring' => $event->is_recurring,
                    'recurrence_config' => $event->recurrence_config,
                    // CRM relationships
                    'contact' => $event->contact ? [
                        'id' => $event->contact->id,
                        'name' => $event->contact->name,
                        'email' => $event->contact->email,
                    ] : null,
                    'company' => $event->company ? [
                        'id' => $event->company->id,
                        'name' => $event->company->name,
                    ] : null,
                    'opportunity' => $event->opportunity ? [
                        'id' => $event->opportunity->id,
                        'name' => $event->opportunity->name,
                        'stage' => $event->opportunity->stage,
                    ] : null,
                    'reminder' => $event->reminder ? [
                        'id' => $event->reminder->id,
                        'title' => $event->reminder->title,
                    ] : null,
                ];
            });

        return response()->json($events);
    }

    /**
     * Create a new event for the authenticated user.
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_datetime' => 'required|date',
            'end_datetime' => 'required|date|after:start_datetime',
            'type' => 'nullable|string|in:' . implode(',', array_keys(Event::TYPES)),
            'priority' => 'nullable|string|in:' . implode(',', array_keys(Event::PRIORITIES)),
            'color' => 'nullable|string|regex:/^#[0-9a-fA-F]{6}$/',
            'all_day' => 'nullable|boolean',
            'location' => 'nullable|string|max:255',
            'attendees' => 'nullable|array',
            'attendees.*' => 'email',
            'notes' => 'nullable|string',
            'meeting_link' => 'nullable|url',
            'contact_id' => 'nullable|exists:contacts,id',
            'company_id' => 'nullable|exists:companies,id',
            'opportunity_id' => 'nullable|exists:opportunities,id',
            'reminder_id' => 'nullable|exists:reminders,id',
            'is_recurring' => 'nullable|boolean',
            'recurrence_config' => 'nullable|array',
        ]);

        // Set defaults
        $validatedData['type'] = $validatedData['type'] ?? 'meeting';
        $validatedData['priority'] = $validatedData['priority'] ?? 'medium';
        $validatedData['all_day'] = $validatedData['all_day'] ?? false;
        $validatedData['is_recurring'] = $validatedData['is_recurring'] ?? false;
        $validatedData['user_id'] = Auth::id();

        $event = Event::create($validatedData);
        $event->load(['contact', 'company', 'opportunity', 'reminder']);

        return response()->json($event, 201);
    }

    /**
     * Update an existing event for the authenticated user.
     */
    public function update(Request $request, Event $event)
    {
        // Check if user owns the event
        if ($event->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validatedData = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_datetime' => 'required|date',
            'end_datetime' => 'required|date|after:start_datetime',
            'type' => 'nullable|string|in:' . implode(',', array_keys(Event::TYPES)),
            'priority' => 'nullable|string|in:' . implode(',', array_keys(Event::PRIORITIES)),
            'color' => 'nullable|string|regex:/^#[0-9a-fA-F]{6}$/',
            'all_day' => 'nullable|boolean',
            'location' => 'nullable|string|max:255',
            'attendees' => 'nullable|array',
            'attendees.*' => 'email',
            'notes' => 'nullable|string',
            'meeting_link' => 'nullable|url',
            'contact_id' => 'nullable|exists:contacts,id',
            'company_id' => 'nullable|exists:companies,id',
            'opportunity_id' => 'nullable|exists:opportunities,id',
            'reminder_id' => 'nullable|exists:reminders,id',
            'is_recurring' => 'nullable|boolean',
            'recurrence_config' => 'nullable|array',
        ]);

        $event->update($validatedData);
        $event->load(['contact', 'company', 'opportunity', 'reminder']);

        return response()->json($event);
    }

    /**
     * Delete an existing event for the authenticated user.
     */
    public function destroy(Event $event)
    {
        // Check if user owns the event
        if ($event->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $event->delete();

        return response()->json(null, 204);
    }

    /**
     * Get event types with their labels and colors
     */
    public function getEventTypes()
    {
        return response()->json(Event::TYPES);
    }

    /**
     * Get priority levels with their labels
     */
    public function getPriorityLevels()
    {
        return response()->json(Event::PRIORITIES);
    }
}
