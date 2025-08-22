<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Document;
use App\Models\ActivityLog;
use App\Models\Opportunity;
use App\Enums\CompanyStatus;
use App\Enums\ContactStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class DashboardController extends Controller
{
    /**
     * Render the Dashboard page (Inertia React).
     */
    public function indexInertia()
    {
        return inertia('Dashboard');
    }

    /**
     * Redirect to the appropriate object page based on type and ID
     */
    public function redirectToObject(string $type, int $id)
    {
        switch (strtolower($type)) {
            case 'contact':
                return redirect()->route('contacts.showInertia', ['id' => $id]);
            case 'company':
                return redirect()->route('companies.showInertia', ['id' => $id]);
            case 'document':
                return redirect()->route('documents.indexInertia', ['id' => $id]);
            default:
                return redirect()->route('dashboard');
        }
    }

    public function getStats(Request $request)
    {
        $user = $request->user();

        // Opportunités stats
        $openOpportunities = Opportunity::where('user_id', $user->id)
            ->whereNotIn('stage', ['converti', 'perdu'])
            ->get();
        
        $pipelineValue = $openOpportunities->sum('amount');
        $weightedPipeline = $openOpportunities->sum(function($opp) {
            return $opp->amount * $opp->probability / 100;
        });
        
        $wonThisMonth = Opportunity::where('user_id', $user->id)
            ->where('stage', 'converti')
            ->whereMonth('updated_at', Carbon::now()->month)
            ->whereYear('updated_at', Carbon::now()->year)
            ->sum('amount');

        $stats = [
            'total_contacts' => Contact::where('user_id', $user->id)->count(),
            'total_companies' => Company::where('owner_id', $user->id)->count(),
            'total_documents' => Document::where('owner_id', $user->id)->count(),
            'total_events' => 0, // Pas de LocalCalendarEvent pour l'instant
            'contacts_this_month' => Contact::where('user_id', $user->id)
                ->whereMonth('created_at', Carbon::now()->month)
                ->whereYear('created_at', Carbon::now()->year)
                ->count(),
            'companies_this_month' => Company::where('owner_id', $user->id)
                ->whereMonth('created_at', Carbon::now()->month)
                ->whereYear('created_at', Carbon::now()->year)
                ->count(),
            // Nouvelles stats d'opportunités
            'total_opportunities' => Opportunity::where('user_id', $user->id)->count(),
            'open_opportunities' => $openOpportunities->count(),
            'pipeline_value' => $pipelineValue,
            'weighted_pipeline' => $weightedPipeline,
            'won_this_month' => $wonThisMonth,
            'opportunities_this_month' => Opportunity::where('user_id', $user->id)
                ->whereMonth('created_at', Carbon::now()->month)
                ->whereYear('created_at', Carbon::now()->year)
                ->count(),
        ];

        return response()->json(['data' => $stats]);
    }

    public function getContactsByStatus(Request $request)
    {
        $user = $request->user();

        $contactsByStatus = Contact::where('user_id', $user->id)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $this->getStatusLabel($item->status),
                    'value' => $item->count,
                    'status' => $item->status,
                ];
            });

        return response()->json(['data' => $contactsByStatus]);
    }

    public function getCompaniesByStatus(Request $request)
    {
        $user = $request->user();

        $companiesByStatus = Company::where('owner_id', $user->id)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $this->getCompanyStatusLabel($item->status),
                    'value' => $item->count,
                    'status' => $item->status,
                ];
            });

        return response()->json(['data' => $companiesByStatus]);
    }

    public function getContactsTimeline(Request $request)
    {
        $user = $request->user();
        $months = $request->get('months', 6);

        $timeline = Contact::where('user_id', $user->id)
            ->where('created_at', '>=', Carbon::now()->subMonths($months))
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                DB::raw('count(*) as count')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                return [
                    'month' => Carbon::createFromFormat('Y-m', $item->month)->format('M Y'),
                    'contacts' => $item->count,
                ];
            });

        return response()->json(['data' => $timeline]);
    }

    public function getDocumentsTimeline(Request $request)
    {
        $user = $request->user();
        $months = $request->get('months', 6);

        $timeline = Document::where('owner_id', $user->id)
            ->where('created_at', '>=', Carbon::now()->subMonths($months))
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                DB::raw('count(*) as count')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                return [
                    'month' => Carbon::createFromFormat('Y-m', $item->month)->format('M Y'),
                    'documents' => $item->count,
                ];
            });

        return response()->json(['data' => $timeline]);
    }

    public function getOpportunitiesByStage(Request $request)
    {
        $user = $request->user();

        $opportunitiesByStage = Opportunity::where('user_id', $user->id)
            ->select('stage', DB::raw('count(*) as count'), DB::raw('sum(amount) as total_amount'))
            ->groupBy('stage')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $this->getOpportunityStageLabel($item->stage),
                    'count' => $item->count,
                    'amount' => $item->total_amount ?? 0,
                    'stage' => $item->stage,
                ];
            });

        return response()->json(['data' => $opportunitiesByStage]);
    }

    private function getOpportunityStageLabel($stage)
    {
        $labels = [
            'nouveau' => 'Nouveau',
            'qualification' => 'Qualification',
            'proposition' => 'Proposition',
            'négociation' => 'Négociation',
            'converti' => 'Converti',
            'perdu' => 'Perdu',
        ];

        return $labels[$stage] ?? ucfirst(str_replace('_', ' ', $stage));
    }

    public function getRecentActivities(Request $request)
    {
        $user = $request->user();
        $limit = $request->get('limit', 10);

        $activities = ActivityLog::forUser($user->id)
            ->recent($limit)
            ->with(['subject'])
            ->get()
            ->map(function ($log) {
                return [
                    'type' => $this->getActivityType($log->log_name),
                    'title' => $log->description,
                    'date' => $log->created_at,
                    'id' => $log->id,
                    'subject_id' => $log->subject_id,
                    'subject_type' => $log->subject_type,
                    'properties' => $log->properties,
                ];
            });

        return response()->json(['data' => $activities]);
    }

    private function getStatusLabel($status)
    {
        $labels = ContactStatus::labels();

        return $labels[$status] ?? ucfirst(str_replace('_', ' ', $status));
    }

    private function getCompanyStatusLabel($status)
    {
        $labels = CompanyStatus::labels();

        return $labels[$status] ?? ucfirst(str_replace('_', ' ', $status));
    }

    private function getActivityType($logName): string
    {
        return match($logName) {
            'contact' => 'contact',
            'company' => 'company',
            'document' => 'document',
            default => 'activity'
        };
    }

    public function exportPdf(Request $request)
    {
        $user = $request->user();

        // Opportunités stats
        $openOpportunities = Opportunity::where('user_id', $user->id)
            ->whereNotIn('stage', ['converti', 'perdu'])
            ->get();
        
        $pipelineValue = $openOpportunities->sum('amount');
        $weightedPipeline = $openOpportunities->sum(function($opp) {
            return $opp->amount * $opp->probability / 100;
        });
        
        $wonThisMonth = Opportunity::where('user_id', $user->id)
            ->where('stage', 'converti')
            ->whereMonth('updated_at', Carbon::now()->month)
            ->whereYear('updated_at', Carbon::now()->year)
            ->sum('amount');

        $stats = [
            'total_contacts' => Contact::where('user_id', $user->id)->count(),
            'total_companies' => Company::where('owner_id', $user->id)->count(),
            'total_documents' => Document::where('owner_id', $user->id)->count(),
            'total_events' => 0,
            'contacts_this_month' => Contact::where('user_id', $user->id)
                ->whereMonth('created_at', Carbon::now()->month)
                ->whereYear('created_at', Carbon::now()->year)
                ->count(),
            'companies_this_month' => Company::where('owner_id', $user->id)
                ->whereMonth('created_at', Carbon::now()->month)
                ->whereYear('created_at', Carbon::now()->year)
                ->count(),
            // Nouvelles stats d'opportunités
            'total_opportunities' => Opportunity::where('user_id', $user->id)->count(),
            'open_opportunities' => $openOpportunities->count(),
            'pipeline_value' => $pipelineValue,
            'weighted_pipeline' => $weightedPipeline,
            'won_this_month' => $wonThisMonth,
            'opportunities_this_month' => Opportunity::where('user_id', $user->id)
                ->whereMonth('created_at', Carbon::now()->month)
                ->whereYear('created_at', Carbon::now()->year)
                ->count(),
        ];

        $contactsByStatus = Contact::where('user_id', $user->id)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $this->getStatusLabel($item->status),
                    'value' => $item->count,
                    'status' => $item->status,
                ];
            });

        $companiesByStatus = Company::where('owner_id', $user->id)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $this->getCompanyStatusLabel($item->status),
                    'value' => $item->count,
                    'status' => $item->status,
                ];
            });

        $contactsTimeline = Contact::where('user_id', $user->id)
            ->where('created_at', '>=', Carbon::now()->subMonths(6))
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                DB::raw('count(*) as count')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                return [
                    'month' => Carbon::createFromFormat('Y-m', $item->month)->format('M Y'),
                    'contacts' => $item->count,
                ];
            });

        $documentsTimeline = Document::where('owner_id', $user->id)
            ->where('created_at', '>=', Carbon::now()->subMonths(6))
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                DB::raw('count(*) as count')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                return [
                    'month' => Carbon::createFromFormat('Y-m', $item->month)->format('M Y'),
                    'documents' => $item->count,
                ];
            });

        $opportunitiesByStage = Opportunity::where('user_id', $user->id)
            ->select('stage', DB::raw('count(*) as count'), DB::raw('sum(amount) as total_amount'))
            ->groupBy('stage')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $this->getOpportunityStageLabel($item->stage),
                    'count' => $item->count,
                    'amount' => $item->total_amount ?? 0,
                    'stage' => $item->stage,
                ];
            });

        $recentActivities = ActivityLog::forUser($user->id)
            ->recent(10)
            ->with(['subject'])
            ->get()
            ->map(function ($log) {
                return [
                    'type' => $this->getActivityType($log->log_name),
                    'description' => $log->description,
                    'date' => $log->created_at->format('d/m/Y H:i'),
                ];
            });

        $data = [
            'user' => $user,
            'stats' => $stats,
            'contactsByStatus' => $contactsByStatus,
            'companiesByStatus' => $companiesByStatus,
            'opportunitiesByStage' => $opportunitiesByStage,
            'contactsTimeline' => $contactsTimeline,
            'documentsTimeline' => $documentsTimeline,
            'recentActivities' => $recentActivities,
            'generated_at' => Carbon::now()->format('d/m/Y à H:i'),
        ];

        $pdf = Pdf::loadView('dashboard.report', $data);

        $pdf->setPaper('A4', 'portrait');
        $pdf->setOptions([
            'dpi' => 150,
            'defaultFont' => 'sans-serif',
            'isRemoteEnabled' => true,
        ]);

        $filename = 'rapport-dashboard-' . Carbon::now()->format('Y-m-d_H-i') . '.pdf';

        return $pdf->download($filename);
    }
}
