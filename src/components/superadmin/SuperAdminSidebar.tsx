import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import {
  LayoutDashboard,
  UserCheck,
  BarChart3,
  ListTodo,
  FileText,
  Users,
  Settings,
  X,
  Book,
  Folder,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";

type MenuLabel = { type: "label"; title: string };
type MenuLink = {
  type: "link";
  name: string;
  path: string;
  icon: ReactNode;
  badge?: number;
};
type MenuItem = MenuLabel | MenuLink;

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SuperAdminSidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const { pathname } = useLocation();
  const dispatch = useAppDispatch();
  const { plans } = useAppSelector((state) => state.strategicPlan);

  useEffect(() => {
    if (plans.length === 0) dispatch(getAllStrategicPlans());
  }, [dispatch, plans.length]);

  useEffect(() => {
    if (typeof setIsOpen === "function") {
      setIsOpen(false);
    }
  }, [pathname, setIsOpen]);

  const totalIndicators = plans.length;

  const menuItems: MenuItem[] = [
    { type: "label", title: "NAVIGATION" },
    {
      type: "link",
      name: "Dashboard",
      path: "/superadmin/dashboard",
      icon: <LayoutDashboard size={18} />,
    },
    {
      type: "link",
      name: "Reviewer Dashboard",
      path: "/superadmin/reviewer",
      icon: <UserCheck size={18} />,
    },
    {
      type: "link",
      name: "PMMU Indicators",
      path: "/superadmin/indicators",
      icon: <BarChart3 size={18} />,
      badge: totalIndicators > 0 ? totalIndicators : undefined,
    },
    {
      type: "link",
      name: "Submissions Queue",
      path: "/superadmin/submissions",
      icon: <ListTodo size={18} />,
      badge: 3,
    },
    {
      type: "link",
      name: "Reports",
      path: "/superadmin/reports",
      icon: <FileText size={18} />,
    },
    { type: "label", title: "ADMINISTRATION" },
    {
      type: "link",
      name: "Team Members",
      path: "/superadmin/team",
      icon: <Users size={18} />,
    },
    {
      type: "link",
      name: "Settings",
      path: "/superadmin/settings",
      icon: <Settings size={18} />,
    },
    {
      type: "link",
      name: "Examiners",
      path: "/superadmin/examiner",
      icon: <Book size={18} />,
    },
    {
      type: "link",
      name: "Teams",
      path: "/superadmin/teams",
      icon: <Book size={18} />,
    },
    {
      type: "link",
      name: "PMMU Registry",
      path: "/superadmin/registry",
      icon: <Folder size={18} />,
    },
  ];

  return (
    <>
      {/* Mobile Overlay - Static background blur when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-[101] w-64 bg-[#1a2c2c] text-slate-300 transition-transform duration-300 ease-in-out transform
        lg:sticky lg:top-0 lg:translate-x-0 lg:flex lg:flex-col lg:h-screen border-r border-slate-700
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        {/* Branding Section - Stays at the top */}
        <div className="pt-8 pb-6 px-4 flex flex-col items-center border-b border-slate-700/40 relative shrink-0">
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden absolute right-4 top-4 p-1 hover:bg-white/10 rounded"
          >
            <X size={20} />
          </button>

          <div className="relative mb-4">
            <div className="bg-white p-2 rounded-xl shadow-xl">
              <img
                src="/ORHC LOGO.png"
                alt="ORHC Logo"
                className="w-screen h-15 object-contain"
              />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-[10px] font-black text-white leading-tight uppercase tracking-wide px-2">
              Office of the Registrar High Court
            </h1>
          </div>
        </div>

        {/* Navigation Section - This portion scrolls if content is too long */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {menuItems.map((item, idx) => {
            if (item.type === "label") {
              return (
                <p
                  key={idx}
                  className="text-[10px] font-semibold text-slate-500 mt-4 mb-2 tracking-wider"
                >
                  {item.title}
                </p>
              );
            }
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between p-2 rounded-md transition-all group ${
                  isActive
                    ? "bg-[#eab308] text-black shadow-lg"
                    : "hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={
                      isActive
                        ? "text-black"
                        : "text-slate-400 group-hover:text-white"
                    }
                  >
                    {item.icon}
                  </span>
                  <span className="text-xs font-medium">{item.name}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center ${
                      isActive
                        ? "bg-black/20 text-black"
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

        {/* User Footer - Stays at the bottom */}
        <div className="p-4 bg-black/20 border-t border-slate-700/50 shrink-0">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
              CO
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold text-white truncate">
                C. Otieno-Omondi
              </p>
              <p className="text-[9px] opacity-60 uppercase tracking-tighter">
                Registrar - Admin
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SuperAdminSidebar;
