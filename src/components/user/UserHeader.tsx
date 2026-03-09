import { useState, useRef, useEffect } from "react";
import { Bell, Search, Menu, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../store/store";
import { logout } from "../../store/slices/auth/authSlice";

const UserHeader = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* Mobile Hamburger */}
        <button 
          onClick={onMenuClick}
          className="p-2 hover:bg-slate-100 rounded-lg md:hidden text-slate-600"
        >
          <Menu size={24} />
        </button>

        {/* Search - Hidden on very small screens, compact on tablet */}
        <div className="relative w-40 md:w-96 hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full bg-slate-50 border-none rounded-full py-2 pl-10 pr-4 text-xs focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3 md:space-x-6">
        <button className="relative text-slate-400 hover:text-[#1d3331] transition-colors p-2">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        {/* Profile Dropdown Section */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center space-x-3 border-l pl-4 md:pl-6 border-slate-100 group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-[#1d3331] group-hover:text-emerald-600 transition-colors">
                {user?.name || "Staff Member"}
              </p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                {user?.role || "Personnel"}
              </p>
            </div>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm border-2 border-transparent group-hover:border-emerald-200 transition-all">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full shadow-sm border border-slate-100 md:block hidden">
                <ChevronDown size={12} className={`text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </button>

          {/* Desktop Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 animate-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-slate-50 mb-1 sm:hidden">
                <p className="text-xs font-bold text-[#1d3331]">{user?.name}</p>
                <p className="text-[10px] text-slate-400 uppercase">{user?.role}</p>
              </div>
              <button className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                <UserIcon size={16} />
                <span>My Profile</span>
              </button>
              <button 
                onClick={() => dispatch(logout())}
                className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                <span className="font-bold">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default UserHeader;