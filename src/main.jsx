import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ExpensesProvider } from "./context/ExpensesContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ExpensesProvider>
        <App />
      </ExpensesProvider>
    </BrowserRouter>
  </React.StrictMode>
);
