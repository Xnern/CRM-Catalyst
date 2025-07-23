import React, { useState, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { PlusIcon, MoreHorizontal } from 'lucide-react';
import { useGetContactsQuery, useDeleteContactMutation } from '@/services/api';
import { Contact } from '@/types/Contact';
import ContactForm from '@/Components/ContactForm';
import { toast } from 'sonner';
import {
  ColumnDef,
  createColumnHelper,
} from '@tanstack/react-table';
import { DataTable } from '@/Components/DataTable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/Components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';


export default function Index({ auth, errors, canCreateContact }: PageProps<{ canCreateContact: boolean }>) {
  const { data: apiResponse, isLoading, isError, error, refetch } = useGetContactsQuery({});
  const contacts: Contact[] = useMemo(() => apiResponse?.data || [], [apiResponse]);

  const [deleteContactMutation] = useDeleteContactMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const handleCreateNew = () => {
    setSelectedContact(null);
    setIsModalOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setIsModalOpen(true);
  };

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setSelectedContact(null);
    toast.success('Contact enregistré avec succès.');
    refetch();
  };

  const handleFormCancel = () => {
    setIsModalOpen(false);
    setSelectedContact(null);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteContactMutation(id).unwrap();
      toast.success('Contact supprimé avec succès.');
      refetch();
    } catch (err) {
      console.error('Échec de la suppression du contact:', err);
      toast.error('Erreur lors de la suppression du contact.');
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
        await Promise.all(ids.map(id => deleteContactMutation(Number(id)).unwrap()));
        toast.success(`${ids.length} contact(s) supprimé(s) avec succès.`);
        refetch();
    } catch (err) {
        console.error('Échec de la suppression groupée:', err);
        toast.error('Échec de la suppression groupée. Veuillez réessayer.');
    }
  };

  const columnHelper = createColumnHelper<Contact>();

  const columns = useMemo<ColumnDef<Contact, any>[]>(() => [
    columnHelper.accessor('name', {
      id: 'name', // <--- ID ajouté
      header: 'Nom',
      cell: (info) => info.getValue(),
      enableSorting: true,
      enableColumnFilter: true,
    }),
    columnHelper.accessor('email', {
      id: 'email', // <--- ID ajouté
      header: 'Email',
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor('phone', {
      id: 'phone', // <--- ID ajouté
      header: 'Téléphone',
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor('address', {
      id: 'address', // <--- ID ajouté
      header: 'Adresse',
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor('user.name', {
      id: 'user_name', // <--- ID ajouté (utilisé 'user_name' pour éviter le point)
      header: 'Créé par',
      cell: (info) => info.getValue() || 'N/A',
      enableSorting: true,
    }),
    columnHelper.accessor('created_at', {
      id: 'created_at', // <--- ID ajouté
      header: 'Date Création',
      cell: (info) => new Date(info.getValue() as string).toLocaleDateString(),
      enableSorting: true,
    }),
    columnHelper.display({
      id: 'actions', // Cet ID est déjà correct
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
              <DropdownMenuItem onClick={() => handleEdit(contact)}>Modifier</DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Supprimer
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action ne peut pas être annulée. Cela supprimera
                      définitivement ce contact de nos serveurs.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(contact.id)}>
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      enableColumnFilter: false,
      enableHiding: false, // Ne pas permettre de cacher la colonne d'actions
    }),
  ], [handleEdit, handleDelete]);

  if (isError) return <div>Erreur de chargement: {JSON.stringify(error)}</div>;


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
              {canCreateContact && (
                <Button onClick={handleCreateNew}>
                  <PlusIcon className="mr-2 h-4 w-4" /> Ajouter un contact
                </Button>
              )}
            </div>

            {contacts && contacts.length > 0 || isLoading ? (
              <DataTable
                columns={columns}
                data={contacts}
                isLoading={isLoading}
                onBulkDelete={handleBulkDelete}
                idAccessorKey="id"
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                Aucun contact trouvé. Commencez par en ajouter un !
              </div>
            )}

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{selectedContact ? 'Modifier le contact' : 'Ajouter un nouveau contact'}</DialogTitle>
                  <DialogDescription>
                    {selectedContact ? 'Mettez à jour les informations du contact ci-dessous.' : 'Remplissez les informations pour le nouveau contact.'}
                  </DialogDescription>
                </DialogHeader>
                <ContactForm
                  contact={selectedContact || undefined}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
