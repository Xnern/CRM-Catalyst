<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class UserManagementController extends Controller
{
    public function __construct()
    {
        $this->middleware('can:view users')->only(['index', 'show']);
        $this->middleware('can:create users')->only(['store']);
        $this->middleware('can:edit users')->only(['update']);
        $this->middleware('can:delete users')->only(['destroy']);
        $this->middleware('can:assign roles')->only(['updateRoles']);
    }

    /**
     * Display a listing of users (Inertia)
     */
    public function index()
    {
        return Inertia::render('Users/Index');
    }

    /**
     * Display a listing of users (API)
     */
    public function apiIndex(Request $request)
    {
        $query = User::with(['roles', 'permissions']);

        // Search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filter by role
        if ($role = $request->input('role')) {
            $query->whereHas('roles', function ($q) use ($role) {
                $q->where('name', $role);
            });
        }

        $users = $query->paginate(10);

        // Add direct and total permissions count for each user
        $users->getCollection()->transform(function ($user) {
            $user->direct_permissions_count = $user->permissions->count();
            $user->total_permissions_count = $user->getAllPermissions()->count();

            return $user;
        });

        return response()->json($users);
    }

    /**
     * Get a specific user with roles and permissions
     */
    public function show($id)
    {
        $user = User::with(['roles'])->findOrFail($id);

        // Load direct permissions for the user
        $user->load('permissions');

        // Add direct permissions and role-inherited permissions
        $user->direct_permissions = $user->permissions;
        $user->role_permissions = $user->getPermissionsViaRoles();
        $user->all_permissions = $user->getAllPermissions();

        return response()->json([
            'user' => $user,
            'allRoles' => Role::all(),
            'allPermissions' => Permission::all()->map(function ($permission) {
                return [
                    'id' => $permission->id,
                    'name' => $permission->name,
                    'label' => $this->translatePermission($permission->name),
                ];
            }),
        ]);
    }

    /**
     * Store a new user
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8',
            'role' => 'required|exists:roles,name',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $user->assignRole($validated['role']);

        return response()->json([
            'message' => 'Utilisateur créé avec succès',
            'user' => $user->load('roles'),
        ], 201);
    }

    /**
     * Update user information
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,'.$id,
            'password' => 'sometimes|nullable|min:8',
        ]);

        if (isset($validated['password']) && $validated['password']) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'message' => 'Utilisateur mis à jour avec succès',
            'user' => $user->load(['roles', 'permissions']),
        ]);
    }

    /**
     * Update user roles
     */
    public function updateRoles(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'roles' => 'required|array',
            'roles.*' => 'exists:roles,name',
        ]);

        $user->syncRoles($validated['roles']);

        return response()->json([
            'message' => 'Rôles mis à jour avec succès',
            'user' => $user->load(['roles', 'permissions']),
        ]);
    }

    /**
     * Update user permissions
     */
    public function updatePermissions(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'permissions' => 'present|array',
            'permissions.*' => 'exists:permissions,name',
        ], [
            'permissions.present' => 'Le champ permissions doit être présent.',
            'permissions.array' => 'Les permissions doivent être un tableau.',
            'permissions.*.exists' => 'Une ou plusieurs permissions sélectionnées n\'existent pas.',
        ]);

        $user->syncPermissions($validated['permissions'] ?? []);

        return response()->json([
            'message' => 'Permissions mises à jour avec succès',
            'user' => $user->load(['roles', 'permissions']),
        ]);
    }

    /**
     * Delete a user
     */
    public function destroy($id)
    {
        $user = User::findOrFail($id);

        // Prevent deleting own account
        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'Vous ne pouvez pas supprimer votre propre compte',
            ], 403);
        }

        $user->delete();

        return response()->json([
            'message' => 'Utilisateur supprimé avec succès',
        ]);
    }

    /**
     * Send verification email to a user
     */
    public function sendVerificationEmail($id)
    {
        $user = User::findOrFail($id);

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Cet utilisateur a déjà vérifié son email',
            ], 400);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Email de vérification envoyé avec succès',
        ]);
    }

    /**
     * Get all roles and permissions
     */
    public function getRolesAndPermissions()
    {
        return response()->json([
            'roles' => Role::all(),
            'permissions' => Permission::all()->map(function ($permission) {
                return [
                    'id' => $permission->id,
                    'name' => $permission->name,
                    'label' => $this->translatePermission($permission->name),
                ];
            }),
        ]);
    }

    /**
     * Translate permission names to French
     */
    private function translatePermission($permission)
    {
        $translations = [
            // Contacts
            'create contact' => 'Créer un contact',
            'manage contacts' => 'Gérer les contacts',
            'view all contacts' => 'Voir tous les contacts',
            'view contacts' => 'Voir les contacts',
            'view own contacts' => 'Voir ses propres contacts',
            'delete contacts' => 'Supprimer les contacts',
            'create contacts' => 'Créer des contacts',
            'edit contacts' => 'Modifier les contacts',
            'import contacts' => 'Importer des contacts',
            'export contacts' => 'Exporter des contacts',

            // Documents
            'create document' => 'Créer un document',
            'manage documents' => 'Gérer les documents',
            'delete documents' => 'Supprimer les documents',
            'view all documents' => 'Voir tous les documents',
            'view documents' => 'Voir les documents',
            'view own documents' => 'Voir ses propres documents',
            'upload documents' => 'Téléverser des documents',
            'edit documents' => 'Modifier les documents',
            'download documents' => 'Télécharger les documents',

            // Entreprises
            'create company' => 'Créer une entreprise',
            'view own companies' => 'Voir ses propres entreprises',
            'view companies' => 'Voir les entreprises',
            'view all companies' => 'Voir toutes les entreprises',
            'manage companies' => 'Gérer les entreprises',
            'delete companies' => 'Supprimer les entreprises',
            'create companies' => 'Créer des entreprises',
            'edit companies' => 'Modifier les entreprises',

            // Paramètres CRM
            'view crm settings' => 'Voir les paramètres CRM',
            'manage crm settings' => 'Gérer les paramètres CRM',

            // Tableau de bord
            'view dashboard' => 'Voir le tableau de bord',
            'view all stats' => 'Voir toutes les statistiques',

            // Opportunités
            'view opportunities' => 'Voir les opportunités',
            'view all opportunities' => 'Voir toutes les opportunités',
            'create opportunities' => 'Créer des opportunités',
            'edit opportunities' => 'Modifier les opportunités',
            'delete opportunities' => 'Supprimer les opportunités',
            'change opportunity stage' => 'Changer le statut des opportunités',

            // Calendrier
            'view calendar' => 'Voir le calendrier',
            'manage calendar events' => 'Gérer les événements du calendrier',

            // Utilisateurs
            'view users' => 'Voir les utilisateurs',
            'create users' => 'Créer des utilisateurs',
            'edit users' => 'Modifier les utilisateurs',
            'delete users' => 'Supprimer les utilisateurs',
            'assign roles' => 'Assigner des rôles',

            // Rapports
            'view reports' => 'Voir les rapports',
            'export reports' => 'Exporter les rapports',
            'generate advanced reports' => 'Générer des rapports avancés',
        ];

        return $translations[$permission] ?? $permission;
    }
}
