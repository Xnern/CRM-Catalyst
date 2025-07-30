<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class GoogleController extends Controller
{
    /**
     * Display the Google Calendar page.
     */
    public function indexInertia()
    {
        return inertia('Calendar/Index');
    }
}
