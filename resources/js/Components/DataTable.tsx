import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  PaginationState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Column,
  Header,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Components/ui/table';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Checkbox } from '@/Components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/Components/ui/alert-dialog';

import { ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon, Settings2, Trash2, Download, GripVertical } from 'lucide-react'; // <-- Ajout de GripVertical
import { toast } from 'sonner';
import Papa from 'papaparse';

// DND-KIT Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMemo } from 'react';


// Interface for DataTable props
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  onBulkDelete?: (selectedIds: string[]) => Promise<void>;
  idAccessorKey?: keyof TData;
}

// Sortable Header Component (for DND-KIT)
interface SortableHeaderProps<TData> {
  header: Header<TData, any>;
  children: React.ReactNode;
}

function SortableHeader<TData>({ header, children }: SortableHeaderProps<TData>) {
  // Les colonnes 'select' et 'actions' ne sont ni déplaçables ni ne nécessitent une poignée
  if (header.id === 'select' || header.id === 'actions') {
    return (
      <TableHead className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}>
        <div
          {...{
            className: header.column.getCanSort()
              ? 'flex items-center gap-1'
              : '',
            onClick: header.column.getToggleSortingHandler(),
          }}
        >
          {children}
          {{
            asc: <ChevronUpIcon className="ml-2 h-4 w-4" />,
            desc: <ChevronDownIcon className="ml-2 h-4 w-4" />,
          }[header.column.getIsSorted() as string] ??
            (header.column.getCanSort() ? (
              <ChevronsUpDownIcon className="ml-2 h-4 w-4 opacity-50" />
            ) : null)}
        </div>
      </TableHead>
    );
  }

  // Pour les colonnes déplaçables
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: header.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 100 : 0,
    position: 'relative',
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      // Le TableHead lui-même gère le tri au clic normal
      className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
      onClick={header.column.getToggleSortingHandler()} // Le tri se fait au clic sur TOUT l'en-tête
    >
      <div className="flex items-center gap-1">
        {/* Poignée de déplacement (handle) */}
        <span
          {...attributes} // Attributs de drag sur la poignée
          {...listeners} // Listeners de drag sur la poignée
          className="cursor-grab hover:bg-gray-200 p-1 rounded-sm -ml-2 transition-colors duration-200" // Style de la poignée
          onClick={(e) => e.stopPropagation()} // IMPORTANT : empêche le clic sur la poignée de déclencher le tri
        >
          <GripVertical className="h-4 w-4 text-gray-500" />
        </span>

        {/* Contenu de l'en-tête (texte) */}
        {children}

        {/* Icône de tri */}
        {{
          asc: <ChevronUpIcon className="ml-2 h-4 w-4" />,
          desc: <ChevronDownIcon className="ml-2 h-4 w-4" />,
        }[header.column.getIsSorted() as string] ??
          (header.column.getCanSort() ? (
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 opacity-50" />
          ) : null)}
      </div>
    </TableHead>
  );
}


