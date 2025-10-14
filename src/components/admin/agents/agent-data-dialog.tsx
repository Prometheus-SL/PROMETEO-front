import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { agentsService, type LatestDataItem } from "@/services/agents";
import { toast } from "sonner";

type Props = {
  agentId: string;
  children: React.ReactNode;
};

export function AgentDataDialog({ agentId, children }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<LatestDataItem[] | null>(null);

  async function ensureData() {
    if (items) return;
    setLoading(true);
    try {
      const response = await agentsService.getAgentData(agentId);
      setItems(response.records);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) void ensureData();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Latest Agent Data</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          {loading && (
            <p className="p-2 text-sm text-muted-foreground">Loading...</p>
          )}
          {!loading && (!items || items.length === 0) && (
            <p className="p-2 text-sm text-muted-foreground">No recent data</p>
          )}
          {!loading &&
            items &&
            items.map((it, idx) => (
              <div key={idx} className="border-b p-2 text-sm">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(it.createdAt).toLocaleString()}</span>
                  <span className="rounded bg-blue-100 px-2 py-1 text-xs dark:bg-blue-900">
                    {it.dataType}
                  </span>
                </div>
                {it.tags && it.tags.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {it.tags.map((tag, tagIdx) => (
                      <span
                        key={tagIdx}
                        className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <pre className="whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs">
                  {JSON.stringify(it.data.data, null, 2)}
                </pre>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
