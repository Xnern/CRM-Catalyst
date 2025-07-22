<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run()
    {
        // 1. Réinitialiser le cache des rôles et permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 2. Créer les permissions (assurez-vous que toutes les permissions utilisées dans les policies sont ici)
        Permission::firstOrCreate(['name' => 'create contact']);
        Permission::firstOrCreate(['name' => 'manage contacts']); // Couvre update/delete dans la portée
        Permission::firstOrCreate(['name' => 'view all contacts']); // Pour les super admins
        Permission::firstOrCreate(['name' => 'view contacts']); // Portée plus large que 'own' (ex: pour managers)
        Permission::firstOrCreate(['name' => 'view own contacts']); // Pour les commerciaux (leurs propres contacts)

        // Vous pouvez ajouter d'autres permissions si nécessaire, par exemple:
        // Permission::firstOrCreate(['name' => 'edit own contacts']);
        // Permission::firstOrCreate(['name' => 'delete own contacts']);
        // Permission::firstOrCreate(['name' => 'view team contacts']); // Si vous avez une logique d'équipe pour les managers

        // 3. Créer les rôles et leur assigner les permissions **dans le bon ordre**

        // Rôle Administrateur
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        // L'administrateur a toutes les permissions existantes
        $adminRole->givePermissionTo(Permission::all());

        // Rôle Manager
        $managerRole = Role::firstOrCreate(['name' => 'manager']);
        $managerRole->givePermissionTo([
            'view contacts',      // Peut voir les contacts (portée définie par la policy/controller)
            'manage contacts',    // Peut créer, modifier, supprimer des contacts dans sa portée
            'create contact',     // Peut créer des contacts
            'view all contacts'   // Si un manager doit voir TOUS les contacts (sinon, retirez cette permission)
        ]);
        // Si un manager doit voir les contacts de son équipe, vous pourriez ajouter:
        // $managerRole->givePermissionTo('view team contacts');

        // Rôle Commercial (Sales)
        $salesRole = Role::firstOrCreate(['name' => 'sales']);
        $salesRole->givePermissionTo([
            'view own contacts',  // Ne peut voir que ses propres contacts
            'manage contacts',    // Peut créer, modifier, supprimer ses propres contacts
            'create contact'      // Peut créer des contacts
        ]);
        // Si vous avez des permissions plus granulaires pour les commerciaux:
        // $salesRole->givePermissionTo(['view own contacts', 'edit own contacts', 'delete own contacts', 'create contact']);

        // 4. (Optionnel) Assigner un rôle à un utilisateur de test si vous en créez ici
        // Exemple:
        // $user = \App\Models\User::factory()->create([
        //     'name' => 'Admin User',
        //     'email' => 'admin@example.com',
        //     'password' => bcrypt('password'),
        // ]);
        // $user->assignRole('admin');
    }
}
