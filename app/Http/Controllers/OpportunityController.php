<?php

namespace App\Http\Controllers;

use App\Enums\OpportunityStage;
use App\Models\Contact;
use App\Models\Opportunity;
use App\Models\OpportunityActivity;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class OpportunityController extends Controller
{
    public function __construct()
    {
        $this->middleware('can:view opportunities')->only(['index', 'show']);
        $this->middleware('can:create opportunities')->only(['create', 'store', 'duplicate']);
        $this->middleware('can:edit opportunities')->only(['edit', 'update']);
        $this->middleware('can:delete opportunities')->only(['destroy']);
        $this->middleware('can:change opportunity stage')->only(['updateStage']);
    }

    /**
     * Display a listing of the opportunities (Sales Dashboard)
     */
    public function index(Request $request)
    {
        // Get filter parameters
        $stage = $request->get('stage');
        $userId = $request->get('user_id');
        $companyId = $request->get('company_id');
        $search = $request->get('search');

        // Build query
        $query = Opportunity::with(['contact', 'company', 'user']);

        if ($stage) {
            $query->where('stage', $stage);
        }

        if ($userId) {
            $query->where('user_id', $userId);
        }

        if ($companyId) {
            $query->where('company_id', $companyId);
        }
        
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('contact', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('company', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $opportunities = $query->latest()->paginate(20)->withQueryString();

        // Get metrics for dashboard
        $metrics = $this->getMetrics();

        return Inertia::render('Sales/Index', [
            'opportunities' => $opportunities,
            'metrics' => $metrics,
            'stages' => OpportunityStage::options(),
            'filters' => [
                'stage' => $stage,
                'user_id' => $userId,
                'company_id' => $companyId,
                'search' => $search,
            ],
        ]);
    }

    /**
     * Show the form for creating a new opportunity
     */
    public function create(Request $request)
    {
        $contactId = $request->get('contact_id');
        $contact = $contactId ? Contact::with('company')->find($contactId) : null;

        return Inertia::render('Sales/Create', [
            'contact' => $contact,
            'stages' => OpportunityStage::options(),
            'leadSources' => $this->getLeadSources(),
        ]);
    }

    /**
     * Store a newly created opportunity
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'contact_id' => 'required|exists:contacts,id',
            'company_id' => 'nullable|exists:companies,id',
            'amount' => 'required|numeric|min:0',
            'probability' => 'required|integer|min:0|max:100',
            'stage' => 'required|string',
            'expected_close_date' => 'required|date',
            'products' => 'nullable|array',
            'products.*.name' => 'required_with:products|string|max:255',
            'products.*.quantity' => 'required_with:products|numeric|min:1',
            'products.*.unit_price' => 'required_with:products|numeric|min:0',
        ]);

        $validated['user_id'] = auth()->id();

        // Remove currency if it exists (we'll default to EUR)
        unset($validated['currency']);

        // Create opportunity
        $opportunity = Opportunity::create($validated);

        // Add products if provided
        if (isset($validated['products'])) {
            foreach ($validated['products'] as $product) {
                DB::table('opportunity_products')->insert([
                    'opportunity_id' => $opportunity->id,
                    'name' => $product['name'],
                    'quantity' => $product['quantity'],
                    'unit_price' => $product['unit_price'],
                    'total' => $product['quantity'] * $product['unit_price'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Log creation activity
        OpportunityActivity::create([
            'opportunity_id' => $opportunity->id,
            'user_id' => auth()->id(),
            'type' => 'note',
            'title' => 'Opportunité créée',
            'description' => 'L\'opportunité a été créée',
        ]);

        // Always return JSON for API routes
        return response()->json([
            'message' => 'Opportunité créée avec succès',
            'opportunity' => $opportunity->fresh()->load(['contact', 'company', 'user']),
            'id' => $opportunity->id,
        ], 201);
    }

    /**
     * Display the specified opportunity
     */
    public function show($id)
    {
        $opportunity = Opportunity::with(['contact.company', 'company', 'user', 'activities.user'])->findOrFail($id);

        // Load products manually
        $products = DB::table('opportunity_products')
            ->where('opportunity_id', $opportunity->id)
            ->get();
        $opportunity->products = $products;

        return Inertia::render('Sales/Show', [
            'opportunity' => $opportunity,
            'stages' => OpportunityStage::options(),
        ]);
    }

    /**
     * Show the form for editing the opportunity
     */
    public function edit($id)
    {
        $opportunity = Opportunity::with(['contact.company', 'company'])->findOrFail($id);

        // Load products manually
        $products = DB::table('opportunity_products')
            ->where('opportunity_id', $opportunity->id)
            ->get();
        $opportunity->products = $products;

        return Inertia::render('Sales/Edit', [
            'opportunity' => $opportunity,
            'stages' => OpportunityStage::options(),
            'leadSources' => $this->getLeadSources(),
        ]);
    }

    /**
     * Update the specified opportunity
     */
    public function update(Request $request, Opportunity $opportunity)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'contact_id' => 'nullable|exists:contacts,id',
            'company_id' => 'nullable|exists:companies,id',
            'amount' => 'required|numeric|min:0',
            'probability' => 'required|integer|min:0|max:100',
            'stage' => 'required|string',
            'expected_close_date' => 'required|date',
            'products' => 'nullable|array',
            'products.*.name' => 'required_with:products|string|max:255',
            'products.*.quantity' => 'required_with:products|numeric|min:1',
            'products.*.unit_price' => 'required_with:products|numeric|min:0',
        ]);

        // Track stage change for activity log
        $oldStage = $opportunity->stage;
        $oldAmount = $opportunity->amount;

        // Update opportunity
        $opportunity->update($validated);

        // Update products if provided
        if (isset($validated['products'])) {
            // Delete existing products
            DB::table('opportunity_products')->where('opportunity_id', $opportunity->id)->delete();

            // Insert new products
            foreach ($validated['products'] as $product) {
                DB::table('opportunity_products')->insert([
                    'opportunity_id' => $opportunity->id,
                    'name' => $product['name'],
                    'quantity' => $product['quantity'],
                    'unit_price' => $product['unit_price'],
                    'total' => $product['quantity'] * $product['unit_price'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Log stage change
        if ($oldStage !== $opportunity->stage) {
            OpportunityActivity::create([
                'opportunity_id' => $opportunity->id,
                'user_id' => auth()->id(),
                'type' => 'note',
                'title' => 'Changement d\'étape',
                'description' => "L'étape a été changée de {$oldStage} à {$opportunity->stage}",
            ]);
        }

        // Log amount change
        if ($oldAmount != $opportunity->amount) {
            OpportunityActivity::create([
                'opportunity_id' => $opportunity->id,
                'user_id' => auth()->id(),
                'type' => 'note',
                'title' => 'Montant modifié',
                'description' => 'Le montant a été changé de '.number_format($oldAmount, 2).' € à '.number_format($opportunity->amount, 2).' €',
            ]);
        }

        // Return JSON response for API
        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Opportunité mise à jour avec succès',
                'opportunity' => $opportunity->fresh()->load(['contact', 'company', 'user']),
            ]);
        }

        return redirect()->route('opportunities.show', $opportunity)
            ->with('success', 'Opportunité mise à jour avec succès');
    }

    /**
     * Remove the specified opportunity
     */
    public function destroy(Request $request, Opportunity $opportunity)
    {
        // Delete related products
        DB::table('opportunity_products')->where('opportunity_id', $opportunity->id)->delete();

        // Delete related activities
        OpportunityActivity::where('opportunity_id', $opportunity->id)->delete();

        // Delete the opportunity
        $opportunity->delete();

        // Return JSON response for API
        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Opportunité supprimée avec succès',
            ], 200);
        }

        return redirect()->route('opportunities.index')
            ->with('success', 'Opportunité supprimée avec succès');
    }

    /**
     * Add an activity to the opportunity
     */
    public function addActivity(Request $request, Opportunity $opportunity)
    {
        $validated = $request->validate([
            'type' => 'required|in:note,call,email,meeting,task,other',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'scheduled_at' => 'nullable|date',
        ]);

        $validated['opportunity_id'] = $opportunity->id;
        $validated['user_id'] = auth()->id();

        OpportunityActivity::create($validated);

        return back()->with('success', 'Activité ajoutée avec succès');
    }

    /**
     * Mark an activity as completed
     */
    public function completeActivity(OpportunityActivity $activity)
    {
        $activity->markAsCompleted();

        return back()->with('success', 'Activité marquée comme complétée');
    }

    /**
     * Duplicate an opportunity
     */
    public function duplicate(Opportunity $opportunity)
    {
        $newOpportunity = $opportunity->replicate(['weighted_amount']);
        $newOpportunity->name = $opportunity->name . ' (Copie)';
        $newOpportunity->stage = 'nouveau';
        $newOpportunity->probability = 10;
        $newOpportunity->expected_close_date = Carbon::now()->addMonth();
        $newOpportunity->actual_close_date = null;
        $newOpportunity->created_at = Carbon::now();
        $newOpportunity->updated_at = Carbon::now();
        $newOpportunity->save();
        
        // Créer un log d'activité spécifique pour la duplication
        \App\Services\ActivityLogger::opportunityDuplicated($newOpportunity, $opportunity);

        // Dupliquer les produits associés si présents
        if ($opportunity->products) {
            $newOpportunity->products = $opportunity->products;
            $newOpportunity->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Opportunité dupliquée avec succès',
            'opportunity' => $newOpportunity->load(['contact', 'company', 'user']),
        ]);
    }

    /**
     * Get sales metrics for dashboard
     */
    private function getMetrics()
    {
        $currentMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();

        return [
            'pipeline_value' => Opportunity::open()->sum('amount'),
            'weighted_pipeline' => Opportunity::open()->sum(DB::raw('amount * probability / 100')),
            'opportunities_count' => Opportunity::open()->count(),
            'won_this_month' => Opportunity::won()
                ->where('actual_close_date', '>=', $currentMonth)
                ->sum('amount'),
            'conversion_rate' => $this->calculateConversionRate(),
            'average_deal_size' => Opportunity::won()->avg('amount') ?? 0,
            'closing_this_month' => Opportunity::closingThisMonth()->open()->count(),
            'overdue_opportunities' => Opportunity::overdue()->count(),
            'by_stage' => $this->getOpportunitiesByStage(),
            'forecast' => $this->getForecast(),
        ];
    }

    /**
     * Calculate conversion rate
     */
    private function calculateConversionRate()
    {
        $total = Opportunity::whereIn('stage', ['converti', 'perdu'])->count();
        if ($total === 0) {
            return 0;
        }

        $won = Opportunity::won()->count();

        return round(($won / $total) * 100, 1);
    }

    /**
     * Get opportunities grouped by stage
     */
    private function getOpportunitiesByStage()
    {
        return Opportunity::open()
            ->select('stage', DB::raw('COUNT(*) as count'), DB::raw('SUM(amount) as total'))
            ->groupBy('stage')
            ->get()
            ->map(function ($item) {
                $item->stage_label = OpportunityStage::from($item->stage)->label();

                return $item;
            });
    }

    /**
     * Get sales forecast for next 3 months
     */
    private function getForecast()
    {
        $forecast = [];

        for ($i = 0; $i < 3; $i++) {
            $month = Carbon::now()->addMonths($i);
            $forecast[] = [
                'month' => $month->format('F Y'),
                'expected' => Opportunity::open()
                    ->whereBetween('expected_close_date', [
                        $month->copy()->startOfMonth(),
                        $month->copy()->endOfMonth(),
                    ])
                    ->sum(DB::raw('amount * probability / 100')),
            ];
        }

        return $forecast;
    }

    /**
     * Get available lead sources from settings
     */
    private function getLeadSources()
    {
        // Get from settings or use defaults
        return [
            'Site web',
            'Réseaux sociaux',
            'Email',
            'Téléphone',
            'Salon/Événement',
            'Recommandation',
            'Partenaire',
            'Publicité',
            'Autre',
        ];
    }
}
