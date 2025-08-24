<?php

namespace App\Http\Controllers;

use App\Models\Opportunity;
use App\Models\ActivityLog;
// use App\Models\Note; // Commenté car le modèle n'existe pas encore
// use App\Models\Activity; // Commenté car le modèle n'existe pas encore
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class OpportunityTimelineController extends Controller
{
    public function index(Opportunity $opportunity)
    {
        // Vérifier les permissions - pour l'instant on permet à tous les utilisateurs connectés
        // if ($opportunity->user_id !== Auth::id() && !Auth::user()->hasRole('admin')) {
        //     abort(403);
        // }

        // Récupérer tous les événements liés à l'opportunité
        $timeline = collect();

        // 1. Logs d'activité du système
        $activityLogs = ActivityLog::where('subject_type', Opportunity::class)
            ->where('subject_id', $opportunity->id)
            ->with('causer')
            ->get()
            ->map(function ($log) {
                return [
                    'id' => 'log_' . $log->id,
                    'type' => 'system',
                    'action' => $log->description,
                    'description' => $this->formatActivityDescription($log),
                    'user' => $log->causer?->name ?? 'Système',
                    'user_id' => $log->causer_id,
                    'created_at' => $log->created_at,
                    'icon' => $this->getActivityIcon($log->description),
                    'color' => $this->getActivityColor($log->description),
                    'properties' => $log->properties,
                ];
            });
        $timeline = $timeline->concat($activityLogs);

        // 2. Notes - Commenté car le modèle Note n'existe pas encore
        // $notes = Note::where('opportunity_id', $opportunity->id)
        //     ->with('user')
        //     ->get()
        //     ->map(function ($note) {
        //         return [
        //             'id' => 'note_' . $note->id,
        //             'type' => 'note',
        //             'action' => 'Note ajoutée',
        //             'description' => $note->content,
        //             'user' => $note->user->name,
        //             'user_id' => $note->user_id,
        //             'created_at' => $note->created_at,
        //             'icon' => 'note',
        //             'color' => 'blue',
        //             'properties' => null,
        //         ];
        //     });
        // $timeline = $timeline->concat($notes);
        $notes = collect(); // Collection vide pour l'instant

        // 3. Activités (tâches, appels, réunions) - Commenté car le modèle Activity n'existe pas encore
        // $activities = Activity::where('opportunity_id', $opportunity->id)
        //     ->with('user')
        //     ->get()
        //     ->map(function ($activity) {
        //         return [
        //             'id' => 'activity_' . $activity->id,
        //             'type' => 'activity',
        //             'action' => $this->getActivityTypeLabel($activity->type),
        //             'description' => $activity->description,
        //             'user' => $activity->user->name,
        //             'user_id' => $activity->user_id,
        //             'created_at' => $activity->created_at,
        //             'completed_at' => $activity->completed_at,
        //             'icon' => $this->getActivityTypeIcon($activity->type),
        //             'color' => $activity->completed_at ? 'green' : 'yellow',
        //             'properties' => [
        //                 'type' => $activity->type,
        //                 'completed' => $activity->completed_at !== null,
        //                 'due_date' => $activity->due_date,
        //             ],
        //         ];
        //     });
        // $timeline = $timeline->concat($activities);
        $activities = collect(); // Collection vide pour l'instant

        // 4. Changements de stage
        $stageChanges = ActivityLog::where('subject_type', Opportunity::class)
            ->where('subject_id', $opportunity->id)
            ->where('description', 'like', '%stage%')
            ->with('causer')
            ->get()
            ->map(function ($log) {
                $oldStage = $log->properties['old']['stage'] ?? null;
                $newStage = $log->properties['attributes']['stage'] ?? null;
                
                return [
                    'id' => 'stage_' . $log->id,
                    'type' => 'stage_change',
                    'action' => 'Changement de stage',
                    'description' => $oldStage && $newStage ? 
                        "Stage modifié de {$this->getStageLabel($oldStage)} vers {$this->getStageLabel($newStage)}" :
                        'Stage modifié',
                    'user' => $log->causer?->name ?? 'Système',
                    'user_id' => $log->causer_id,
                    'created_at' => $log->created_at,
                    'icon' => 'stage',
                    'color' => 'purple',
                    'properties' => [
                        'old_stage' => $oldStage,
                        'new_stage' => $newStage,
                    ],
                ];
            });

        // Trier par date décroissante
        $timeline = $timeline->sortByDesc('created_at')->values();

        // Grouper par date
        $groupedTimeline = $timeline->groupBy(function ($item) {
            $date = Carbon::parse($item['created_at']);
            
            if ($date->isToday()) {
                return "Aujourd'hui";
            } elseif ($date->isYesterday()) {
                return "Hier";
            } elseif ($date->isCurrentWeek()) {
                return "Cette semaine";
            } elseif ($date->isLastWeek()) {
                return "La semaine dernière";
            } elseif ($date->isCurrentMonth()) {
                return "Ce mois-ci";
            } else {
                return $date->format('F Y');
            }
        });

        return response()->json([
            'timeline' => $groupedTimeline,
            'total_events' => $timeline->count(),
            'stats' => [
                'notes' => $notes->count(),
                'activities' => $activities->count(),
                'system_logs' => $activityLogs->count(),
            ],
        ]);
    }

    public function addQuickNote(Request $request, Opportunity $opportunity)
    {
        $validated = $request->validate([
            'content' => 'required|string|max:1000',
        ]);

        // Pour l'instant on ne peut pas créer de notes car le modèle n'existe pas
        // On va juste créer un log d'activité
        
        // Log l'activité
        \App\Services\ActivityLogger::log(
            'Note ajoutée: ' . $validated['content'],
            $opportunity,
            Auth::user(),
            'opportunity',
            ['note_content' => $validated['content']]
        );

        return response()->json([
            'success' => true,
            'message' => 'Note enregistrée dans l\'historique',
        ]);
    }

    private function formatActivityDescription($log)
    {
        $description = $log->description;
        $properties = $log->properties;

        // Personnaliser la description selon le type d'action
        if (str_contains($description, 'created')) {
            return 'Opportunité créée';
        } elseif (str_contains($description, 'updated')) {
            $changes = [];
            if (isset($properties['attributes'])) {
                foreach ($properties['attributes'] as $key => $value) {
                    if (isset($properties['old'][$key]) && $properties['old'][$key] != $value) {
                        $changes[] = $this->formatFieldName($key);
                    }
                }
            }
            return count($changes) > 0 ? 
                'Modifications : ' . implode(', ', $changes) : 
                'Opportunité mise à jour';
        }

        return $description;
    }

    private function getActivityIcon($description)
    {
        if (str_contains($description, 'created')) return 'plus';
        if (str_contains($description, 'updated')) return 'edit';
        if (str_contains($description, 'deleted')) return 'trash';
        if (str_contains($description, 'stage')) return 'flag';
        if (str_contains($description, 'note')) return 'message';
        return 'info';
    }

    private function getActivityColor($description)
    {
        if (str_contains($description, 'created')) return 'green';
        if (str_contains($description, 'updated')) return 'blue';
        if (str_contains($description, 'deleted')) return 'red';
        if (str_contains($description, 'stage')) return 'purple';
        return 'gray';
    }

    private function getActivityTypeLabel($type)
    {
        return match($type) {
            'call' => 'Appel',
            'meeting' => 'Réunion',
            'email' => 'Email',
            'task' => 'Tâche',
            default => ucfirst($type),
        };
    }

    private function getActivityTypeIcon($type)
    {
        return match($type) {
            'call' => 'phone',
            'meeting' => 'calendar',
            'email' => 'mail',
            'task' => 'check',
            default => 'activity',
        };
    }

    private function getStageLabel($stage)
    {
        return match($stage) {
            'new' => 'Nouveau',
            'qualification' => 'Qualification',
            'proposal' => 'Proposition',
            'negotiation' => 'Négociation',
            'closed_won' => 'Gagné',
            'closed_lost' => 'Perdu',
            default => ucfirst(str_replace('_', ' ', $stage)),
        };
    }

    private function formatFieldName($field)
    {
        return match($field) {
            'name' => 'Nom',
            'amount' => 'Montant',
            'probability' => 'Probabilité',
            'expected_close_date' => 'Date de clôture prévue',
            'stage' => 'Stage',
            'description' => 'Description',
            default => ucfirst(str_replace('_', ' ', $field)),
        };
    }
}