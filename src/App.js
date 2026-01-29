import React, { useState } from "react";
import StockScreen from "./stockScreen";
import EditProductScreen from "./EditProduct";
import Movements from "./Movements";
import AddProduct from "./addProduct";

function NavButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-3xl text-sm font-medium transition",
        active
          ? "bg-slate-600 text-white"
          : "text-neutral-300 hover:bg-neutral-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [screen, setScreen] = useState("stock");

  const ScreenSelector = () => {
    switch (screen) {
      case "stock":
        return <StockScreen />;
      case "in/out":
        return <Movements />;
      case "edit":
        return <EditProductScreen />;
      case "report":
        return <p className="text-white">Report</p>;
      case "add":
        return <AddProduct />;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-rows-[80px_1fr] h-screen ">
      {/* Taskbar */}
      <header className="flex items-center justify-start px-6 bg-neutral-950 border-b-2 border-[#0f0f0f]">
        <div className="bg-neutral-900 border border-neutral-800 flex items-center gap-3 px-3 h-[60px] rounded-3xl min-w-[420px] shadow-white-md">
          <NavButton
            active={screen === "stock"}
            onClick={() => setScreen("stock")}
          >
            Stock
          </NavButton>

          <NavButton
            active={screen === "in/out"}
            onClick={() => setScreen("in/out")}
          >
            Stock In/Out
          </NavButton>

          <NavButton
            active={screen === "edit"}
            onClick={() => setScreen("edit")}
          >
            Edit Product
          </NavButton>

          <NavButton active={screen === "add"} onClick={() => setScreen("add")}>
            Add Product
          </NavButton>

          <NavButton
            active={screen === "report"}
            onClick={() => setScreen("report")}
          >
            Report
          </NavButton>
        </div>
      </header>

      {/* Main content */}
      <main className="bg-neutral-900 overflow-auto border-t-2 border-[#0f0f0f] p-6">
        <ScreenSelector />
      </main>
    </div>
  );
}
