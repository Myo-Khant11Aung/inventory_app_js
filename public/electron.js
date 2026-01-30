// electron.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
// const isDev = require("electron-is-dev");
// const db = require("../electron/db");
// const services = require("../electron/services");

// build/electron.js  ->  ../electron/db.js
const db = require(path.join(__dirname, "..", "electron", "db.js"));
const services = require(path.join(__dirname, "..", "electron", "services.js"));
let mainWindow;

ipcMain.handle("get-products", async () => {
  return services.getProducts();
});

ipcMain.handle("get-product-by-id", async (event, id) => {
  return services.getProductById(id);
});

ipcMain.handle("add-product", async (event, product) => {
  return services.addProduct(product);
});

ipcMain.handle("update-product", async (event, id, updates) => {
  return services.updateProduct(id, updates);
});

ipcMain.handle("delete-product", async (event, id) => {
  return services.deleteProduct(id);
});

ipcMain.handle("add-movement", async (event, movement) => {
  return services.addMovement(movement);
});

ipcMain.handle("get-movements-by-variant", async (event, variant_id, limit) => {
  return services.getMovementsByVariant(variant_id, limit);
});

ipcMain.handle("get-movements-by-product", async (event, product_id, limit) => {
  return services.getMovementsByProduct(product_id, limit);
});

ipcMain.handle("get-variants-by-product", async (event, product_id) => {
  return services.getVariantsByProductId(product_id);
});

ipcMain.handle("add-variant", async (event, variant) => {
  return services.addVariant(variant);
});

ipcMain.handle(
  "add-product-with-variants",
  async (event, product, variants) => {
    return services.addProductWithVariants(product, variants);
  }
);

ipcMain.handle("delete-variant", async (event, variant_id) => {
  return services.deleteVariant(variant_id);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "../build/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startURL = app.isPackaged
    ? `file://${path.join(__dirname, "../build/index.html")}`
    : "http://localhost:3000";

  mainWindow.loadURL(startURL);

  // if (isDev) {
  //   mainWindow.webContents.openDevTools();
  // }
  // mainWindow.webContents.openDevTools({ mode: "detach" });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  if (db) {
    db.close();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
