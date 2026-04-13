import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileCheck,
  Users,
  Settings,
  LogOut,
  X,
  BarChart3,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

type MenuLabel = {
  type: "label";
  title: string;
};

type MenuLink = {
  type?: "link";
  name: string;
  path: string;
  icon: React.ReactNode;
};

type MenuItem = MenuLabel | MenuLink;

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const menuItems: MenuItem[] = [
  { type: "label", title: "MAIN NAVIGATION" },
  { name: "Dashboard", path: "/admin/dashboard", icon: <LayoutDashboard size={18} /> },
  {
    name: "PMMU Indicators",
    path: "/admin/indicators/all",
    icon: <BarChart3 size={18} />,
  },
  {
    name: "Pending Reviews",
    path: "/admin/reviews",
    icon: <FileCheck size={18} />,
  },
  {
    name: "Approved Submissions",
    path: "/admin/approvals",
    icon: <CheckCircle size={18} />,
  },
  {
    name: "Rejected Submissions",
    path: "/admin/rejects",
    icon: <AlertCircle size={18} />,
  },

  { type: "label", title: "MANAGEMENT" },

  { name: "Staff Overview", path: "/admin/staff", icon: <Users size={18} /> },
  { name: "System Settings", path: "/admin/settings", icon: <Settings size={18} /> },
];

const AdminSidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { pathname } = useLocation();

  const handleLogout = () => {
    // Implement your logout logic here
    console.log("Logout clicked");
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[101] w-64 bg-[#1a3a32] text-slate-300
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:sticky lg:top-0 lg:flex lg:flex-col lg:h-screen
        border-r border-white/10
        ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Branding */}
        <div className="sticky top-0 bg-[#1a3a32] pt-8 pb-6 px-6 flex flex-col items-center border-b border-white/5 shrink-0">
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden absolute right-4 top-4 p-1 hover:bg-white/10 rounded text-white"
          >
            <X size={20} />
          </button>

          <div className="bg-white p-2 rounded-xl shadow-xl mb-4">
            <img
              src="/ORHC LOGO.png"
              alt="ORHC"
              className="h-12 w-auto object-contain"
            />
          </div>

          <h1 className="text-[10px] font-black text-white text-center leading-tight uppercase tracking-widest">
            Office of the Registrar <br /> High Court
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {menuItems.map((item, index) => {
            if ("type" in item && item.type === "label") {
              return (
                <p
                  key={index}
                  className="text-[10px] font-bold text-slate-500 mt-6 mb-2 ml-2 tracking-[0.2em] uppercase"
                >
                  {item.title}
                </p>
              );
            }

            const isActive = pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? "bg-[#c2a336] text-[#1a3a32] font-bold shadow-lg"
                    : "hover:bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                <span className={`${isActive ? "text-[#1a3a32]" : "text-inherit"}`}>
                  {item.icon}
                </span>
                <span className="text-xs">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1a3a32] p-4 border-t border-white/5 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-bold transition-all"
          >
            <LogOut size={18} />
            Logout System
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;