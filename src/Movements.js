import { useContext, useState } from "react";
import { StoreContext } from "./StoreContext";
import SearchSelect from "./SearchSelect";

export default function Movements({ onSelectVariant }) {
  const { qty_change, setQtyChange } = useState(null);
  const { reason, setReason } = useState("");
  const { sold_price, setSoldPrice } = useState(null);
  const { state, markVariantsStale, updateProduct } = useContext(StoreContext);
  const [selectedId, setSelectedId] = useState(null);

  const resultProduct = state.products.find((p) => p.id === selectedId);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 pb-3 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold text-neutral-200">
          Stock In/Out
        </h1>
      </header>

      <div className="flex-1 overflow-auto px-4 pt-3">
        {/* Search + select */}
        <div className="max-w-xl">
          <SearchSelect
            items={state.products}
            placeholder="Search product name..."
            getLabel={(p) => p.name}
            onSelect={(p) => setSelectedId(p.id)}
          />
        </div>
      </div>
    </div>
  );
}
