import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { PlusIcon, ChevronLeft, ChevronRight, RefreshCw, Filter, Search, X, Calendar, DollarSign, User, Star, StarOff, BarChart3 } from 'lucide-react';
import { Input } from '@/Components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Label } from '@/Components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Badge } from '@/Components/ui/badge';
import { toast } from 'sonner';
import ImportExportOpportunities from '@/Components/ImportExportOpportunities';
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
  users?: Array<{ id: number; name: string }>;
}

interface Filters {
  search: string;
  userId: string;
  minAmount: string;
  maxAmount: string;
  startDate: string;
  endDate: string;
}

export default function OpportunityKanban({ opportunities, stages, auth, users = [] }: Props) {
  const [columnHeight, setColumnHeight] = useState(0);
  const [deleteOpportunityId, setDeleteOpportunityId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localOpportunities, setLocalOpportunities] = useState(opportunities);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    userId: '',
    minAmount: '',
    maxAmount: '',
    startDate: '',
    endDate: '',
  });
  
  // Filter opportunities based on filters
  const filteredOpportunities = useMemo(() => {
    let filtered = [...localOpportunities];
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(opp => 
        opp.name.toLowerCase().includes(searchLower) ||
        opp.contact?.name?.toLowerCase().includes(searchLower) ||
        opp.company?.name?.toLowerCase().includes(searchLower)
      );
    }
    
    // User filter
    if (filters.userId) {
      filtered = filtered.filter(opp => opp.user?.id === parseInt(filters.userId));
    }
    
    // Amount filters
    if (filters.minAmount) {
      filtered = filtered.filter(opp => opp.amount >= parseFloat(filters.minAmount));
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(opp => opp.amount <= parseFloat(filters.maxAmount));
    }
    
    // Date filters
    if (filters.startDate) {
      filtered = filtered.filter(opp => {
        if (!opp.expected_close_date) return false;
        return new Date(opp.expected_close_date) >= new Date(filters.startDate);
      });
    }
    if (filters.endDate) {
      filtered = filtered.filter(opp => {
        if (!opp.expected_close_date) return false;
        return new Date(opp.expected_close_date) <= new Date(filters.endDate);
      });
    }
    
    return filtered;
  }, [localOpportunities, filters]);
  
  // Group filtered opportunities by stage
  const opportunitiesByStage = useMemo(() => {
    return stages.reduce((acc, stage) => {
      acc[stage.value] = filteredOpportunities.filter(opp => opp.stage === stage.value);
      return acc;
    }, {} as Record<string, Opportunity[]>);
  }, [stages, filteredOpportunities]);
  
  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.userId && filters.userId !== "") count++;
    if (filters.minAmount) count++;
    if (filters.maxAmount) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    return count;
  }, [filters]);
  
  const clearFilters = () => {
    setFilters({
      search: '',
      userId: '',
      minAmount: '',
      maxAmount: '',
      startDate: '',
      endDate: '',
    });
  };
  
  // Gestion des filtres favoris
  const [savedFilters, setSavedFilters] = useState<{name: string, filters: Filters}[]>([]);
  const [filterName, setFilterName] = useState('');
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  
  useEffect(() => {
    const saved = localStorage.getItem('kanban-saved-filters');
    if (saved) {
      setSavedFilters(JSON.parse(saved));
    }
  }, []);
  
  const saveCurrentFilter = () => {
    if (!filterName.trim()) return;
    
    const newSavedFilters = [...savedFilters, { name: filterName, filters: {...filters} }];
    setSavedFilters(newSavedFilters);
    localStorage.setItem('kanban-saved-filters', JSON.stringify(newSavedFilters));
    setFilterName('');
    setShowSaveFilter(false);
    toast.success(`Filtre "${filterName}" sauvegardé`);
  };
  
  const loadSavedFilter = (savedFilter: {name: string, filters: Filters}) => {
    setFilters(savedFilter.filters);
    toast.success(`Filtre "${savedFilter.name}" appliqué`);
  };
  
  const deleteSavedFilter = (index: number) => {
    const newSavedFilters = savedFilters.filter((_, i) => i !== index);
    setSavedFilters(newSavedFilters);
    localStorage.setItem('kanban-saved-filters', JSON.stringify(newSavedFilters));
    toast.success('Filtre supprimé');
  };

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

      const response = await fetch(`/api/opportunites/${opportunityId}`, {
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
    router.visit(`/opportunites/${opportunity.id}/edit`);
  };

  const handleDeleteOpportunity = async (id: number) => {
    setDeleteOpportunityId(id);
  };

  const handleDuplicateOpportunity = async (opportunity: Opportunity) => {
    try {
      const response = await fetch(`/opportunites/${opportunity.id}/dupliquer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin'
      });

      if (response.ok) {
        const data = await response.json();
        // Ajouter la nouvelle opportunité à la liste locale
        setLocalOpportunities(prev => [...prev, data.opportunity]);
        toast.success(data.message || 'Opportunité dupliquée avec succès');
      } else {
        toast.error('Erreur lors de la duplication');
      }
    } catch (error) {
      toast.error('Erreur lors de la duplication');
    }
  };

  const confirmDelete = async () => {
    if (!deleteOpportunityId) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/opportunites/${deleteOpportunityId}`, {
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
              <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-500 text-sm">Gestion visuelle du pipeline de ventes</p>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {filteredOpportunities.length} résultat{filteredOpportunities.length > 1 ? 's' : ''} filtré{filteredOpportunities.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <ImportExportOpportunities filters={filters} />
              
              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="relative">
                    <Filter className="h-4 w-4" />
                    {activeFiltersCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center"
                      >
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Filtres avancés</h4>
                      <div className="flex items-center gap-2">
                        {activeFiltersCount > 0 && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setShowSaveFilter(!showSaveFilter)}
                              className="text-xs"
                            >
                              <Star className="h-3 w-3 mr-1" />
                              Sauvegarder
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={clearFilters}
                              className="text-xs"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Réinitialiser
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Sauvegarder le filtre */}
                    {showSaveFilter && (
                      <div className="flex gap-2 p-2 bg-gray-50 rounded">
                        <Input
                          placeholder="Nom du filtre"
                          value={filterName}
                          onChange={(e) => setFilterName(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Button size="sm" onClick={saveCurrentFilter}>Sauver</Button>
                      </div>
                    )}
                    
                    {/* Filtres sauvegardés */}
                    {savedFilters.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Filtres sauvegardés</Label>
                        <div className="flex flex-wrap gap-1">
                          {savedFilters.map((saved, index) => (
                            <div key={index} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                              <button
                                onClick={() => loadSavedFilter(saved)}
                                className="hover:text-blue-600"
                              >
                                {saved.name}
                              </button>
                              <button
                                onClick={() => deleteSavedFilter(index)}
                                className="text-gray-400 hover:text-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Recherche */}
                    <div className="space-y-2">
                      <Label className="text-xs">Rechercher</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Nom, contact, entreprise..."
                          value={filters.search}
                          onChange={(e) => setFilters({...filters, search: e.target.value})}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    
                    {/* Utilisateur */}
                    {users && users.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs">Utilisateur assigné</Label>
                        <Select 
                          value={filters.userId || "all"} 
                          onValueChange={(value) => setFilters({...filters, userId: value === "all" ? "" : value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tous les utilisateurs" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les utilisateurs</SelectItem>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {/* Montant */}
                    <div className="space-y-2">
                      <Label className="text-xs">Montant</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            placeholder="Min"
                            value={filters.minAmount}
                            onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
                            className="pl-8"
                          />
                        </div>
                        <div className="relative flex-1">
                          <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            placeholder="Max"
                            value={filters.maxAmount}
                            onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
                            className="pl-8"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Dates */}
                    <div className="space-y-2">
                      <Label className="text-xs">Date de clôture prévue</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                            className="pl-8"
                          />
                        </div>
                        <div className="relative flex-1">
                          <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                            className="pl-8"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Link href="/kanban/stats">
                <Button variant="outline" title="Statistiques">
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </Link>
              
              <Button onClick={() => window.location.reload()} variant="outline" title="Rafraîchir">
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Link href="/opportunites/create">
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
                  onDuplicateOpportunity={handleDuplicateOpportunity}
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