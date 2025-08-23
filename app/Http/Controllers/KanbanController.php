<?php

namespace App\Http\Controllers;

use App\Models\Opportunity;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class KanbanController extends Controller
{
    /**
     * Display the Kanban board for opportunities.
     */
    public function indexInertia()
    {
        // Get all opportunities with relations
        $opportunitiesQuery = Opportunity::with(['contact', 'company', 'user']);
        
        // If user is not admin, only show their opportunities
        if (!auth()->user()->hasRole(['admin', 'super-admin'])) {
            $opportunitiesQuery->where('user_id', auth()->id());
        }
        
        $opportunities = $opportunitiesQuery->get()
            ->map(function ($opportunity) {
                return [
                    'id' => $opportunity->id,
                    'name' => $opportunity->name,
                    'amount' => (float) $opportunity->amount,
                    'probability' => (int) $opportunity->probability,
                    'stage' => $opportunity->stage,
                    'expected_close_date' => $opportunity->expected_close_date?->format('Y-m-d'),
                    'contact' => $opportunity->contact ? [
                        'id' => $opportunity->contact->id,
                        'name' => $opportunity->contact->name,
                        'email' => $opportunity->contact->email,
                    ] : null,
                    'company' => $opportunity->company ? [
                        'id' => $opportunity->company->id,
                        'name' => $opportunity->company->name,
                    ] : null,
                    'user' => $opportunity->user ? [
                        'id' => $opportunity->user->id,
                        'name' => $opportunity->user->name,
                    ] : null,
                ];
            });

        $stages = [
            ['value' => 'nouveau', 'label' => 'Nouveau'],
            ['value' => 'qualification', 'label' => 'Qualification'],
            ['value' => 'proposition_envoyee', 'label' => 'Proposition envoyée'],
            ['value' => 'negociation', 'label' => 'Négociation'],
            ['value' => 'converti', 'label' => 'Converti'],
            ['value' => 'perdu', 'label' => 'Perdu'],
        ];

        // Get all users for filter dropdown (only for admins)
        $users = [];
        if (auth()->user()->hasRole(['admin', 'super-admin'])) {
            $users = User::select('id', 'name')
                ->orderBy('name')
                ->get()
                ->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                    ];
                });
        }

        return Inertia::render('Kanban/OpportunityKanban', [
            'opportunities' => $opportunities,
            'stages' => $stages,
            'users' => $users,
        ]);
    }
    
    /**
     * Display pipeline statistics
     */
    public function stats()
    {
        // Get all opportunities with relations
        $opportunitiesQuery = Opportunity::with(['user']);
        
        // If user is not admin, only show their opportunities
        if (!auth()->user()->hasRole(['admin', 'super-admin'])) {
            $opportunitiesQuery->where('user_id', auth()->id());
        }
        
        $opportunities = $opportunitiesQuery->get()
            ->map(function ($opportunity) {
                return [
                    'id' => $opportunity->id,
                    'name' => $opportunity->name,
                    'amount' => (float) $opportunity->amount,
                    'probability' => (int) $opportunity->probability,
                    'stage' => $opportunity->stage,
                    'expected_close_date' => $opportunity->expected_close_date?->format('Y-m-d'),
                    'created_at' => $opportunity->created_at->toISOString(),
                    'user' => $opportunity->user ? [
                        'id' => $opportunity->user->id,
                        'name' => $opportunity->user->name,
                    ] : null,
                ];
            });

        $stages = [
            ['value' => 'nouveau', 'label' => 'Nouveau'],
            ['value' => 'qualification', 'label' => 'Qualification'],
            ['value' => 'proposition_envoyee', 'label' => 'Proposition envoyée'],
            ['value' => 'negociation', 'label' => 'Négociation'],
            ['value' => 'converti', 'label' => 'Converti'],
            ['value' => 'perdu', 'label' => 'Perdu'],
        ];

        return Inertia::render('Kanban/PipelineStats', [
            'opportunities' => $opportunities,
            'stages' => $stages,
        ]);
    }
}
