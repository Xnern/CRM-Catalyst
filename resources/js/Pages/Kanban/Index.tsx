// resources/js/Pages/Kanban/KanbanBoard.tsx

import React, { useState, useMemo, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { PlusIcon, MoreVertical } from 'lucide-react'; // Importez MoreVertical
import { useGetContactsQuery, useUpdateContactStatusMutation, useAddContactMutation, useUpdateContactMutation, useDeleteContactMutation } from '@/services/api';
import { Contact } from '@/types/Contact';
import ContactForm from '@/Components/ContactForm';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog';

// React DnD Imports
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Shadcn UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Separator } from '@/Components/ui/separator';
import { // Importez les composants DropdownMenu
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';


// Définition des types de glisser-déposer
const ItemTypes = {
    CONTACT: 'contact',
};

// --- KanbanCard Component (Draggable Item) ---
interface KanbanCardProps {
    contact: Contact;
    onEdit: (contact: Contact) => void;
    onDelete: (id: number) => void;
    onMoveContact: (contactId: number, newStatus: Contact['status']) => void; // Nouvelle prop
    kanbanStatuses: Contact['status'][]; // Nouvelle prop pour les statuts
}

const KanbanCard: React.FC<KanbanCardProps> = ({ contact, onEdit, onDelete, onMoveContact, kanbanStatuses }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.CONTACT,
        item: { id: contact.id, currentStatus: contact.status },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }), [contact]);

    return (
        <Card
            ref={drag}
            className={`
                p-3 cursor-grab bg-white rounded-lg shadow-sm relative // Ajout de relative pour positionner le menu
                hover:shadow-md transition-all duration-200 ease-in-out
                ${isDragging ? 'opacity-50 border-2 border-blue-400 transform scale-105' : 'border border-gray-200'}
            `}
            onDoubleClick={() => onEdit(contact)}
        >
            <CardTitle className="text-sm font-semibold text-gray-800 truncate pr-6"> {/* Ajout de pr-6 pour l'espace du menu */}
                {contact.name}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
                {contact.company || 'Sans entreprise'}
            </CardDescription>
            <p className="text-xs text-gray-600 truncate mt-1">
                {contact.email}
            </p>

            {/* Menu de déplacement */}
            <div className="absolute top-2 right-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
                            <span className="sr-only">Actions</span>
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel>Déplacer vers</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {kanbanStatuses.map((statusOption) => (
                            // N'affiche pas l'option si le contact est déjà dans ce statut
                            contact.status !== statusOption && (
                                <DropdownMenuItem key={statusOption} onClick={() => onMoveContact(contact.id, statusOption)}>
                                    {statusOption}
                                </DropdownMenuItem>
                            )
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(contact)}>
                            Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(contact.id)} className="text-red-600 focus:bg-red-50 focus:text-red-600">
                            Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </Card>
    );
};

