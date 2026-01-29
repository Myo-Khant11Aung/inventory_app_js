// EditProductScreen.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { StoreContext } from "./StoreContext";
import SearchSelect from "./SearchSelect";

function VariantTable({ variants, onAddVariant, onDeleteVariant }) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-neutral-200">Variants</h2>
      </div>

      <table className="w-full text-sm border border-blue-800/50 bg-slate-950/80">
        <thead className="bg-blue-950/70 border-b border-blue-800/60">
          <tr>
            <th className="text-left px-3 py-2 border-r border-blue-800/60 text-blue-100 font-semibold">
              Size
            </th>
            <th className="text-left px-3 py-2 border-r border-blue-800/60 text-blue-100 font-semibold">
              Color
            </th>
            <th className="text-right px-3 py-2 text-blue-100 font-semibold">
              Qty
            </th>
            <th className="text-right px-3 py-2 text-blue-100 font-semibold">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v, idx) => (
            <tr
              key={v.id}
              className={[
                idx % 2 === 0 ? "bg-slate-950/60" : "bg-blue-950/40",
                "hover:bg-blue-900/30 transition",
              ].join(" ")}
            >
              <td className="px-3 py-2 border-r border-blue-800/40 text-left text-blue-50">
                {v.size}
              </td>
              <td className="px-3 py-2 border-r border-blue-800/40 text-left text-blue-50">
                {v.color}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-blue-50">
                {v.qty}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  onClick={() => onDeleteVariant(v.id)}
                  className="text-xs px-2 py-1 rounded border border-blue-800/50 text-blue-100 hover:bg-blue-900/30"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {variants.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-3 text-blue-200/70">
                No variants yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function EditProductScreen() {
  const { state, markVariantsStale } = useContext(StoreContext);

  const [selectedId, setSelectedId] = useState(null);

  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState(null);

  const [variants, setVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantsError, setVariantsError] = useState(null);
  const { updateProduct } = useContext(StoreContext);

  // form fields
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");

  // add-variant inputs
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newQty, setNewQty] = useState("0");

  // derived selected product (for showing in UI)
  const selectedFromList = useMemo(() => {
    return state.products.find((p) => p.id === selectedId) || null;
  }, [state.products, selectedId]);

  // when a product is selected, load its latest data
  useEffect(() => {
    if (!selectedId) return;

    let cancelled = false;

    async function load() {
      setProductError(null);
      setVariantsError(null);

      setProductLoading(true);
      try {
        const p = await window.api.products.getById(selectedId);
        if (cancelled) return;

        setName(p?.name ?? "");
        setSku(p?.sku ?? "");
        setCostPrice(String(p?.cost_price ?? ""));
        setSellPrice(String(p?.sell_price ?? ""));
      } catch (err) {
        if (!cancelled) setProductError(err?.message || String(err));
      } finally {
        if (!cancelled) setProductLoading(false);
      }

      setVariantsLoading(true);
      try {
        const vs = await window.api.products.getVariantsByProduct(selectedId);
        if (cancelled) return;
        setVariants(Array.isArray(vs) ? vs : []);
      } catch (err) {
        if (!cancelled) setVariantsError(err?.message || String(err));
      } finally {
        if (!cancelled) setVariantsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function handleSaveProduct() {
    if (!selectedId) return;

    setProductError(null);
    setProductLoading(true);

    try {
      await window.api.products.update(selectedId, {
        name,
        sku: sku.trim() ? sku : null,
        cost_price: Number(costPrice || 0),
        sell_price: Number(sellPrice || 0),
      });

      // if product info changed, we should refresh global products list the simple way:
      // easiest: refetch products (you likely have loadProducts in your provider)
      // If you don't, just leave this out and it will update after app reload.
      // markVariantsStale isn't necessary for product fields, but harmless if variants depend on display.
      markVariantsStale(selectedId);
      const updatedProduct = await window.api.products.getById(selectedId);
      updateProduct(updatedProduct);
    } catch (err) {
      setProductError(err?.message || String(err));
    } finally {
      setProductLoading(false);
    }
  }

  async function handleAddVariant() {
    if (!selectedId) return;

    setVariantsError(null);
    setVariantsLoading(true);

    try {
      await window.api.products.addVariant({
        product_id: selectedId,
        size: newSize || "One Size",
        color: newColor || "N/A",
        qty: Number(newQty || 0),
      });

      markVariantsStale(selectedId);

      // reload variants for this product (so UI updates)
      const vs = await window.api.products.getVariantsByProduct(selectedId);
      setVariants(Array.isArray(vs) ? vs : []);

      // clear inputs
      setNewSize("");
      setNewColor("");
      setNewQty("0");

      const updatedProduct = await window.api.products.getById(selectedId);
      updateProduct(updatedProduct);
    } catch (err) {
      setVariantsError(err?.message || String(err));
    } finally {
      setVariantsLoading(false);
    }
  }

  async function handleDeleteVariant(variantId) {
    if (!selectedId) return;

    setVariantsError(null);
    setVariantsLoading(true);

    try {
      await window.api.products.deleteVariant(variantId);

      markVariantsStale(selectedId);

      const vs = await window.api.products.getVariantsByProduct(selectedId);
      setVariants(Array.isArray(vs) ? vs : []);
      const updatedProduct = await window.api.products.getById(selectedId);
      updateProduct(updatedProduct);
    } catch (err) {
      setVariantsError(err?.message || String(err));
    } finally {
      setVariantsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 pb-3 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold text-neutral-200">
          Edit Product
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

        {/* Selected */}
        {!selectedId ? (
          <div className="mt-6 text-neutral-400">Select a product to edit.</div>
        ) : (
          <div className="mt-6 grid gap-4">
            {/* Product form */}
            <div className="border border-neutral-700/60 bg-neutral-950 rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-neutral-200 font-semibold">
                    {selectedFromList?.name || "Selected Product"}
                  </div>
                  <div className="text-neutral-400 text-sm">
                    ID: {selectedId}
                  </div>
                </div>

                <button
                  onClick={handleSaveProduct}
                  disabled={productLoading}
                  className={[
                    "text-sm px-3 py-2 rounded border border-neutral-700/60",
                    "text-neutral-200",
                    productLoading
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:bg-neutral-800",
                  ].join(" ")}
                >
                  {productLoading ? "Saving..." : "Save Product"}
                </button>
              </div>

              {productError && (
                <div className="text-red-300 text-sm mb-2">{productError}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-xs text-neutral-400">Name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="px-3 py-2 rounded bg-neutral-900 border border-neutral-700 text-neutral-200"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-neutral-400">
                    SKU (optional)
                  </span>
                  <input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="px-3 py-2 rounded bg-neutral-900 border border-neutral-700 text-neutral-200"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-neutral-400">Cost Price</span>
                  <input
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="px-3 py-2 rounded bg-neutral-900 border border-neutral-700 text-neutral-200"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-neutral-400">Sell Price</span>
                  <input
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className="px-3 py-2 rounded bg-neutral-900 border border-neutral-700 text-neutral-200"
                  />
                </label>
              </div>
            </div>

            {/* Add Variant */}
            <div className="border border-blue-800/40 bg-slate-950/60 rounded-md p-4">
              <div className="text-blue-100 font-semibold mb-3">
                Add Variant
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <label className="grid gap-1">
                  <span className="text-xs text-blue-200/70">Size</span>
                  <input
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    className="px-3 py-2 rounded bg-blue-950/40 border border-blue-800/50 text-blue-50"
                    placeholder="One Size"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-blue-200/70">Color</span>
                  <input
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="px-3 py-2 rounded bg-blue-950/40 border border-blue-800/50 text-blue-50"
                    placeholder="N/A"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-blue-200/70">Qty</span>
                  <input
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    className="px-3 py-2 rounded bg-blue-950/40 border border-blue-800/50 text-blue-50 text-right tabular-nums"
                  />
                </label>

                <button
                  onClick={handleAddVariant}
                  disabled={variantsLoading}
                  className={[
                    "px-3 py-2 rounded border border-blue-800/60 text-blue-100",
                    variantsLoading
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:bg-blue-900/30",
                  ].join(" ")}
                >
                  {variantsLoading ? "Working..." : "Add"}
                </button>
              </div>

              {variantsError && (
                <div className="text-red-300 text-sm mt-2">{variantsError}</div>
              )}
            </div>

            {/* Variants table */}
            <div>
              {variantsLoading && variants.length === 0 ? (
                <div className="text-neutral-300">Loading variants...</div>
              ) : (
                <VariantTable
                  variants={variants}
                  onAddVariant={handleAddVariant}
                  onDeleteVariant={handleDeleteVariant}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
