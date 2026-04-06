import { useEffect, useState, useMemo } from "react";
import { 
  Search, 
  Loader2,   
  FileCheck,
  ShieldCheck,
  History as HistoryIcon,
  UserCheck,
  CheckCircle2,
  Clock,
  Filter,
  FileSearch,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { 
  fetchAllAdminIndicators, 
  getIndicatorByIdAdmin, 
  setSelectedIndicator 
} from "../../store/slices/adminIndicatorSlice";

const AdminApprovals = () => {
  const dispatch = useAppDispatch();
  const { allAssignments, isLoading } = useAppSelector((state) => state.adminIndicators);
  const [searchTerm, setSearchTerm] = useState("");
  const [fetchingId, setFetchingId] = useState<string | null>(null);

  useEffect(() => {
    // Passing 'all' to fetch all records for the vault view
    dispatch(fetchAllAdminIndicators({ status: 'all' }));
  }, [dispatch]);

  const approvedItems = useMemo(() => {
    // Statuses that represent verified or completed work in the Postgres workflow
    const targets = ["Awaiting Super Admin", "Completed", "Verified"];
    
    return allAssignments.filter((ind) => {
      const matchesStatus = targets.includes(ind.status);
      const matchesSearch = 
        ind.objective?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ind.assigneeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ind.activity?.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }, [allAssignments, searchTerm]);

  const handleViewDossier = async (id: string) => {
    setFetchingId(id);
    dispatch(setSelectedIndicator(null)); 
    try {
      await dispatch(getIndicatorByIdAdmin(id)).unwrap();
      // Logic for opening your specific review modal would trigger here
    } catch (err) {
      console.error("Failed to fetch dossier:", err);
    } finally {
      setFetchingId(null);
    }
  };

  if (isLoading && allAssignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fcfdfb]">
        <div className="relative mb-6">
          <Loader2 className="animate-spin text-[#1a3a32]" size={48} />
          <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600" size={18} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1a3a32] animate-pulse">
          Accessing Verified Vault...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-[#fcfdfb] min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#1a3a32] rounded-2xl shadow-xl shadow-emerald-900/20 text-white">
              <FileCheck size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-black text-[#1a3a32] tracking-tighter uppercase leading-none">
                Verified Tasks
              </h1>
              <div className="flex gap-2 mt-2">
                <span className="bg-emerald-50 text-emerald-700 text-[9px] px-3 py-1 rounded-lg font-black border border-emerald-100 uppercase tracking-widest">
                  {approvedItems.length} Performance Records
                </span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            ORHC Performance Management & Measurement Unit (PMMU)
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1a3a32] transition-colors" size={16} />
            <input 
              type="text"
              placeholder="Search by activity or lead officer..."
              className="pl-11 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-[#1a3a32]/5 transition-all w-full md:w-96 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-3.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      {approvedItems.length === 0 ? (
        <div className="bg-white rounded-[3.5rem] py-40 text-center border border-dashed border-slate-200 shadow-2xl shadow-slate-200/30">
          <FileSearch className="mx-auto mb-6 text-slate-100" size={80} />
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">No verified records found</h2>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[1300px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Activity Dossier</th>
                  <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center w-48">Execution</th>
                  <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Verification Pipeline</th>
                  <th className="px-10 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {approvedItems.map((indicator) => {
                  const isCompleted = indicator.status === "Completed";
                  const history = indicator.reviewHistory || [];
                  
                  // Logic to check verification steps from history
                  const adminEntry = [...history].reverse().find(h => h.reviewerRole === 'admin' && h.action === "Verified");
                  const superEntry = [...history].reverse().find(h => h.reviewerRole === 'superadmin' && h.action === "Approved");
                  
                  const isBeingFetched = fetchingId === indicator.id;

                  return (
                    <tr key={indicator.id} className="hover:bg-slate-50/60 transition-all group">
                      <td className="px-10 py-7">
                        <div className="max-w-md">
                          <h3 className="text-[13px] font-black text-[#1a3a32] tracking-tight mb-3 line-clamp-2 leading-snug">
                            {indicator.activity?.description}
                          </h3>
                          <div className="flex items-center gap-3">
                             <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 group-hover:bg-[#1a3a32] group-hover:border-[#1a3a32] transition-colors">
                                <UserCheck size={12} className="text-slate-400 group-hover:text-white" />
                             </div>
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">
                               {indicator.assigneeName}
                             </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-7">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-[11px] font-black text-[#1a3a32]">{indicator.progress}%</span>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-[#1a3a32]'}`} 
                              style={{ width: `${indicator.progress}%` }} 
                            />
                          </div>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                            Target: {indicator.target} {indicator.unit}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-7">
                        <div className="flex items-center justify-center gap-4">
                          {/* Registry Node */}
                          <div className="flex flex-col items-center gap-2">
                            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all border ${
                              adminEntry ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-300'
                            }`}>
                              <ShieldCheck size={16} />
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${adminEntry ? 'text-emerald-700' : 'text-slate-400'}`}>Registry</span>
                          </div>

                          {/* Connector */}
                          <div className="flex items-center">
                             <div className={`w-12 h-[2px] rounded-full transition-all ${superEntry ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                             <ArrowRight size={10} className={superEntry ? 'text-emerald-500' : 'text-slate-200'} />
                          </div>

                          {/* Super Admin Node */}
                          <div className="flex flex-col items-center gap-2">
                            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all border ${
                              superEntry ? 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-lg shadow-emerald-500/10' : 'bg-slate-50 border-slate-100 text-slate-300'
                            }`}>
                              <ShieldAlert size={16} />
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${superEntry ? 'text-emerald-700' : 'text-slate-400'}`}>Certification</span>
                          </div>

                          {/* Status Badge */}
                          <div className="ml-6">
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border ${
                              isCompleted 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : 'bg-[#1a3a32] text-white border-[#1a3a32]'
                            }`}>
                               {isCompleted ? <CheckCircle2 size={10} /> : <Clock size={10} className="animate-pulse" />}
                               <span className="text-[9px] font-black uppercase tracking-widest">
                                 {indicator.status.replace(/([A-Z])/g, ' $1').trim()}
                               </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-10 py-7 text-right">
                        <div className="flex justify-end items-center gap-3">
                          <button 
                            onClick={() => handleViewDossier(indicator.id)}
                            className="p-3 text-slate-400 hover:text-[#1a3a32] hover:bg-white hover:shadow-md rounded-2xl transition-all"
                            title="Review Timeline"
                          >
                            <HistoryIcon size={18} />
                          </button>
                          <button 
                            onClick={() => handleViewDossier(indicator.id)}
                            disabled={isBeingFetched}
                            className="group/btn relative overflow-hidden px-6 py-3.5 bg-white  text-[#1a3a32]  text-[10px] font-black uppercase tracking-[0.2em] hover:border-[#1a3a32] transition-all"
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              {isBeingFetched ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <></>
                              )}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;