import { useEffect, useMemo, useState } from "react";
import { 
  UserCheck, 
  Mail, 
  ShieldCheck, 
  Search, 
  UserMinus, 
  Loader2, 
  MoreVertical,
  IdCard,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchAllUsers, toggleStatus, type User } from "../../store/slices/user/userSlice";

const SuperAdminExaminers = () => {
  const dispatch = useAppDispatch();
  const { users, isLoading } = useAppSelector((state) => state.users);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    dispatch(fetchAllUsers());
  }, [dispatch]);

  // Logic: Filter only users with the 'examiner' role
  const examiners = useMemo(() => {
    return users.filter((user: User) => {
      const isExaminer = user.role === "examiner";
      const matchesSearch = 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.pjNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      return isExaminer && matchesSearch;
    });
  }, [users, searchTerm]);

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    dispatch(toggleStatus({ id, isActive: !currentStatus }));
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#1d3331] mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Loading Examiner Registry...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-[#fcfcf7] min-h-screen font-sans text-[#1a2c2c]">
      {/* 🔹 HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1d3331]">Examiner Directory</h1>
          <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-1">
            Managing {examiners.length} Verified Review Officers
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by Name, PJ, or Email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[12px] font-bold outline-none focus:border-[#1d3331] transition-all shadow-sm"
          />
        </div>
      </div>

      {/* 🔹 EXAMINER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {examiners.map((examiner) => (
          <div key={examiner._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                  <ShieldCheck size={24} />
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    examiner.isActive 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                    : "bg-red-50 text-red-600 border-red-100"
                  }`}>
                    {examiner.isActive ? "Active" : "Suspended"}
                  </span>
                  <button className="text-slate-300 hover:text-slate-600 transition-colors">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-[15px] font-bold text-[#1d3331] truncate">{examiner.name}</h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{examiner.title}</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-slate-500">
                  <IdCard size={14} className="text-slate-300" />
                  <span className="text-[11px] font-bold tracking-widest">{examiner.pjNumber}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <Mail size={14} className="text-slate-300" />
                  <span className="text-[11px] font-medium truncate">{examiner.email}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <button 
                  onClick={() => handleToggleActive(examiner._id, examiner.isActive)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    examiner.isActive 
                    ? "text-red-500 hover:bg-red-50" 
                    : "text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  {examiner.isActive ? (
                    <><UserMinus size={14} /> Suspend Access</>
                  ) : (
                    <><UserCheck size={14} /> Restore Access</>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {!isLoading && examiners.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center">
            <UserCheck size={48} className="text-slate-200 mb-4" />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">No examiners found in registry</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminExaminers;