import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { 
  fetchMyAssignments, 
  type IIndicatorUI 
} from "../../store/slices/userIndicatorSlice";
import { useNavigate } from "react-router-dom";
import { 
  Loader2, Gavel, CheckCircle2, AlertTriangle, 
  Clock, XCircle, Send, Scale, type LucideIcon
} from "lucide-react";

/* ============================================================
    INTERFACES & TYPES
============================================================ */
interface IStat {
  key: string;
  value: number;
}

interface IStatusItem {
  label: string;
  color: string;
  theme: string;
  icon: LucideIcon;
}

/* ============================================================
    JUDICIARY COLOR PALETTE & MAPPING
============================================================ */
const STATUS_CONFIG: Record<string, IStatusItem> = {
  pending: { 
    label: "Pending",
    color: "#4B5563", 
    theme: "bg-[#F9FAFB] border-[#4B5563] text-[#4B5563]",
    icon: Clock 
  },
  awaiting: { 
    label: "In Review",
    color: "#1E3A2B", 
    theme: "bg-[#F0FDF4] border-[#1E3A2B] text-[#1E3A2B]",
    icon: Send 
  },
  rejected: { 
    label: "Rejected",
    color: "#991B1B", 
    theme: "bg-[#FEF2F2] border-[#991B1B] text-[#991B1B]",
    icon: XCircle 
  },
  partially: { 
    label: "Admin Verified",
    color: "#C69214", 
    theme: "bg-[#FFFBEB] border-[#C69214] text-[#C69214]",
    icon: Gavel 
  },
  completed: { 
    label: "Completed",
    color: "#059669", 
    theme: "bg-[#ECFDF5] border-[#059669] text-[#059669]",
    icon: CheckCircle2 
  },
  overdue: { 
    label: "Overdue",
    color: "#7f1d1d", 
    theme: "bg-red-50 border-red-800 text-red-900",
    icon: AlertTriangle 
  },
};

const UserDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { myIndicators, loading } = useAppSelector((state) => state.userIndicators);
  
  // FIX: Passing a function to useState makes the initialization pure
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    dispatch(fetchMyAssignments());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [dispatch]);

  // FIX: useCallback prevents this function from changing on every render
  const getUIKey = useCallback((indicator: IIndicatorUI) => {
    const status = indicator.status;
    if (status === "Completed") return "completed";
    if (status?.includes("Rejected")) return "rejected";
    if (status === "Partially Approved" || status === "Awaiting Super Admin") return "partially";
    if (status === "Awaiting Admin Approval") return "awaiting";
    
    if (indicator.deadline && new Date(indicator.deadline).getTime() < now) {
        if (status !== "Completed") return "overdue";
    }
    return "pending";
  }, [now]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {
      pending: 0, awaiting: 0, rejected: 0, partially: 0, completed: 0, overdue: 0
    };
    
    myIndicators.forEach((i) => {
        const key = getUIKey(i);
        if (counts[key] !== undefined) counts[key]++;
    });
    
    return Object.entries(counts).map(([key, value]) => ({ key, value })) as IStat[];
  }, [myIndicators, getUIKey]); // getUIKey is now a stable dependency

  if (loading && myIndicators.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#C69214] mb-2" size={32} />
        <p className="text-[10px] font-black text-[#1E3A2B] uppercase tracking-widest">Registry Sync...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* COMPACT HEADER */}
        <div className="border-b-2 border-[#C69214] pb-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Scale className="text-[#1E3A2B]" size={24} />
            <div>
              <h1 className="text-xl font-black text-[#1E3A2B] font-serif uppercase tracking-tight">Performance DashBoard</h1>
              <p className="text-[#C69214] font-bold text-[9px] uppercase tracking-[0.2em]">PMMU Oversight — Kenya Judiciary</p>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase">System Time</p>
            <p className="font-mono text-xs font-bold text-[#1E3A2B]">{new Date(now).toLocaleTimeString()}</p>
          </div>
        </div>

        {/* 6-BOX GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {stats.map(({ key, value }) => {
            const config = STATUS_CONFIG[key];
            const Icon = config.icon;
            return (
              <div key={key} className={`p-4 rounded-xl border-l-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${config.theme}`}>
                <div className="flex justify-between items-start mb-2">
                  <Icon size={14} strokeWidth={2.5} />
                  <span className="text-[7px] font-black uppercase opacity-40">Metric</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl font-black leading-none">{value}</p>
                  <p className="text-[8px] font-bold uppercase truncate">{config.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between px-1">
               <h2 className="text-[10px] font-black text-[#1E3A2B] uppercase tracking-widest flex items-center gap-2">
                 <div className="h-1.5 w-1.5 rounded-full bg-[#C69214]" />
                 Current Assignments
               </h2>
            </div>
            
            <div className="bg-white rounded-2xl border border-[#E5D5B0] overflow-hidden shadow-sm">
              {myIndicators.length === 0 ? (
                  <div className="p-12 text-center">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No active indicators assigned</p>
                  </div>
              ) : (
                myIndicators.map((indicator) => {
                    const uiKey = getUIKey(indicator);
                    const config = STATUS_CONFIG[uiKey];
                    return (
                      <div 
                        key={indicator.id} 
                        onClick={() => navigate(`/user/assignments/${indicator.id}`)}
                        className="group border-b border-gray-50 p-4 flex items-center justify-between hover:bg-[#F9F4E8]/40 cursor-pointer transition-colors"
                      >
                        <div className="flex-1 pr-4 overflow-hidden">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[8px] font-bold text-[#C69214] uppercase tracking-tighter shrink-0">
                                {indicator.perspective}
                            </span>
                            {indicator.assignee_model === "Team" && (
                                <span className="bg-violet-100 text-violet-700 text-[7px] px-1.5 py-0.5 rounded font-black uppercase">Team</span>
                            )}
                          </div>
                          <h3 className="font-bold text-sm text-[#1E3A2B] group-hover:text-[#C69214] transition-colors truncate">
                            {indicator.objective?.title || "Strategic Objective"}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-[9px] text-gray-400 font-bold uppercase flex items-center gap-1">
                              <Clock size={10} />
                              Deadline: {new Date(indicator.deadline).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
    
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className={`px-3 py-1 rounded-lg text-[8px] font-black border uppercase tracking-wider ${config.theme}`}>
                            {indicator.status}
                          </div>
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-[#1E3A2B] transition-all duration-700 ease-out" 
                                style={{ width: `${indicator.progress || 0}%` }} 
                            />
                          </div>
                          <span className="text-[8px] font-black text-[#1E3A2B] opacity-40">{Math.round(indicator.progress || 0)}% Complete</span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E5D5B0] p-6 shadow-sm text-center">
                <h3 className="text-[9px] font-black text-[#C69214] uppercase tracking-widest mb-6">Execution Distribution</h3>
                <IndicatorStatusPieChart data={stats} />
            </div>

            <div className="p-5 bg-[#1E3A2B] rounded-2xl border-l-4 border-[#C69214] shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                    <Gavel size={14} className="text-[#C69214]" />
                    <p className="text-[9px] font-black text-[#C69214] uppercase">Protocol Notice</p>
                </div>
                <p className="text-[10px] text-white/80 leading-relaxed font-medium">
                  Evidence uploads must be in PDF or Image format. Once "In Review", records are locked from further editing unless a correction is requested.
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
    PIE CHART (Strictly Typed)
============================================================ */
const IndicatorStatusPieChart: React.FC<{ data: IStat[] }> = ({ data }) => {
  const total = data.reduce((s, i) => s + i.value, 0);
  if (!total) return <div className="text-[10px] text-gray-300 py-10 italic font-bold uppercase tracking-widest">Registry Empty</div>;

  return (
    <div className="relative flex justify-center items-center">
      <svg viewBox="0 0 100 100" className="w-32 h-32 transform -rotate-90">
        {data.map((e, i) => {
          let start = 0;
          for (let x = 0; x < i; x++) start += (data[x].value / total) * 360;
          const end = start + (e.value / total) * 360;
          if (start === end) return null;
          const arc = end - start <= 180 ? 0 : 1;
          const sx = 50 + 40 * Math.cos((Math.PI * start) / 180);
          const sy = 50 + 40 * Math.sin((Math.PI * start) / 180);
          const ex = 50 + 40 * Math.cos((Math.PI * end) / 180);
          const ey = 50 + 40 * Math.sin((Math.PI * end) / 180);
          return (
            <path
              key={e.key}
              d={`M50,50 L${sx},${sy} A40,40 0 ${arc},1 ${ex},${ey} Z`}
              fill={STATUS_CONFIG[e.key].color}
              className="hover:opacity-80 transition-opacity cursor-pointer stroke-white stroke-[1px]"
            />
          );
        })}
        <circle cx="50" cy="50" r="32" fill="white" />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-black text-[#1E3A2B]">{total}</p>
        <p className="text-[7px] font-black text-[#C69214] uppercase">Indicators</p>
      </div>
    </div>
  );
};

export default UserDashboard;