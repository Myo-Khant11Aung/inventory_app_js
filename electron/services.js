import db from "./db.js";

/**
 * Small helper: convert to number safely.
 * If value is "" / null / undefined / NaN -> fallback.
 */
function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Small helper: clean strings.
 */
function cleanText(value) {
  const s = value == null ? "" : String(value);
  const t = s.trim();
  return t.length ? t : null;
}

const productinputVaildator = (product) => {
  const name = cleanText(product?.name);
  if (!name) throw new Error("Name is required.");

  const sku = cleanText(product?.sku); // optional
  const cost = toNumber(product?.cost_price, 0);
  const sell = toNumber(product?.sell_price, 0);

  const categoryId =
    product?.category_id === "" || product?.category_id == null
      ? null
      : Number(product.category_id);

  return { name, sku, cost, sell, categoryId };
};

const variantInputValidator = (variant) => {
  const size = cleanText(variant?.size || "One Size");
  if (!size) throw new Error("Size is required.");

  const color = cleanText(variant?.color || "N/A");
  if (!color) throw new Error("Color is required.");

  const qty = toNumber(variant?.qty, 0);

  return { size, color, qty };
};

const DEFAULT_SIZE = "One Size";
const DEFAULT_COLOR = "N/A";

/**
 * PRODUCTS
 */

function getProducts() {
  return db
    .prepare(
      `
      SELECT
        id,
        name,
        sku,
        category_id,
        cost_price,
        sell_price,
        qty
      FROM products 
    `
    )
    .all();
}

function getProductById(id) {
  const productId = Number(id);
  if (!Number.isInteger(productId)) throw new Error("Invalid product id.");

  return db
    .prepare(
      `
      SELECT
        id,
        name,
        sku,
        category_id,
        cost_price,
        sell_price,
        qty
      FROM products p
      WHERE id = ?
    `
    )
    .get(productId);
}

/**
 * Variants for a product (size/color rows)
 */
function getVariantsByProductId(product_id) {
  const pid = Number(product_id);
  if (!Number.isInteger(pid)) throw new Error("Invalid product_id.");

  return db
    .prepare(
      `
      SELECT id, product_id, size, color, qty
      FROM product_variants
      WHERE product_id = ?
      ORDER BY
        CASE WHEN size = ? AND color = ? THEN 0 ELSE 1 END,
        size COLLATE NOCASE,
        color COLLATE NOCASE
    `
    )
    .all(pid, DEFAULT_SIZE, DEFAULT_COLOR);
}

/**
 * Create a product AND at least one variant.
 * - If size/color provided, create that variant.
 * - Else create default (One Size / N/A).
 */
function addProduct(product) {
  const name = cleanText(product?.name);
  if (!name) throw new Error("Name is required.");

  const sku = cleanText(product?.sku); // optional
  // const qty = toNumber(product?.qty, 0);

  const cost = toNumber(product?.cost_price, 0);
  const sell = toNumber(product?.sell_price, 0);

  const size = DEFAULT_SIZE;
  const color = DEFAULT_COLOR;

  const categoryId =
    product?.category_id === "" || product?.category_id == null
      ? null
      : Number(product.category_id);

  try {
    const tx = db.transaction(() => {
      const info = db
        .prepare(
          `
          INSERT INTO products (name, sku, category_id, cost_price, sell_price, qty)
          VALUES (?, ?, ?, ?, ?, ?)
        `
        )
        .run(name, sku, categoryId, cost, sell, 0);
      const productId = Number(info.lastInsertRowid);

      db.prepare(
        `
        INSERT INTO product_variants (product_id, size, color, qty)
        VALUES (?, ?, ?, ?)
      `
      ).run(productId, size, color, 0);

      return { id: productId };
    });

    return tx();
  } catch (e) {
    const msg = String(e.message || e);

    if (msg.includes("UNIQUE constraint failed: products.sku")) {
      throw new Error("SKU already exists. Please use a different SKU.");
    }
    if (
      msg.includes("UNIQUE constraint failed: product_variants.product_id") ||
      msg.includes("ux_variant_product_size_color")
    ) {
      throw new Error("That size/color already exists for this product.");
    }

    throw e;
  }
}

/**
 * Update product info (NOT qty).
 * qty lives in variants.
 */
