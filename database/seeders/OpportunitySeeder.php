<?php

namespace Database\Seeders;

use App\Models\Opportunity;
use App\Models\OpportunityActivity;
use App\Models\Contact;
use App\Models\Company;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class OpportunitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $stages = ['nouveau', 'qualification', 'proposition_envoyee', 'negociation', 'converti', 'perdu'];
        $leadSources = ['Site web', 'Réseaux sociaux', 'Email', 'Téléphone', 'Salon/Événement', 'Recommandation'];
        $products = [
            ['name' => 'Logiciel CRM', 'price' => 99],
            ['name' => 'Formation', 'price' => 1500],
            ['name' => 'Consulting', 'price' => 5000],
            ['name' => 'Support Premium', 'price' => 299],
            ['name' => 'Intégration API', 'price' => 2500],
        ];
        
        // Get existing data
        $contacts = Contact::all();
        $companies = Company::all();
        $users = User::all();
        
        if ($contacts->isEmpty() || $users->isEmpty()) {
            $this->command->warn('No contacts or users found. Please run ContactSeeder and UserSeeder first.');
            return;
        }
        
        // Create 30 opportunities
        for ($i = 0; $i < 30; $i++) {
            $contact = $contacts->random();
            $user = $users->random();
            $stage = $stages[array_rand($stages)];
            
            // Calculate probability based on stage
            $probability = match($stage) {
                'nouveau' => rand(10, 20),
                'qualification' => rand(25, 40),
                'proposition_envoyee' => rand(50, 70),
                'negociation' => rand(75, 90),
                'converti' => 100,
                'perdu' => 0,
                default => 50,
            };
            
            // Random products selection
            $selectedProducts = [];
            $numProducts = rand(1, 3);
            for ($j = 0; $j < $numProducts; $j++) {
                $product = $products[array_rand($products)];
                $selectedProducts[] = [
                    'name' => $product['name'],
                    'quantity' => rand(1, 5),
                    'price' => $product['price'],
                ];
            }
            
            // Calculate amount from products
            $amount = array_reduce($selectedProducts, function ($carry, $item) {
                return $carry + ($item['quantity'] * $item['price']);
            }, 0);
            
            // Expected close date (varies by stage)
            $expectedCloseDate = match($stage) {
                'nouveau' => Carbon::now()->addDays(rand(60, 90)),
                'qualification' => Carbon::now()->addDays(rand(30, 60)),
                'proposition_envoyee' => Carbon::now()->addDays(rand(15, 30)),
                'negociation' => Carbon::now()->addDays(rand(7, 15)),
                'converti' => Carbon::now()->subDays(rand(1, 30)),
                'perdu' => Carbon::now()->subDays(rand(1, 30)),
                default => Carbon::now()->addDays(rand(30, 60)),
            };
            
            $opportunity = Opportunity::create([
                'name' => "Opportunité {$contact->name} - " . $selectedProducts[0]['name'],
                'description' => "Opportunité de vente pour {$contact->name}. Intéressé par nos solutions.",
                'contact_id' => $contact->id,
                'company_id' => $contact->company_id ?? $companies->random()->id,
                'user_id' => $user->id,
                'amount' => $amount,
                'currency' => 'EUR',
                'probability' => $probability,
                'stage' => $stage,
                'expected_close_date' => $expectedCloseDate,
                'actual_close_date' => in_array($stage, ['converti', 'perdu']) ? Carbon::now()->subDays(rand(1, 10)) : null,
                'lead_source' => $leadSources[array_rand($leadSources)],
                'loss_reason' => $stage === 'perdu' ? 'Budget insuffisant' : null,
                'next_step' => $stage === 'nouveau' ? 'Appeler pour qualifier' : 
                              ($stage === 'qualification' ? 'Envoyer proposition' : 
                              ($stage === 'proposition_envoyee' ? 'Relancer client' : null)),
                'products' => $selectedProducts,
                'competitors' => rand(0, 1) ? 'Salesforce, HubSpot' : null,
            ]);
            
            // Create some activities
            $numActivities = rand(2, 5);
            for ($j = 0; $j < $numActivities; $j++) {
                $activityTypes = ['note', 'call', 'email', 'meeting', 'task'];
                $type = $activityTypes[array_rand($activityTypes)];
                
                OpportunityActivity::create([
                    'opportunity_id' => $opportunity->id,
                    'user_id' => $user->id,
                    'type' => $type,
                    'title' => match($type) {
                        'note' => 'Note de suivi',
                        'call' => 'Appel client',
                        'email' => 'Email envoyé',
                        'meeting' => 'Réunion client',
                        'task' => 'Tâche à effectuer',
                        default => 'Activité',
                    },
                    'description' => match($type) {
                        'note' => 'Discussion avec le client sur ses besoins.',
                        'call' => 'Appel de qualification effectué. Client intéressé.',
                        'email' => 'Proposition commerciale envoyée par email.',
                        'meeting' => 'Présentation produit effectuée.',
                        'task' => 'Préparer contrat et conditions.',
                        default => 'Activité enregistrée.',
                    },
                    'scheduled_at' => $type === 'task' ? Carbon::now()->addDays(rand(1, 7)) : null,
                    'completed_at' => $type !== 'task' || rand(0, 1) ? Carbon::now()->subDays(rand(0, 5)) : null,
                    'created_at' => Carbon::now()->subDays(rand(0, 30)),
                ]);
            }
        }
        
        $this->command->info('30 opportunities created with activities!');
    }
}