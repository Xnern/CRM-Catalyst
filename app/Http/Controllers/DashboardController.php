<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Document;
use App\Models\ActivityLog;
use App\Enums\CompanyStatus;
use App\Enums\ContactStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Render the Dashboard page (Inertia React).
     */
    public function indexInertia()
    {
        return inertia('Dashboard');
    }

    public function getStats(Request $request)
    {
        $user = $request->user();

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
}
