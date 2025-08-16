import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { PlusIcon, MoreHorizontal, UploadCloud } from 'lucide-react';
import {
  useGetContactsQuery,
  useAddContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
} from '@/services/api';
import { Contact } from '@/types/Contact';
import ContactForm from '@/Components/ContactForm';
import { toast } from 'sonner';
import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { DataTable } from '@/Components/DataTable';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { debounce } from 'lodash';

interface PaginatedApiResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  links: Array<{ url: string | null; label: string; active: boolean }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

interface BackendValidationErrors {
  [key: string]: string[];
}

const getPersistedState = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const persistState = <T,>(key: string, state: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore
  }
};

const formatPhoneNumberForDisplay = (phoneNumber: string | null | undefined): string => {
  if (!phoneNumber) return '';
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  const hasPlus = cleaned.startsWith('+');
  const digitsOnly = hasPlus ? cleaned.substring(1) : cleaned;
  if (digitsOnly.length === 10) {
    return `${hasPlus ? '+' : ''}${digitsOnly.substring(0, 2)} ${digitsOnly.substring(2, 4)} ${digitsOnly.substring(4, 6)} ${digitsOnly.substring(6, 8)} ${digitsOnly.substring(8, 10)}`;
  }
  return phoneNumber;
};

