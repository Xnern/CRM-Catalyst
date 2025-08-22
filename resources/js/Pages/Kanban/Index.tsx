import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { PlusIcon, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import {
  useAddContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
  useUpdateContactStatusMutation,
  useGetContactStatusOptionsQuery,
} from '@/services/api';
import type { Contact } from '@/types/Contact';
import ContactForm from '@/Components/ContactForm';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog';
import KanbanColumn from '@/Components/Kanban/KanbanColumn';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

type StatusOption = { value: string; label: string };

export default function KanbanBoard({ auth }) {
  // Fallback local si l'API meta n'est pas encore dispo
  const fallbackStatuses: StatusOption[] = useMemo(
    () => [
      { value: 'nouveau', label: 'Nouveau' },
      { value: 'qualification', label: 'Qualification' },
      { value: 'proposition_envoyee', label: 'Proposition envoyée' },
      { value: 'negociation', label: 'Négociation' },
      { value: 'converti', label: 'Converti' },
      { value: 'perdu', label: 'Perdu' },
    ],
    []
  );

  // Charger les options dynamiques depuis l’API meta
  const { data: statusRes, isLoading: isLoadingStatuses, isError: isErrorStatuses } = useGetContactStatusOptionsQuery();

  // Colonnes de Kanban: utiliser l’API sinon fallback
  const kanbanStatuses: StatusOption[] = useMemo(() => {
    const remote = statusRes?.data ?? [];
    if (Array.isArray(remote) && remote.length > 0) return remote;
    return fallbackStatuses;
  }, [statusRes?.data, fallbackStatuses]);

  // Nombre d'items par colonne/page
  const [perPage] = useState(15);

  // Hauteur dynamique des colonnes
  const [columnHeight, setColumnHeight] = useState(0);
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

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [backendErrors, setBackendErrors] = useState({});

  // Scroll horizontal
  const columnsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Mutations
  const [addContact] = useAddContactMutation();
  const [updateContact] = useUpdateContactMutation();
  const [deleteContact] = useDeleteContactMutation();
  const [updateStatus] = useUpdateContactStatusMutation();

  const handleMoveContact = async (contactId: number, newStatusValue: string) => {
    try {
      await updateStatus({ id: contactId, status: newStatusValue as Contact['status'] }).unwrap();
      const label = kanbanStatuses.find(s => s.value === newStatusValue)?.label ?? newStatusValue;
      toast.success(`Contact déplacé vers "${label}"`);
    } catch {
      toast.error('Déplacement impossible.');
    }
  };

  const handleCreateNew = () => {
    setSelectedContact(null);
    setBackendErrors({});
    setIsModalOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setBackendErrors({});
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (values: Partial<Contact>) => {
    setBackendErrors({});
    try {
      if (selectedContact) {
        await updateContact({ id: selectedContact.id, ...values }).unwrap();
        toast.success('Contact modifié.');
      } else {
        await addContact(values).unwrap();
        toast.success('Contact ajouté.');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      if (err.status === 422 && err.data?.errors) setBackendErrors(err.data.errors);
      toast.error("Erreur lors de l'enregistrement.");
    }
  };

  const handleDeleteContact = async (id: number) => {
    if (!window.confirm('Supprimer ce contact ?')) return;
    try {
      await deleteContact(id).unwrap();
      toast.success('Contact supprimé');
    } catch {
      toast.error('Échec de la suppression');
    }
  };

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

  return (
    <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Kanban des Contacts</h2>}>
      <Head title="Kanban" />
      <div className="py-6 h-full flex flex-col">
        <div className="bg-white p-6 flex flex-col flex-1 relative">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-bold">Tableau Kanban des Contacts</h3>
              <p className="text-gray-500 text-sm">Gestion visuelle</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => window.location.reload()} variant="outline">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={handleCreateNew} disabled={isLoadingStatuses && !isErrorStatuses}>
                <PlusIcon className="mr-2 h-4 w-4" /> Ajouter
              </Button>
            </div>
          </div>

          <DndProvider backend={HTML5Backend}>
            <div className="relative flex-1 overflow-hidden">
              <div ref={columnsRef} className="flex space-x-5 h-full overflow-x-auto pb-6">
                {kanbanStatuses.map(s => (
                  <KanbanColumn
                    key={s.value}
                    statusValue={s.value}
                    statusLabel={s.label}
                    perPage={perPage}
                    columnHeight={columnHeight}
                    onDropContact={handleMoveContact}
                    onEditContact={handleEditContact}
                    onDeleteContact={handleDeleteContact}
                    onMoveContact={handleMoveContact}
                    statuses={kanbanStatuses}
                  />
                ))}
              </div>
            </div>
          </DndProvider>

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

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedContact ? 'Modifier' : 'Ajouter'} un contact</DialogTitle>
                <DialogDescription>Formulaire de contact</DialogDescription>
              </DialogHeader>
              <ContactForm
                initialData={selectedContact}
                onSubmit={handleFormSubmit}
                isLoading={false}
                errors={backendErrors}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
