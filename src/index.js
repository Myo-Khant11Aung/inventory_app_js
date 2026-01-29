import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { StoreProvider } from "./StoreProvider";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <StoreProvider>
      <div className="h-screen w-screen overflow-hidden">
        <App />
      </div>
    </StoreProvider>
  </React.StrictMode>
);

reportWebVitals();
