import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout.jsx";
import Home from "./pages/Home.jsx";
import MoneyManager from "./pages/MoneyManager.jsx";
import ControlPanel from "./pages/ControlPanel.jsx";
import DebtsPage from "./pages/DebtsPage.jsx";
import ExercisesPage from "./pages/ExercisesPage.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/money" element={<MoneyManager />} />
        <Route path="/control" element={<ControlPanel />} />
        <Route path="/debts" element={<DebtsPage />} />
        <Route path="/exercises" element={<ExercisesPage />} />
      </Routes>
    </Layout>
  );
}
