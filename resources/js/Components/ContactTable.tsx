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
import { toast } from 'sonner';

const ContactTable: React.FC = () => {
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
    include: 'user',
  };

  const { data, isLoading, isFetching, error } = useGetContactsQuery(queryParams);
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
      toast.success("Contact deleted successfully!");
    } catch (err) {
      console.error('Failed to delete contact:', err);
      toast.error("Failed to delete contact. Check permissions or connection.");
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
            Name
            {column.getIsSorted() === 'asc' ? ' 🔼' : column.getIsSorted() === 'desc' ? ' 🔽' : ''}
          </Button>
        ),
        cell: info => <div className="min-w-[150px]">{info.getValue() as string}</div>,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: info => <div className="min-w-[200px]">{info.getValue() as string}</div>,
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        meta: { responsive: 'md' },
        cell: info => <div className="min-w-[120px]">{info.getValue() as string}</div>,
      },
      {
        accessorKey: 'address',
        header: 'Address',
        meta: { responsive: 'md' },
        cell: info => <div className="min-w-[250px]">{info.getValue() as string}</div>,
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Creation Date
            {column.getIsSorted() === 'asc' ? ' 🔼' : column.getIsSorted() === 'desc' ? ' 🔽' : ''}
          </Button>
        ),
        cell: info => <div className="min-w-[150px]">{new Date(info.getValue() as string).toLocaleDateString()}</div>,
        meta: { responsive: 'md' },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex space-x-2 min-w-[140px]">
            <Button variant="outline" size="sm" onClick={() => handleEditContact(row.original)}>
              Edit
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the contact "{row.original.name}" from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteContact(row.original.id)}>
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ),
      },
    ],
    [isDeleting]
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
        <span className="ml-2 text-gray-700">Loading contacts...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">Error loading contacts. Please try again later.</div>;
  }

  return (
    // The main container for the table view should respect the sidebar layout.
    // Instead of p-4, consider how this component is rendered within your overall layout.
    // If it's directly within a main content area that already has padding/margin
    // for the sidebar, then additional p-4 here might be redundant or additive.
    // For demonstration, I'll assume this is the main content area.
    <div className="space-y-4 px-4 sm:px-6 lg:px-8 xl:px-10"> {/* Adjusted padding */}
      <Input
        placeholder="Search by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* The container for the table now avoids using `max-w-full`
          and instead uses fixed breakpoints or adapts to the parent's available width.
          `w-full` will make it fill the available space, and `overflow-auto` within Table component
          will handle horizontal scrolling. */}
      <div className="rounded-md border">
        <Table> {/* The Table component itself handles overflow-x-auto */}
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={header.column.columnDef.meta?.responsive === 'md' ? 'hidden md:table-cell' : ''}>
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
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.responsive === 'md' ? 'hidden md:table-cell' : ''}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
        <span className="text-sm text-muted-foreground ml-4">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
      </div>

      {/* Contact Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information below.
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
