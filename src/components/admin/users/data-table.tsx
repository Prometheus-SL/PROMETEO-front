import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleAll?: () => void;
  getRowId?: (row: TData) => string;
  emptyMessage?: string;
  mobileCardRenderer?: (args: {
    row: TData;
    selected: boolean;
    onToggleSelected?: () => void;
  }) => React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  getRowId,
  emptyMessage = "No results.",
  mobileCardRenderer,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const ids = getRowId ? data.map(getRowId) : [];
  const selectedOnPage = ids.filter((id) => selectedIds?.has(id)).length;
  const allSelected = ids.length > 0 && selectedOnPage === ids.length;
  const partiallySelected = selectedOnPage > 0 && !allSelected;

  return (
    <div>
      {mobileCardRenderer ? (
        <div className="grid gap-3 md:hidden">
          {data.length > 0 ? (
            data.map((row) => {
              const rowId = getRowId?.(row);
              return (
                <div key={rowId ?? JSON.stringify(row)}>
                  {mobileCardRenderer({
                    row,
                    selected: Boolean(rowId && selectedIds?.has(rowId)),
                    onToggleSelected:
                      rowId && onToggleSelect
                        ? () => onToggleSelect(rowId)
                        : undefined,
                  })}
                </div>
              );
            })
          ) : (
            <div className="rounded-md border bg-background p-8 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          )}
        </div>
      ) : null}
      <div
        className={`${mobileCardRenderer ? "hidden md:block" : ""} overflow-hidden rounded-md border bg-background`}
      >
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {selectedIds && onToggleAll && getRowId && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        allSelected || (partiallySelected && "indeterminate")
                      }
                      onCheckedChange={() => onToggleAll()}
                      aria-label="Select all users"
                    />
                  </TableHead>
                )}
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const rowId = getRowId?.(row.original);
                return (
                  <TableRow
                    key={row.id}
                    data-state={
                      rowId && selectedIds?.has(rowId) ? "selected" : undefined
                    }
                  >
                    {selectedIds && onToggleSelect && rowId && (
                      <TableCell className="w-10">
                        <Checkbox
                          checked={selectedIds.has(rowId)}
                          onCheckedChange={() => onToggleSelect(rowId)}
                          aria-label="Select user"
                        />
                      </TableCell>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectedIds ? 1 : 0)}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
