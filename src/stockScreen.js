import { StoreContext } from "./StoreContext";
import React, { useContext, useState } from "react";

function VariantTable({ variants }) {
  return (
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
            <td className="px-3 py-2 border-r border-neutral-700/60 text-left">
              {v.size}
            </td>
            <td className="px-3 py-2 border-r border-neutral-700/60 text-left">
              {v.color}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{v.qty}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StockScreen() {
  const [expandedId, setExpandedId] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState({});
  const [variantsError, setVariantsError] = useState({});

  const { state, variantsCache, setVariantsFresh } = useContext(StoreContext);

  if (state.loading) return <p className="text-neutral-200">Loading...</p>;
  if (state.error) return <p className="text-red-300">Error: {state.error}</p>;

  async function handleDetails(productId) {
    if (expandedId.find((id) => id === productId)) {
      setExpandedId(expandedId.filter((id) => id !== productId));
      return;
    }
    setExpandedId([...expandedId, productId]);

    const cached = variantsCache[productId];

    // If cached and fresh, don't fetch
    if (cached && cached.fresh) {
      return;
    }

    // Otherwise fetch
    setVariantsLoading((prev) => ({ ...prev, [productId]: true }));
    setVariantsError((prev) => ({ ...prev, [productId]: null }));

    try {
      const variants = await window.api.products.getVariantsByProduct(
        productId
      );

      setVariantsFresh(productId, variants);
    } catch (err) {
      setVariantsError((prev) => ({
        ...prev,
        [productId]: err?.message || String(err),
      }));
    } finally {
      setVariantsLoading((prev) => ({ ...prev, [productId]: false }));
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 pb-3 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold text-neutral-200">Stock</h1>
      </header>
      <div className="flex-1 overflow-auto px-4 pt-3">
        <table className="w-full table-fixed text-right text-sm text-neutral-200 border border-neutral-700/60 bg-neutral-950 ">
          <thead className="sticky top-0 z-10 bg-neutral-900 border-b border-neutral-700/60 text-lg ">
            <tr className="text-neutral-200">
              <th className="w-[40%] text-left px-3 py-2 border-r border-neutral-700/60 font-semibold">
                Name
              </th>
              <th className="w-[15%] text-right px-3 py-2 border-r border-neutral-700/60 font-semibold">
                Quantity
              </th>
              <th className="w-[20%] text-right px-3 py-2 border-r border-neutral-700/60 font-semibold">
                Cost Price
              </th>
              <th className="w-[20%] text-right px-3 py-2 border-r border-neutral-700/60 font-semibold">
                Selling Price
              </th>
              <th className=" w-[5%] px-3 py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {state.products.map((p, idx) => (
              <React.Fragment key={p.id}>
                <tr
                  className={[
                    "border-t border-neutral-700/60",
                    idx % 2 === 0 ? "bg-neutral-950" : "bg-neutral-800/60",
                    "hover:bg-neutral-800/40 transition",
                  ].join(" ")}
                >
                  <td className="px-3 py-2 border-r border-neutral-700/60 text-left truncate">
                    {p.name}
                  </td>
                  <td className="px-3 py-2 border-r border-neutral-700/60 text-right tabular-nums">
                    {p.qty}
                  </td>
                  <td className="px-3 py-2 border-r border-neutral-700/60 text-right tabular-nums">
                    {Number(p.cost_price || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 border-r border-neutral-700/60 text-right tabular-nums">
                    {Number(p.sell_price || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right border border-neutral-700/60">
                    <button
                      className="text-xs px-2 py-1 rounded border border-neutral-700/60 hover:bg-neutral-800"
                      onClick={() => handleDetails(p.id)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
                {expandedId.includes(p.id) && (
                  <tr className="border-t border-neutral-700/60">
                    <td
                      colSpan={5}
                      className="px-3 py-3 bg-slate-950 border-t border-slate-700/60"
                    >
                      {variantsLoading[p.id] &&
                      !variantsCache[p.id]?.variants ? (
                        <div className="text-neutral-300">
                          Loading variants...
                        </div>
                      ) : (
                        <VariantTable
                          variants={variantsCache[p.id]?.variants || []}
                        />
                      )}
                      {variantsError[p.id] && (
                        <div className="text-red-300 mb-2">
                          {variantsError[p.id]}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {state.products.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-neutral-400 text-center"
                >
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StockScreen;
