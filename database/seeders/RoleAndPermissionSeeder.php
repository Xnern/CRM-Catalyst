<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            // CRM Settings
            'view crm settings',
            'manage crm settings',

            // Dashboard
            'view dashboard',
            'view all stats', // Pour voir les stats de tous les utilisateurs

            // Contacts
            'view contacts',
            'view all contacts', // Pour voir tous les contacts, pas seulement les siens
            'create contacts',
            'edit contacts',
            'delete contacts',
            'import contacts',
            'export contacts',

            // Companies
            'view companies',
            'view all companies',
            'create companies',
            'edit companies',
            'delete companies',

            // Opportunities
            'view opportunities',
            'view all opportunities',
            'create opportunities',
            'edit opportunities',
            'delete opportunities',
            'change opportunity stage',

            // Documents
            'view documents',
            'view all documents',
            'upload documents',
            'edit documents',
            'delete documents',
            'download documents',

            // Calendar
            'view calendar',
            'manage calendar events',

            // Users
            'view users',
            'create users',
            'edit users',
            'delete users',
            'assign roles',

            // Reports
            'view reports',
            'export reports',
            'generate advanced reports',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Create roles and assign permissions

        // Super Admin - Accès total
        $superAdmin = Role::firstOrCreate(['name' => 'super-admin']);
        $superAdmin->syncPermissions(Permission::all());

        // Admin - Gestion complète sauf paramètres système
        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->syncPermissions([
            'view dashboard',
            'view all stats',
            'view contacts',
            'view all contacts',
            'create contacts',
            'edit contacts',
            'delete contacts',
            'import contacts',
            'export contacts',
            'view companies',
            'view all companies',
            'create companies',
            'edit companies',
            'delete companies',
            'view opportunities',
            'view all opportunities',
            'create opportunities',
            'edit opportunities',
            'delete opportunities',
            'change opportunity stage',
            'view documents',
            'view all documents',
            'upload documents',
            'edit documents',
            'delete documents',
            'download documents',
            'view calendar',
            'manage calendar events',
            'view users',
            'create users',
            'edit users',
            'assign roles',
            'view reports',
            'export reports',
            'generate advanced reports',
        ]);

        // Manager - Peut gérer son équipe
        $manager = Role::firstOrCreate(['name' => 'manager']);
        $manager->syncPermissions([
            'view dashboard',
            'view all stats', // Peut voir les stats de son équipe
            'view contacts',
            'view all contacts', // Peut voir tous les contacts
            'create contacts',
            'edit contacts',
            'delete contacts',
            'export contacts',
            'view companies',
            'view all companies',
            'create companies',
            'edit companies',
            'view opportunities',
            'view all opportunities', // Peut voir toutes les opportunités
            'create opportunities',
            'edit opportunities',
            'change opportunity stage',
            'view documents',
            'view all documents',
            'upload documents',
            'edit documents',
            'download documents',
            'view calendar',
            'manage calendar events',
            'view reports',
            'export reports',
        ]);

        // Sales - Commercial standard
        $sales = Role::firstOrCreate(['name' => 'sales']);
        $sales->syncPermissions([
            'view dashboard',
            'view contacts',
            'create contacts',
            'edit contacts',
            'view companies',
            'create companies',
            'edit companies',
            'view opportunities',
            'create opportunities',
            'edit opportunities',
            'change opportunity stage',
            'view documents',
            'upload documents',
            'download documents',
            'view calendar',
            'manage calendar events',
            'view reports',
        ]);

        // Support - Accès en lecture principalement
        $support = Role::firstOrCreate(['name' => 'support']);
        $support->syncPermissions([
            'view dashboard',
            'view contacts',
            'view companies',
            'view opportunities',
            'view documents',
            'download documents',
            'view calendar',
        ]);

        // Assigner le rôle super-admin au premier utilisateur
        $firstUser = User::first();
        if ($firstUser) {
            $firstUser->assignRole('super-admin');
        }
    }
}