// --- KanbanColumn Component (Droppable Target) ---
interface KanbanColumnProps {
    status: Contact['status'];
    contacts: Contact[];
    onDropContact: (contactId: number, newStatus: Contact['status']) => void;
    onEditContact: (contact: Contact) => void;
    onDeleteContact: (id: number) => void;
    onMoveContact: (contactId: number, newStatus: Contact['status']) => void; // Passé à la carte
    kanbanStatuses: Contact['status'][]; // Passé à la carte
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, contacts, onDropContact, onEditContact, onDeleteContact, onMoveContact, kanbanStatuses }) => {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: ItemTypes.CONTACT,
        drop: (item: { id: number; currentStatus: Contact['status'] }) => {
            if (item.currentStatus !== status) {
                onDropContact(item.id, status);
            }
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    }), [status, onDropContact]);

    const getStatusColor = (status: Contact['status']) => {
        switch (status) {
            case 'Nouveau': return 'bg-blue-50';
            case 'Qualification': return 'bg-yellow-50';
            case 'Proposition envoyée': return 'bg-purple-50';
            case 'Négociation': return 'bg-orange-50';
            case 'Converti': return 'bg-green-50';
            case 'Perdu': return 'bg-red-50';
            default: return 'bg-gray-50';
        }
    };

    return (
        <Card
            ref={drop}
            className={`
                w-80 min-w-[20rem] flex-shrink-0 flex flex-col
                rounded-lg shadow-lg border border-gray-200
                ${getStatusColor(status)}
                ${isOver ? 'border-2 border-blue-500 bg-blue-100 shadow-xl' : ''}
                transition-all duration-200 ease-in-out
            `}
        >
            <CardHeader className="pb-2 bg-white rounded-t-lg border-b border-gray-200">
                <CardTitle className="text-lg font-bold text-gray-800 flex justify-between items-center">
                    <span>{status}</span>
                    <span className="text-sm font-normal text-gray-500">{contacts.length}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex-grow overflow-hidden">
                <ScrollArea className="h-full pr-2 pb-2">
                    <div className="space-y-3">
                        {contacts.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-4">
                                Aucun contact ici pour l'instant.
                            </p>
                        ) : (
                            contacts.map((contact) => (
                                <KanbanCard
                                    key={contact.id}
                                    contact={contact}
                                    onEdit={onEditContact}
                                    onDelete={onDeleteContact}
                                    onMoveContact={onMoveContact} // Passez la fonction
                                    kanbanStatuses={kanbanStatuses} // Passez les statuts
                                />
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

// --- Main KanbanBoard Component ---
export default function KanbanBoard({ auth }: PageProps) {
    const kanbanStatuses: Contact['status'][] = ['Nouveau', 'Qualification', 'Proposition envoyée', 'Négociation', 'Converti', 'Perdu'];

    const {
        data: apiResponse,
        isLoading,
        isError,
        error,
    } = useGetContactsQuery({});

    const [updateContactStatus] = useUpdateContactStatusMutation();
    const [updateContact] = useUpdateContactMutation();
    const [addContact] = useAddContactMutation();
    const [deleteContact] = useDeleteContactMutation();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [backendErrors, setBackendErrors] = useState<{ [key: string]: string[] }>({});

    const groupedContacts = useMemo(() => {
        const groups: Record<Contact['status'], Contact[]> = {} as Record<Contact['status'], Contact[]>;
        kanbanStatuses.forEach(status => {
            groups[status] = [];
        });

        if (apiResponse?.data) {
            apiResponse.data.forEach(contact => {
                if (kanbanStatuses.includes(contact.status)) {
                    groups[contact.status].push(contact);
                } else {
                    // Si un contact a un statut qui n'est pas dans la liste, le placer dans 'Nouveau'
                    groups['Nouveau'].push(contact);
                }
            });
        }
        return groups;
    }, [apiResponse, kanbanStatuses]);

    // Gère le déplacement par glisser-déposer ou par le menu
    const handleMoveContact = useCallback(async (contactId: number, newStatus: Contact['status']) => {
        try {
            await updateContactStatus({ id: contactId, status: newStatus }).unwrap();
            toast.success(`Contact déplacé vers "${newStatus}"`);
        } catch (err) {
            console.error('Failed to update contact status:', err);
            toast.error('Échec du déplacement du contact. Veuillez réessayer.');
        }
    }, [updateContactStatus]);

    const handleCreateNew = () => { setSelectedContact(null); setBackendErrors({}); setIsModalOpen(true); };
    const handleEditContact = (contact: Contact) => { setSelectedContact(contact); setBackendErrors({}); setIsModalOpen(true); };

    const handleFormSubmit = async (values: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'user'>) => {
        setBackendErrors({});
        try {
            if (selectedContact) {
                await updateContact({ id: selectedContact.id, ...values }).unwrap();
                toast.success('Contact mis à jour avec succès.');
            } else {
                await addContact(values).unwrap();
                toast.success('Contact ajouté avec succès.');
            }
            setIsModalOpen(false);
            setSelectedContact(null);
        } catch (err) {
            console.error('Error saving contact:', err);
            if ((err as any).status === 422 && (err as any).data && (err as any).data.errors) {
                setBackendErrors((err as any).data.errors);
                toast.error('Veuillez corriger les erreurs dans le formulaire.');
            } else {
                toast.error('Échec de l\'enregistrement du contact. Une erreur inattendue est survenue.');
            }
        }
    };

    const handleDeleteContact = async (id: number) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce contact ? Cette action est irréversible.')) {
            return;
        }
        try {
            await deleteContact(id).unwrap();
            toast.success('Contact supprimé avec succès.');
        } catch (err) {
            console.error('Error deleting contact:', err);
            toast.error('Échec de la suppression du contact.');
        }
    };

    if (isLoading) {
        return (
            <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Kanban des Contacts</h2>}>
                <Head title="Kanban" />
                <div className="py-12">
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6 text-center text-gray-600">
                            Chargement du tableau Kanban...
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    if (isError) {
        return (
            <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Kanban des Contacts</h2>}>
                <Head title="Kanban" />
                <div className="py-12">
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6 text-red-500">
                            Erreur de chargement du Kanban : {JSON.stringify(error)}
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Kanban des Contacts</h2>}
        >
            <Head title="Kanban" />

            {/* Main container for the page content, ensuring it fills height */}
            <div className="py-6 h-full flex flex-col">
                <div className="max-w-full flex-grow mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">Tableau Kanban des Contacts</h3>
                            <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white">
                                <PlusIcon className="mr-2 h-4 w-4" /> Ajouter un contact
                            </Button>
                        </div>

                        <DndProvider backend={HTML5Backend}>
                            {/* Nouvelle div pour gérer le défilement horizontal du Kanban */}
                            <div className="flex-grow overflow-x-auto pb-4 custom-scrollbar-horizontal"> {/* Applique le scrollbar horizontal ici */}
                                <div className="flex space-x-5 h-full"> {/* Les colonnes sont dans cette div */}
                                    {kanbanStatuses.map((status) => (
                                        <KanbanColumn
                                            key={status}
                                            status={status}
                                            contacts={groupedContacts[status]}
                                            onDropContact={handleMoveContact} // Utilise la même fonction de déplacement
                                            onEditContact={handleEditContact}
                                            onDeleteContact={handleDeleteContact}
                                            onMoveContact={handleMoveContact} // Passez la fonction pour le menu
                                            kanbanStatuses={kanbanStatuses} // Passez les statuts pour le menu
                                        />
                                    ))}
                                </div>
                            </div>
                        </DndProvider>

                        {/* Add/Edit Contact Modal (unchanged) */}
                        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>{selectedContact ? 'Modifier' : 'Ajouter'} un contact</DialogTitle>
                                    <DialogDescription>
                                        {selectedContact ? 'Modifiez les informations du contact.' : 'Remplissez les informations pour ajouter un nouveau contact.'}
                                    </DialogDescription>
                                </DialogHeader>
                                <ContactForm
                                    initialData={selectedContact}
                                    onSubmit={handleFormSubmit}
                                    isLoading={isLoading}
                                    errors={backendErrors}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
