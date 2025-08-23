import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  Mail, 
  Phone, 
  User,
  Edit,
  Trash2,
  ArrowLeft,
  TrendingUp,
  Clock,
  FileText
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface Contact {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company?: {
    id: number;
    name: string;
  };
}

interface Company {
  id: number;
  name: string;
  domain?: string;
  industry?: string;
}

interface Product {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Activity {
  id: number;
  description: string;
  created_at: string;
  properties?: any;
}

interface Opportunity {
  id: number;
  name: string;
  stage: string;
  amount: number;
  probability: number;
  weighted_amount: number;
  expected_close_date: string;
  description?: string;
  contact?: Contact;
  company?: Company;
  products?: Product[];
  activities?: Activity[];
  created_at: string;
  updated_at: string;
}

interface Props {
  opportunity: Opportunity;
  auth: any;
}

const stageColors: Record<string, string> = {
  nouveau: 'bg-blue-100 text-blue-800',
  qualification: 'bg-yellow-100 text-yellow-800',
  proposition_envoyee: 'bg-purple-100 text-purple-800',
  negociation: 'bg-orange-100 text-orange-800',
  converti: 'bg-green-100 text-green-800',
  perdu: 'bg-red-100 text-red-800',
};

const stageLabels: Record<string, string> = {
  nouveau: 'Nouveau',
  qualification: 'Qualification',
  proposition_envoyee: 'Proposition envoyée',
  negociation: 'Négociation',
  converti: 'Converti',
  perdu: 'Perdu',
};

export default function Show({ opportunity, auth }: Props) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [currentStage, setCurrentStage] = useState(opportunity.stage);

  const handleStageChange = async (newStage: string) => {
    if (newStage === currentStage) return;
    
    setIsUpdatingStage(true);
    
    try {
      const response = await fetch(`/api/opportunities/${opportunity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          ...opportunity,
          stage: newStage,
          // Ajuster automatiquement la probabilité selon l'étape
          probability: newStage === 'nouveau' ? 10 :
                      newStage === 'qualification' ? 25 :
                      newStage === 'proposition_envoyee' ? 50 :
                      newStage === 'negociation' ? 75 :
                      newStage === 'converti' ? 100 :
                      newStage === 'perdu' ? 0 : opportunity.probability
        }),
      });

      if (response.ok) {
        setCurrentStage(newStage);
        toast.success('Étape mise à jour avec succès');
        // Rafraîchir la page pour voir les changements
        router.reload();
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/opportunities/${opportunity.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin'
      });

      if (response.ok) {
        toast.success('Opportunité supprimée avec succès');
        setIsDeleteDialogOpen(false);
        router.visit('/opportunities');
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/opportunities">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold">{opportunity.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={stageColors[currentStage]}>
                  {stageLabels[currentStage]}
                </Badge>
                <span className="text-sm text-gray-500">
                  Créée le {format(new Date(opportunity.created_at), 'dd MMMM yyyy', { locale: fr })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/opportunities/${opportunity.id}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            </Link>
            <Button 
              variant="destructive" 
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </div>
        </div>
      }
    >
      <Head title={`Opportunité - ${opportunity.name}`} />

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Financial Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Informations financières
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Montant</p>
                      <p className="text-2xl font-bold">{formatCurrency(opportunity.amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Probabilité</p>
                      <p className="text-2xl font-bold">{opportunity.probability}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Montant pondéré</p>
                      <p className="text-2xl font-bold text-primary-600">
                        {formatCurrency(opportunity.weighted_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date de clôture prévue</p>
                      <p className="text-lg font-semibold">
                        {format(new Date(opportunity.expected_close_date), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products */}
              {opportunity.products && opportunity.products.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Produits/Services
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {opportunity.products.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-500">
                              {product.quantity} × {formatCurrency(product.unit_price)}
                            </p>
                          </div>
                          <p className="font-semibold">{formatCurrency(product.total)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Description */}
              {opportunity.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 whitespace-pre-wrap">{opportunity.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Activities */}
              {opportunity.activities && opportunity.activities.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Historique d'activité
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {opportunity.activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                          <div className="mt-1">
                            <div className="h-2 w-2 bg-primary-600 rounded-full"></div>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{activity.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(activity.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Info */}
              {opportunity.contact && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Contact principal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Link 
                          href={`/contacts/${opportunity.contact.id}`}
                          className="font-medium text-primary-600 hover:underline"
                        >
                          {opportunity.contact.name}
                        </Link>
                      </div>
                      {opportunity.contact.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a href={`mailto:${opportunity.contact.email}`} className="text-gray-600 hover:text-gray-900">
                            {opportunity.contact.email}
                          </a>
                        </div>
                      )}
                      {opportunity.contact.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <a href={`tel:${opportunity.contact.phone}`} className="text-gray-600 hover:text-gray-900">
                            {opportunity.contact.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Company Info */}
              {opportunity.company && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Entreprise
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <Link 
                          href={`/companies/${opportunity.company.id}`}
                          className="font-medium text-primary-600 hover:underline"
                        >
                          {opportunity.company.name}
                        </Link>
                      </div>
                      {opportunity.company.industry && (
                        <p className="text-sm text-gray-600">
                          Secteur: {opportunity.company.industry}
                        </p>
                      )}
                      {opportunity.company.domain && (
                        <p className="text-sm text-gray-600">
                          Site web: <a href={`https://${opportunity.company.domain}`} target="_blank" className="text-primary-600 hover:underline">
                            {opportunity.company.domain}
                          </a>
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stage Progression */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Progression
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Stage Selector */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Changer l'étape
                      </label>
                      <Select
                        value={currentStage}
                        onValueChange={handleStageChange}
                        disabled={isUpdatingStage}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner une étape" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(stageLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isUpdatingStage && (
                        <p className="text-xs text-gray-500">Mise à jour en cours...</p>
                      )}
                    </div>

                    {/* Visual Progress */}
                    <div className="space-y-2 pt-2">
                      {Object.entries(stageLabels).map(([key, label], index) => {
                        const isActive = key === currentStage;
                        const pipelineStages = ['nouveau', 'qualification', 'proposition_envoyee', 'negociation'];
                        const currentIndex = pipelineStages.indexOf(currentStage);
                        const keyIndex = pipelineStages.indexOf(key);
                        
                        // Only mark as past if both are in the pipeline and key comes before current
                        const isPast = currentIndex !== -1 && keyIndex !== -1 && keyIndex < currentIndex;
                        
                        // Special styling for final stages
                        const isFinalStage = key === 'converti' || key === 'perdu';
                        const finalStageColor = key === 'converti' ? 'bg-green-500' : key === 'perdu' ? 'bg-red-500' : '';
                        
                        return (
                          <div key={key} className={`flex items-center gap-3 p-2 rounded-lg ${isActive ? 'bg-primary-50' : ''}`}>
                            <div className={`h-3 w-3 rounded-full ${
                              isActive && isFinalStage ? finalStageColor :
                              isActive ? 'bg-primary-600' : 
                              isPast ? 'bg-green-500' : 
                              'bg-gray-300'
                            }`}></div>
                            <span className={`text-sm ${isActive ? 'font-semibold text-primary-700' : 'text-gray-600'}`}>
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'opportunité "{opportunity.name}" ?
              Cette action est irréversible et supprimera également tous les produits et activités associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthenticatedLayout>
  );
}