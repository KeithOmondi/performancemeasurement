import { Search, Bell, Mail, PlusCircle, Menu } from "lucide-react";
import { useAppSelector } from "../../store/hooks";

interface HeaderProps {
  onMenuClick: () => void;
}

const AdminHeader = ({ onMenuClick }: HeaderProps) => {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-slate-100 rounded-md text-slate-600"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <img
            src="/ORHC LOGO.png"
            alt="ORHC Logo"
            className="h-8 md:h-10 object-contain"
          />

          <h1 className="font-bold font-serif text-[10px] md:text-sm uppercase hidden sm:block text-slate-800">
            OFFICE OF THE REGISTRAR HIGH COURT
          </h1>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />

          <input
            type="text"
            placeholder="Search Registry..."
            className="pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-md text-xs focus:ring-1 focus:ring-yellow-500 w-40 lg:w-64"
          />
        </div>

        {/* Notifications */}
        <div className="flex items-center space-x-1 md:space-x-2 border-x border-slate-200 px-2 md:px-4">
          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-full relative">
            <Bell size={18} />

            <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full border-2 border-white">
              3
            </span>
          </button>

          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-full">
            <Mail size={18} />
          </button>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden xl:block">
            <p className="text-[11px] font-black text-[#1a3a32] leading-none uppercase">
              {user?.name || "Admin"}
            </p>

            <p className="text-[9px] text-emerald-600 font-bold uppercase mt-1">
              {user?.role || "ORHC"}
            </p>
          </div>

          <button className="flex items-center gap-2 bg-[#eab308] text-black px-3 py-2 rounded-md text-[11px] font-bold uppercase hover:bg-yellow-500 transition-colors shadow-sm">
            <PlusCircle size={16} />
            <span className="hidden lg:inline">Assign Indicator</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;