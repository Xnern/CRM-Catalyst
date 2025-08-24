<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Reminder;
use App\Models\User;
use App\Models\Opportunity;
use Carbon\Carbon;

class ReminderSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        if (!$user) {
            $this->command->info('No users found. Please create a user first.');
            return;
        }

        $opportunity = Opportunity::first();

        // Rappel en retard
        Reminder::create([
            'user_id' => $user->id,
            'opportunity_id' => $opportunity?->id,
            'title' => 'Appeler le client ABC',
            'description' => 'Faire un suivi sur la proposition envoyée la semaine dernière',
            'reminder_date' => Carbon::now()->subHours(2),
            'type' => 'call',
            'priority' => 'high',
            'status' => 'pending',
        ]);

        // Rappel pour aujourd'hui
        Reminder::create([
            'user_id' => $user->id,
            'opportunity_id' => $opportunity?->id,
            'title' => 'Réunion avec l\'équipe commerciale',
            'description' => 'Discuter de la stratégie Q4',
            'reminder_date' => Carbon::now()->addHours(2),
            'type' => 'meeting',
            'priority' => 'medium',
            'status' => 'pending',
        ]);

        // Rappel pour demain
        Reminder::create([
            'user_id' => $user->id,
            'title' => 'Envoyer le rapport mensuel',
            'description' => 'Préparer et envoyer le rapport de performance',
            'reminder_date' => Carbon::tomorrow()->setHour(14),
            'type' => 'email',
            'priority' => 'medium',
            'status' => 'pending',
        ]);

        // Rappel pour dans 3 jours
        Reminder::create([
            'user_id' => $user->id,
            'title' => 'Deadline projet XYZ',
            'description' => 'Date limite pour la livraison du projet',
            'reminder_date' => Carbon::now()->addDays(3),
            'type' => 'deadline',
            'priority' => 'high',
            'status' => 'pending',
        ]);

        // Rappel récurrent
        Reminder::create([
            'user_id' => $user->id,
            'title' => 'Revue hebdomadaire du pipeline',
            'description' => 'Analyser les opportunités en cours',
            'reminder_date' => Carbon::now()->next('Monday')->setHour(9),
            'type' => 'follow_up',
            'priority' => 'low',
            'status' => 'pending',
            'is_recurring' => true,
            'recurrence_pattern' => 'weekly',
            'recurrence_interval' => 1,
        ]);

        $this->command->info('5 test reminders created successfully!');
    }
}