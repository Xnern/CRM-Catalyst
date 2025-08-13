<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class KanbanController extends Controller
{
    /**
     * Display the Kanban board.
     */
    public function indexInertia()
    {
        return inertia('Kanban/Index');
    }
}
