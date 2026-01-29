const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  products: {
    getAll: () => ipcRenderer.invoke("get-products"),
    getById: (id) => ipcRenderer.invoke("get-product-by-id", id),
    addProductOnly: (product) => ipcRenderer.invoke("add-product", product),
    addProductWithVariants: (product, variants) =>
      ipcRenderer.invoke("add-product-with-variants", product, variants),
    update: (id, updates) => ipcRenderer.invoke("update-product", id, updates),
    deleteProduct: (id) => ipcRenderer.invoke("delete-product", id),
    deleteVariant: (variant_id) =>
      ipcRenderer.invoke("delete-variant", variant_id),
    addVariant: (variant) => ipcRenderer.invoke("add-variant", variant),
    getVariantsByProduct: (product_id) =>
      ipcRenderer.invoke("get-variants-by-product", product_id),
  },
  movements: {
    add: (movement) => ipcRenderer.invoke("add-movement", movement),
    getByVariant: (variant_id, limit) =>
      ipcRenderer.invoke("get-movements-by-variant", variant_id, limit),
    getByProduct: (product_id, limit) =>
      ipcRenderer.invoke("get-movements-by-product", product_id, limit),
  },
});
