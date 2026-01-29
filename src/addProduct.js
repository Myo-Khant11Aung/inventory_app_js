import { useState, useContext } from "react";
import { StoreContext } from "./StoreContext";

export default function AddProduct() {
  const { loadProducts } = useContext(StoreContext);

  // product fields
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // variants array
  const [variants, setVariants] = useState([]);

  // temp variant inputs
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [qty, setQty] = useState("");

  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function addVariant() {
    if (!size || !color) {
      setError("Size and color are required.");
      return;
    }

    const quantity = Number(qty);
    if (!Number.isFinite(quantity) || quantity < 0) {
      setError("Quantity must be a non-negative number.");
      return;
    }

    setVariants((prev) => [...prev, { size, color, qty: quantity }]);

    // reset variant inputs
    setSize("");
    setColor("");
    setQty("");
    setError(null);
  }

  function removeVariant(index) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setError(null);

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (variants.length === 0) {
      setError("You must add at least one variant.");
      return;
    }

    const product = {
      name,
      sku: sku || null,
      cost_price: Number(costPrice) || 0,
      sell_price: Number(sellPrice) || 0,
      category_id: categoryId || null,
    };

    setSaving(true);
    try {
      await window.api.products.addProductWithVariants(product, variants);
      await loadProducts(); // refresh global products list

      // reset form
      setName("");
      setSku("");
      setCostPrice("");
      setSellPrice("");
      setCategoryId("");
      setVariants([]);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto grid gap-6 text-neutral-200">
      <h1 className="text-2xl font-semibold">Add Product</h1>

      {/* Product info */}
      <div className="grid gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Product name"
          className="input bg-neutral-700/60"
        />
        <input
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="SKU (optional)"
          className="input bg-neutral-700/60"
        />
        <input
          value={costPrice}
          onChange={(e) => setCostPrice(e.target.value)}
          placeholder="Cost price"
          className="input bg-neutral-700/60"
        />
        <input
          value={sellPrice}
          onChange={(e) => setSellPrice(e.target.value)}
          placeholder="Sell price"
          className="input bg-neutral-700/60"
        />
      </div>

      {/* Variants */}
      <div className="grid gap-2">
        <h2 className="font-semibold">Variants</h2>

        {variants.map((v, i) => (
          <div
            key={i}
            className="flex justify-between items-center bg-neutral-900 px-3 py-2 rounded"
          >
            <div>
              {v.size} / {v.color} — Qty: {v.qty}
            </div>
            <button
              onClick={() => removeVariant(i)}
              className="text-red-400 text-sm"
            >
              Remove
            </button>
          </div>
        ))}

        <div className="grid grid-cols-3 gap-2">
          <input
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="Size"
            className="input bg-neutral-700/60"
          />
          <input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Color"
            className="input bg-neutral-700/60"
          />
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Qty"
            className="input bg-neutral-700/60"
          />
        </div>

        <button
          onClick={addVariant}
          className="px-3 py-2 bg-neutral-800 rounded hover:bg-neutral-700"
        >
          Add Variant
        </button>
      </div>

      {error && <div className="text-red-400">{error}</div>}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Create Product"}
      </button>
    </div>
  );
}
