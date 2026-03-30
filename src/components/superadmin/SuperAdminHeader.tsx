import { useState } from "react";
import { useSelector, useDispatch } from "react-redux"; // Added useDispatch
import { Search, Bell, Mail, LogOut, Check, Menu } from "lucide-react"; // Replaced PlusCircle with LogOut
import SlideOver from "./SlideOver";
import type { RootState, AppDispatch } from "../../store/store"; // Import AppDispatch
import { logout } from "../../store/slices/auth/authSlice";

interface HeaderProps {
  onMenuClick: () => void;
}

const SuperAdminHeader = ({ onMenuClick }: HeaderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const [activePanel, setActivePanel] = useState<"notifications" | "messages" | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  
  // Fetch users and auth status from Redux
  const { users } = useSelector((state: RootState) => state.users);
  const { isLoading } = useSelector((state: RootState) => state.auth);

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      dispatch(logout());
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Toggle */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-slate-100 rounded-md text-slate-600"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <img src="/ORHC LOGO.png" alt="ORHC Logo" className="w-8 md:w-auto h-8 md:h-10 object-contain" />
          <h1 className="font-roboto font-bold text-[10px] md:text-sm uppercase hidden sm:block">
            Office of the Registrar
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Search - Hidden on mobile */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-md text-xs focus:ring-1 focus:ring-yellow-500 w-40 lg:w-64"
          />
        </div>

        {/* Action Icons */}
        <div className="flex items-center space-x-1 md:space-x-2 border-x border-slate-200 px-2 md:px-4">
          <button onClick={() => setActivePanel("notifications")} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full relative">
            <Bell size={18} />
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full border-2 border-white">0</span>
          </button>
          
          <button onClick={() => setActivePanel("messages")} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full relative">
            <Mail size={18} />
            <span className="absolute top-1 right-1 bg-teal-500 text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full border-2 border-white">
              {selectedRecipients.length}
            </span>
          </button>
        </div>

        {/* Logout Button (Replaced Assign Indicator) */}
        <button 
          onClick={handleLogout}
          disabled={isLoading}
          className="flex items-center gap-2 bg-red-50 text-red-600 p-2 md:px-4 md:py-2 rounded-md text-xs font-bold uppercase hover:bg-red-600 hover:text-white transition-all border border-red-100"
        >
          <LogOut size={16} />
          <span className="hidden lg:inline">{isLoading ? "Logging out..." : "Logout"}</span>
        </button>
      </div>

      {/* Notifications SlideOver */}
      <SlideOver isOpen={activePanel === "notifications"} onClose={() => setActivePanel(null)} title="Notifications" icon={<Bell size={18} />}>
        <div className="p-8 text-center flex flex-col items-center justify-center h-full">
           <div className="text-slate-200 mb-4 font-serif text-6xl">🔔</div>
           <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No notifications yet</p>
        </div>
      </SlideOver>

      {/* Messages SlideOver */}
      <SlideOver isOpen={activePanel === "messages"} onClose={() => setActivePanel(null)} title="Messages" icon={<Mail size={18} />}>
        <div className="flex flex-col h-full bg-slate-50">
          <div className="bg-white border-b p-4">
             <div className="flex space-x-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <button className="text-[#1d3331] border-b-2 border-[#1d3331] pb-2">Direct Message</button>
                <button className="hover:text-slate-600 pb-2">Broadcast</button>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {users.map((user: any) => (
              <div 
                key={user._id} 
                onClick={() => toggleRecipient(user._id)}
                className={`bg-white p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between shadow-sm hover:border-teal-200 ${
                  selectedRecipients.includes(user._id) ? "border-teal-500 ring-1 ring-teal-500" : "border-slate-100"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                    selectedRecipients.includes(user._id) ? "bg-teal-600 border-teal-600" : "border-slate-200"
                  }`}>
                    {selectedRecipients.includes(user._id) && <Check size={10} className="text-white" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700">{user.name}</span>
                    <span className="text-[9px] text-slate-400 uppercase tracking-tighter">{user.pjNumber}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-white border-t">
            <textarea 
              placeholder="Type a message..." 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs focus:ring-1 focus:ring-[#1d3331] h-20 resize-none outline-none"
            />
            <button 
              disabled={selectedRecipients.length === 0}
              className="w-full mt-2 bg-[#1d3331] text-white py-2.5 rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-all"
            >
              Send Message
            </button>
          </div>
        </div>
      </SlideOver>
    </header>
  );
};

export default SuperAdminHeader;