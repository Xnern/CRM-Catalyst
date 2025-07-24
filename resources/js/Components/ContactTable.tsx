// src/Components/ContactTable.tsx

import React, { useState, useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { useGetContactsQuery, useDeleteContactMutation, GetContactsQueryParams } from '@/services/api';
import { Contact } from '@/types/Contact';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/Components/ui/alert-dialog';
import ContactForm from '@/Components/ContactForm';
import { toast } from 'sonner'; // <-- IMPORT DE LA FONCTION toast DE SONNER

const ContactTable: React.FC = () => {
  // Pas besoin de "const { toast } = useToast();" ici.

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });
  const [sorting, setSorting] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const queryParams: GetContactsQueryParams = {
    page: pagination.pageIndex + 1,
    per_page: pagination.pageSize,
    search: search || undefined,
    sort: sorting.length > 0 ? (sorting[0].desc ? `-${sorting[0].id}` : sorting[0].id) : undefined,
    includes: ['user'],
  };

  const { data, isLoading, isFetching, error } = useGetContactsQuery(queryParams as any);
  const [deleteContact, { isLoading: isDeleting }] = useDeleteContactMutation();

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedContact(null);
  };

  const handleContactUpdated = () => {
    handleCloseEditModal();
  };

  const handleDeleteContact = async (contactId: number) => {
    try {
      await deleteContact(contactId).unwrap();
      toast.success("Le contact a été supprimé avec succès !"); // <-- Utilisation de toast.success
    } catch (err) {
      console.error('Échec de la suppression du contact:', err);
      toast.error("Échec de la suppression du contact. Vérifiez les permissions ou la connexion."); // <-- Utilisation de toast.error
    }
  };

  const columns = useMemo<ColumnDef<Contact>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Nom
            {column.getIsSorted() === 'asc' ? ' 🔼' : column.getIsSorted() === 'desc' ? ' 🔽' : ''}
          </Button>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
      },
      {
        accessorKey: 'phone',
        header: 'Téléphone',
      },
      {
        accessorKey: 'address',
        header: 'Adresse',
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date Création
            {column.getIsSorted() === 'asc' ? ' 🔼' : column.getIsSorted() === 'desc' ? ' 🔽' : ''}
          </Button>
        ),
        cell: info => new Date(info.getValue() as string).toLocaleDateString(),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleEditContact(row.original)}>
              Modifier
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action ne peut pas être annulée. Cela supprimera définitivement le contact "{row.original.name}" de nos serveurs.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteContact(row.original.id)}>
                    Continuer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ),
      },
    ],
    [isDeleting] // `toast` n'est pas une dépendance ici car c'est une fonction globale
  );

  const table = useReactTable({
    data: data?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      pagination,
      sorting,
    },
    manualPagination: true,
    manualSorting: true,
    rowCount: data?.total || 0,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  });

  if (isLoading && !isFetching) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-700">Chargement des contacts...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">Erreur lors du chargement des contacts. Veuillez réessayer plus tard.</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <Input
        placeholder="Rechercher par nom..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Aucun contact trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Suivant
        </Button>
        <span className="text-sm text-muted-foreground ml-4">
          Page {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
        </span>
      </div>

      {/* Modale d'édition de contact */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier le contact</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du contact ci-dessous.
            </DialogDescription>
          </DialogHeader>
          {selectedContact && (
            <ContactForm
              contact={selectedContact}
              onSuccess={handleContactUpdated}
              onCancel={handleCloseEditModal}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactTable;
