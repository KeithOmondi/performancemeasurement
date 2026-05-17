import { useState } from "react";
import { Outlet } from "react-router-dom";
import ExaminerSidebar from "./ExaminerSidebar";
import ExaminerHeader from "./ExaminerHeader";

const ExaminerLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <ExaminerSidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ExaminerHeader
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main className="p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ExaminerLayout;