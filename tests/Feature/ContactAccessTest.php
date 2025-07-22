<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    // Nettoyer les rôles et permissions avant chaque test
    app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    Permission::truncate();
    Role::truncate();

    Permission::firstOrCreate(['name' => 'view contacts']);
    Permission::firstOrCreate(['name' => 'view own contacts']);
    Permission::firstOrCreate(['name' => 'view all contacts']);

    Role::firstOrCreate(['name' => 'admin'])->givePermissionTo('view all contacts');
    Role::firstOrCreate(['name' => 'manager'])->givePermissionTo('view contacts');
    Role::firstOrCreate(['name' => 'sales'])->givePermissionTo('view own contacts');
});

test('admin can view all contacts', function () {
    $admin = User::factory()->create()->assignRole('admin');
    Contact::factory()->count(5)->create();

    $this->actingAs($admin, 'sanctum')
        ->getJson('/api/contacts')
        ->assertOk()
        ->assertJsonCount(5, 'data');
});

test('sales can only view their own contacts', function () {
    $salesUser = User::factory()->create()->assignRole('sales');
    $otherUser = User::factory()->create();

    Contact::factory()->create(['user_id' => $salesUser->id]);
    Contact::factory()->count(3)->create(['user_id' => $otherUser->id]);

    $this->actingAs($salesUser, 'sanctum')
        ->getJson('/api/contacts')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonFragment(['user_id' => $salesUser->id]);
});

test('manager can view all contacts (if policy allows)', function () {
    $manager = User::factory()->create()->assignRole('manager');
    Contact::factory()->count(5)->create();

    $this->actingAs($manager, 'sanctum')
        ->getJson('/api/contacts')
        ->assertOk()
        ->assertJsonCount(5, 'data');
});

test('unauthenticated user cannot view contacts', function () {
    $this->getJson('/api/contacts')
        ->assertUnauthorized();
});

test('sales cannot view another user\'s contact details', function () {
    $salesUser = User::factory()->create()->assignRole('sales');
    $otherUser = User::factory()->create();
    $otherContact = Contact::factory()->create(['user_id' => $otherUser->id]);

    $this->actingAs($salesUser, 'sanctum')
        ->getJson("/api/contacts/{$otherContact->id}")
        ->assertForbidden();
});

test('sales can view their own contact details', function () {
    $salesUser = User::factory()->create()->assignRole('sales');
    $ownContact = Contact::factory()->create(['user_id' => $salesUser->id]);

    $this->actingAs($salesUser, 'sanctum')
        ->getJson("/api/contacts/{$ownContact->id}")
        ->assertOk()
        ->assertJsonFragment(['id' => $ownContact->id]);
});

// Test avec filtres et tri de Spatie Query Builder
test('contacts can be filtered by name', function () {
    $admin = User::factory()->create()->assignRole('admin');
    Contact::factory()->create(['name' => 'Alice Smith']);
    Contact::factory()->create(['name' => 'Bob Johnson']);

    $this->actingAs($admin, 'sanctum')
        ->getJson('/api/contacts?filter[name]=Alice')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonFragment(['name' => 'Alice Smith']);
});

test('contacts can be sorted by name descending', function () {
    $admin = User::factory()->create()->assignRole('admin');
    Contact::factory()->create(['name' => 'Zoe']);
    Contact::factory()->create(['name' => 'Aaron']);

    $response = $this->actingAs($admin, 'sanctum')
        ->getJson('/api/contacts?sort=-name')
        ->assertOk();

    $data = $response->json('data');
    $this->assertEquals('Zoe', $data[0]['name']);
    $this->assertEquals('Aaron', $data[1]['name']);
});