export default function Index({ auth, errors, canCreateContact }: PageProps<{ canCreateContact: boolean }>) {
  // Etat pagination et recherche
  const [currentPage, setCurrentPage] = useState<number>(() => getPersistedState('contactsCurrentPage', 1));
  const [perPage, setPerPage] = useState<number>(() => getPersistedState('contactsPerPage', 15));
  const [searchQuery, setSearchQuery] = useState<string>(() => getPersistedState('contactsSearchQuery', ''));
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>(searchQuery);

  // Erreurs backend (formulaire)
  const [backendErrors, setBackendErrors] = useState<BackendValidationErrors>({});

  useEffect(() => { persistState('contactsPerPage', perPage); }, [perPage]);
  useEffect(() => { persistState('contactsSearchQuery', searchQuery); }, [searchQuery]);

  // Debounce recherche
  const debouncedSetSearchAndPage = useCallback(
    debounce((value: string) => {
      setDebouncedSearchQuery(value);
      setCurrentPage(1);
    }, 500),
    []
  );

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSetSearchAndPage(value);
  };

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Suppression groupée
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  // Form import CSV
  const {
    data: importFormData,
    setData: setImportFormData,
    post: importPost,
    processing: importProcessing,
    errors: importErrors,
    reset: importReset,
  } = useForm({
    csv_file: null as File | null,
  });

  // Récupération des contacts (RTK Query)
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
    include: 'user',
  });

  const contacts = useMemo(() => apiResponse?.data || [], [apiResponse]);
  const totalContacts = apiResponse?.total || 0;
  const lastPage = apiResponse?.last_page || 1;

  // Mutations CRUD
  const [addContact, { isLoading: isAdding }] = useAddContactMutation();
  const [updateContact, { isLoading: isUpdating }] = useUpdateContactMutation();
  const [deleteContact, { isLoading: isDeleting }] = useDeleteContactMutation();

  // Colonnes DataTable
  const columnHelper = createColumnHelper<Contact>();
  const columns: ColumnDef<Contact>[] = useMemo(
    () => [
      columnHelper.accessor('name', { header: 'Nom', cell: (info) => info.getValue() }),
      columnHelper.accessor('email', { header: 'Email', cell: (info) => info.getValue() }),
      columnHelper.accessor('phone', {
        header: 'Téléphone',
        cell: ({ row }) => formatPhoneNumberForDisplay(row.original.phone),
      }),
      columnHelper.accessor('address', {
        header: 'Adresse',
        cell: ({ row }) => {
          if (row.original.address && row.original.latitude && row.original.longitude) {
            return (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${row.original.latitude},${row.original.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {row.original.address}
              </a>
            );
          }
          return row.original.address || 'N/A';
        },
      }),
      columnHelper.accessor('created_at', {
        header: 'Créé le',
        cell: (info) => (info.getValue() ? new Date(info.getValue()).toLocaleDateString() : 'N/A'),
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
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleEdit(contact)}>Modifier</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(contact.id)}>Supprimer</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      }),
    ],
    []
  );

  // Pagination DataTable
  const handlePageChange = (newPage: number) => { setCurrentPage(newPage); };
  const handlePerPageChange = (newSize: string) => { setPerPage(Number(newSize)); setCurrentPage(1); };

  // Submit du formulaire (add/edit)
  const handleFormSubmit = async (
    values: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'user'>
  ) => {
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
      refetch();
    } catch (err: any) {
      if (err?.status === 422 && err?.data?.errors) {
        setBackendErrors(err.data.errors);
        toast.error('Veuillez corriger les erreurs dans le formulaire.');
      } else {
        toast.error("Échec de l'enregistrement du contact. Une erreur inattendue est survenue.");
      }
    }
  };

  // Handlers CRUD
  const handleCreateNew = () => { setSelectedContact(null); setBackendErrors({}); setIsModalOpen(true); };
  const handleEdit = (contact: Contact) => { setSelectedContact(contact); setBackendErrors({}); setIsModalOpen(true); };
  const handleDelete = async (id: number) => {
    try {
      await deleteContact(id).unwrap();
      toast.success('Contact supprimé avec succès.');
      refetch();
    } catch {
      toast.error('Échec de la suppression du contact.');
    }
  };

  // Suppression groupée
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
      setSelectedContactIds([]);
      refetch();
    } catch {
      toast.error('Échec de la suppression groupée. Veuillez réessayer.');
    }
  };

  // Import CSV
  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (importFormData.csv_file) {
      importPost(route('contacts.import.csv'), {
        onSuccess: () => {
          toast.success('Fichier CSV importé. Le traitement est en cours...');
          setIsImportModalOpen(false);
          importReset();
          refetch();
          setCurrentPage(1);
        },
        onError: (errs) => {
          const e: any = errs;
          if (e.csv_file && e.csv_file.includes('validation.required')) {
            toast.error('Veuillez sélectionner un fichier CSV à importer.');
          } else if (e.csv_file) {
            toast.error(`Erreur d'importation du fichier: ${e.csv_file}`);
          } else {
            toast.error("Échec de l'importation CSV. Vérifiez les erreurs.");
          }
        },
      });
    } else {
      toast.error('Veuillez sélectionner un fichier CSV.');
    }
  };

  // Erreur chargement
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

      <div>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white overflow-hidden sm:rounded-lg p-6">
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

            {/* DataTable */}
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
                searchInput={{
                  value: searchQuery,
                  onChange: handleSearchInputChange,
                  placeholder: 'Rechercher par nom, email ou téléphone...',
                  className: 'flex-grow',
                }}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                Aucun contact trouvé. Commencez par en ajouter un ou importez-en !
              </div>
            )}

            {/* Modale Ajouter/Modifier un contact */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogContent
                className="sm:max-w-[600px] p-0"
                style={{ overflow: 'hidden' }}
              >
                <div
                  className="flex flex-col"
                  style={{ maxHeight: 'calc(100vh - 6rem)', minHeight: 300 }}
                >
                  <div className="px-6 py-4">
                    <DialogHeader className="p-0">
                      <DialogTitle>{selectedContact ? 'Modifier' : 'Ajouter'} un contact</DialogTitle>
                      <DialogDescription>
                        {selectedContact
                          ? 'Modifiez les informations du contact.'
                          : 'Remplissez les informations pour ajouter un nouveau contact.'}
                      </DialogDescription>
                    </DialogHeader>
                  </div>

                  <div
                    className="px-6 pb-4"
                    style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}
                  >
                    <ContactForm
                      initialData={selectedContact}
                      onSubmit={handleFormSubmit}
                      isLoading={isAdding || isUpdating}
                      errors={backendErrors}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Modale Import CSV */}
            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
              <DialogContent className="sm:max-w-[480px]">
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
                    onChange={(e) => setImportFormData('csv_file', e.target.files ? e.target.files[0] : null)}
                    className="p-0 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-foreground file:text-primary hover:file:bg-primary-foreground/90"
                  />
                  {(importErrors as any)?.csv_file && (
                    <p className="text-red-500 text-xs mt-1">{(importErrors as any).csv_file}</p>
                  )}
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Annuler</Button>
                    </DialogClose>
                    <Button type="submit" disabled={importProcessing || !importFormData.csv_file}>
                      {importProcessing ? 'Importation en cours...' : 'Importer'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Confirmation suppression groupée */}
            <AlertDialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression groupée</AlertDialogTitle>
                  <AlertDialogDescription>
                    Êtes-vous sûr de vouloir supprimer les {selectedContactIds.length} contact(s) sélectionné(s) ? Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmBulkDelete}
                    className="bg-red-500 hover:bg-red-600"
                  >
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
