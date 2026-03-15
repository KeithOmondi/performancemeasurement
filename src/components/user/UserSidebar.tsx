import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  History,
  User,
  LogOut,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react";
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
    { name: "Approved Submissions", path: "/user/approvals", icon: CheckCircle },
    { name: "Rejected Submissions", path: "/user/rejects", icon: XCircle },
    { name: "Submission History", path: "/user/history", icon: History },
    { name: "Settings", path: "/user/profile", icon: User },
  ];

  return (
    <>
      {/* Mobile Overlay - Styled with a soft blur */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-[#0a1413]/80 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        w-64 bg-[#1d3331] text-white h-screen fixed left-0 top-0 flex flex-col border-r border-white/5 z-50 transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
      `}>
        
        {/* --- BRANDING SECTION --- */}
        <div className="pt-6 pb-4 px-5 flex flex-col items-center shrink-0 relative">
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute right-3 top-3 p-1.5 text-slate-400 md:hidden hover:text-white hover:bg-white/10 rounded-lg"
          >
            <X size={18} />
          </button>

          {/* White Logo Box - Slimmed to prevent header squeeze */}
          <div className="bg-white p-2 rounded-xl shadow-lg w-full flex items-center justify-center mb-4 transition-transform hover:scale-[1.02]">
            <img
              src="/ORHC LOGO.png"
              alt="ORHC Logo"
              className="h-15 w-auto object-contain"
            />
          </div>
          
          <h1 className="text-[10px] font-black text-white text-center leading-tight uppercase tracking-[0.15em] px-1">
            Office of the Registrar <br /> 
            <span className="text-emerald-400/90">High Court</span>
          </h1>
        </div>

        {/* Subtle Divider */}
        <div className="px-6 py-2">
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* --- NAVIGATION SECTION --- */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
                  : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
                }`}
              >
                {/* Active Indicator Line */}
                {isActive && (
                  <div className="absolute left-0 w-1 h-5 bg-emerald-500 rounded-r-full" />
                )}

                <Icon 
                  size={18} 
                  className={`transition-colors duration-200 ${
                    isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"
                  }`} 
                />
                <span className="text-[11px] font-bold uppercase tracking-[0.1em]">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* --- FOOTER SECTION --- */}
        <div className="p-4 mt-auto border-t border-white/5 bg-[#162927] shrink-0">
          <button 
            onClick={() => dispatch(logout())}
            className="flex items-center space-x-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default UserSidebar;