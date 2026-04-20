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

interface AgentDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filtersComponent?: React.ReactNode;
  getRowId?: (row: TData) => string;
  selectedIds?: Set<string>;
  onSelectedIdsChange?: (ids: Set<string>) => void;
  emptyMessage?: string;
  mobileCardRenderer?: (args: {
    row: TData;
    selected: boolean;
    onToggleSelected?: () => void;
  }) => React.ReactNode;
}

export function AgentDataTable<TData, TValue>({
  columns,
  data,
  filtersComponent,
  getRowId,
  selectedIds,
  onSelectedIdsChange,
  emptyMessage = "No results.",
  mobileCardRenderer,
}: AgentDataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  });

  const ids = getRowId ? data.map(getRowId) : [];
  const selectedOnPage = ids.filter((id) => selectedIds?.has(id)).length;
  const allSelected = ids.length > 0 && selectedOnPage === ids.length;
  const partiallySelected = selectedOnPage > 0 && !allSelected;

  function toggleAll() {
    if (!onSelectedIdsChange) return;
    if (allSelected) {
      onSelectedIdsChange(new Set());
      return;
    }
    onSelectedIdsChange(new Set(ids));
  }

  function toggleOne(id: string) {
    if (!onSelectedIdsChange) return;
    const next = new Set(selectedIds ?? []);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedIdsChange(next);
  }

  return (
    <div>
      {filtersComponent ? (
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          {filtersComponent}
        </div>
      ) : null}
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
                    onToggleSelected: rowId ? () => toggleOne(rowId) : undefined,
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
                {selectedIds && onSelectedIdsChange && getRowId && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        allSelected || (partiallySelected && "indeterminate")
                      }
                      onCheckedChange={toggleAll}
                      aria-label="Select all agents"
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
                            header.getContext()
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
                    {selectedIds && onSelectedIdsChange && rowId && (
                      <TableCell className="w-10">
                        <Checkbox
                          checked={selectedIds.has(rowId)}
                          onCheckedChange={() => toggleOne(rowId)}
                          aria-label="Select agent"
                        />
                      </TableCell>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={
                    columns.length + (selectedIds && getRowId ? 1 : 0)
                  }
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
