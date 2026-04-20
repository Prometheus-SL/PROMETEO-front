"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
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
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

interface AgentDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filtersComponent?: React.ReactNode;
  getRowId?: (row: TData) => string;
  selectedIds?: Set<string>;
  onSelectedIdsChange?: (ids: Set<string>) => void;
}

export function AgentDataTable<TData, TValue>({
  columns,
  data,
  filtersComponent,
  getRowId,
  selectedIds,
  onSelectedIdsChange,
}: AgentDataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!selectedIds) return;

    const nextSelection = Object.fromEntries(
      [...selectedIds].map((id) => [id, true]),
    );
    setRowSelection((current) => {
      const currentKeys = Object.keys(current).filter((key) => current[key]);
      const nextKeys = Object.keys(nextSelection);
      if (
        currentKeys.length === nextKeys.length &&
        currentKeys.every((key) => nextSelection[key])
      ) {
        return current;
      }

      return nextSelection;
    });
  }, [selectedIds]);

  useEffect(() => {
    if (!onSelectedIdsChange) return;

    onSelectedIdsChange(
      new Set(Object.keys(rowSelection).filter((key) => rowSelection[key])),
    );
  }, [onSelectedIdsChange, rowSelection]);

  // Filtro global personalizado para buscar por ID y nombre
  const globalFilterFn = (
    row: { original: TData },
    _columnId: string,
    value: string
  ) => {
    const agent = row.original as Record<string, unknown>;
    const searchValue = value.toLowerCase();

    // Buscar en ID y nombre
    const searchableText = [
      (agent.id as string) || "",
      (agent.name as string) || "",
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(searchValue);
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getRowId,
    globalFilterFn,
    state: {
      columnFilters,
      globalFilter,
      rowSelection,
    },
  });

  return (
    <div>
      <div className="flex items-center py-4">
        <Input
          placeholder="Search by ID or name..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        <div className="ml-auto">{filtersComponent}</div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
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
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
