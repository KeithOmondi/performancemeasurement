import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { 
  ArrowLeft, Clock,  AlertCircle, 
  Loader2, TrendingUp,
  FileText, Upload, ExternalLink, RotateCcw,
  CheckCircle2
} from "lucide-react";
import { fetchIndicatorDetails } from "../../store/slices/userIndicatorSlice";
import type { AppDispatch, RootState } from "../../store/store";
import SubmissionModal from "./SubmissionModal";

const UserTaskIdPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { currentIndicator, loading, error } = useSelector(
    (state: RootState) => state.userIndicators
  );

  // Global settings for window management
  const { settings } = useSelector((state: RootState) => state.registry || { settings: [] });

  useEffect(() => {
    if (id) {
      dispatch(fetchIndicatorDetails(id));
    }
  }, [id, dispatch]);

  /**
   * 🛡️ SMART REGISTRY LOGIC: Updated for Annual vs Quarterly differentiation
   */
  const registryStatus = useMemo(() => {
    if (!currentIndicator) return { isOpen: false, message: "Syncing..." };

    const isAnnual = currentIndicator.reportingCycle === "Annual";
    const activeQ = currentIndicator.activeQuarter || 1;
    const now = new Date();
    const deadline = new Date(currentIndicator.deadline);

    // 1. Completion Check
    if (currentIndicator.status === "Completed") {
      return { isOpen: false, message: "Indicator Completed" };
    }

    // 2. State-Based Overrides (If rejected, always allow revision until deadline)
    const isInternallyOpen = 
      currentIndicator.status === "Pending" || 
      currentIndicator.status.includes("Rejected");

    if (isInternallyOpen && now < deadline) {
      return { isOpen: true, message: isAnnual ? "Annual Window Open" : `Q${activeQ} Window Open` };
    }

    // 3. Annual Cycle Logic: Bypasses quarterly window settings if not restricted
    if (isAnnual) {
      return now < deadline 
        ? { isOpen: true, message: "Annual Registry Active" }
        : { isOpen: false, message: "Annual Deadline Passed" };
    }

    // 4. Quarterly Window Logic
    const config = settings?.find((s: any) => s.quarter === activeQ);
    if (!config) return { isOpen: false, message: `Q${activeQ} Registry Pending` };
    if (config.isLocked) return { isOpen: false, message: "Registry Locked" };
    
    const start = new Date(config.startDate);
    const end = new Date(config.endDate);

    if (now < start) return { isOpen: false, message: `Opens ${start.toLocaleDateString()}` };
    if (now > end) return { isOpen: false, message: "Window Expired" };

    return { isOpen: true, message: "Registry Active" };
  }, [currentIndicator, settings]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fa]">
        <Loader2 className="w-12 h-12 animate-spin text-[#1a3a32] mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fetching Dossier...</p>
      </div>
    );
  }

  if (error || !currentIndicator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="text-center">
          <AlertCircle size={40} className="text-rose-500 mx-auto mb-4" />
          <h2 className="font-black text-xl text-[#1a3a32]">No Tasks assigned to you yet</h2>
          <button onClick={() => navigate(-1)} className="mt-4 text-[10px] font-black uppercase underline">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Top Navbar */}
        <nav className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1a3a32]">Back to Registry</span>
          </button>

          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
              registryStatus.isOpen ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-gray-100 border-gray-200 text-gray-400'
            }`}>
              {registryStatus.message}
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              disabled={!registryStatus.isOpen}
              className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                registryStatus.isOpen 
                ? "bg-[#1a3a32] text-white hover:shadow-xl hover:bg-[#c2a336]" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {currentIndicator.status.includes('Rejected') 
                ? 'Revise Submission' 
                : currentIndicator.reportingCycle === 'Annual' 
                  ? 'Submit Evidence' 
                  : `Submit Q${currentIndicator.activeQuarter} Progress`}
            </button>
          </div>
        </nav>

        {/* Main Header */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-bold uppercase">{currentIndicator.perspective}</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                currentIndicator.reportingCycle === 'Annual' ? 'bg-blue-50 text-blue-600' : 'bg-[#c2a336]/10 text-[#c2a336]'
              }`}>
                {currentIndicator.reportingCycle === 'Annual' ? 'Annual Cycle' : `Q${currentIndicator.activeQuarter} Active`}
              </span>
            </div>
            <h1 className="text-4xl font-black text-[#1a3a32] tracking-tighter leading-none">
              {currentIndicator.objectiveTitle}
            </h1>
            <p className="text-gray-500 font-medium leading-relaxed max-w-2xl italic">
              "{currentIndicator.activityDescription}"
            </p>
          </div>

          <div className="bg-[#1a3a32] p-6 rounded-2xl text-white shadow-2xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#c2a336]">Cumulative Performance</p>
              <TrendingUp size={18} className="text-white/20" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black">{currentIndicator.progress}%</span>
                <span className="text-[10px] text-white/40 uppercase font-black">
                  target: {currentIndicator.target}{currentIndicator.unit}
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
                <div 
                  className="h-full bg-[#c2a336] transition-all duration-700" 
                  style={{ width: `${currentIndicator.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            
            {/* EVIDENCE SECTION */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                  <FileText size={16} className="text-[#c2a336]" /> Evidence Repository
                </h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {currentIndicator.submissions.flatMap(sub => 
                  sub.documents.map((doc, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:text-[#c2a336] transition-colors">
                          <FileText size={18} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[11px] font-black text-[#1a3a32] truncate uppercase tracking-tighter">
                            {doc.fileName || `Submission_${sub.quarter}`}
                          </p>
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            sub.reviewStatus === 'Accepted' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {currentIndicator.reportingCycle === 'Annual' ? 'Annual' : `Q${sub.quarter}`} {sub.reviewStatus}
                          </span>
                        </div>
                      </div>
                      <a href={doc.evidenceUrl} target="_blank" rel="noreferrer" className="p-2 hover:bg-gray-50 rounded-lg">
                        <ExternalLink size={14} className="text-gray-400" />
                      </a>
                    </div>
                  ))
                )}
                {currentIndicator.submissions.length === 0 && (
                  <div className="col-span-full py-12 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-300">
                    <Upload size={24} className="mb-2" />
                    <p className="text-[10px] font-black uppercase">No filings detected for this cycle</p>
                  </div>
                )}
              </div>
            </section>

            {/* AUDIT LOG */}
            <section className="space-y-6">
              <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} className="text-[#c2a336]" /> Audit Trail
              </h3>
              <div className="space-y-4">
                {currentIndicator.reviewHistory.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
                    <div className={`mt-1 p-2 rounded-full ${
                      entry.action === 'Approved' || entry.action === 'Verified' ? 'bg-emerald-50 text-emerald-600' : 
                      entry.action === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {(entry.action === 'Approved' || entry.action === 'Verified') ? <CheckCircle2 size={16} /> : <RotateCcw size={16} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[10px] font-black uppercase text-[#1a3a32]">{entry.action}</p>
                        <span className="text-[8px] font-bold text-gray-400">{new Date(entry.at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium italic mb-2">"{entry.reason || 'No comment provided'}"</p>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Action by {entry.reviewerRole}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* SIDEBAR SPECS */}
          <aside className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-gray-400">Specifications</h4>
              <div className="space-y-4">
                <SpecRow label="Current Status" value={currentIndicator.status} />
                <SpecRow label="Reporting Cycle" value={currentIndicator.reportingCycle} />
                <SpecRow label="Filing Deadline" value={new Date(currentIndicator.deadline).toLocaleDateString()} highlight />
                <SpecRow 
                  label={currentIndicator.reportingCycle === 'Annual' ? "Current Phase" : "Active Quarter"} 
                  value={currentIndicator.reportingCycle === 'Annual' ? "Annual Cumulative" : `Quarter ${currentIndicator.activeQuarter}`} 
                />
              </div>
            </div>

            {currentIndicator.instructions && (
              <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                <p className="text-[10px] font-black uppercase text-amber-700 mb-2">Internal Instructions</p>
                <p className="text-xs text-amber-800 font-medium leading-relaxed">{currentIndicator.instructions}</p>
              </div>
            )}
          </aside>
        </div>
      </div>

      {isModalOpen && (
        <SubmissionModal 
          task={currentIndicator} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
};

const SpecRow = ({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
    <span className="text-[9px] font-black text-gray-400 uppercase">{label}</span>
    <span className={`text-[10px] font-black uppercase ${highlight ? 'text-rose-600' : 'text-[#1a3a32]'}`}>{value}</span>
  </div>
);

export default UserTaskIdPage;