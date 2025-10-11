import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMarketplaceStore } from "../store";
import type { ModuleMeta } from "../types";
import { ModuleConfigModal } from "./ModuleConfigModal";

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function ModuleCard({
  meta,
  onAdd,
}: {
  meta: ModuleMeta;
  onAdd: (m: ModuleMeta) => void;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{meta.name}</span>
          {meta.size && <Badge variant="secondary">
            {meta.size.width}x{meta.size.height}
          </Badge>}
        </CardTitle>
        {meta.description && (
          <CardDescription>{meta.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {meta.preview ? (
          <img
            src={meta.preview}
            alt={meta.name}
            className="w-full h-32 object-scale-down rounded"
          />
        ) : (
          <div className="w-full h-32 bg-zinc-100 dark:bg-zinc-900 rounded grid place-items-center text-sm text-zinc-500">
            No preview available
          </div>
        )}
      </CardContent>
      <CardFooter className="mt-auto flex justify-between">
        {meta.category && <Badge>{capitalize(meta.category)}</Badge>}
        <Button size="sm" onClick={() => onAdd(meta)}>
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}

export function MarketplaceList() {
  const { state, filtered, setQuery, installModule } = useMarketplaceStore();
  const [selected, setSelected] = useState<ModuleMeta | null>(null);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(state.modules.map((m) => m.category).filter(Boolean))
      ) as string[],
    [state.modules]
  );

  if (state.loading) return <div>Cargando módulos…</div>;
  if (state.error)
    return <div className="text-red-600">Error: {state.error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar módulos…"
          value={state.filters.query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-2">
          {categories.map((c) => (
            <Badge key={c}>{c}</Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m) => (
          <ModuleCard key={m.id} meta={m} onAdd={setSelected} />
        ))}
      </div>

      {selected && (
        <ModuleConfigModal
          meta={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          onSave={(config) => {
            installModule(selected, config);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
