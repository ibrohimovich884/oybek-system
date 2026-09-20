import Sidebar from "./Sidebar.jsx";
import OfflineIndicator from "../OfflineIndicator.jsx";

export default function Layout({ children }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="content">{children}</main>
      <OfflineIndicator />
    </div>
  );
}
