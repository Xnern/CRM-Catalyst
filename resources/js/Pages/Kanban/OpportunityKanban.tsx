import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { PlusIcon, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
// Drag and drop temporairement désactivé pour corriger l'erreur de boucle infinie
// import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
// import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import OpportunityKanbanColumn from '@/Components/Kanban/OpportunityKanbanColumn';
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

interface Contact {
  id: number;
  name: string;
  email?: string;
}

interface Company {
  id: number;
  name: string;
}

interface Opportunity {
  id: number;
  name: string;
  amount: number;
  probability: number;
  stage: string;
  expected_close_date: string | null;
  contact?: Contact;
  company?: Company;
  user?: {
    id: number;
    name: string;
  };
}

interface Props {
  opportunities: Opportunity[];
  stages: Array<{ value: string; label: string }>;
  auth: any;
}

export default function OpportunityKanban({ opportunities, stages, auth }: Props) {
  const [columnHeight, setColumnHeight] = useState(0);
  const [deleteOpportunityId, setDeleteOpportunityId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localOpportunities, setLocalOpportunities] = useState(opportunities);
  
  // Group opportunities by stage
  const opportunitiesByStage = useMemo(() => {
    return stages.reduce((acc, stage) => {
      acc[stage.value] = localOpportunities.filter(opp => opp.stage === stage.value);
      return acc;
    }, {} as Record<string, Opportunity[]>);
  }, [stages, localOpportunities]);

  useEffect(() => {
    const calcHeight = () => {
      const headerH = 140;
      const footerH = 40;
      setColumnHeight(window.innerHeight - headerH - footerH);
    };
    calcHeight();
    window.addEventListener('resize', calcHeight);
    return () => window.removeEventListener('resize', calcHeight);
  }, []);

  // Scroll horizontal
  const columnsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    if (columnsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = columnsRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
    }
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const ref = columnsRef.current;
    if (ref) {
      ref.addEventListener('scroll', updateScrollButtons);
      return () => ref.removeEventListener('scroll', updateScrollButtons);
    }
  }, [updateScrollButtons]);

  const scrollLeft = () => {
    columnsRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
  };
  const scrollRight = () => {
    columnsRef.current?.scrollBy({ left: 320, behavior: 'smooth' });
  };

  const handleMoveOpportunity = useCallback(async (opportunityId: number, newStage: string) => {
    try {
      // Calculer automatiquement la probabilité selon l'étape
      const probability = newStage === 'nouveau' ? 10 :
                         newStage === 'qualification' ? 25 :
                         newStage === 'proposition_envoyee' ? 50 :
                         newStage === 'negociation' ? 75 :
                         newStage === 'converti' ? 100 :
                         newStage === 'perdu' ? 0 : 50;

      const opportunity = localOpportunities.find(o => o.id === opportunityId);
      if (!opportunity) return;

      const response = await fetch(`/api/opportunities/${opportunityId}`, {
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
          probability: probability
        }),
      });

      if (response.ok) {
        // Mettre à jour localement
        setLocalOpportunities(prev => prev.map(opp => 
          opp.id === opportunityId 
            ? { ...opp, stage: newStage, probability }
            : opp
        ));
        
        const stageLabel = stages.find(s => s.value === newStage)?.label || newStage;
        toast.success(`Opportunité déplacée vers "${stageLabel}"`);
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  }, [localOpportunities, stages]);

  const handleEditOpportunity = (opportunity: Opportunity) => {
    router.visit(`/opportunities/${opportunity.id}/edit`);
  };

  const handleDeleteOpportunity = async (id: number) => {
    setDeleteOpportunityId(id);
  };

  const confirmDelete = async () => {
    if (!deleteOpportunityId) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/opportunities/${deleteOpportunityId}`, {
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
        // Retirer l'opportunité de la liste locale
        setLocalOpportunities(prev => prev.filter(opp => opp.id !== deleteOpportunityId));
        toast.success('Opportunité supprimée avec succès');
        setDeleteOpportunityId(null);
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
    <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Pipeline Kanban</h2>}>
      <Head title="Pipeline Kanban" />
      <div className="py-6 h-full flex flex-col">
        <div className="bg-white p-6 flex flex-col flex-1 relative">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-bold">Pipeline des Opportunités</h3>
              <p className="text-gray-500 text-sm">Gestion visuelle du pipeline de ventes</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => window.location.reload()} variant="outline">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Link href="/opportunities/create">
                <Button>
                  <PlusIcon className="mr-2 h-4 w-4" /> Nouvelle Opportunité
                </Button>
              </Link>
            </div>
          </div>

          {/* Drag and drop désactivé temporairement */}
          <div className="relative flex-1 overflow-hidden">
            <div ref={columnsRef} className="flex space-x-5 h-full overflow-x-auto pb-6">
              {stages.map(stage => (
                <OpportunityKanbanColumn
                  key={stage.value}
                  stage={stage.value}
                  stageLabel={stage.label}
                  opportunities={opportunitiesByStage[stage.value] || []}
                  columnHeight={columnHeight}
                  onDropOpportunity={handleMoveOpportunity}
                  onEditOpportunity={handleEditOpportunity}
                  onDeleteOpportunity={handleDeleteOpportunity}
                  onMoveOpportunity={handleMoveOpportunity}
                  stages={stages}
                />
              ))}
            </div>
          </div>

          {canScrollLeft && (
            <Button onClick={scrollLeft} className="absolute left-2 top-1/2">
              <ChevronLeft />
            </Button>
          )}
          {canScrollRight && (
            <Button onClick={scrollRight} className="absolute right-2 top-1/2">
              <ChevronRight />
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpportunityId !== null} onOpenChange={(open) => !open && setDeleteOpportunityId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette opportunité ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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