// --- Utility functions for persistence ---
const getPersistedState = (key: string, defaultValue: any) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Failed to read from localStorage key "${key}":`, error);
    return defaultValue;
  }
};

const persistState = (key: string, state: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.warn(`Failed to write to localStorage key "${key}":`, error);
  }
};


export function DataTable<TData extends { id?: any }, TValue>({
  columns,
  data,
  isLoading = false,
  onBulkDelete,
  idAccessorKey = 'id' as keyof TData,
}: DataTableProps<TData, TValue>) {

  // Define the 'select' column explicitly inside DataTable
  const selectColumn: ColumnDef<TData, TValue> = {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
  };

  // Define the 'actions' column ID
  const actionColumnId = 'actions';

  // Helper to get a column's effective ID (explicit 'id' or 'accessorKey' as string)
  const getColumnEffectiveId = React.useCallback((col: ColumnDef<TData, TValue>): string | undefined => {
      if (col.id) return col.id;
      if (typeof col.accessorKey === 'string') return col.accessorKey;
      return undefined;
  }, []);

  // Process the incoming columns into fixed (select, actions) and draggable columns
  const { fixedStartColumn, fixedEndColumn, draggableColumnsMap, draggableColumnIdsInOriginalOrder } = useMemo(() => {
    let fixedStart: ColumnDef<TData, TValue> | undefined;
    let fixedEnd: ColumnDef<TData, TValue> | undefined;
    const draggableMap = new Map<string, ColumnDef<TData, TValue>>();
    const draggableIds: string[] = [];

    // First, add our internal selectColumn
    fixedStart = selectColumn;

    // Process user-provided columns
    columns.forEach(col => {
      const colId = getColumnEffectiveId(col);
      if (colId === actionColumnId) {
        fixedEnd = col; // This is the user's action column
      } else if (colId && colId !== selectColumn.id) { // Ensure it's not our internal select
        draggableMap.set(colId, col);
        draggableIds.push(colId);
      }
    });

    return {
      fixedStartColumn: fixedStart,
      fixedEndColumn: fixedEnd,
      draggableColumnsMap: draggableMap,
      draggableColumnIdsInOriginalOrder: draggableIds,
    };
  }, [columns, selectColumn, getColumnEffectiveId]);


  // --- PERSISTED STATE ---
  const [sorting, setSortingState] = React.useState<SortingState>(
    getPersistedState('dataTableSorting', [])
  );
  const [columnFilters, setColumnFiltersState] = React.useState<ColumnFiltersState>(
    getPersistedState('dataTableColumnFilters', [])
  );
  const [columnVisibility, setColumnVisibilityState] = React.useState<VisibilityState>(
    getPersistedState('dataTableColumnVisibility', {})
  );
  const [pagination, setPaginationState] = React.useState<PaginationState>(
    getPersistedState('dataTablePagination', { pageIndex: 0, pageSize: 10 })
  );
  const [rowSelection, setRowSelection] = React.useState({});

  const [columnOrder, setColumnOrder] = React.useState<string[]>(() => {
    const persistedOrder = getPersistedState('dataTableColumnOrder', []);
    // Filter persistedOrder to only include IDs that are actually draggable columns
    const validPersistedOrder = persistedOrder.filter((id: string) =>
        draggableColumnIdsInOriginalOrder.includes(id)
    );
    // Combine valid persisted order with any new or missing draggable column IDs
    const finalOrder = [...new Set([...validPersistedOrder, ...draggableColumnIdsInOriginalOrder])];
    return finalOrder;
  });


  // Synchronize with localStorage
  React.useEffect(() => {
    persistState('dataTableSorting', sorting);
  }, [sorting]);

  React.useEffect(() => {
    persistState('dataTableColumnFilters', columnFilters);
  }, [columnFilters]);

  React.useEffect(() => {
    persistState('dataTableColumnVisibility', columnVisibility);
  }, [columnVisibility]);

  React.useEffect(() => {
    persistState('dataTablePagination', pagination);
  }, [pagination]);

  React.useEffect(() => {
    persistState('dataTableColumnOrder', columnOrder);
  }, [columnOrder]);


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over?.id as string);

        // This check is primarily handled by `draggableColumnsMap` construction now,
        // but remains as a defensive layer.
        if (!draggableColumnsMap.has(active.id as string) || !draggableColumnsMap.has(over?.id as string)) {
            return items;
        }

        if (oldIndex === -1 || newIndex === -1) return items;

        const newItems = Array.from(items);
        const [movedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);
        return newItems;
      });
    }
  };

  // The final array of columns passed to useReactTable
  const finalColumnsForTable = useMemo(() => {
    // Construct draggable columns from the current `columnOrder`
    const orderedDraggableColumns = columnOrder
      .map(id => draggableColumnsMap.get(id))
      .filter(Boolean) as ColumnDef<TData, TValue>[];

    // Assemble the final order: fixed start, then ordered draggable, then fixed end
    return [
      ...(fixedStartColumn ? [fixedStartColumn] : []),
      ...orderedDraggableColumns,
      ...(fixedEndColumn ? [fixedEndColumn] : []),
    ];
  }, [columnOrder, fixedStartColumn, fixedEndColumn, draggableColumnsMap]);


  const table = useReactTable({
    data,
    columns: finalColumnsForTable,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
      rowSelection,
      columnOrder: finalColumnsForTable.map(col => getColumnEffectiveId(col) || ''), // Use effective ID for TanStack Table's columnOrder state
    },
    onSortingChange: setSortingState,
    onColumnFiltersChange: setColumnFiltersState,
    onColumnVisibilityChange: setColumnVisibilityState,
    onPaginationChange: setPaginationState,
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: setColumnOrder, // Let TanStack Table update our state
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelectedRows = selectedRows.length > 0;

  const handleBulkDelete = async () => {
    if (!onBulkDelete) {
      toast.error("La fonction de suppression groupée n'est pas configurée.");
      return;
    }
    const selectedIds = selectedRows.map(row => String(row.original[idAccessorKey!]));

    try {
      await onBulkDelete(selectedIds);
      toast.success(`${selectedIds.length} contact(s) supprimé(s) avec succès.`);
      table.toggleAllRowsSelected(false);
      setRowSelection({});
    } catch (err) {
      console.error("Erreur lors de la suppression groupée:", err);
      toast.error("Échec de la suppression groupée. Veuillez réessayer.");
    }
  };

  const handleExportCsv = () => {
    if (data.length === 0) {
      toast.info("Aucune donnée à exporter.");
      return;
    }

    const dataToExport = hasSelectedRows ? selectedRows.map(row => row.original) : table.getFilteredRowModel().rows.map(row => row.original);

    if (dataToExport.length === 0) {
      toast.info("Aucune ligne sélectionnée ou filtrée à exporter.");
      return;
    }

    const csv = Papa.unparse(dataToExport);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'contacts_export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Données exportées avec succès au format CSV !");
  };

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-2">
        <Input
          placeholder="Rechercher par nom..."
          value={(table.getAllColumns().find(col => col.id === 'name')?.getFilterValue() as string) ?? ''}
          onChange={(event) => {
            const nameColumn = table.getAllColumns().find(col => col.id === 'name');
            if (nameColumn) {
                nameColumn.setFilterValue(event.target.value);
            }
          }}
          className="max-w-sm"
        />

        {/* Bulk Actions */}
        {hasSelectedRows && (
          <div className="flex items-center space-x-2 ml-auto">
            <span className="text-sm text-muted-foreground">
              {selectedRows.length} ligne(s) sélectionnée(s)
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Actions <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions groupées</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportCsv} className="cursor-pointer">
                  <Download className="mr-2 h-4 w-4" /> Exporter ({selectedRows.length} sélectionné(s))
                </DropdownMenuItem>

                {onBulkDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 cursor-pointer">
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer ({selectedRows.length} sélectionné(s))
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer les {selectedRows.length} contact(s) sélectionné(s) ?
                          Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete}>
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Column Visibility */}
        {!hasSelectedRows && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto">
                        Colonnes <Settings2 className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {table
                        .getAllColumns()
                        .filter((column) => column.getCanHide())
                        .map((column) => {
                            // Exclude 'select' and 'actions' columns from visibility controls
                            if (column.id === 'select' || column.id === actionColumnId) return null;

                            const headerName = typeof column.columnDef.header === 'string'
                                ? column.columnDef.header
                                : column.id;
                            return (
                                <DropdownMenuCheckboxItem
                                    key={column.id}
                                    className="capitalize"
                                    checked={column.getIsVisible()}
                                    onCheckedChange={(value) =>
                                        column.toggleVisibility(!!value)
                                    }
                                >
                                    {headerName}
                                </DropdownMenuCheckboxItem>
                            );
                        })}
                </DropdownMenuContent>
            </DropdownMenu>
        )}
      </div>

      <div className="rounded-md border">
        {/* DndContext wraps the entire Table */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  <SortableContext
                    // Provide ALL column IDs here, as dnd-kit needs to know the full order
                    items={finalColumnsForTable.map(col => getColumnEffectiveId(col) || '')}
                    strategy={horizontalListSortingStrategy}
                  >
                    {headerGroup.headers.map((header) => (
                      <SortableHeader key={header.id} header={header}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </SortableHeader>
                    ))}
                  </SortableContext>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={finalColumnsForTable.length} className="h-24 text-center">
                    <div className="flex flex-col space-y-3 animate-pulse p-4">
                      {[...Array(table.getState().pagination.pageSize)].map((_, i) => (
                          <div key={i} className="h-8 bg-gray-200 rounded-md w-full" />
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={finalColumnsForTable.length} className="h-24 text-center">
                    Aucun résultat.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} résultat(s) trouvé(s) sur {data.length} total.
        </div>

        <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
                table.setPageSize(Number(value));
            }}
        >
            <SelectTrigger className="h-8 w-[100px]">
                <SelectValue placeholder="Page Size" />
            </SelectTrigger>
            <SelectContent>
                {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>

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
    </div>
  );
}
