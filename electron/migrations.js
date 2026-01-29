const MIGRATIONS = [
  `
    CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
    );
    `,
  `
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sku TEXT UNIQUE,
        price REAL NOT NULL,
        qty INTEGER NOT NULL DEFAULT 0,
        category_id INTEGER,
        FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    `,

  `
    CREATE TABLE IF NOT EXISTS movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        qty_change INTEGER NOT NULL,
        reason TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
    );
    `,
  `
    ALTER TABLE products ADD COLUMN cost_price REAL NOT NULL DEFAULT 0;
    ALTER TABLE products ADD COLUMN sell_price REAL NOT NULL DEFAULT 0;
    `,
  `
    CREATE INDEX IF NOT EXISTS idx_products_name
    ON products(name);
    
    CREATE INDEX IF NOT EXISTS idx_products_category
    ON products(category_id);
    
    CREATE INDEX IF NOT EXISTS idx_movements_product
    ON movements(product_id);
    
    CREATE INDEX IF NOT EXISTS idx_movements_product_date
    ON movements(product_id, created_at);
    `,
  `
    CREATE TABLE products_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sku TEXT UNIQUE,
        qty INTEGER NOT NULL DEFAULT 0,
        category_id INTEGER,
        cost_price REAL NOT NULL DEFAULT 0,
        sell_price REAL NOT NULL DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    
    INSERT INTO products_new (
        id, name, sku, qty, category_id, cost_price, sell_price
    )
    SELECT
        id, name, sku, qty, category_id, cost_price, sell_price
    FROM products;
    
    DROP TABLE products;
    
    ALTER TABLE products_new RENAME TO products;
    
    -- Recreate indexes for products
    CREATE INDEX IF NOT EXISTS idx_products_name
    ON products(name);
    
    CREATE INDEX IF NOT EXISTS idx_products_category
    ON products(category_id);
    `,
  `
    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      size TEXT NOT NULL,
      color TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  
    CREATE UNIQUE INDEX IF NOT EXISTS ux_variant_product_size_color
    ON product_variants(product_id, size, color);
  
    CREATE INDEX IF NOT EXISTS idx_variants_product
    ON product_variants(product_id);
    `,

  // 7) Backfill default variants from existing products.qty
  // Safe to rerun because UNIQUE(product_id,size,color) + OR IGNORE
  `
    INSERT OR IGNORE INTO product_variants (product_id, size, color, qty)
    SELECT id, 'One Size', 'N/A', qty
    FROM products;
    `,

  // 8) Migrate movements to variant_id (map old product_id -> default variant)
  `
    CREATE TABLE IF NOT EXISTS movements_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL,
      qty_change INTEGER NOT NULL,
      reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    );
  
    INSERT INTO movements_new (id, variant_id, qty_change, reason, created_at)
    SELECT
      m.id,
      v.id AS variant_id,
      m.qty_change,
      m.reason,
      m.created_at
    FROM movements m
    JOIN product_variants v
      ON v.product_id = m.product_id
     AND v.size = 'One Size'
     AND v.color = 'N/A';
  
    DROP TABLE movements;
  
    ALTER TABLE movements_new RENAME TO movements;
  
    CREATE INDEX IF NOT EXISTS idx_movements_variant
    ON movements(variant_id);
  
    CREATE INDEX IF NOT EXISTS idx_movements_variant_date
    ON movements(variant_id, created_at);
    `,
  `
  ALTER TABLE movements ADD COLUMN sold_price REAL DEFAULT 0;
  `,
];
module.exports = MIGRATIONS;
