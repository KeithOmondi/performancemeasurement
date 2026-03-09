import { useState } from "react";
import { Outlet } from "react-router-dom";
import SuperAdminSidebar from "./SuperAdminSidebar";
import SuperAdminHeader from "./SuperAdminHeader";

const SuperAdminLayout = () => {
  // 1. Manage the sidebar visibility state here
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* 2. Pass isOpen and setIsOpen to handle the mobile drawer logic */}
      <SuperAdminSidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 3. Pass onMenuClick so the hamburger button can open the sidebar */}
        <SuperAdminHeader 
          onMenuClick={() => setIsSidebarOpen(true)} 
        />
        
        <main className="p-4 md:p-6 overflow-y-auto">
          {/* Status Alert Banner */}
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-3 flex flex-wrap items-center gap-2 text-[11px] text-yellow-800">
            <span className="flex items-center font-bold">⚠️ 3 indicators</span>
            <span>have evidence pending review</span>
            <span className="hidden sm:inline mx-2">•</span>
            <span className="flex items-center font-bold">2 indicators</span>
            <span>are due within 7 days</span>
          </div>

          {/* Child Routes Render Here */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;