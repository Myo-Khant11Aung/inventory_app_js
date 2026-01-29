import { useContext, useEffect, useMemo, useState } from "react";
import { StoreContext } from "./StoreContext";
import SearchSelect from "./SearchSelect";

export default function Movements() {
  const [movementType, setMovementType] = useState(""); // "in" | "out"

  const { state, markVariantsStale, updateProduct } = useContext(StoreContext);

  const [selectedProductId, setSelectedProductId] = useState(null);

  const [variants, setVariants] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  const [qtyChange, setQtyChange] = useState(""); // string for input
  const [reason, setReason] = useState("");
  const [soldPrice, setSoldPrice] = useState(""); // optional, only for stock-out

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [variantsLoading, setVariantsLoading] = useState(false);

  const selectedProduct = useMemo(() => {
    return state.products.find((p) => p.id === selectedProductId) || null;
  }, [state.products, selectedProductId]);

  const selectedVariant = useMemo(() => {
    return variants.find((v) => v.id === selectedVariantId) || null;
  }, [variants, selectedVariantId]);

  // Fetch variants whenever product changes
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setVariants([]);
      setSelectedVariantId(null);
      setError(null);

      if (!selectedProductId) return;

      setVariantsLoading(true);
      try {
        const rows = await window.api.products.getVariantsByProduct(
          selectedProductId
        );
        if (!cancelled) setVariants(rows);
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setVariantsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedProductId]);

  function resetForm() {
    setQtyChange("");
    setReason("");
    setSoldPrice("");
    setMovementType("");
  }

  const isStockOut = movementType === "out";

  async function handleSubmit() {
    if (!movementType) {
      setError("Please select Stock In or Stock Out.");
      return;
    }
    setError(null);

    if (!selectedProductId) {
      setError("Pick a product first.");
      return;
    }
    if (!selectedVariantId) {
      setError("Pick a variant first.");
      return;
    }

    let change = Number(qtyChange);
    if (!Number.isFinite(change) || change < 0) {
      setError("Quantity change must be a positive number.");
      return;
    }
    if (movementType === "out" && change > 0) {
      change = -change;
    }

    // sold price only makes sense for stock-out
    let sold = null;

    if (movementType === "out") {
      if (soldPrice === "") {
        // default to product sell price
        sold = Number(selectedProduct.sell_price || 0);
      } else {
        sold = Number(soldPrice);
      }

      if (!Number.isFinite(sold) || sold < 0) {
        setError("Sold price must be a valid number.");
        return;
      }
    }

    setSaving(true);
    try {
      await window.api.movements.add({
        variant_id: selectedVariantId,
        qty_change: change,
        reason: reason.trim() || null,
        sold_price: isStockOut ? sold : null,
      });

      // Invalidate variant cache for this product (so details refetch later)
      markVariantsStale(selectedProductId);

      // Refresh only this product in global state
      const freshProduct = await window.api.products.getById(selectedProductId);
      updateProduct(freshProduct);

      // Refresh variants list too (so this screen shows updated qty immediately)
      const freshVariants = await window.api.products.getVariantsByProduct(
        selectedProductId
      );
      setVariants(freshVariants);

      resetForm();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  if (state.loading) return <p className="text-neutral-200">Loading...</p>;
  if (state.error) return <p className="text-red-300">Error: {state.error}</p>;

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 pb-3 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold text-neutral-200">
          Stock In/Out
        </h1>
      </header>

      <div className="flex-1 overflow-auto px-4 pt-3">
        {/* Product picker */}
        <div className="max-w-xl">
          <SearchSelect
            items={state.products}
            placeholder="Search product name..."
            getLabel={(p) => p.name}
            onSelect={(p) => setSelectedProductId(p.id)}
          />
        </div>

        {!selectedProduct ? (
          <div className="mt-6 text-neutral-400">Select a product.</div>
        ) : (
          <div className="mt-6 grid gap-4">
            <h2 className="text-xl font-semibold text-neutral-200">
              {selectedProduct.name}
            </h2>

            {/* Product summary */}
            <table className="text-neutral-200 text-center w-full border-collapse table-auto text-lg border border-neutral-700/60 bg-neutral-950">
              <thead className="bg-neutral-900 border-b border-neutral-700/60">
                <tr>
                  <th className="px-3 py-2 border-r border-neutral-700/60 font-semibold">
                    Total Qty
                  </th>
                  <th className="px-3 py-2 border-r border-neutral-700/60 font-semibold">
                    Cost Price
                  </th>
                  <th className="px-3 py-2 font-semibold">Sell Price</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2 border-r border-neutral-700/60 tabular-nums">
                    {selectedProduct.qty}
                  </td>
                  <td className="px-3 py-2 border-r border-neutral-700/60 tabular-nums">
                    ${Number(selectedProduct.cost_price || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    ${Number(selectedProduct.sell_price || 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Variant picker */}

            <div className="grid gap-2">
              <label className="grid gap-1">
                <span className="text-neutral-300 text-sm">Movement type</span>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-700 text-neutral-200"
                >
                  <option value="">Select…</option>
                  <option value="in">Stock In</option>
                  <option value="out">Stock Out</option>
                </select>
              </label>

              {movementType === "" ? (
                <div className="text-red-300 font-medium">
                  Please select a movement type.
                </div>
              ) : (
                <>
                  <div className="text-neutral-300 font-medium">
                    Choose variant
                  </div>

                  {variantsLoading ? (
                    <div className="text-neutral-400">Loading variants...</div>
                  ) : variants.length === 0 ? (
                    <div className="text-neutral-400">
                      No variants found for this product.
                    </div>
                  ) : (
                    <div className="grid gap-2 max-w-xl">
                      {variants.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariantId(v.id)}
                          className={[
                            "px-3 py-2 rounded border text-left",
                            selectedVariantId === v.id
                              ? "bg-blue-950/40 border-blue-700 text-blue-100"
                              : "bg-neutral-950 border-neutral-700 text-neutral-200 hover:bg-neutral-900",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-semibold">{v.size}</span>{" "}
                              <span className="text-neutral-400">/</span>{" "}
                              <span>{v.color}</span>
                            </div>
                            <div className="tabular-nums text-sm text-neutral-300">
                              Qty: {v.qty}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Movement form */}
                  <div className="grid gap-3 max-w-xl border border-neutral-800 bg-neutral-950 rounded-lg p-4">
                    <div className="text-neutral-200 font-semibold">
                      Create movement{" "}
                      {selectedVariant
                        ? `(${selectedVariant.size} / ${selectedVariant.color})`
                        : ""}
                    </div>

                    <label className="grid gap-1">
                      <span className="text-neutral-300 text-sm">
                        Quantity (always positive)
                      </span>
                      <input
                        value={qtyChange}
                        onChange={(e) => setQtyChange(e.target.value)}
                        placeholder="Example: 5"
                        className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-700 text-neutral-200"
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-neutral-300 text-sm">
                        Reason (optional)
                      </span>
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Example: restock, sold, return..."
                        className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-700 text-neutral-200"
                      />
                    </label>

                    {movementType === "out" && (
                      <label className="grid gap-1">
                        <span className="text-neutral-300 text-sm">
                          Sold price (optional, for stock out)
                        </span>
                        <input
                          value={soldPrice}
                          onChange={(e) => setSoldPrice(e.target.value)}
                          placeholder="Example: 49.99"
                          className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-700 text-neutral-200"
                        />
                      </label>
                    )}

                    {error && (
                      <div className="text-red-300 text-sm">{error}</div>
                    )}

                    <button
                      type="button"
                      disabled={saving || !selectedVariantId}
                      onClick={handleSubmit}
                      className={[
                        "px-3 py-2 rounded-md font-medium",
                        saving || !selectedVariantId
                          ? "bg-neutral-800 text-neutral-400 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700",
                      ].join(" ")}
                    >
                      {saving ? "Saving..." : "Confirm movement"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
