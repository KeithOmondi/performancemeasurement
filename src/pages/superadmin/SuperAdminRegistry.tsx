import React, { useEffect, useMemo, useState } from "react";
import { 
  Folder, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  RefreshCcw, 
  Loader2, 
  FileText,
  Target,
  ShieldCheck,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import IndicatorsPageIdModal from "./IndicatorsPageIdModal"; // Adjust path as needed

const SuperAdminRegistry = () => {
  const dispatch = useAppDispatch();
  
  // Data from Redux
  const { plans, loading } = useAppSelector((state) => state.strategicPlan);
  const { users } = useAppSelector((state) => state.users);
  
  // Local UI State
  const [activePerspective, setActivePerspective] = useState("All Indicators");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  
  // Filing / Modal State
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  const perspectives = [
    "All Indicators", 
    "Core Business", 
    "Customer", 
    "Financial", 
    "Innovation & Learning", 
    "Internal Process"
  ];

  useEffect(() => {
    dispatch(getAllStrategicPlans());
    dispatch(fetchAllUsers());
  }, [dispatch]);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredRegistry = useMemo(() => {
    return plans
      .filter(plan => 
        activePerspective === "All Indicators" || 
        plan.perspective.toLowerCase().includes(activePerspective.toLowerCase().split(" ")[0])
      )
      .map(plan => ({
        ...plan,
        objectives: plan.objectives.filter(obj => 
          obj.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          obj.activities.some(act => act.description.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      }))
      .filter(plan => plan.objectives.length > 0);
  }, [plans, activePerspective, searchTerm]);

  if (loading && plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#1d3331] mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Loading Registry Folders...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-[#fcfcf7] min-h-screen font-sans text-[#1a2c2c] relative">
      
      {/* 🔹 HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1d3331]">PMMU Registry</h1>
          <p className="text-[11px] text-slate-500 font-medium">Strategic evidence filed under judicial indicators</p>
        </div>
        <button 
          onClick={() => dispatch(getAllStrategicPlans())}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-sm"
        >
          <RefreshCcw size={14} /> Sync Registry
        </button>
      </div>

      {/* 🔹 PERSPECTIVES & SEARCH */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap gap-2">
          {perspectives.map((p) => (
            <button
              key={p}
              onClick={() => setActivePerspective(p)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight border transition-all
                ${activePerspective === p 
                  ? "bg-[#1d3331] text-white border-[#1d3331] shadow-md" 
                  : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"}`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input 
            type="text"
            placeholder="Filter files or objectives..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-[12px] font-medium outline-none focus:border-[#1d3331]/20 transition-all"
          />
        </div>
      </div>

      {/* 🔹 REGISTRY FOLDERS */}
      <div className="space-y-4">
        {filteredRegistry.map((plan) => (
          <React.Fragment key={plan._id}>
            {plan.objectives.map((obj) => (
              <div key={obj._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div 
                  onClick={() => toggleFolder(obj._id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-50 rounded-2xl">
                      <Folder className="text-amber-500 fill-amber-500" size={24} />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-[#1d3331] leading-tight">{obj.title}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{plan.perspective}</span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Weight: {obj.weight}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] font-black text-[#1d3331] uppercase tracking-widest">{obj.activities.length} Indicator Tracks</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Automated Filing Active</p>
                    </div>
                    <div className="text-slate-300">
                      {expandedFolders[obj._id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                  </div>
                </div>

                {expandedFolders[obj._id] && (
                  <div className="px-5 pb-5 pt-0 border-t border-slate-50 bg-slate-50/20">
                    <div className="space-y-2 mt-4 ml-0 md:ml-16">
                      {obj.activities.map((act) => (
                        <div key={act._id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl group hover:border-emerald-200 transition-all shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-emerald-600 transition-colors">
                              <FileText size={18} />
                            </div>
                            <div>
                              <span className="text-[12px] font-bold text-slate-700 italic block">"{act.description}"</span>
                              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Ref: {act._id.slice(-6).toUpperCase()}</p>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => setSelectedActivity(act)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#1d3331] text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#0e2a22] transition-all shadow-lg active:scale-95"
                          >
                            <ShieldCheck size={14} /> Examine Dossier
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* 🔹 THE FILING DRAWER (Modal Integration) */}
      {selectedActivity && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-[#1d3331]/20 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setSelectedActivity(null)}
          />
          
          {/* Drawer Content */}
          <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl animate-in slide-in-from-right duration-500 ease-out">
            <IndicatorsPageIdModal 
              indicator={selectedActivity} 
              allStaff={users} 
              onClose={() => setSelectedActivity(null)} 
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredRegistry.length === 0 && (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-100 mt-8">
          <Target className="mx-auto text-slate-200 mb-4" size={56} />
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">No registry records match your search</p>
        </div>
      )}
    </div>
  );
};

export default SuperAdminRegistry;