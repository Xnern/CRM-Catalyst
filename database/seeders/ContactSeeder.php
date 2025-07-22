<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Contact; // N'oubliez pas d'importer votre modèle Contact
use App\Models\User;    // N'oubliez pas d'importer votre modèle User

class ContactSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Trouver l'utilisateur avec l'ID 1
        // Il est crucial que cet utilisateur existe déjà dans votre base de données.
        // Assurez-vous que votre UserSeeder (ou toute autre méthode de création d'utilisateurs)
        // est exécuté avant ce seeder, et qu'il crée bien un utilisateur avec l'ID 1.
        $user = User::find(1);

        if ($user) {
            // 2. Créer 10 contacts pour cet utilisateur spécifique
            Contact::factory()->count(10)->create([
                'user_id' => $user->id,
            ]);

            $this->command->info("10 contacts créés pour l'utilisateur avec l'ID: {$user->id}");

            // 3. (Optionnel) Créer quelques contacts pour d'autres utilisateurs
            // Ceci est utile pour tester le RBAC où un utilisateur ne voit que ses propres contacts.
            // Assurez-vous que ces autres utilisateurs existent.
            $otherUser = User::find(2); // Essayez de trouver un autre utilisateur

            if ($otherUser) {
                Contact::factory()->count(3)->create([
                    'user_id' => $otherUser->id,
                ]);
                $this->command->info("3 contacts créés pour l'utilisateur avec l'ID: {$otherUser->id}");
            } else {
                $this->command->warn("Utilisateur avec l'ID 2 non trouvé. Pas de contacts créés pour cet utilisateur.");
            }

            // 4. (Optionnel) Créer des contacts sans user_id spécifique (si votre schéma le permet et que c'est pertinent)
            // Attention : Si votre 'user_id' est non-nullable et 'constrained', cela échouera.
            // Contact::factory()->count(5)->create();
            // $this->command->info("5 contacts créés sans user_id spécifique.");

        } else {
            $this->command->error("Utilisateur avec l'ID 1 non trouvé. Aucun contact n'a pu être créé.");
        }
    }
}
