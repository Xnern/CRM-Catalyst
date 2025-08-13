// resources/js/Pages/Kanban/KanbanBoard.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { PlusIcon, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import {
  useAddContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
  useUpdateContactStatusMutation
} from '@/services/api';
import { Contact } from '@/types/Contact';
import ContactForm from '@/Components/ContactForm';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog';
import KanbanColumn from '@/Components/Kanban/KanbanColumn';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export default function KanbanBoard({ auth }) {
  // List of Kanban statuses
  const kanbanStatuses: Contact['status'][] = [
    'Nouveau',
    'Qualification',
    'Proposition envoyée',
    'Négociation',
    'Converti',
    'Perdu'
  ];

  // Number of items per column page
  const [perPage] = useState(15);

  // Dynamic height for column scroll area
  const [columnHeight, setColumnHeight] = useState(0);

  // Modal state and form data
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [backendErrors, setBackendErrors] = useState({});

  // Horizontal scroll control refs/states
  const columnsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // RTK Query mutation hooks for CRUD operations
  const [addContact] = useAddContactMutation();
  const [updateContact] = useUpdateContactMutation();
  const [deleteContact] = useDeleteContactMutation();
  const [updateStatus] = useUpdateContactStatusMutation();

  /**
   * Calculates available height for columns based on viewport,
   * minus header/footer, and updates on resize.
   */
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

  /**
   * Moves a contact to a different status (column).
   * Called from drag/drop or menu action.
   */
  const handleMoveContact = async (contactId: number, newStatus: Contact['status']) => {
    try {
      await updateStatus({ id: contactId, status: newStatus }).unwrap();
      toast.success(`Contact déplacé vers "${newStatus}"`);
    } catch {
      toast.error('Déplacement impossible.');
    }
  };

  /**
   * Opens the modal for creating a contact.
   */
  const handleCreateNew = () => {
    setSelectedContact(null);
    setBackendErrors({});
    setIsModalOpen(true);
  };

  /**
   * Opens the modal for editing a contact, with pre-filled data.
   */
  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setBackendErrors({});
    setIsModalOpen(true);
  };

  /**
   * Handles submitting the add/edit contact form.
   * Calls the appropriate mutation and closes the modal on success.
   */
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
      toast.error('Erreur lors de l\'enregistrement.');
    }
  };

  /**
   * Deletes a contact after confirmation.
   */
  const handleDeleteContact = async (id: number) => {
    if (!window.confirm('Supprimer ce contact ?')) return;
    try {
      await deleteContact(id).unwrap();
      toast.success('Contact supprimé');
    } catch {
      toast.error('Échec de la suppression');
    }
  };

  /**
   * Updates the state for horizontal scroll buttons
   * depending on the current scroll position.
   */
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

  // Scrolls horizontally to the left/right by a fixed amount
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
          {/* Board header with title and global actions */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-bold">Tableau Kanban des Contacts</h3>
              <p className="text-gray-500 text-sm">Gestion visuelle</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => window.location.reload()} variant="outline">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={handleCreateNew}>
                <PlusIcon className="mr-2 h-4 w-4" /> Ajouter
              </Button>
            </div>
          </div>

          {/* Drag-and-Drop context provider */}
          <DndProvider backend={HTML5Backend}>
            <div className="relative flex-1 overflow-hidden">
              <div ref={columnsRef} className="flex space-x-5 h-full overflow-x-auto pb-6">
                {kanbanStatuses.map(status => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    perPage={perPage}
                    columnHeight={columnHeight}
                    onDropContact={handleMoveContact}
                    onEditContact={handleEditContact}
                    onDeleteContact={handleDeleteContact}
                    onMoveContact={handleMoveContact}
                    kanbanStatuses={kanbanStatuses}
                  />
                ))}
              </div>
            </div>
          </DndProvider>

          {/* Horizontal scroll buttons */}
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

          {/* Add/Edit Contact Modal */}
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
