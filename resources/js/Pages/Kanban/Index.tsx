// resources/js/Pages/Kanban/KanbanBoard.tsx

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Head } from '@inertiajs/react';
import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import {
    PlusIcon,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    RefreshCw,
    Edit,
    Trash,
    AlertCircle
} from 'lucide-react';
import {
    useGetContactsQuery,
    useUpdateContactStatusMutation,
    useAddContactMutation,
    useUpdateContactMutation,
    useDeleteContactMutation
} from '@/services/api';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Skeleton } from '@/Components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar';
import { Badge } from '@/Components/ui/badge';


// Définition des types de glisser-déposer
const ItemTypes = {
    CONTACT: 'contact',
};

// --- KanbanCard Component (Draggable Item) ---
interface KanbanCardProps {
    contact: Contact;
    onEdit: (contact: Contact) => void;
    onDelete: (id: number) => void;
    onMoveContact: (contactId: number, newStatus: Contact['status']) => void;
    kanbanStatuses: Contact['status'][];
}

const KanbanCard: React.FC<KanbanCardProps> = ({ contact, onEdit, onDelete, onMoveContact, kanbanStatuses }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.CONTACT,
        item: { id: contact.id, currentStatus: contact.status },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }), [contact]);

    // Fonction pour obtenir les initiales du nom
    const getInitials = (name: string) => {
        const names = name.split(' ');
        return names.map(n => n[0]).join('').toUpperCase();
    };

    return (
        <Card
            ref={drag}
            className={`
                p-3 cursor-grab bg-white rounded-lg shadow-sm relative z-0
                hover:shadow-md transition-all duration-200 ease-in-out
                border-l-4 ${contact.status === 'Nouveau' ? 'border-blue-400' :
                            contact.status === 'Qualification' ? 'border-yellow-400' :
                            contact.status === 'Proposition envoyée' ? 'border-purple-400' :
                            contact.status === 'Négociation' ? 'border-orange-400' :
                            contact.status === 'Converti' ? 'border-green-400' : 'border-red-400'}
                ${isDragging ? 'opacity-50 border-2 border-blue-400 transform scale-105' : 'border border-gray-200'}
            `}
            onDoubleClick={() => onEdit(contact)}
        >
            <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={contact.avatar} alt={contact.name} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 font-medium">
                        {getInitials(contact.name)}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold text-gray-800 truncate">
                        {contact.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <span>{contact.company || 'Sans entreprise'}</span>
                        {contact.company && contact.industry && <span className="mx-1">•</span>}
                        {contact.industry && <Badge variant="outline" className="text-xs px-1.5 py-0.5">{contact.industry}</Badge>}
                    </CardDescription>
                    <p className="text-xs text-gray-600 truncate mt-1 flex items-center">
                        <a href={`mailto:${contact.email}`} className="hover:text-blue-600 hover:underline">
                            {contact.email}
                        </a>
                    </p>
                </div>
            </div>

            {/* Menu de déplacement */}
            <div className="absolute top-2 right-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
                            <span className="sr-only">Actions</span>
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-md shadow-lg border border-gray-200">
                        <DropdownMenuLabel className="font-medium text-gray-800">Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator className="my-1" />
                        <DropdownMenuItem
                            onClick={() => onEdit(contact)}
                            className="cursor-pointer px-3 py-2 hover:bg-gray-50"
                        >
                            <Edit className="mr-2 h-4 w-4 text-blue-500" /> Modifier
                        </DropdownMenuItem>

                        <DropdownMenuLabel className="font-medium text-gray-800 mt-1">Déplacer vers</DropdownMenuLabel>
                        <div className="grid grid-cols-2 gap-1 px-1">
                            {kanbanStatuses.map((statusOption) => (
                                contact.status !== statusOption && (
                                    <DropdownMenuItem
                                        key={statusOption}
                                        onClick={() => onMoveContact(contact.id, statusOption)}
                                        className="cursor-pointer px-2 py-1.5 text-xs hover:bg-gray-50 rounded"
                                    >
                                        {statusOption}
                                    </DropdownMenuItem>
                                )
                            ))}
                        </div>

                        <DropdownMenuSeparator className="my-1" />
                        <DropdownMenuItem
                            onClick={() => onDelete(contact.id)}
                            className="cursor-pointer px-3 py-2 text-red-600 hover:bg-red-50"
                        >
                            <Trash className="mr-2 h-4 w-4" /> Supprimer
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
    onMoveContact: (contactId: number, newStatus: Contact['status']) => void;
    kanbanStatuses: Contact['status'][];
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

    const getStatusTextColor = (status: Contact['status']) => {
        switch (status) {
            case 'Nouveau': return 'text-blue-700';
            case 'Qualification': return 'text-yellow-700';
            case 'Proposition envoyée': return 'text-purple-700';
            case 'Négociation': return 'text-orange-700';
            case 'Converti': return 'text-green-700';
            case 'Perdu': return 'text-red-700';
            default: return 'text-gray-700';
        }
    };

    return (
        <Card
            ref={drop}
            className={`
                w-80 min-w-[20rem] flex-shrink-0 flex flex-col
                rounded-lg shadow-sm border border-gray-200
                ${getStatusColor(status)}
                ${isOver ? 'border-2 border-blue-500 bg-blue-100 shadow-lg' : ''}
                transition-all duration-200 ease-in-out
            `}
        >
            <CardHeader className="py-3 px-4 rounded-t-lg border-b border-gray-200">
                <div className="flex justify-between items-center">
                    <CardTitle className={`text-md font-bold ${getStatusTextColor(status)} flex items-center gap-2`}>
                        <div className={`w-3 h-3 rounded-full ${status === 'Nouveau' ? 'bg-blue-500' :
                                        status === 'Qualification' ? 'bg-yellow-500' :
                                        status === 'Proposition envoyée' ? 'bg-purple-500' :
                                        status === 'Négociation' ? 'bg-orange-500' :
                                        status === 'Converti' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        {status}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-white border border-gray-300 text-gray-600">
                        {contacts.length}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-3 flex-grow overflow-hidden">
                <ScrollArea className="h-full pr-2 pb-2">
                    <div className="space-y-3">
                        {contacts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                <div className="bg-gray-100 border-2 border-dashed rounded-xl w-16 h-16 flex items-center justify-center">
                                    <ArrowLeft className="h-8 w-8 text-gray-400 rotate-180" />
                                </div>
                                <p className="text-gray-400 text-sm mt-3">
                                    Glissez-déposez des contacts ici
                                </p>
                            </div>
                        ) : (
                            contacts.map((contact) => (
                                <KanbanCard
                                    key={contact.id}
                                    contact={contact}
                                    onEdit={onEditContact}
                                    onDelete={onDeleteContact}
                                    onMoveContact={onMoveContact}
                                    kanbanStatuses={kanbanStatuses}
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
        refetch
    } = useGetContactsQuery({});

    const [updateContactStatus] = useUpdateContactStatusMutation();
    const [updateContact] = useUpdateContactMutation();
    const [addContact] = useAddContactMutation();
    const [deleteContact] = useDeleteContactMutation();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [backendErrors, setBackendErrors] = useState<{ [key: string]: string[] }>({});
    const columnsRef = useRef<HTMLDivElement>(null);

    // États pour gérer la visibilité des boutons de scroll
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);


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

    const updateScrollButtons = useCallback(() => {
        if (columnsRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = columnsRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
        }
    }, []);

    const scrollLeft = () => {
        if (columnsRef.current) {
            const columnWidth = columnsRef.current.firstElementChild?.offsetWidth + 20 || 320;
            const newPosition = columnsRef.current.scrollLeft - columnWidth;
            columnsRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (columnsRef.current) {
            const columnWidth = columnsRef.current.firstElementChild?.offsetWidth + 20 || 320;
            const newPosition = columnsRef.current.scrollLeft + columnWidth;
            columnsRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        updateScrollButtons();
        const ref = columnsRef.current;
        if (ref) {
            ref.addEventListener('scroll', updateScrollButtons);
            return () => {
                ref.removeEventListener('scroll', updateScrollButtons);
            };
        }
    }, [updateScrollButtons, isLoading]);


    if (isLoading) {
        return (
            <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Kanban des Contacts</h2>}>
                <Head title="Kanban" />
                <div className="py-12">
                    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <div className="flex justify-between items-center mb-6">
                                <Skeleton className="h-8 w-48" />
                                <Skeleton className="h-10 w-48" />
                            </div>

                            <div className="flex space-x-5 h-full">
                                {kanbanStatuses.map(status => (
                                    <div key={status} className="w-80 min-w-[20rem] flex-shrink-0">
                                        <div className="flex justify-between items-center mb-3">
                                            <Skeleton className="h-6 w-32" />
                                            <Skeleton className="h-6 w-8" />
                                        </div>
                                        <div className="space-y-3">
                                            {[...Array(3)].map((_, i) => (
                                                <Skeleton key={i} className="h-32 rounded-lg" />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6 text-red-500">
                            <div className="flex flex-col items-center justify-center py-10">
                                <div className="bg-red-100 rounded-full p-3 mb-4">
                                    <AlertCircle className="h-10 w-10 text-red-500" />
                                </div>
                                <h3 className="text-xl font-medium mb-2">Erreur de chargement</h3>
                                <p className="text-gray-600 mb-4 text-center">
                                    Impossible de charger les données du Kanban. Veuillez réessayer.
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => refetch()}
                                    className="border-gray-300 text-gray-700"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" /> Réessayer
                                </Button>
                            </div>
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

            <div className="py-6 h-full flex flex-col">
                <div className="max-w-full flex-grow mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden sm:rounded-lg p-6 h-full flex flex-col relative">
                        {/* En-tête fixe */}
                        <div className="flex justify-between items-center mb-6 flex-shrink-0">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Tableau Kanban des Contacts</h3>
                                <p className="text-gray-500 text-sm mt-1">
                                    Gestion visuelle de votre pipeline commercial
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => refetch()}
                                    className="border-gray-300 text-gray-700"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button onClick={handleCreateNew}>
                                    <PlusIcon className="mr-2 h-4 w-4" /> Ajouter un contact
                                </Button>
                            </div>
                        </div>
                        <DndProvider backend={HTML5Backend}>
                            <div className="relative flex-1 overflow-hidden">
                                <div
                                    ref={columnsRef}
                                    className="flex space-x-5 h-full pb-6 overflow-x-auto custom-scrollbar-horizontal"
                                    style={{ scrollBehavior: 'smooth' }}
                                >
                                    {kanbanStatuses.map((status) => (
                                        <KanbanColumn
                                            key={status}
                                            status={status}
                                            contacts={groupedContacts[status]}
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

                        {/* Boutons de navigation horizontale */}
                        {canScrollLeft && (
                            <Button
                                variant="outline"
                                size="icon"
                                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 bg-white border-gray-300 shadow-md rounded-full h-8 w-8"
                                onClick={scrollLeft}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        )}
                        {canScrollRight && (
                            <Button
                                variant="outline"
                                size="icon"
                                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 bg-white border-gray-300 shadow-md rounded-full h-8 w-8"
                                onClick={scrollRight}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        )}

                        {/* Add/Edit Contact Modal */}
                        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                            <DialogContent className="sm:max-w-[550px] rounded-lg">
                                <DialogHeader className="border-b pb-4">
                                    <DialogTitle className="text-xl font-bold">
                                        {selectedContact ? 'Modifier' : 'Ajouter'} un contact
                                    </DialogTitle>
                                    <DialogDescription>
                                        {selectedContact ? 'Mettez à jour les informations du contact' : 'Ajoutez un nouveau contact à votre tableau Kanban'}
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
