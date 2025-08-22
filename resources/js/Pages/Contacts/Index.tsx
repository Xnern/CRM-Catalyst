import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { PlusIcon, MoreHorizontal, UploadCloud, Eye } from 'lucide-react';
import {
  useGetContactsQuery,
  useAddContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
  useLazySearchCompaniesQuery,
  useLazySearchContactsQuery,
  // Company-Contact Relations - Hooks that match existing routes
  useAttachCompanyContactMutation,
  useDetachCompanyContactMutation,
  // Documents
  useUploadDocumentMutation,
  useUnlinkDocumentFromContactMutation,
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
import { ContactDetailsModal } from '@/Components/Contacts/ContactDetailsModal';

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

export default function ContactsIndex({ auth, errors, canCreateContact }: PageProps<{ canCreateContact: boolean }>) {
  // Pagination and search states
  const [currentPage, setCurrentPage] = useState<number>(() => getPersistedState('contactsCurrentPage', 1));
  const [perPage, setPerPage] = useState<number>(() => getPersistedState('contactsPerPage', 15));
  const [searchQuery, setSearchQuery] = useState<string>(() => getPersistedState('contactsSearchQuery', ''));
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>(searchQuery);

  useEffect(() => { persistState('contactsPerPage', perPage); }, [perPage]);
  useEffect(() => { persistState('contactsSearchQuery', searchQuery); }, [searchQuery]);

  // Search debouncing
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

  // Contact CRUD modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Delete confirmation states
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDetailsDeleteConfirmOpen, setIsDetailsDeleteConfirmOpen] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [detailsContactToDelete, setDetailsContactToDelete] = useState<number | null>(null);

  // CSV import form
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

  // Fetch contacts (RTK Query)
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
  const totalContacts = (apiResponse as any)?.meta?.total || 0;
  const lastPage = (apiResponse as any)?.meta?.last_page || 1;

  // CRUD mutations - Using optimized generic hooks
  const [addContact, { isLoading: isAdding }] = useAddContactMutation();
  const [updateContact, { isLoading: isUpdating }] = useUpdateContactMutation();
  const [deleteContact, { isLoading: isDeleting }] = useDeleteContactMutation();

  // Quick detail modal (contact)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsContactId, setDetailsContactId] = useState<number | null>(null);

  // Lazy search hooks (RTK) for modal usage
  const [triggerCompanies] = useLazySearchCompaniesQuery();
  const [triggerContacts] = useLazySearchContactsQuery();

  const searchCompanies = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) return [];
    try {
      const res: any = await triggerCompanies(q).unwrap();
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  }, [triggerCompanies]);

  const searchContacts = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) return [];
    try {
      const res: any = await triggerContacts(q).unwrap();
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  }, [triggerContacts]);

  // RTK hooks for company-contact relations
  const [attachCompanyContact] = useAttachCompanyContactMutation();
  const [detachCompanyContact] = useDetachCompanyContactMutation();
  const [uploadDocument] = useUploadDocumentMutation();
  const [unlinkDocumentFromContact] = useUnlinkDocumentFromContactMutation();

  // Wrappers passed to modal - Corrected fetchContact function
  const fetchContact = async (id: number) => {
    try {
      const resp = await fetch(`/api/contacts/${id}?include=company,documents`, {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (!resp.ok) return null;
      const result = await resp.json();

      // Extract .data if present (Laravel Resource structure)
      const contact = result.data || result;
      console.log('Contact chargé:', contact);

      return contact;
    } catch (error) {
      console.error('Erreur lors du chargement du contact:', error);
      return null;
    }
  };

  const fetchDocument = async (id: number) => {
    try {
      const resp = await fetch(`/api/documents/${id}`, { credentials: 'include', headers: { Accept: 'application/json' } });
      if (!resp.ok) return null;
      const result = await resp.json();
      return result.data || result;
    } catch {
      return null;
    }
  };

  // Company-contact relations handling with existing routes
  const linkCompany = async (contactId: number, companyId: number) => {
    await attachCompanyContact({ companyId, contactId }).unwrap();
  };

  const unlinkCompany = async (contactId: number, companyId: number) => {
    await detachCompanyContact({ companyId, contactId }).unwrap();
  };

  const unlinkDocument = async (docId: number, contactId: number) => {
    await unlinkDocumentFromContact({ id: docId, contactId }).unwrap();
  };

  const uploadDocumentDirect = async (form: FormData) => {
    return await uploadDocument(form).unwrap();
  };

  // Navigate to show page (instead of modal)
  const handleRowClick = (contact: Contact) => {
    router.visit(`/contacts/${contact.id}`);
  };

  // DataTable columns
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
        cell: ({ row }) => row.original.address || 'N/A',
      }),
      columnHelper.accessor('created_at', {
        header: 'Créé le',
        cell: (info) => (info.getValue() ? new Date(info.getValue() as any).toLocaleDateString() : 'N/A'),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const contact = row.original;
          return (
            <div className="flex items-center gap-1.5">
              {/* Eye button for quick preview (modal) */}
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                title="Aperçu rapide"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent propagation to row click
                  setDetailsContactId(contact.id);
                  setDetailsOpen(true);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()} // Prevent propagation
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleEdit(contact)}>Modifier</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => askDeleteContact(contact)}>Supprimer</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      }),
    ],
    []
  );

  // DataTable pagination
  const handlePageChange = (newPage: number) => { setCurrentPage(newPage); };
  const handlePerPageChange = (newSize: string) => { setPerPage(Number(newSize)); setCurrentPage(1); };

  // Form submission (add/edit) - Coordinate normalization
  const [backendErrors, setBackendErrors] = useState<BackendValidationErrors>({});

  // Helper to normalize data before sending
  const normalizeContactPayload = (values: any) => {
    const toNumericOrNull = (v: any) => {
      if (v === '' || v === undefined || v === null) return null;
      const num = parseFloat(v);
      return isNaN(num) ? null : num;
    };

    return {
      ...values,
      latitude: toNumericOrNull(values.latitude),
      longitude: toNumericOrNull(values.longitude),
    };
  };

  const handleFormSubmit = async (
    values: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'user'>
  ) => {
    setBackendErrors({});
    try {
      // Normalize data before sending
      const payload = normalizeContactPayload(values);

      if (selectedContact) {
        await updateContact({ id: selectedContact.id, ...payload }).unwrap();
        toast.success('Contact mis à jour avec succès.');
      } else {
        await addContact(payload).unwrap();
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

  // CRUD handlers with confirmation
  const handleCreateNew = () => { setSelectedContact(null); setBackendErrors({}); setIsModalOpen(true); };
  const handleEdit = (contact: Contact) => { setSelectedContact(contact); setBackendErrors({}); setIsModalOpen(true); };

  // Request deletion confirmation (table)
  const askDeleteContact = (contact: Contact) => {
    setContactToDelete(contact);
    setIsDeleteConfirmOpen(true);
  };

  // Confirm deletion (table)
  const confirmDeleteContact = async () => {
    if (!contactToDelete) return;
    try {
      await deleteContact(contactToDelete.id).unwrap();
      toast.success('Contact supprimé avec succès.');
      refetch();
    } catch {
      toast.error('Échec de la suppression du contact.');
    } finally {
      setIsDeleteConfirmOpen(false);
      setContactToDelete(null);
    }
  };

  // Request deletion confirmation (detail modal)
  const askDeleteContactFromDetails = (id: number) => {
    setDetailsContactToDelete(id);
    setIsDetailsDeleteConfirmOpen(true);
  };

  // Confirm deletion (detail modal)
  const confirmDeleteContactFromDetails = async () => {
    if (!detailsContactToDelete) return;
    try {
      await deleteContact(detailsContactToDelete).unwrap();
      toast.success('Contact supprimé.');
      setDetailsOpen(false);
      setDetailsContactId(null);
      refetch();
    } catch {
      toast.error('Échec de la suppression.');
    } finally {
      setIsDetailsDeleteConfirmOpen(false);
      setDetailsContactToDelete(null);
    }
  };

  // Bulk deletion
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

  // CSV Import
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

  // Loading error
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

            {/* DataTable with row click navigation to show page */}
            {contacts && (contacts.length > 0 || isLoading) ? (
              <DataTable
                columns={columns}
                data={contacts}
                isLoading={isLoading}
                onBulkDelete={handleBulkDelete}
                idAccessorKey="id"
                onRowClick={handleRowClick} // Navigate to /contacts/{id}
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

            {/* Add/Edit contact modal */}
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

            {/* CSV Import modal */}
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

            {/* Individual deletion confirmation (table) */}
            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                  <AlertDialogDescription>
                    {contactToDelete
                      ? `Voulez-vous vraiment supprimer le contact "${contactToDelete.name}" ? Cette action est irréversible.`
                      : 'Voulez-vous vraiment supprimer ce contact ?'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmDeleteContact}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Bulk deletion confirmation */}
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

            {/* Deletion confirmation from detail modal */}
            <AlertDialog open={isDetailsDeleteConfirmOpen} onOpenChange={setIsDetailsDeleteConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                  <AlertDialogDescription>
                    {detailsContactToDelete && contacts.find(c => c.id === detailsContactToDelete)
                      ? `Voulez-vous vraiment supprimer le contact "${contacts.find(c => c.id === detailsContactToDelete)?.name}" ? Cette action est irréversible.`
                      : 'Voulez-vous vraiment supprimer ce contact ? Cette action est irréversible.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmDeleteContactFromDetails}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Quick contact detail modal (accessible via Eye button) */}
            <ContactDetailsModal
              open={detailsOpen}
              onOpenChange={setDetailsOpen}
              contactId={detailsContactId}
              // Data loaders
              fetchContact={fetchContact}
              fetchDocument={fetchDocument}
              // Link/detach company with existing routes
              linkCompany={linkCompany}
              unlinkCompany={unlinkCompany}
              // Unlink document
              unlinkDocument={unlinkDocument}
              // Search providers
              searchCompanies={searchCompanies}
              searchContacts={searchContacts}
              // Upload
              uploadDocument={uploadDocumentDirect}
              // Contact-level actions
              onEdit={(id) => {
                const c = contacts.find(c => c.id === id);
                if (c) { setSelectedContact(c); setIsModalOpen(true); }
              }}
              // Deletion with confirmation from detail modal
              onDelete={(id) => askDeleteContactFromDetails(id)}
              onAfterChange={() => {
                refetch();
              }}
            />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
