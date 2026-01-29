const path = require("path");
const Database = require("better-sqlite3");
const os = require("os");
const fs = require("fs");
const MIGRATIONS = require("./migrations");

const homedir = os.homedir();
const dbDir = path.join(homedir, ".inverntory_app");
const dbPath = path.join(homedir, ".inverntory_app", "inventory.db");

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
if (!fs.existsSync(dbPath)) {
  fs.closeSync(fs.openSync(dbPath, "w"));
  console.log("Created new database:", dbPath);
}

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 3000");
db.pragma("foreign_keys = ON");

function hasColumn(table, column) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((r) => r.name === column);
}

function runMigrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL);`);
  const dbVersions = db
    .prepare("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
    .get();

  console.log("Current DB version:", dbVersions ? dbVersions.version : 0);
  if (!dbVersions) {
    db.prepare("INSERT INTO schema_version (version) VALUES (0)").run();
  }
  const total = MIGRATIONS.length;
  let currentVersion = dbVersions ? dbVersions.version : 0;

  if (currentVersion >= total) return;
  for (let i = currentVersion; i < total; i++) {
    console.log(`Applying migration ${i + 1} of ${total}...`);

    const sql = MIGRATIONS[i];

    const isProductsRebuild =
      sql.includes("CREATE TABLE products_new") &&
      sql.includes("DROP TABLE products") &&
      sql.includes("RENAME TO products");

    const isMovementsRebuild =
      sql.includes("CREATE TABLE IF NOT EXISTS movements_new") &&
      sql.includes("DROP TABLE movements") &&
      sql.includes("RENAME TO movements");

    // Skip products rebuild if already upgraded (no price column)
    if (isProductsRebuild) {
      const shouldRebuild = hasColumn("products", "price");
      if (!shouldRebuild) {
        db.prepare("UPDATE schema_version SET version = ?").run(i + 1);
        continue;
      }
    }

    // Skip add cost/sell migration if columns already exist (shipping safety)
    const isAddCostSell =
      sql.includes("ALTER TABLE products ADD COLUMN cost_price") ||
      sql.includes("ALTER TABLE products ADD COLUMN sell_price");

    if (isAddCostSell) {
      const hasCost = hasColumn("products", "cost_price");
      const hasSell = hasColumn("products", "sell_price");
      if (hasCost && hasSell) {
        db.prepare("UPDATE schema_version SET version = ?").run(i + 1);
        continue;
      }
    }

    // Run migrations that require FK OFF (dropping/renaming referenced tables)
    const needsFkOff = isProductsRebuild || isMovementsRebuild;

    if (needsFkOff) {
      db.pragma("foreign_keys = OFF");
      try {
        db.exec(sql);
      } finally {
        db.pragma("foreign_keys = ON");
      }

      const fkProblems = db.prepare("PRAGMA foreign_key_check").all();
      if (fkProblems.length) {
        throw new Error(
          `Foreign key check failed after migration ${i}: ` +
            JSON.stringify(fkProblems)
        );
      }
    } else {
      db.exec(sql);
    }

    db.prepare("UPDATE schema_version SET version = ?").run(i + 1);
  }

  const final = db
    .prepare("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
    .get();
  console.log(`Migrations applied. Version: ${final?.version ?? 0}/${total}`);
}

runMigrate();

module.exports = db;
