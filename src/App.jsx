<<<<<<< HEAD
import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout.jsx";
import Home from "./pages/Home.jsx";
import MoneyManager from "./pages/MoneyManager.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/money" element={<MoneyManager />} />
      </Routes>
    </Layout>
  );
}
=======
import ExercisesPage from './pages/ExercisesPage';

function App() {
  return <ExercisesPage />;
}

export default App;

>>>>>>> 27a690c7f42848b88163d7519b4fbcd3a5c95b8a
