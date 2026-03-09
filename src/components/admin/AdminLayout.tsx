import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <AdminSidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <AdminHeader onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 p-4 md:p-6">
          {/* Alert Banner */}
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-3 flex flex-wrap items-center gap-2 text-[11px] text-yellow-800 shadow-sm">
            <span className="font-bold">⚠️ High Court Registry Alert:</span>
            <span>3 indicators pending review</span>
            <span className="hidden sm:inline mx-2">•</span>
            <span>2 tasks approaching deadline</span>
          </div>

          <Outlet />
        </main>

        <footer className="py-4 bg-white border-t border-slate-100 text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          © 2026 Office of the Registrar High Court | PMMU System
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;