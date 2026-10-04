import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout.jsx";
import Home from "./pages/Home.jsx";
import MoneyManager from "./pages/MoneyManager.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import ControlPanel from "./pages/ControlPanel.jsx";
import DebtsPage from "./pages/DebtsPage.jsx";
import ExercisesPage from "./pages/ExercisesPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import UpdatesPage from "./pages/UpdatesPage.jsx";
import SecurityGate from "./components/security/SecurityGate.jsx";
import LoginScreen from "./components/auth/LoginScreen.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { SlidersHorizontal } from "lucide-react";

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  // Agar 1 oylik JWT sessiya faol bo'lmasa, shunchaki parol oynasi ko'rsatiladi
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/money" element={<MoneyManager />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/transactions" element={<Navigate to="/history" replace />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/control"
          element={
            <SecurityGate
              scope="control_panel"
              title="Control Panel Qulflangan"
              subtitle="Boshqaruv paneliga kirish uchun 4 xonali maxfiy parolni tering"
              icon={<SlidersHorizontal size={26} color="#34d399" />}
              backUrl="/"
            >
              <ControlPanel />
            </SecurityGate>
          }
        />
        <Route path="/debts" element={<DebtsPage />} />
        <Route path="/exercises" element={<ExercisesPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/updates" element={<UpdatesPage />} />
        <Route path="/changelog" element={<Navigate to="/updates" replace />} />
        <Route path="/yangilanishlar" element={<Navigate to="/updates" replace />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}


