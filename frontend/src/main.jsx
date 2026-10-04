import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ExpensesProvider } from "./context/ExpensesContext.jsx";
import { NotificationsProvider } from "./context/NotificationsContext.jsx";
import { SecurityProvider } from "./context/SecurityContext.jsx";
import { LoadingProvider } from "./context/LoadingContext.jsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// PWA service worker avtomatik ro'yxatdan o'tkazish
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ExpensesProvider>
          <NotificationsProvider>
            <SecurityProvider>
              <LoadingProvider>
                <App />
              </LoadingProvider>
            </SecurityProvider>
          </NotificationsProvider>
        </ExpensesProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);


