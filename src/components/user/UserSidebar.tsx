import { LayoutDashboard, ClipboardList, History, User, LogOut, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../store/store";
import { logout } from "../../store/slices/auth/authSlice";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const UserSidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();

  const menuItems = [
    { name: "Dashboard", path: "/user/dashboard", icon: LayoutDashboard },
    { name: "My Assignments", path: "/user/assignments", icon: ClipboardList },
    { name: "Approved Submissions", path: "/user/approvals", icon: ClipboardList },
    { name: "Rejected Submissions", path: "/user/rejects", icon: ClipboardList },
    { name: "Submission History", path: "/user/history", icon: History },
    { name: "Settings", path: "/user/profile", icon: User },
  ];

  return (
    <aside className={`
      w-64 bg-[#1d3331] text-white h-screen fixed left-0 top-0 flex flex-col border-r border-white/10 z-50 transition-transform duration-300 ease-in-out
      ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
    `}>
      {/* Mobile Close Button */}
      <button 
        onClick={() => setIsOpen(false)}
        className="absolute right-4 top-6 p-2 text-slate-400 md:hidden"
      >
        <X size={20} />
      </button>

      <div className="p-6 mb-4">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-white p-1.5 rounded-xl inline-block">
             <img src="/ORHC LOGO.png" alt="Logo" className="w-32 h-8 object-contain" />
          </div>
        </div>
        <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500 font-black border-l-2 border-emerald-500/30 pl-3">
          User Portal
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsOpen(false)} // Close drawer on link click
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon size={18} className={isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-white"} />
              <span className="text-sm font-semibold">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <button 
          onClick={() => dispatch(logout())}
          className="flex items-center space-x-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all group"
        >
          <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default UserSidebar;