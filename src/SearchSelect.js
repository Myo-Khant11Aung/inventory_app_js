import React, { useState, useMemo } from "react";

export default function SearchSelect({
  items,
  getKey = (x) => x.id,
  getLabel = (x) => x.name,
  getSearchText = (x) => `${x.name ?? ""} `,
  onSelect,
  placeholder = "Search...",
  maxResults = 30,
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, maxResults);

    const filtered = items.filter((item) =>
      getSearchText(item).toLowerCase().includes(q)
    );

    return filtered.slice(0, maxResults);
  }, [items, query, getSearchText, maxResults]);

  return (
    <div className="w-full">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-700 text-neutral-200"
      />

      <div className="mt-2 border border-neutral-700 rounded-md overflow-hidden bg-neutral-950">
        {results.length === 0 ? (
          <div className="px-3 py-2 text-neutral-400 text-sm">No results</div>
        ) : (
          results.map((item) => (
            <button
              key={getKey(item)}
              type="button"
              onClick={() => onSelect(item)}
              className="w-full text-left px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 border-b border-neutral-800 last:border-b-0"
            >
              {getLabel(item)}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
