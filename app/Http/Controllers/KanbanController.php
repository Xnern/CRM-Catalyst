<?php

namespace App\Http\Controllers;

use App\Models\Opportunity;
use Illuminate\Http\Request;
use Inertia\Inertia;

class KanbanController extends Controller
{
    /**
     * Display the Kanban board for opportunities.
     */
    public function indexInertia()
    {
        $opportunities = Opportunity::with(['contact', 'company', 'user'])
            ->where('user_id', auth()->id())
            ->get()
            ->map(function ($opportunity) {
                return [
                    'id' => $opportunity->id,
                    'name' => $opportunity->name,
                    'amount' => $opportunity->amount,
                    'probability' => $opportunity->probability,
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

        return Inertia::render('Kanban/OpportunityKanban', [
            'opportunities' => $opportunities,
            'stages' => $stages,
        ]);
    }
}
