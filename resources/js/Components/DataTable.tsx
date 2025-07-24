import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
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

import { ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon, Settings2, Trash2, Download, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

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


interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  onBulkDelete?: (selectedIds: string[]) => Promise<void>;
  idAccessorKey?: keyof TData;
  pagination: {
    currentPage: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: string) => void;
  };
}

interface SortableHeaderProps<TData> {
  header: Header<TData, any>;
  children: React.ReactNode;
}

function SortableHeader<TData>({ header, children }: SortableHeaderProps<TData>) {
  // 'select' and 'actions' columns are not draggable
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
      className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
      onClick={header.column.getToggleSortingHandler()}
    >
      <div className="flex items-center gap-1">
        {/* Drag handle for column reordering */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab hover:bg-gray-200 p-1 rounded-sm -ml-2 transition-colors duration-200"
          onClick={(e) => e.stopPropagation()} // Prevents sorting when clicking drag handle
        >
          <GripVertical className="h-4 w-4 text-gray-500" />
        </span>
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


// Utility functions for state persistence in localStorage
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


export function DataTable<TData extends { id?: any }, TValue>({
  columns,
  data,
  isLoading = false,
  onBulkDelete,
  idAccessorKey = 'id' as keyof TData,
  pagination,
}: DataTableProps<TData, TValue>) {

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

  const actionColumnId = 'actions';

  // Helper to get a column's effective ID (explicit 'id' or 'accessorKey' as string)
  const getColumnEffectiveId = React.useCallback((col: ColumnDef<TData, TValue>): string | undefined => {
      if (col.id) return col.id;
      if (typeof col.accessorKey === 'string') return col.accessorKey;
      return undefined;
  }, []);

  // Processes incoming columns into fixed (select, actions) and draggable columns
  const { fixedStartColumn, fixedEndColumn, draggableColumnsMap, draggableColumnIdsInOriginalOrder } = useMemo(() => {
    let fixedStart: ColumnDef<TData, TValue> | undefined;
    let fixedEnd: ColumnDef<TData, TValue> | undefined;
    const draggableMap = new Map<string, ColumnDef<TData, TValue>>();
    const draggableIds: string[] = [];

    // Always add our internal selectColumn as the fixed start
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


  // Persisted state for TanStack Table properties (sorting, column filters, visibility, order)
  const [sorting, setSortingState] = React.useState<SortingState>(
    getPersistedState('dataTableSorting', [])
  );
  const [columnFilters, setColumnFiltersState] = React.useState<ColumnFiltersState>(
    getPersistedState('dataTableColumnFilters', [])
  );
  const [columnVisibility, setColumnVisibilityState] = React.useState<VisibilityState>(
    getPersistedState('dataTableColumnVisibility', {})
  );
  const [rowSelection, setRowSelection] = React.useState({});

  const [columnOrder, setColumnOrder] = React.useState<string[]>(() => {
    const persistedOrder = getPersistedState('dataTableColumnOrder', []);
    const validPersistedOrder = persistedOrder.filter((id: string) =>
        draggableColumnIdsInOriginalOrder.includes(id)
    );
    const finalOrder = [...new Set([...validPersistedOrder, ...draggableColumnIdsInOriginalOrder])];
    return finalOrder;
  });


  // Synchronize state with localStorage
  React.useEffect(() => { persistState('dataTableSorting', sorting); }, [sorting]);
  React.useEffect(() => { persistState('dataTableColumnFilters', columnFilters); }, [columnFilters]);
  React.useEffect(() => { persistState('dataTableColumnVisibility', columnVisibility); }, [columnVisibility]);
  React.useEffect(() => { persistState('dataTableColumnOrder', columnOrder); }, [columnOrder]);

  // DND-KIT sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  // Handles column drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over?.id as string);
        // Prevent dragging 'select' or 'actions' columns
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
    const orderedDraggableColumns = columnOrder
      .map(id => draggableColumnsMap.get(id))
      .filter(Boolean) as ColumnDef<TData, TValue>[];
    return [
      ...(fixedStartColumn ? [fixedStartColumn] : []),
      ...orderedDraggableColumns,
      ...(fixedEndColumn ? [fixedEndColumn] : []),
    ];
  }, [columnOrder, fixedStartColumn, fixedEndColumn, draggableColumnsMap]);


  // TanStack Table instance setup
  const table = useReactTable({
    data,
    columns: finalColumnsForTable,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      columnOrder: finalColumnsForTable.map(col => getColumnEffectiveId(col) || ''),
      pagination: {
        pageIndex: pagination.currentPage - 1, // TanStack Table is 0-based
        pageSize: pagination.perPage,
      },
    },
    onSortingChange: setSortingState,
    onColumnFiltersChange: setColumnFiltersState,
    onColumnVisibilityChange: setColumnVisibilityState,
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: setColumnOrder,

    manualPagination: true, // Indicates server-side pagination
    pageCount: pagination.totalPages,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelectedRows = selectedRows.length > 0;

  // Handles bulk delete action
  const handleBulkDelete = async () => {
    if (!onBulkDelete) {
      toast.error("Bulk delete function not configured.");
      return;
    }
    const selectedIds = selectedRows.map(row => String(row.original[idAccessorKey!]));

    try {
      await onBulkDelete(selectedIds);
      toast.success(`${selectedIds.length} contact(s) deleted successfully.`);
      setRowSelection({}); // Clear row selection after successful deletion
    } catch (err) {
      console.error("Error during bulk deletion:", err);
      toast.error("Failed to perform bulk deletion. Please try again.");
    }
  };

  // Handles CSV export action
  const handleExportCsv = () => {
    if (data.length === 0) {
      toast.info("No data to export.");
      return;
    }

    const dataToExport = hasSelectedRows ? selectedRows.map(row => row.original) : table.getFilteredRowModel().rows.map(row => row.original);

    if (dataToExport.length === 0) {
      toast.info("No selected or filtered data on the current page to export.");
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
    toast.success("Data exported successfully to CSV!");
  };

  // Calculate pagination display (e.g., 1-15 of 108)
  const firstItemOnPage = pagination.totalItems > 0 ? (pagination.currentPage - 1) * pagination.perPage + 1 : 0;
  const lastItemOnPage = pagination.totalItems > 0 ? Math.min(pagination.currentPage * pagination.perPage, pagination.totalItems) : 0;

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-2">
        {/* Bulk Actions Block: Shown ONLY if rows are selected */}
        {hasSelectedRows ? (
          <div className="flex items-center space-x-2 ml-auto">
            <span className="text-sm text-muted-foreground">
              {selectedRows.length} row(s) selected
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Actions <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportCsv} className="cursor-pointer">
                  <Download className="mr-2 h-4 w-4" /> Export ({selectedRows.length} selected)
                </DropdownMenuItem>

                {onBulkDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 cursor-pointer">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedRows.length} selected)
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the {selectedRows.length} selected contact(s)?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : ( // If no rows are selected, display the Column Visibility Dropdown
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto">
                        Columns <Settings2 className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {table
                        .getAllColumns()
                        .filter((column) => column.getCanHide())
                        .map((column) => {
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
                      {[...Array(pagination.perPage)].map((_, i) => (
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
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        {/* Pagination display */}
        <div className="flex-1 text-sm text-muted-foreground">
          {pagination.totalItems > 0 ? (
            `Showing ${firstItemOnPage} - ${lastItemOnPage} of ${pagination.totalItems} contacts.`
          ) : (
            `No contacts.`
          )}
        </div>

        {/* Page size selector */}
        <Select
            value={`${pagination.perPage}`}
            onValueChange={pagination.onPerPageChange}
        >
            <SelectTrigger className="h-8 w-[100px]">
                <SelectValue placeholder="Page Size" />
            </SelectTrigger>
            <SelectContent>
                {[10, 15, 20, 30, 40, 50, 100].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>

        {/* Pagination navigation buttons */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
          disabled={pagination.currentPage <= 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
          disabled={pagination.currentPage >= pagination.totalPages}
        >
          Next
        </Button>
        <span className="text-sm text-muted-foreground ml-4">
          Page {pagination.currentPage} of {pagination.totalPages}
        </span>
      </div>
    </div>
  );
}
