import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout.jsx";
import Home from "./pages/Home.jsx";
import MoneyManager from "./pages/MoneyManager.jsx";
import ControlPanel from "./pages/ControlPanel.jsx";
import DebtsPage from "./pages/DebtsPage.jsx";
import ExercisesPage from "./pages/ExercisesPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import SecurityGate from "./components/security/SecurityGate.jsx";
import { SlidersHorizontal } from "lucide-react";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/money" element={<MoneyManager />} />
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
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}