function updateProduct(id, updates) {
  const productId = Number(id);
  if (!Number.isInteger(productId)) throw new Error("Invalid product id.");

  const name = cleanText(updates?.name);
  if (!name) throw new Error("Name is required.");

  const sku = cleanText(updates?.sku);
  const cost = toNumber(updates?.cost_price, 0);
  const sell = toNumber(updates?.sell_price, 0);

  const categoryId =
    updates?.category_id === "" || updates?.category_id == null
      ? null
      : Number(updates.category_id);

  try {
    const info = db
      .prepare(
        `
        UPDATE products
        SET name = ?, sku = ?, category_id = ?, cost_price = ?, sell_price = ?
        WHERE id = ?
      `
      )
      .run(name, sku, categoryId, cost, sell, productId);

    return { changes: info.changes };
  } catch (e) {
    const msg = String(e.message || e);

    if (msg.includes("UNIQUE constraint failed: products.sku")) {
      throw new Error("SKU already exists. Please use a different SKU.");
    }

    throw e;
  }
}

/**
 * Add a new variant row for a product.
 */
function addVariant({ product_id, size, color, qty = 0 }) {
  const pid = Number(product_id);
  if (!Number.isInteger(pid)) throw new Error("Invalid product_id.");

  const s = cleanText(size);
  const c = cleanText(color);
  if (!s) throw new Error("Size is required.");
  if (!c) throw new Error("Color is required.");

  const q = toNumber(qty, 0);

  try {
    const tx = db.transaction(() => {
      const info = db
        .prepare(
          `
          INSERT INTO product_variants (product_id, size, color, qty)
          VALUES (?, ?, ?, ?)
          `
        )
        .run(pid, s, c, q);

      db.prepare(
        `
        UPDATE products
        SET qty = qty + ?
        WHERE id = ?
        `
      ).run(q, pid);

      return { id: info.lastInsertRowid };
    });

    return tx();
  } catch (e) {
    const msg = String(e.message || e);

    if (
      msg.includes("UNIQUE constraint failed: product_variants.product_id") ||
      msg.includes("ux_variant_product_size_color")
    ) {
      throw new Error("That size/color already exists for this product.");
    }

    throw e;
  }
}

/**
 * Delete product:
 * - delete movements for all its variants
 * - delete variants
 * - delete product
 */
function deleteProduct(id) {
  const productId = Number(id);
  if (!Number.isInteger(productId)) throw new Error("Invalid product id.");

  const tx = db.transaction(() => {
    // get all variant ids for this product
    const variantIds = db
      .prepare(`SELECT id FROM product_variants WHERE product_id = ?`)
      .all(productId)
      .map((r) => r.id);

    let deletedMovements = 0;

    if (variantIds.length) {
      // build placeholders (?, ?, ?)
      const placeholders = variantIds.map(() => "?").join(", ");
      const mInfo = db
        .prepare(`DELETE FROM movements WHERE variant_id IN (${placeholders})`)
        .run(...variantIds);
      deletedMovements = mInfo.changes;
    }

    const vInfo = db
      .prepare(`DELETE FROM product_variants WHERE product_id = ?`)
      .run(productId);

    const pInfo = db
      .prepare(`DELETE FROM products WHERE id = ?`)
      .run(productId);

    return {
      deletedMovements,
      deletedVariants: vInfo.changes,
      deletedProducts: pInfo.changes,
    };
  });

  return tx();
}

/**
 * MOVEMENTS (variant-based)
 */

function addMovement({ variant_id, qty_change, reason, sold_price }) {
  const vid = Number(variant_id);
  if (!Number.isInteger(vid)) throw new Error("Invalid variant_id.");

  const change = toNumber(qty_change, NaN);
  if (!Number.isFinite(change) || change === 0) {
    throw new Error("qty_change must be a non-zero number.");
  }

  const why = cleanText(reason); // can be null

  const sold_price_num =
    sold_price == null || sold_price === "" ? null : Number(sold_price);

  if (
    sold_price_num !== null &&
    (!Number.isFinite(sold_price_num) || sold_price_num < 0)
  ) {
    throw new Error("sold_price must be a non-negative number.");
  }

  if (change > 0 && sold_price_num !== null) {
    throw new Error("sold_price is only allowed for stock-out movements.");
  }

  const tx = db.transaction(() => {
    // Ensure variant exists
    const variant = db
      .prepare(`SELECT id FROM product_variants WHERE id = ?`)
      .get(vid);
    if (!variant) throw new Error("Variant not found.");

    const product_id = db
      .prepare(`SELECT product_id FROM product_variants WHERE id = ?`)
      .get(vid).product_id;

    db.prepare(
      `
      INSERT INTO movements (variant_id, qty_change, reason, sold_price)
      VALUES (?, ?, ?, ?)
    `
    ).run(vid, change, why, sold_price_num);

    db.prepare(
      `
      UPDATE product_variants
      SET qty = qty + ?
      WHERE id = ?
    `
    ).run(change, vid);
    db.prepare(
      `
      UPDATE products SET qty = qty + ? WHERE id = ?
      `
    ).run(change, product_id);
  });

  tx();
  return { ok: true, variant_id: vid };
}

