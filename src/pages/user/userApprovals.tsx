import { useEffect, useState, useMemo } from "react";
import { 
  Search, 
  Loader2,   
  FileText,
  Trophy,
  ShieldCheck,
  Scale,
  User,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchMyAssignments, setLocalSelectedIndicator } from "../../store/slices/userIndicatorSlice";

const UserApprovals = () => {
  const dispatch = useAppDispatch();
  const { myIndicators, loading } = useAppSelector((state) => state.userIndicators);

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    dispatch(fetchMyAssignments());
  }, [dispatch]);

  const approvedAssignments = useMemo(() => {
    return myIndicators
      .filter((ind) => {
        // Logic: Only show records that have reached the terminal 'Approved' or 'Completed' state
        // and have been fully certified (progress 100%)
        const isFinalized = ind.status === "Approved" || ind.status === "Completed";
        const isCertified = (ind.progress ?? 0) >= 100;
        return isFinalized && isCertified;
      })
      .filter(ind => 
        (ind.activity?.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ind.objective?.title || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [myIndicators, searchTerm]);

  if (loading && myIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-emerald-600 mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">
          Accessing Verified Registry...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-[#fcfdfb] min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
             <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Finalized Records</span>
          </div>
          <h1 className="text-2xl font-serif font-black text-[#1a3a32] tracking-tighter uppercase">
            Completed Assignments
          </h1>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text"
            placeholder="Filter records..."
            className="pl-11 pr-6 py-3 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-emerald-600/5 transition-all w-full md:w-80 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {approvedAssignments.length === 0 ? (
        <div className="bg-white rounded-[2rem] p-24 text-center border border-dashed border-gray-200 shadow-inner">
          <Trophy className="mx-auto mb-6 text-gray-100" size={64} />
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Archive Empty</h2>
          <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tight">Verified certifications will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[1300px]">
              <thead>
                <tr className="bg-[#1a3a32] text-white">
                  <th className="px-6 py-6 text-[9px] font-black uppercase tracking-widest">Indicator / Activity</th>
                  <th className="px-4 py-6 text-[9px] font-black uppercase tracking-widest text-center">Perspective</th>
                  <th className="px-4 py-6 text-[9px] font-black uppercase tracking-widest text-center">Wt.</th>
                  <th className="px-4 py-6 text-[9px] font-black uppercase tracking-widest text-center">Unit</th>
                  <th className="px-6 py-6 text-[9px] font-black uppercase tracking-widest">Assignee</th>
                  <th className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-center">Progress</th>
                  <th className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-center">Certification</th>
                  <th className="px-6 py-6 text-right text-[9px] font-black uppercase tracking-widest">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {approvedAssignments.map((indicator) => (
                  <tr key={indicator.id} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="max-w-[300px]">
                        <p className="text-xs font-bold text-[#1a3a32] leading-tight mb-1">
                          {indicator.activity?.description}
                        </p>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-tight">
                          REF: {indicator.id.split('-')[0].toUpperCase()}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-5 text-center">
                      <span className="inline-block px-3 py-1 rounded-lg bg-slate-100 text-[#1a3a32] text-[9px] font-black uppercase tracking-tighter border border-slate-200">
                        {indicator.perspective}
                      </span>
                    </td>

                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <Scale size={12} className="text-slate-300 mb-1" />
                        <span className="text-xs font-black text-slate-700">{indicator.weight}</span>
                      </div>
                    </td>

                    <td className="px-4 py-5 text-center">
                      <span className="text-[10px] font-bold text-slate-500 italic">
                        {indicator.unit}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-[#1a3a32] border border-emerald-200">
                          <User size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-[#1a3a32] uppercase tracking-tighter">
                            {indicator.assigneeName || "System Assigned"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-black text-emerald-600">{indicator.progress}%</span>
                        <div className="w-16 h-1 bg-emerald-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-full" />
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <ShieldCheck size={16} className="text-emerald-500" />
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">
                          {indicator.status}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-right">
                      <button 
                        onClick={() => dispatch(setLocalSelectedIndicator(indicator.id))}
                        className="p-2.5 bg-[#1a3a32] text-white rounded-lg hover:bg-emerald-900 transition-all shadow-md group-hover:scale-110"
                      >
                        <FileText size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserApprovals;