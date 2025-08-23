<?php

namespace App\Http\Controllers;

use App\Models\Opportunity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\OpportunitiesExport;
use App\Imports\OpportunitiesImport;

class OpportunityExportController extends Controller
{
    public function export(Request $request)
    {
        $query = Opportunity::with(['contact', 'company', 'notes', 'activities']);
        
        // Apply filters if provided
        if ($request->has('stage') && $request->stage !== 'all') {
            $query->where('stage', $request->stage);
        }
        
        if ($request->has('user_id') && $request->user_id !== 'all') {
            $query->where('user_id', $request->user_id);
        }
        
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        
        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        
        $opportunities = $query->get();
        
        $csvData = [];
        $csvData[] = [
            'ID',
            'Nom',
            'Stage',
            'Montant',
            'Probabilité',
            'Date de clôture prévue',
            'Contact',
            'Entreprise',
            'Email Contact',
            'Téléphone Contact',
            'Responsable',
            'Description',
            'Source',
            'Statut',
            'Dernière activité',
            'Créé le',
            'Mis à jour le'
        ];
        
        foreach ($opportunities as $opportunity) {
            $csvData[] = [
                $opportunity->id,
                $opportunity->name,
                $opportunity->stage,
                $opportunity->amount,
                $opportunity->probability,
                $opportunity->expected_close_date?->format('Y-m-d'),
                $opportunity->contact?->name,
                $opportunity->company?->name,
                $opportunity->contact?->email,
                $opportunity->contact?->phone,
                $opportunity->user?->name,
                $opportunity->description,
                $opportunity->source,
                $opportunity->status,
                $opportunity->last_activity_at?->format('Y-m-d H:i'),
                $opportunity->created_at->format('Y-m-d H:i'),
                $opportunity->updated_at->format('Y-m-d H:i'),
            ];
        }
        
        $filename = 'opportunities_' . date('Y-m-d_His') . '.csv';
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0'
        ];
        
        $callback = function() use ($csvData) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF)); // BOM for UTF-8
            
            foreach ($csvData as $row) {
                fputcsv($file, $row, ';');
            }
            
            fclose($file);
        };
        
        return Response::stream($callback, 200, $headers);
    }
    
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:csv,txt|max:10240', // 10MB max
        ]);
        
        $file = $request->file('file');
        $importResults = [
            'success' => 0,
            'errors' => [],
            'skipped' => 0
        ];
        
        if (($handle = fopen($file->getPathname(), 'r')) !== false) {
            // Skip header row
            $header = fgetcsv($handle, 0, ';');
            
            $lineNumber = 2;
            while (($data = fgetcsv($handle, 0, ';')) !== false) {
                try {
                    // Skip if name is empty
                    if (empty($data[1])) {
                        $importResults['skipped']++;
                        continue;
                    }
                    
                    // Check if opportunity already exists (by name and company)
                    $existingOpp = Opportunity::where('name', $data[1]);
                    if (!empty($data[7])) { // Company name
                        $company = \App\Models\Company::where('name', $data[7])->first();
                        if ($company) {
                            $existingOpp->where('company_id', $company->id);
                        }
                    }
                    
                    if ($existingOpp->exists()) {
                        // Update existing opportunity
                        $opportunity = $existingOpp->first();
                        $updateData = [];
                        
                        if (!empty($data[2])) $updateData['stage'] = $data[2];
                        if (!empty($data[3])) $updateData['amount'] = floatval(str_replace(',', '.', $data[3]));
                        if (!empty($data[4])) $updateData['probability'] = intval($data[4]);
                        if (!empty($data[5])) $updateData['expected_close_date'] = $data[5];
                        if (!empty($data[11])) $updateData['description'] = $data[11];
                        if (!empty($data[12])) $updateData['source'] = $data[12];
                        if (!empty($data[13])) $updateData['status'] = $data[13];
                        
                        $opportunity->update($updateData);
                    } else {
                        // Create new opportunity
                        $opportunityData = [
                            'name' => $data[1],
                            'stage' => $data[2] ?? 'new',
                            'amount' => !empty($data[3]) ? floatval(str_replace(',', '.', $data[3])) : 0,
                            'probability' => !empty($data[4]) ? intval($data[4]) : 10,
                            'expected_close_date' => !empty($data[5]) ? $data[5] : null,
                            'description' => $data[11] ?? '',
                            'source' => $data[12] ?? 'import',
                            'status' => $data[13] ?? 'open',
                            'user_id' => auth()->id(),
                        ];
                        
                        // Handle contact
                        if (!empty($data[6])) { // Contact name
                            $contact = \App\Models\Contact::firstOrCreate(
                                ['email' => $data[8] ?? $data[6] . '@import.local'],
                                [
                                    'name' => $data[6],
                                    'phone' => $data[9] ?? null,
                                    'user_id' => auth()->id(),
                                ]
                            );
                            $opportunityData['contact_id'] = $contact->id;
                        }
                        
                        // Handle company
                        if (!empty($data[7])) { // Company name
                            $company = \App\Models\Company::firstOrCreate(
                                ['name' => $data[7]],
                                [
                                    'user_id' => auth()->id(),
                                ]
                            );
                            $opportunityData['company_id'] = $company->id;
                        }
                        
                        Opportunity::create($opportunityData);
                    }
                    
                    $importResults['success']++;
                } catch (\Exception $e) {
                    $importResults['errors'][] = "Ligne $lineNumber: " . $e->getMessage();
                }
                
                $lineNumber++;
            }
            
            fclose($handle);
        }
        
        if ($importResults['success'] > 0) {
            $message = "{$importResults['success']} opportunité(s) importée(s) avec succès.";
            if ($importResults['skipped'] > 0) {
                $message .= " {$importResults['skipped']} ligne(s) ignorée(s).";
            }
            
            return redirect()->back()->with('success', $message);
        } else {
            return redirect()->back()->with('error', 'Aucune opportunité importée. Vérifiez le format du fichier.');
        }
    }
    
    public function downloadTemplate()
    {
        $csvData = [];
        $csvData[] = [
            'ID',
            'Nom',
            'Stage',
            'Montant',
            'Probabilité',
            'Date de clôture prévue',
            'Contact',
            'Entreprise',
            'Email Contact',
            'Téléphone Contact',
            'Responsable',
            'Description',
            'Source',
            'Statut',
            'Dernière activité',
            'Créé le',
            'Mis à jour le'
        ];
        
        // Add example row
        $csvData[] = [
            '1',
            'Exemple Opportunité',
            'qualification',
            '10000',
            '30',
            '2024-12-31',
            'Jean Dupont',
            'Entreprise ABC',
            'jean.dupont@example.com',
            '0123456789',
            'Commercial 1',
            'Description de l\'opportunité',
            'website',
            'open',
            '2024-01-15 10:30',
            '2024-01-01 09:00',
            '2024-01-15 10:30'
        ];
        
        $filename = 'template_opportunities.csv';
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0'
        ];
        
        $callback = function() use ($csvData) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF)); // BOM for UTF-8
            
            foreach ($csvData as $row) {
                fputcsv($file, $row, ';');
            }
            
            fclose($file);
        };
        
        return Response::stream($callback, 200, $headers);
    }
}