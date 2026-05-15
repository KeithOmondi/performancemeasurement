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
          

          {/* Child Routes Render Here */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;