import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import "./AdminLayout.css";

export default function AdminLayout() {
  return (
    <div className="fincrm-admin-layout">
      <Sidebar />

      <div className="fincrm-admin-content">
        <Outlet />
      </div>
    </div>
  );
}
