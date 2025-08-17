<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Comments in English only

        // 1) Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 2) Define permissions (idempotent)
        // Contacts
        Permission::firstOrCreate(['name' => 'create contact']);
        Permission::firstOrCreate(['name' => 'view own contacts']);
        Permission::firstOrCreate(['name' => 'view contacts']);
        Permission::firstOrCreate(['name' => 'view all contacts']);
        Permission::firstOrCreate(['name' => 'manage contacts']);   // update within scope
        Permission::firstOrCreate(['name' => 'delete contacts']);   // delete within scope

        // Companies
        Permission::firstOrCreate(['name' => 'create company']);
        Permission::firstOrCreate(['name' => 'view own companies']);
        Permission::firstOrCreate(['name' => 'view companies']);
        Permission::firstOrCreate(['name' => 'view all companies']);
        Permission::firstOrCreate(['name' => 'manage companies']);  // update within scope
        Permission::firstOrCreate(['name' => 'delete companies']);  // delete within scope

        // Documents
        Permission::firstOrCreate(['name' => 'create document']);
        Permission::firstOrCreate(['name' => 'view own documents']);
        Permission::firstOrCreate(['name' => 'view documents']);
        Permission::firstOrCreate(['name' => 'view all documents']);
        Permission::firstOrCreate(['name' => 'manage documents']);  // update within scope
        Permission::firstOrCreate(['name' => 'delete documents']);  // delete within scope

        // 3) Create roles and assign permissions

        // Admin: full access (can also be granted Permission::all())
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $adminRole->givePermissionTo([
            // Contacts
            'create contact',
            'view own contacts',
            'view contacts',
            'view all contacts',
            'manage contacts',
            'delete contacts',
            // Companies
            'create company',
            'view own companies',
            'view companies',
            'view all companies',
            'manage companies',
            'delete companies',
            // Documents
            'create document',
            'view own documents',
            'view documents',
            'view all documents',
            'manage documents',
            'delete documents',
        ]);

        // Manager: broad scoped access; can manage within scope, optionally no global view-all/delete
        $managerRole = Role::firstOrCreate(['name' => 'manager']);
        $managerRole->givePermissionTo([
            // Contacts
            'create contact',
            'view own contacts',
            'view contacts',
            'manage contacts',
            // Companies
            'create company',
            'view own companies',
            'view companies',
            'manage companies',
            // Documents
            'create document',
            'view own documents',
            'view documents',
            'manage documents',
            // Optional toggles (uncomment if desired):
            // 'view all contacts',
            // 'delete contacts',
            // 'view all companies',
            // 'delete companies',
            // 'view all documents',
            // 'delete documents',
        ]);

        // Sales: own-focused; can create and manage only within own (policy enforces scope)
        $salesRole = Role::firstOrCreate(['name' => 'sales']);
        $salesRole->givePermissionTo([
            // Contacts
            'create contact',
            'view own contacts',
            'manage contacts',
            // Companies (if sales owns accounts; keep or remove based on your model)
            'create company',
            'view own companies',
            'manage companies',
            // Documents
            'create document',
            'view own documents',
            'manage documents',
            // Optionally allow some broader read:
            // 'view contacts',
            // 'view companies',
            // 'view documents',
        ]);

        // 4) Optionally, grant admin all permissions explicitly (redundant but safe)
        // $adminRole->givePermissionTo(Permission::all());

        // 5) Clear cache after changes
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }
}
