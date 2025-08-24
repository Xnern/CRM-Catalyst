import React, { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Download, Upload, FileDown } from 'lucide-react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';

interface ImportExportProps {
  filters?: {
    stage?: string;
    user_id?: string;
    date_from?: string;
    date_to?: string;
  };
}

export default function ImportExportOpportunities({ filters }: ImportExportProps) {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });
    }

    const url = `/opportunites/exporter${params.toString() ? '?' + params.toString() : ''}`;
    
    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = url;
    link.download = `opportunities_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Export démarré');
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/opportunites/modele';
    link.download = 'template_opportunities.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Template téléchargé');
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    setIsImporting(true);
    
    const formData = new FormData();
    formData.append('file', importFile);

    router.post('/opportunites/importer', formData, {
      forceFormData: true,
      onSuccess: () => {
        toast.success('Import réussi');
        setShowImportDialog(false);
        setImportFile(null);
        router.reload();
      },
      onError: (errors) => {
        console.error(errors);
        toast.error('Erreur lors de l\'import');
      },
      onFinish: () => {
        setIsImporting(false);
      }
    });
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          title="Exporter les opportunités"
        >
          <Download className="h-4 w-4 mr-2" />
          Exporter
        </Button>
        
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              title="Importer des opportunités"
            >
              <Upload className="h-4 w-4 mr-2" />
              Importer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Importer des opportunités</DialogTitle>
              <DialogDescription>
                Importez vos opportunités depuis un fichier CSV. Les opportunités existantes seront mises à jour.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="file">Fichier CSV</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-gray-500">
                  Format: CSV avec séparateur point-virgule (;), encodage UTF-8
                </p>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <FileDown className="h-4 w-4 text-blue-600" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Besoin d'un modèle ?</p>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-blue-600"
                    onClick={handleDownloadTemplate}
                  >
                    Télécharger le template CSV
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 p-3 bg-amber-50 rounded-lg">
                <p className="text-sm font-medium text-amber-900">Instructions :</p>
                <ul className="text-xs text-amber-800 space-y-1">
                  <li>• Le fichier doit contenir les colonnes du template</li>
                  <li>• Les opportunités existantes seront mises à jour (par nom + entreprise)</li>
                  <li>• Les contacts et entreprises seront créés automatiquement si nécessaire</li>
                  <li>• Maximum 10 MB par fichier</li>
                </ul>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowImportDialog(false)}
                disabled={isImporting}
              >
                Annuler
              </Button>
              <Button
                onClick={handleImport}
                disabled={!importFile || isImporting}
              >
                {isImporting ? 'Import en cours...' : 'Importer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}