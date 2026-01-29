# Inventory App (Work in Progress)

This is an **ongoing inventory management desktop application** built with Electron, React, and SQLite.

The goal of this project is to design and implement a **realistic inventory system** while deeply understanding:
- state management
- SQL data modeling
- Electron IPC boundaries
- frontend–backend coordination
- cache invalidation and data correctness

This project is **not finished** and is actively evolving.

---

## Current Capabilities

### Products
- Products are stored in a local SQLite database
- Each product has:
  - name
  - SKU (optional)
  - cost price
  - selling price
  - total quantity (derived from variants)

### Variants (Size / Color)
- Products can have multiple variants
- Each variant represents a size + color combination
- Quantity is tracked at the **variant level**
- A product must always have **at least one variant**

### Stock Display
- Spreadsheet-style stock table
- Alternating row colors for readability
- Sticky table header
- Per-product “Details” button
- Variant rows expand inline under the product row

### Variant Loading Strategy
- Variants are **not loaded upfront**
- Variants are fetched only when a product row is expanded
- Loaded variants are cached per product
- Each cached variant set has a `fresh` flag
- Cache is marked stale after edits or movements

### Stock Movements
- Stock movements are tracked per variant
- Movements update:
  - variant quantity
  - cached product total quantity
- Movement history is stored for auditing and reporting

### State Management
- Products are stored in global state (React Context + `useReducer`)
- Variants are cached separately by product ID
- Individual products can be updated in global state without reloading everything
- Variant cache invalidation is handled explicitly

---

## What This Project Is Focused On

- Correct data flow over convenience
- Clear separation between:
  - UI
  - state
  - database logic
- Learning why certain patterns exist (not just using them)
- Avoiding premature abstractions
- Designing for future features without overengineering

---

## Planned Next Steps

- Edit product screen
- Add / edit / delete variants from UI
- Stock in / stock out screen
- Sold price tracking per movement
- Profit and reporting views
- Search and filtering improvements
- Keyboard-friendly workflows

---

## Status

⚠️ **Work in progress**

The API, state shape, and UI are expected to change as the project evolves.
