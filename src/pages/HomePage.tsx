import { useAuthContext } from "@/providers/AuthProvider";
import { GridManager } from "@/modules/ui/GridManager";
import { useMarketplaceStore } from "@/modules/store";

export default function HomePage() {
  const { user } = useAuthContext();
  const { state, removeModule, setModulePosition } = useMarketplaceStore();
  return (
    <div className="">
      <h1 className="text-3xl font-bold mb-4">Welcome to PROMETEO</h1>
      {user && (
        <div className="text-zinc-700">
          Hello, <b>{user.username}</b>.
        </div>
      )}
      <div className="mt-6">
        <GridManager
          installed={state.installed}
          onRemove={removeModule}
          onMove={(id, pos) => setModulePosition(id, pos)}
        />
      </div>
    </div>
  );
}
