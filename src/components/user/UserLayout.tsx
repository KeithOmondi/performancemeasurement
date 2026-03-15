import { useState } from "react";
import { Outlet } from "react-router-dom";
import UserSidebar from "./UserSidebar";
import UserHeader from "./UserHeader";

const UserLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fcfcf7] flex">
      {/* Sidebar: 
        Now handles its own Z-index and fixed positioning internally 
      */}
      <UserSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Header: Sticky at top-0 */}
        <UserHeader onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="p-4 md:p-8 animate-in fade-in duration-500">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserLayout;