<?php

namespace App\Http\Controllers;

use App\Models\EmailTemplate;
use App\Models\Contact;
use App\Models\Opportunity;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Auth;

class EmailTemplateController extends Controller
{
    public function index()
    {
        $templates = EmailTemplate::accessible()
            ->with('user:id,name')
            ->orderBy('category')
            ->orderBy('name')
            ->get()
            ->groupBy('category');

        return Inertia::render('EmailTemplates/Index', [
            'templates' => $templates,
            'categories' => EmailTemplate::categories(),
            'variables' => EmailTemplate::availableVariables(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|in:' . implode(',', array_keys(EmailTemplate::categories())),
            'subject' => 'required|string|max:255',
            'body' => 'required|string',
            'is_shared' => 'boolean',
        ]);

        $template = EmailTemplate::create([
            ...$validated,
            'user_id' => Auth::id(),
            'variables' => $this->extractVariables($validated['body']),
        ]);

        return redirect()->back()->with('success', 'Template créé avec succès');
    }

    public function update(Request $request, EmailTemplate $template)
    {
        // Vérifier les permissions
        if ($template->user_id !== Auth::id() && !Auth::user()->hasRole('admin')) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|in:' . implode(',', array_keys(EmailTemplate::categories())),
            'subject' => 'required|string|max:255',
            'body' => 'required|string',
            'is_shared' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $template->update([
            ...$validated,
            'variables' => $this->extractVariables($validated['body']),
        ]);

        return redirect()->back()->with('success', 'Template mis à jour');
    }

    public function destroy(EmailTemplate $template)
    {
        // Vérifier les permissions
        if ($template->user_id !== Auth::id() && !Auth::user()->hasRole('admin')) {
            abort(403);
        }

        $template->delete();

        return redirect()->back()->with('success', 'Template supprimé');
    }

    public function duplicate(EmailTemplate $template)
    {
        $newTemplate = $template->replicate();
        $newTemplate->name = $template->name . ' (Copie)';
        $newTemplate->user_id = Auth::id();
        $newTemplate->is_shared = false;
        $newTemplate->usage_count = 0;
        $newTemplate->save();

        return redirect()->back()->with('success', 'Template dupliqué avec succès');
    }

    public function preview(Request $request, EmailTemplate $template)
    {
        $data = [];

        // Si un contact est spécifié
        if ($request->has('contact_id')) {
            $contact = Contact::find($request->contact_id);
            if ($contact) {
                $data['{{contact_name}}'] = $contact->name;
                $data['{{contact_first_name}}'] = explode(' ', $contact->name)[0] ?? '';
                $data['{{contact_email}}'] = $contact->email;
                
                if ($contact->company) {
                    $data['{{company_name}}'] = $contact->company->name;
                }
            }
        }

        // Si une opportunité est spécifiée
        if ($request->has('opportunity_id')) {
            $opportunity = Opportunity::find($request->opportunity_id);
            if ($opportunity) {
                $data['{{opportunity_name}}'] = $opportunity->name;
                $data['{{opportunity_amount}}'] = number_format($opportunity->amount, 2, ',', ' ') . ' €';
            }
        }

        $rendered = $template->render($data);

        return response()->json([
            'subject' => $rendered['subject'],
            'body' => $rendered['body'],
            'variables_used' => $template->variables,
        ]);
    }

    public function send(Request $request, EmailTemplate $template)
    {
        $validated = $request->validate([
            'to' => 'required|email',
            'cc' => 'nullable|string',
            'bcc' => 'nullable|string',
            'subject' => 'required|string',
            'body' => 'required|string',
            'contact_id' => 'nullable|exists:contacts,id',
            'opportunity_id' => 'nullable|exists:opportunities,id',
        ]);

        try {
            // Envoyer l'email
            Mail::html($validated['body'], function ($message) use ($validated) {
                $message->to($validated['to'])
                        ->subject($validated['subject']);
                
                if (!empty($validated['cc'])) {
                    $message->cc(explode(',', $validated['cc']));
                }
                
                if (!empty($validated['bcc'])) {
                    $message->bcc(explode(',', $validated['bcc']));
                }
            });

            // Incrémenter le compteur d'utilisation
            $template->incrementUsage();

            // Logger l'activité si lié à un contact ou une opportunité
            if ($validated['contact_id']) {
                $contact = Contact::find($validated['contact_id']);
                $contact->logCustomActivity('Email envoyé', [
                    'template_id' => $template->id,
                    'subject' => $validated['subject'],
                ]);
            }

            if ($validated['opportunity_id']) {
                $opportunity = Opportunity::find($validated['opportunity_id']);
                $opportunity->logCustomActivity('Email envoyé', [
                    'template_id' => $template->id,
                    'subject' => $validated['subject'],
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Email envoyé avec succès',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'envoi de l\'email: ' . $e->getMessage(),
            ], 500);
        }
    }

    // API pour récupérer les templates dans un contexte donné
    public function apiIndex(Request $request)
    {
        $query = EmailTemplate::accessible()->active();

        if ($request->has('category')) {
            $query->byCategory($request->category);
        }

        $templates = $query->orderBy('usage_count', 'desc')
                          ->orderBy('name')
                          ->get();

        return response()->json($templates);
    }

    private function extractVariables(string $text): array
    {
        preg_match_all('/\{\{([^}]+)\}\}/', $text, $matches);
        return array_unique($matches[0]);
    }
}