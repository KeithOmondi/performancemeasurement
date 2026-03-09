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
} from "lucide-react";
import { RiEjectFill } from "react-icons/ri";

type MenuLabel = {
  type: "label";
  title: string;
};

type MenuLink = {
  type?: "link";
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
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
    badge: 12,
  },
  {
    name: "Pending Reviews",
    path: "/admin/reviews",
    icon: <FileCheck size={18} />,
    badge: 3,
  },
  {
    name: "Approved Submissions",
    path: "/admin/approvals",
    icon: <RiEjectFill size={18} />,
    badge: 3,
  },
  {
    name: "Rejected Submissions",
    path: "/admin/rejects",
    icon: <RiEjectFill size={18} />,
    badge: 3,
  },

  { type: "label", title: "MANAGEMENT" },

  { name: "Staff Overview", path: "/admin/staff", icon: <Users size={18} /> },
  { name: "System Settings", path: "/admin/settings", icon: <Settings size={18} /> },
];

const AdminSidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { pathname } = useLocation();

  const handleLogout = () => {
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
        className={`fixed inset-y-0 left-0 z-[101] w-64 bg-[#1a2c2c] text-slate-300
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:sticky lg:top-0 lg:flex lg:flex-col lg:h-screen
        border-r border-slate-700
        ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Branding */}
        <div className="sticky top-0 bg-[#1a2c2c] pt-8 pb-6 px-6 flex flex-col items-center border-b border-slate-700/40 shrink-0">
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden absolute right-4 top-4 p-1 hover:bg-white/10 rounded"
          >
            <X size={20} />
          </button>

          <div className="bg-white p-2 rounded-xl shadow-xl mb-4">
            <img
              src="/ORHC LOGO.png"
              alt="ORHC"
              className="w-10 h-10 object-contain"
            />
          </div>

          <h1 className="text-[10px] font-black text-white text-center leading-tight uppercase tracking-wider">
            Office of the Registrar High Court
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item, index) => {
            if ("type" in item && item.type === "label") {
              return (
                <p
                  key={index}
                  className="text-[10px] font-semibold text-slate-500 mt-6 mb-2 ml-2 tracking-widest"
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
                className={`flex items-center justify-between p-3 rounded-lg transition-all group ${
                  isActive
                    ? "bg-[#eab308] text-black font-bold shadow-lg"
                    : "hover:bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="text-xs">{item.name}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive
                        ? "bg-black/10 text-black"
                        : "bg-emerald-500/10 text-emerald-500"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1a2c2c] p-4 border-t border-slate-700/50 shrink-0">
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