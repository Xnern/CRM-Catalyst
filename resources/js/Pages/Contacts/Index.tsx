import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { PlusIcon, MoreHorizontal, UploadCloud } from 'lucide-react';
import { useGetContactsQuery, useAddContactMutation, useUpdateContactMutation, useDeleteContactMutation } from '@/services/api';
import { Contact } from '@/types/Contact';
import ContactForm from '@/Components/ContactForm';
import { toast } from 'sonner';
import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { DataTable } from '@/Components/DataTable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/Components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { debounce } from 'lodash';

// Interface pour Laravel paginated response
interface PaginatedApiResponse<T> {
    current_page: number;
    data: T[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: Array<{ url: string | null; label: string; active: boolean }>;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

// NOUVEAU: Interface pour les erreurs de validation du backend
interface BackendValidationErrors {
    [key: string]: string[]; // Ex: { name: ['Le nom est requis.'], email: ['Email invalide.'] }
}

// --- Utility functions for persistence ---
const getPersistedState = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn(`Failed to read from localStorage key "${key}":`, error);
        return defaultValue;
    }
};

const persistState = <T,>(key: string, state: T): void => {
    try {
        localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
        console.warn(`Failed to write to localStorage key "${key}":`, error);
    }
};


export default function Index({ auth, errors, canCreateContact }: PageProps<{ canCreateContact: boolean }>) {
    // --- Pagination and search states managed here and persisted ---
    const [currentPage, setCurrentPage] = useState<number>(() => getPersistedState('contactsCurrentPage', 1));
    const [perPage, setPerPage] = useState<number>(() => getPersistedState('contactsPerPage', 15));
    const [searchQuery, setSearchQuery] = useState<string>(() => getPersistedState('contactsSearchQuery', ''));
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>(searchQuery);

    // NOUVEAU: État pour stocker les erreurs de validation du backend
    const [backendErrors, setBackendErrors] = useState<BackendValidationErrors>({});

    // Persist perPage and searchQuery (the raw input term) every time they change
    useEffect(() => {
        persistState('contactsPerPage', perPage);
    }, [perPage]);

    useEffect(() => {
        persistState('contactsSearchQuery', searchQuery);
    }, [searchQuery]);

    // --- Debounce logic for search ---
    const debouncedSetSearchAndPage = useCallback(
        debounce((value: string) => {
            setDebouncedSearchQuery(value);
            setCurrentPage(1); // Crucially, go back to the first page for a new search
        }, 500),
        []
    );

    // Handles changes in the search input
    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        debouncedSetSearchAndPage(value);
    };

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

    // Bulk delete states
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

    // CSV import form
    const { data: importFormData, setData: setImportFormData, post: importPost, processing: importProcessing, errors: importErrors, reset: importReset } = useForm({
        file: null as File | null,
    });

    // RTK Query to fetch contacts
    const {
        data: apiResponse,
        isLoading,
        isError,
        error,
        refetch,
    } = useGetContactsQuery({
        page: currentPage,
        per_page: perPage,
        search: debouncedSearchQuery,
        include: 'user', // IMPORTANT: Request the 'user' relationship from the backend
    });

    // Extract data and pagination info
    const contacts: Contact[] = useMemo(() => apiResponse?.data || [], [apiResponse]);
    const totalContacts = apiResponse?.total || 0;
    const lastPage = apiResponse?.last_page || 1;

    // RTK Query mutations
    const [addContact, { isLoading: isAdding }] = useAddContactMutation();
    const [updateContact, { isLoading: isUpdating }] = useUpdateContactMutation();
    const [deleteContact, { isLoading: isDeleting }] = useDeleteContactMutation();

    // DataTable Columns
    const columnHelper = createColumnHelper<Contact>();
    const columns: ColumnDef<Contact>[] = useMemo(() => [
        columnHelper.accessor('name', { header: 'Nom', cell: info => info.getValue() }),
        columnHelper.accessor('email', { header: 'Email', cell: info => info.getValue() }),
        columnHelper.accessor('phone', { header: 'Téléphone', cell: info => info.getValue() }),
        columnHelper.accessor('address', { header: 'Adresse', cell: info => info.getValue() || 'N/A' }), // Ajout de l'adresse
        columnHelper.accessor('user.name', {
            header: 'Créé par',
            // Corrected cell function to handle potentially undefined 'user' or 'user.name'
            cell: ({ row }) => row.original.user?.name || 'N/A',
        }),
        columnHelper.accessor('created_at', {
            header: 'Créé le',
            cell: info => info.getValue() ? new Date(info.getValue()).toLocaleDateString() : 'N/A'
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const contact = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Ouvrir le menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(contact)}>
                                Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(contact.id)}>
                                Supprimer
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        }),
    ], []);

    // --- Callback Management Functions ---

    // Handle page change (called by DataTable)
    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    // Handle per page change (called by DataTable)
    const handlePerPageChange = (newSize: string) => {
        const size = Number(newSize);
        setPerPage(size);
        setCurrentPage(1); // Very important: go back to the first page when changing perPage
    };

    // Handle add/edit
    const handleFormSubmit = async (values: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'user'>) => {
        setBackendErrors({}); // Réinitialise les erreurs à chaque soumission

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
            refetch(); // Refetch data after add/edit
        } catch (err) {
            console.error('Erreur lors de l\'enregistrement du contact:', err);
            // Gérer les erreurs de validation spécifiques du backend (status 422)
            if ((err as any).status === 422 && (err as any).data && (err as any).data.errors) {
                setBackendErrors((err as any).data.errors);
                toast.error('Veuillez corriger les erreurs dans le formulaire.');
            } else {
                toast.error('Échec de l\'enregistrement du contact. Une erreur inattendue est survenue.');
            }
        }
    };

    const handleCreateNew = () => {
        setSelectedContact(null);
        setBackendErrors({}); // Réinitialise les erreurs quand on ouvre pour créer
        setIsModalOpen(true);
    };

    const handleEdit = (contact: Contact) => {
        setSelectedContact(contact);
        setBackendErrors({}); // Réinitialise les erreurs quand on ouvre pour modifier
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteContact(id).unwrap();
            toast.success('Contact supprimé avec succès.');
            refetch();
        } catch (err) {
            console.error('Erreur lors de la suppression du contact:', err);
            toast.error('Échec de la suppression du contact.');
        }
    };

    const handleBulkDelete = async (ids: string[]) => {
        setSelectedContactIds(ids);
        setIsBulkDeleteConfirmOpen(true);
    };

    const confirmBulkDelete = async () => {
        try {
            for (const id of selectedContactIds) {
                await deleteContact(Number(id)).unwrap();
            }
            toast.success(`${selectedContactIds.length} contact(s) supprimé(s) avec succès.`);
            setIsBulkDeleteConfirmOpen(false);
            setSelectedContactIds([]); // Reset selected IDs
            refetch();
        }
        catch (err) {
            console.error('Erreur lors de la suppression groupée:', err);
            toast.error('Échec de la suppression groupée. Veuillez réessayer.');
        }
    };

    const handleImportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (importFormData.file) {
            importPost(route('contacts.import.csv'), {
                onSuccess: () => {
                    toast.success('Fichier CSV importé. Le traitement est en cours...');
                    setIsImportModalOpen(false);
                    importReset();
                    refetch(); // Refetch data after successful import
                    setCurrentPage(1); // Go back to first page after import
                },
                onError: (errors) => {
                    console.error('Erreur d\'importation:', errors);
                    toast.error('Échec de l\'importation. Vérifiez les erreurs.');
                },
            });
        } else {
            toast.error('Veuillez sélectionner un fichier CSV.');
        }
    };

    if (isError) {
        return (
            <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Contacts</h2>}>
                <Head title="Contacts" />
                <div className="py-12">
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6 text-red-500">
                            Erreur de chargement des contacts : {JSON.stringify(error)}
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Contacts</h2>}
        >
            <Head title="Contacts" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold">Liste des Contacts</h3>
                            <div className="flex gap-2">
                                {canCreateContact && (
                                    <Button onClick={() => setIsImportModalOpen(true)} variant="outline">
                                        <UploadCloud className="mr-2 h-4 w-4" /> Importer CSV
                                    </Button>
                                )}
                                {canCreateContact && (
                                    <Button onClick={handleCreateNew}>
                                        <PlusIcon className="mr-2 h-4 w-4" /> Ajouter un contact
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="mb-4">
                            <Input
                                type="text"
                                placeholder="Rechercher par nom, email ou téléphone..."
                                value={searchQuery}
                                onChange={handleSearchInputChange}
                                className="max-w-sm"
                            />
                        </div>

                        {contacts && (contacts.length > 0 || isLoading) ? (
                            <DataTable
                                columns={columns}
                                data={contacts}
                                isLoading={isLoading}
                                onBulkDelete={handleBulkDelete}
                                idAccessorKey="id"
                                pagination={{
                                    currentPage: currentPage,
                                    perPage: perPage,
                                    totalItems: totalContacts,
                                    totalPages: lastPage,
                                    onPageChange: handlePageChange,
                                    onPerPageChange: handlePerPageChange,
                                }}
                            />
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                Aucun contact trouvé. Commencez par en ajouter un ou importez-en !
                            </div>
                        )}

                        {/* Add/Edit Contact Modal */}
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
                                    isLoading={isAdding || isUpdating}
                                    errors={backendErrors}
                                />
                            </DialogContent>
                        </Dialog>

                        {/* CSV Import Modal */}
                        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Importer des Contacts (CSV)</DialogTitle>
                                    <DialogDescription>
                                        Sélectionnez un fichier CSV à importer. Le fichier doit contenir les colonnes 'name', 'email', 'phone'.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleImportSubmit} className="space-y-4">
                                    <Input
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) => setImportFormData('file', e.target.files ? e.target.files[0] : null)}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-foreground file:text-primary hover:file:bg-primary-foreground/90"
                                    />
                                    {importErrors.file && <p className="text-red-500 text-xs mt-1">{importErrors.file}</p>}
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button type="button" variant="outline">Annuler</Button>
                                        </DialogClose>
                                        <Button type="submit" disabled={importProcessing || !importFormData.file}>
                                            {importProcessing ? 'Importation en cours...' : 'Importer'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* Bulk Delete Confirmation Alert */}
                        <AlertDialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmer la suppression groupée</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Êtes-vous sûr de vouloir supprimer les {selectedContactIds.length} contact(s) sélectionné(s) ?
                                        Cette action est irréversible.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={confirmBulkDelete} className="bg-red-500 hover:bg-red-600">
                                        Supprimer
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
