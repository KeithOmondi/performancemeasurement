import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { 
  ArrowLeft, Clock, AlertCircle, 
  Loader2, TrendingUp,
  FileText, Upload, ExternalLink
} from "lucide-react";
import { fetchIndicatorDetails, clearIndicatorError } from "../../store/slices/userIndicatorSlice";
import type { AppDispatch, RootState } from "../../store/store";
import SubmissionModal from "./SubmissionModal";

const UserTaskIdPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { currentIndicator, loading, error, uploading } = useSelector(
    (state: RootState) => state.userIndicators
  );

  const { settings } = useSelector((state: RootState) => state.registry || { settings: [] });

  useEffect(() => {
    if (id) {
      dispatch(fetchIndicatorDetails(id));
    }
    return () => {
      dispatch(clearIndicatorError());
    };
  }, [id, dispatch]);

  /**
   * 🛡️ SMART REGISTRY LOGIC
   * Priority: Completion > Audit State > Revision Needs > Windows
   */
  const registryStatus = useMemo(() => {
    if (!currentIndicator) return { isOpen: false, message: "Syncing Registry..." };

    const isAnnual = currentIndicator.reportingCycle === "Annual";
    // For Annual, we look for Q0; for Quarterly, we look for the activeQuarter
    const targetQ = isAnnual ? 0 : currentIndicator.activeQuarter; 
    const now = new Date();
    const deadline = new Date(currentIndicator.deadline);

    // 1. Terminal State Check
    if (currentIndicator.status === "Completed") {
      return { isOpen: false, message: "Dossier Certified" };
    }

    // 2. Verification Firewall (Awaiting higher-level review)
    const activeSub = currentIndicator.submissions.find(s => s.quarter === targetQ);
    
    if (currentIndicator.status === "Awaiting Admin Approval" || currentIndicator.status === "Awaiting Super Admin") {
      return { isOpen: false, message: "Under Audit" };
    }

    if (activeSub?.reviewStatus === "Accepted") {
      return { isOpen: false, message: "Cycle Certified" };
    }

    // 3. Revision Priority (Allow upload if rejected/requested correction)
    if (currentIndicator.status.includes("Rejected")) {
      return { isOpen: true, message: "Revision Required" };
    }

    // 4. Hard Deadline Check
    if (now > deadline) {
      return { isOpen: false, message: "Deadline Passed" };
    }

    // 5. Quarterly Window Validation
    if (!isAnnual) {
      const config = settings?.find((s: any) => s.quarter === targetQ);
      if (!config) return { isOpen: false, message: `Q${targetQ} Setup Pending` };
      if (config.isLocked) return { isOpen: false, message: "Registry Locked" };
      
      const start = new Date(config.startDate);
      const end = new Date(config.endDate);

      if (now < start) return { isOpen: false, message: `Opens ${start.toLocaleDateString()}` };
      if (now > end) return { isOpen: false, message: "Window Expired" };
    }

    return { isOpen: true, message: "Registry Active" };
  }, [currentIndicator, settings]);

  if (loading && !currentIndicator) {
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
        <div className="text-center p-12 bg-white rounded-[2rem] shadow-xl border border-gray-100">
          <AlertCircle size={40} className="text-rose-500 mx-auto mb-4" />
          <h2 className="font-black text-xl text-[#1a3a32] uppercase tracking-tighter">Record Not Found</h2>
          <p className="text-xs text-gray-400 mt-2 font-medium">{error || "The requested dossier is unavailable."}</p>
          <button onClick={() => navigate(-1)} className="mt-8 px-6 py-2 bg-[#1a3a32] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-900 transition-all">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 lg:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Navigation */}
        <nav className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 group w-fit">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1a3a32]">Registry Portal</span>
          </button>

          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
              registryStatus.isOpen ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-gray-100 border-gray-200 text-gray-400 shadow-inner'
            }`}>
              {registryStatus.message}
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              disabled={!registryStatus.isOpen || uploading}
              className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${
                registryStatus.isOpen 
                ? "bg-[#1a3a32] text-white hover:shadow-2xl hover:-translate-y-0.5 active:scale-95" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-60"
              }`}
            >
              {uploading && <Loader2 size={12} className="animate-spin" />}
              {currentIndicator.status.includes('Rejected') 
                ? 'Submit Correction' 
                : currentIndicator.reportingCycle === 'Annual' 
                  ? 'Submit Annual Evidence' 
                  : `Submit Q${currentIndicator.activeQuarter} Filing`}
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="grid lg:grid-cols-3 gap-8 items-stretch">
          <div className="lg:col-span-2 space-y-4 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-gray-200 text-[#1a3a32] rounded text-[8px] font-black uppercase tracking-widest">
                {currentIndicator.perspective}
              </span>
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                currentIndicator.reportingCycle === 'Annual' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {currentIndicator.reportingCycle === 'Annual' ? 'Annual Cycle' : `Quarterly Cycle (Q${currentIndicator.activeQuarter})`}
              </span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-[#1a3a32] tracking-tighter leading-[0.9]">
              {currentIndicator.objectiveTitle}
            </h1>
            <p className="text-gray-400 font-bold text-sm leading-relaxed max-w-2xl italic border-l-4 border-gray-100 pl-4 py-1">
              {currentIndicator.activityDescription}
            </p>
          </div>

          <div className="bg-[#1a3a32] p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <TrendingUp size={80} />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c2a336] mb-4">Certified Progress</p>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black tracking-tighter">{Math.round(currentIndicator.progress)}%</span>
                  <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">
                    Target: {currentIndicator.target}{currentIndicator.unit}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full mt-6 overflow-hidden">
                  <div 
                    className="h-full bg-[#c2a336] shadow-[0_0_15px_rgba(194,163,54,0.5)] transition-all duration-1000 ease-out" 
                    style={{ width: `${Math.min(currentIndicator.progress, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            
            {/* EVIDENCE REGISTRY */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-[#1a3a32]">
                  <FileText size={16} className="text-[#c2a336]" /> Evidence Registry
                </h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {currentIndicator.submissions.flatMap(sub => 
                  sub.documents.map((doc, i) => (
                    <div key={`${sub._id}-${i}`} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-[#c2a336]/30 hover:shadow-lg transition-all">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400 group-hover:bg-[#c2a336]/10 group-hover:text-[#c2a336] transition-colors">
                          <FileText size={18} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[11px] font-black text-[#1a3a32] truncate uppercase tracking-tighter leading-none mb-1">
                            {doc.fileName || `Filing_Ref_${sub._id.slice(-4)}`}
                          </p>
                          <div className="flex gap-1.5">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              sub.reviewStatus === 'Accepted' || sub.reviewStatus === 'Verified' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
                              sub.reviewStatus === 'Rejected' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-amber-50 border-amber-100 text-amber-600'
                            }`}>
                              {sub.reviewStatus}
                            </span>
                            <span className="text-[8px] font-black text-gray-300 uppercase py-0.5">
                                {sub.quarter === 0 ? 'Annual' : `Q${sub.quarter}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <a href={doc.evidenceUrl} target="_blank" rel="noreferrer" className="p-2 hover:bg-gray-100 rounded-lg transition-colors group/btn">
                        <ExternalLink size={14} className="text-gray-300 group-hover/btn:text-[#1a3a32]" />
                      </a>
                    </div>
                  ))
                )}
                {currentIndicator.submissions.length === 0 && (
                  <div className="col-span-full py-16 border-2 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center text-gray-300 bg-white/50">
                    <Upload size={32} className="mb-3 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Filing repository empty</p>
                  </div>
                )}
              </div>
            </section>

            {/* AUDIT LOG */}
            <section className="space-y-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-[#1a3a32]">
                <Clock size={16} className="text-[#c2a336]" /> Certification Timeline
              </h3>
              <div className="space-y-4 border-l-2 border-gray-100 pl-6 ml-2">
                {[...currentIndicator.reviewHistory].reverse().map((entry, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative group hover:shadow-xl transition-all">
                    <div className="absolute -left-[33px] top-6 w-4 h-4 rounded-full bg-white border-4 border-[#1a3a32] z-10 group-hover:scale-125 transition-transform" />
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        ['Approved', 'Verified', 'Accepted'].includes(entry.action) ? 'bg-emerald-100 text-emerald-700' : 
                        entry.action.includes('Rejected') ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {entry.action}
                      </div>
                      <span className="text-[9px] font-bold text-gray-300">{new Date(entry.at).toLocaleDateString()}</span>
                    </div>
                    
                    <p className="text-sm text-[#1a3a32] font-medium leading-relaxed italic mb-4">
                        "{entry.reason || 'Record updated in registry.'}"
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                          Role: <span className="text-[#1a3a32]">{entry.reviewerRole}</span>
                        </p>
                        <p className="text-[9px] font-bold text-gray-300">
                          {new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* SIDEBAR */}
          <aside className="space-y-8">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm sticky top-12">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-8 text-gray-400 border-b border-gray-50 pb-4">Task Specification</h4>
              <div className="space-y-6">
                <SpecRow label="Current Status" value={currentIndicator.status} />
                <SpecRow label="Registry Mode" value={currentIndicator.reportingCycle} />
                <SpecRow label="Hard Deadline" value={new Date(currentIndicator.deadline).toLocaleDateString()} highlight />
                <SpecRow 
                  label={currentIndicator.reportingCycle === 'Annual' ? "Current Stage" : "Active Target"} 
                  value={currentIndicator.reportingCycle === 'Annual' ? "Cumulative" : `Quarter ${currentIndicator.activeQuarter}`} 
                />
              </div>

              {currentIndicator.instructions && (
                <div className="mt-12 pt-8 border-t border-gray-50">
                  <p className="text-[10px] font-black uppercase text-[#c2a336] mb-3 tracking-widest">Registry Guidance</p>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 italic">
                    "{currentIndicator.instructions}"
                  </p>
                </div>
              )}
            </div>
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
  <div className="flex flex-col gap-1">
    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">{label}</span>
    <span className={`text-[11px] font-black uppercase tracking-tight ${highlight ? 'text-rose-600' : 'text-[#1a3a32]'}`}>
        {value}
    </span>
  </div>
);

export default UserTaskIdPage;