/**
 * Movements for ONE variant
 */
function getMovementsByVariant({ variant_id, limit = 200 }) {
  const vid = Number(variant_id);
  if (!Number.isInteger(vid)) throw new Error("Invalid variant_id.");

  const lim = Math.max(1, Math.min(1000, Number(limit) || 200));

  return db
    .prepare(
      `
      SELECT id, variant_id, qty_change, reason, created_at
      FROM movements
      WHERE variant_id = ?
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ?
    `
    )
    .all(vid, lim);
}

/**
 * Movements for a PRODUCT (all variants) + include size/color in results
 */
function getMovementsByProduct({ product_id, limit = 200 }) {
  const pid = Number(product_id);
  if (!Number.isInteger(pid)) throw new Error("Invalid product_id.");

  const lim = Math.max(1, Math.min(1000, Number(limit) || 200));

  return db
    .prepare(
      `
      SELECT
        m.id,
        m.qty_change,
        m.reason,
        m.created_at,
        v.id AS variant_id,
        v.size,
        v.color
      FROM movements m
      JOIN product_variants v ON v.id = m.variant_id
      WHERE v.product_id = ?
      ORDER BY datetime(m.created_at) DESC, m.id DESC
      LIMIT ?
    `
    )
    .all(pid, lim);
}

function addProductWithVariants(product, variants) {
  if (!Array.isArray(variants) || variants.length === 0) {
    return addProduct(product);
  }
  const { name, sku, cost, sell, categoryId } = productinputVaildator(product);

  var totalQty = 0;
  for (const variant of variants) {
    const { qty } = variantInputValidator(variant);
    totalQty += qty;
  }

  try {
    const tx = db.transaction(() => {
      const createProduct = db
        .prepare(
          `
          INSERT INTO products (name, sku, category_id, cost_price, sell_price, qty)
          VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(name, sku, categoryId, cost, sell, totalQty);
      const productId = Number(createProduct.lastInsertRowid);

      for (const variant of variants) {
        const { size, color, qty } = variantInputValidator(variant);
        db.prepare(
          `
          INSERT INTO product_variants (product_id, size, color, qty)
          VALUES (?, ?, ?, ?)
        `
        ).run(productId, size, color, qty);
      }
      return { id: productId };
    });
    return tx();
  } catch (e) {
    const msg = String(e.message || e);

    if (msg.includes("UNIQUE constraint failed: products.sku")) {
      throw new Error("SKU already exists. Please use a different SKU.");
    }
    if (
      msg.includes("UNIQUE constraint failed: product_variants.product_id") ||
      msg.includes("ux_variant_product_size_color")
    ) {
      throw new Error("That size/color already exists for this product.");
    }

    throw e;
  }
}

function deleteVariant(variant_id) {
  const vid = Number(variant_id);
  if (!Number.isInteger(vid)) throw new Error("Invalid variant_id.");
  try {
    const tx = db.transaction(() => {
      // 1) read variant first (must exist)
      const row = db
        .prepare(`SELECT product_id, qty FROM product_variants WHERE id = ?`)
        .get(vid);

      if (!row) throw new Error("Variant not found.");

      const { product_id, qty } = row;

      const countRow = db
        .prepare(
          `SELECT COUNT(*) AS cnt FROM product_variants WHERE product_id = ?`
        )
        .get(product_id);

      if (countRow.cnt <= 1) {
        throw new Error("Cannot delete the last variant.");
      }

      // 2) delete movements
      db.prepare(`DELETE FROM movements WHERE variant_id = ?`).run(vid);

      // 3) delete variant
      db.prepare(`DELETE FROM product_variants WHERE id = ?`).run(vid);

      // 4) update cached product qty
      db.prepare(`UPDATE products SET qty = qty - ? WHERE id = ?`).run(
        qty,
        product_id
      );

      return { ok: true };
    });
    return tx();
  } catch (e) {
    throw e;
  }
}

export {
  // products
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,

  // variants
  getVariantsByProductId,
  addVariant,
  addProductWithVariants,
  deleteVariant,

  // movements
  addMovement,
  getMovementsByVariant,
  getMovementsByProduct,
};
