import { useReducer, useEffect, useState } from "react";
import { StoreContext } from "./StoreContext";

const initialState = {
  products: [],
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };
    case "LOAD_SUCCESS":
      return {
        ...state,
        loading: false,
        products: action.products,
      };

    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };
    case "UPDATE_PRODUCT":
      return {
        ...state,
        loading: false,
        products: state.products.map((p) =>
          p.id === action.product.id ? action.product : p
        ),
      };

    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const [variantsCache, setVariantsCache] = useState({});

  async function loadProducts() {
    dispatch({ type: "LOAD_START" });
    try {
      const products = await window.api.products.getAll();
      dispatch({ type: "LOAD_SUCCESS", products });
      console.log("Loaded products:", products);
    } catch (err) {
      dispatch({ type: "LOAD_ERROR", error: err?.message || String(err) });
    }
  }

  async function updateProduct(updatedProduct) {
    dispatch({
      type: "UPDATE_PRODUCT",
      product: updatedProduct,
    });
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function setVariantsFresh(productId, variants) {
    setVariantsCache((prev) => ({
      ...prev,
      [productId]: { variants, fresh: true },
    }));
  }

  // helper: mark cached variants as stale
  function markVariantsStale(productId) {
    setVariantsCache((prev) => {
      if (!prev[productId]) return prev; // nothing cached yet
      return {
        ...prev,
        [productId]: { ...prev[productId], fresh: false },
      };
    });
  }

  return (
    <StoreContext.Provider
      value={{
        state,
        dispatch,
        loadProducts,
        markVariantsStale,
        setVariantsCache,
        variantsCache,
        setVariantsFresh,
        updateProduct,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
