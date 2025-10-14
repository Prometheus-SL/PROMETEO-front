import { MarketplaceList } from "@/modules/ui/MarketplaceList";

export default function MarketplacePage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Marketplace</h1>
      <h3 className="text-lg mb-6 text-muted-foreground">
        Discover and integrate third-party agents to enhance your experience.
      </h3>
      <MarketplaceList />
    </div>
  );
}
