import { MarketplaceList } from "@/modules/ui/MarketplaceList";

export default function MarketplacePage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Marketplace</h1>
      <MarketplaceList />
    </div>
  );
}
