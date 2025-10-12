import { GridManager } from "@/modules/ui/GridManager";
import { useMarketplaceStore } from "@/modules/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DashboardsPage() {
  const {
    state,
    removeModule,
    setModulePosition,
    setModuleConfig,
    selectDashboard,
    createDashboard,
    deleteDashboard,
    activateDashboard,
  } = useMarketplaceStore();
  const [newPageName, setNewPageName] = useState("");
  return (
    <div>
      {/* Selector de páginas */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={state.currentPageId ?? ""}
          onValueChange={selectDashboard}
        >
          <SelectTrigger className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <SelectValue placeholder="Select page" />
          </SelectTrigger>
          <SelectContent>
            {state.pages.map((p) => (
              <SelectItem key={p._id} value={p._id}>
                {p.name} {p.active ? "(activa)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="secondary"
          onClick={() =>
            state.currentPageId && activateDashboard(state.currentPageId)
          }
        >
          Activar
        </Button>
        <Button
          variant="destructive"
          onClick={() =>
            state.currentPageId && deleteDashboard(state.currentPageId)
          }
        >
          Eliminar
        </Button>
      </div>
      {/* Crear nueva página */}
      <div className="mt-2 flex items-center gap-2">
        <Input
          placeholder="Nombre de la nueva página"
          value={newPageName}
          onChange={(e) => setNewPageName(e.target.value)}
        />
        <Button
          onClick={() => {
            if (newPageName.trim()) {
              createDashboard(newPageName.trim());
              setNewPageName("");
            }
          }}
        >
          Crear
        </Button>
      </div>
      <div className="mt-6">
        <GridManager
          installed={state.installed}
          onRemove={removeModule}
          onMove={(id, pos) => setModulePosition(id, pos)}
          onUpdateConfig={(id, config) => setModuleConfig(id, config)}
        />
      </div>
    </div>
  );
}
