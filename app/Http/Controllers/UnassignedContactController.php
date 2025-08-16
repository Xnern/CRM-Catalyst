<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use Illuminate\Http\Request;

class UnassignedContactController extends Controller
{
    /**
     * List contacts for selecting/attaching.
     * Supports:
     * - scope=unassigned (default) -> company_id IS NULL
     * - scope=all -> list all contacts (if your policy allows it)
     * - search on name/email/phone
     * - standard pagination
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Basic authorization: reuse your ContactPolicy@viewAny
        $this->authorize('viewAny', Contact::class);

        $perPage = (int)($request->get('per_page', 10));
        $search = trim((string)$request->get('search', ''));
        $scope = $request->get('scope', 'unassigned'); // 'unassigned' | 'all'

        $q = Contact::query()->with('user')->orderByDesc('created_at');

        if ($scope !== 'all') {
            $q->whereNull('company_id');
        }

        if ($search !== '') {
            $q->where(function ($sub) use ($search) {
                $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($user->can('view own contacts') && ! $user->can('view contacts') && ! $user->can('view all contacts') && ! $user->hasRole('admin')) {
            $q->where('user_id', $user->id);
        }

        return response()->json($q->paginate($perPage));
    }
}
