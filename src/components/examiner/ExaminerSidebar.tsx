import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";

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

const ExaminerSidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const { pathname } = useLocation();

  // Pull current examiner user from auth state for the footer
  const { user } = useSelector((state: RootState) => state.auth);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (typeof setIsOpen === "function") {
      setIsOpen(false);
    }
  }, [pathname, setIsOpen]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "EX";

  const menuItems: MenuItem[] = [
    { type: "label", title: "NAVIGATION" },
    {
      type: "link",
      name: "Dashboard",
      path: "/examiner/dashboard",
      icon: <LayoutDashboard size={18} />,
    },
    {
      type: "link",
      name: "Assigned Folders",
      path: "/examiner/assigned",
      icon: <ClipboardCheck size={18} />,
    },
    
    { type: "label", title: "RECORDS" },
    {
      type: "link",
      name: "Reports",
      path: "/examiner/reports",
      icon: <FileText size={18} />,
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-[101] w-64 bg-[#1a2c2c] text-slate-300
          transition-transform duration-300 ease-in-out transform
          lg:sticky lg:top-0 lg:translate-x-0 lg:flex lg:flex-col lg:h-screen
          border-r border-slate-700
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Branding */}
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
            {/* Examiner role badge */}
            <span className="mt-2 inline-block text-[8px] font-black uppercase tracking-widest bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full">
              Examiner Portal
            </span>
          </div>
        </div>

        {/* Navigation */}
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

        {/* User Footer */}
        <div className="p-4 bg-black/20 border-t border-slate-700/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-[10px] font-bold text-black shadow-lg">
              {initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold text-white truncate">
                {user?.name || "Examiner"}
              </p>
              <p className="text-[9px] opacity-60 uppercase tracking-tighter">
                Examiner
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default ExaminerSidebar;