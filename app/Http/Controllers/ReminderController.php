<?php

namespace App\Http\Controllers;

use App\Models\Reminder;
use App\Models\Opportunity;
use App\Models\Contact;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class ReminderController extends Controller
{
    public function index()
    {
        $reminders = Reminder::with(['opportunity', 'contact'])
            ->where('user_id', auth()->id())
            ->orderBy('reminder_date', 'asc')
            ->get()
            ->map(function ($reminder) {
                return [
                    'id' => $reminder->id,
                    'title' => $reminder->title,
                    'description' => $reminder->description,
                    'reminder_date' => $reminder->reminder_date->toISOString(),
                    'type' => $reminder->type,
                    'priority' => $reminder->priority,
                    'status' => $reminder->status,
                    'is_overdue' => $reminder->isOverdue(),
                    'is_due_today' => $reminder->isDueToday(),
                    'is_due_soon' => $reminder->isDueSoon(),
                    'opportunity' => $reminder->opportunity ? [
                        'id' => $reminder->opportunity->id,
                        'name' => $reminder->opportunity->name,
                    ] : null,
                    'contact' => $reminder->contact ? [
                        'id' => $reminder->contact->id,
                        'name' => $reminder->contact->name,
                    ] : null,
                ];
            });

        // Group reminders
        $grouped = [
            'overdue' => $reminders->filter(fn($r) => $r['is_overdue'])->values(),
            'today' => $reminders->filter(fn($r) => $r['is_due_today'])->values(),
            'upcoming' => $reminders->filter(fn($r) => !$r['is_overdue'] && !$r['is_due_today'] && $r['status'] === 'pending')->values(),
            'completed' => $reminders->filter(fn($r) => $r['status'] === 'completed')->values(),
        ];

        return Inertia::render('Reminders/Index', [
            'reminders' => $grouped,
            'types' => Reminder::typeLabels(),
            'priorities' => Reminder::priorityLabels(),
            'stats' => [
                'overdue' => $grouped['overdue']->count(),
                'today' => $grouped['today']->count(),
                'upcoming' => $grouped['upcoming']->count(),
                'total' => $reminders->where('status', 'pending')->count(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'reminder_date' => 'required|date',
            'type' => 'required|in:follow_up,meeting,call,email,deadline,other',
            'priority' => 'required|in:low,medium,high',
            'opportunity_id' => 'nullable|exists:opportunities,id',
            'contact_id' => 'nullable|exists:contacts,id',
            'is_recurring' => 'boolean',
            'recurrence_pattern' => 'nullable|in:daily,weekly,monthly',
            'recurrence_interval' => 'nullable|integer|min:1',
            'recurrence_end_date' => 'nullable|date|after:reminder_date',
        ]);

        $reminder = Reminder::create([
            ...$validated,
            'user_id' => auth()->id(),
            'status' => 'pending',
        ]);

        return redirect()->back()->with('success', 'Rappel créé avec succès');
    }

    public function update(Request $request, Reminder $reminder)
    {
        $this->authorize('update', $reminder);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'reminder_date' => 'required|date',
            'type' => 'required|in:follow_up,meeting,call,email,deadline,other',
            'priority' => 'required|in:low,medium,high',
        ]);

        $reminder->update($validated);

        return redirect()->back()->with('success', 'Rappel mis à jour');
    }

    public function complete(Reminder $reminder)
    {
        $this->authorize('update', $reminder);
        
        $reminder->markAsCompleted();

        return redirect()->back()->with('success', 'Rappel marqué comme complété');
    }

    public function snooze(Request $request, Reminder $reminder)
    {
        $this->authorize('update', $reminder);
        
        $minutes = $request->input('minutes', 60);
        $reminder->snooze($minutes);

        return redirect()->back()->with('success', 'Rappel reporté');
    }

    public function destroy(Reminder $reminder)
    {
        $this->authorize('delete', $reminder);
        
        $reminder->delete();

        return redirect()->back()->with('success', 'Rappel supprimé');
    }

    // API endpoints for AJAX
    public function apiUpcoming()
    {
        // Get all pending reminders, not just upcoming ones
        $reminders = Reminder::with(['opportunity', 'contact'])
            ->where('user_id', auth()->id())
            ->pending()
            ->orderBy('reminder_date', 'asc')
            ->limit(10)
            ->get()
            ->map(function ($reminder) {
                // Force le recalcul des statuts
                $reminder->refresh();
                return [
                    'id' => $reminder->id,
                    'title' => $reminder->title,
                    'reminder_date' => $reminder->reminder_date->toISOString(),
                    'type' => $reminder->type,
                    'priority' => $reminder->priority,
                    'is_overdue' => $reminder->isOverdue(),
                    'is_due_today' => $reminder->isDueToday(),
                    'opportunity_name' => $reminder->opportunity?->name,
                    'contact_name' => $reminder->contact?->name,
                ];
            });

        return response()->json($reminders);
    }

    public function apiCount()
    {
        $counts = [
            'overdue' => Reminder::where('user_id', auth()->id())->overdue()->count(),
            'today' => Reminder::where('user_id', auth()->id())->today()->count(),
            'upcoming' => Reminder::where('user_id', auth()->id())->upcoming(3)->count(),
        ];

        return response()->json($counts);
    }
}