import { useState, useEffect, useMemo } from "react";
import {
  X, CheckCircle2, FileText, Calendar, ShieldCheck,
  RotateCcw, Loader2, Lock, User, Paperclip, ExternalLink
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  superAdminReview,
  type IIndicator,
  type ISubmission
} from "../../store/slices/indicatorSlice";
import FilePreviewModal from "../PreviewModal"; // ✅ adjust path as needed
import toast from "react-hot-toast";

export interface Props {
  indicator: IIndicator;
  allStaff: any[];
  onClose: () => void;
}

const IndicatorsPageIdModal = ({ indicator, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const isProcessing = useAppSelector((state) => state.indicators.actionLoading);

  const [decisionReason, setDecisionReason] = useState("");
  const [progressOverride, setProgressOverride] = useState<number>(0);
  const [nextDeadline, setNextDeadline] = useState<string>("");
  const [showRejectReason, setShowRejectReason] = useState(false);

  // ✅ Preview state
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  const targetQ = useMemo(() => indicator.activeQuarter, [indicator]);

  const { activeSubmission, cycleLabel, isLastQuarter } = useMemo(() => {
    const label = indicator.reportingCycle === "Annual" ? "Annual" : `Q${targetQ}`;
    const submission = indicator.submissions?.find((s: ISubmission) => s.quarter === targetQ);
    const last = indicator.reportingCycle === "Annual" || targetQ === 4;
    return { activeSubmission: submission || null, cycleLabel: label, isLastQuarter: last };
  }, [indicator, targetQ]);

  useEffect(() => {
    setProgressOverride(activeSubmission?.achievedValue ?? indicator.currentTotalAchieved ?? 0);
    setDecisionReason("");
    setNextDeadline("");
    setShowRejectReason(false);
  }, [indicator, activeSubmission]);

  const isCertified =
    activeSubmission?.reviewStatus === "Accepted" || indicator.status === "Completed";

  const canAct = indicator.status === "Awaiting Super Admin" && !isCertified;

  const handleCertification = async (decision: "Approved" | "Rejected") => {
    if (decision === "Rejected" && !showRejectReason) {
      setShowRejectReason(true);
      return;
    }

    if (decision === "Rejected" && !decisionReason.trim()) {
      toast.error("Please provide a reason for rejecting this submission.");
      return;
    }

    if (
      decision === "Approved" &&
      indicator.reportingCycle === "Quarterly" &&
      !isLastQuarter &&
      !nextDeadline
    ) {
      toast.error(`Please set the Q${targetQ + 1} submission deadline before certifying.`);
      return;
    }

    try {
      await dispatch(
        superAdminReview({
          id: indicator._id,
          reviewData: {
            decision,
            reason: decision === "Approved" ? "" : decisionReason.trim(),
            progressOverride,
            nextDeadline: nextDeadline || undefined,
          },
        })
      ).unwrap();

      toast.success(
        decision === "Approved"
          ? isLastQuarter
            ? `${cycleLabel} — Final certification complete.`
            : `Q${targetQ} certified. Q${targetQ + 1} is now open.`
          : `${cycleLabel} returned for correction.`
      );

      onClose();
    } catch (err: any) {
      toast.error(err || "Certification failed. Please try again.");
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-[#fcfcf7] w-full h-full flex flex-col shadow-2xl overflow-hidden font-sans relative">
      <header className="bg-[#1d3331] px-8 py-7 flex justify-between items-start shrink-0 border-b-4 border-[#c2a336]">
        <div className="flex items-start gap-5">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all mt-1 ${
            isCertified
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
              : "bg-[#c2a336]/10 border-[#c2a336]/20 text-[#c2a336]"
          }`}>
            {isCertified ? <ShieldCheck size={26} /> : <FileText size={24} />}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] font-black uppercase text-[#c2a336] tracking-[0.2em]">
                CORE BUSINESS / MANDATE
              </p>
            </div>
            <h2 className="text-lg font-bold text-white font-serif leading-tight max-w-xl uppercase tracking-tight">
              {indicator.activityDescription}
            </h2>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="bg-[#c2a336] text-[9px] text-[#1d3331] px-3 py-1 rounded-full font-black uppercase">
                {indicator.status?.replace(/-/g, " ") || "Pending"}
              </span>
              <div className="bg-white/10 text-[9px] text-white px-3 py-1 rounded-full font-black uppercase flex items-center gap-1.5 border border-white/10">
                <User size={10} className="text-[#c2a336]" /> {indicator.assigneeDisplayName || "Registry Team"}
              </div>
              <div className="bg-white/10 text-[9px] text-white px-3 py-1 rounded-full font-black uppercase flex items-center gap-1.5 border border-white/10">
                <Calendar size={10} className="text-[#c2a336]" />
                {indicator.deadline ? new Date(indicator.deadline).toISOString().split("T")[0] : "2026-06-30"}
              </div>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white p-2 bg-white/5 rounded-lg transition-colors">
          <X size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-3xl mx-auto py-8 px-8 space-y-12">

          {/* Indicator Details */}
          <section className="space-y-6">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 pb-3">
              Indicator Details
            </h3>
            <div className="grid grid-cols-2 gap-y-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weight</p>
                <p className="text-base font-black text-[#1d3331]">{indicator.weight || "5%"}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</p>
                <p className="text-base font-black text-[#1d3331]">{indicator.unit || "%"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target 2025/26</p>
                <p className="text-base font-black text-[#1d3331]">{indicator.target || "100%"}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</p>
                <p className="text-base font-black text-[#1d3331]">{indicator.progress || "60%"}%</p>
              </div>
            </div>
          </section>

          {/* Assignment */}
          <section className="space-y-6">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 pb-3">
              Assignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assign To</label>
                <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-[#1d3331] flex justify-between items-center">
                  {indicator.assigneeDisplayName || "Select Staff"}
                  <X size={14} className="text-slate-300" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deadline</label>
                <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-[#1d3331] flex items-center gap-3">
                  <Calendar size={16} className="text-slate-400" />
                  {indicator.deadline ? new Date(indicator.deadline).toLocaleDateString() : "03/31/2026"}
                </div>
              </div>
            </div>
            <button className="px-6 py-3 bg-[#1d3331] text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all">
              Save Assignment
            </button>
          </section>

          {/* ✅ Evidence Section — shows uploaded docs if they exist, upload area otherwise */}
          <section className="space-y-6 pb-20">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 pb-3">
              Evidence / Supporting Documents
            </h3>

            {activeSubmission?.documents && activeSubmission.documents.length > 0 ? (
              // ✅ Show uploaded documents as previewable buttons
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeSubmission.documents.map((doc: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setPreviewFile({ url: doc.evidenceUrl, name: doc.fileName || "Evidence File" })}
                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-[#1d3331] group transition-all text-left"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="text-slate-400 group-hover:text-[#1d3331] shrink-0" size={16} />
                      <span className="text-[11px] font-black text-slate-600 truncate uppercase">
                        {doc.fileName || "Evidence File"}
                      </span>
                    </div>
                    <ExternalLink size={14} className="text-slate-300 group-hover:text-[#1d3331] shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              // Upload area shown when no documents yet
              <div className="py-12 bg-[#fcfcf7] border-2 border-dashed border-emerald-100 rounded-3xl flex flex-col items-center justify-center text-center group cursor-pointer hover:border-[#c2a336]/40 transition-all">
                <div className="mb-4 text-slate-400 group-hover:scale-110 transition-transform">
                  <Paperclip size={32} strokeWidth={1.5} />
                </div>
                <p className="text-xs font-bold text-slate-600 mb-1">
                  <span className="text-[#1d3331] underline">Click to upload</span> or drag files here
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                  PDF, DOCX, XLSX, JPG — max 10 MB per file
                </p>
              </div>
            )}
          </section>

          {/* Certification Card */}
          <div className={`p-8 rounded-[2rem] shadow-2xl space-y-8 border-b-[10px] transition-all duration-500 ${
            isCertified ? "bg-emerald-900 border-emerald-500" : "bg-[#1d3331] border-[#c2a336]"
          } text-white`}>
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${isCertified ? "bg-emerald-500/20" : "bg-white/10"}`}>
                {isCertified ? <ShieldCheck size={24} className="text-emerald-400" /> : <Lock size={24} className={canAct ? "text-[#c2a336]" : "text-white/20"} />}
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">
                {isCertified ? "Record Certified" : canAct ? "Certification Verdict" : "Not Ready for Certification"}
              </h3>
            </div>

            {canAct && (
              <div className="space-y-6 animate-in fade-in duration-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c2a336]">Verified Value ({indicator.unit})</label>
                    <input
                      type="number"
                      value={progressOverride}
                      onChange={(e) => setProgressOverride(Number(e.target.value))}
                      className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl font-black text-lg text-white outline-none focus:border-[#c2a336] transition-all"
                    />
                  </div>
                  {!isLastQuarter && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Next Q Deadline</label>
                      <input
                        type="date"
                        min={todayStr}
                        value={nextDeadline}
                        onChange={(e) => setNextDeadline(e.target.value)}
                        className="w-full p-4 bg-black/40 border border-amber-500/30 rounded-2xl font-bold text-white outline-none focus:border-amber-400 transition-all"
                      />
                    </div>
                  )}
                </div>

                {showRejectReason && (
                  <div className="space-y-3 animate-in slide-in-from-top-4 duration-500">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Rejection Feedback</label>
                    <textarea
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      className="w-full p-5 bg-black/40 border border-rose-500/30 rounded-2xl text-sm font-medium outline-none min-h-[100px]"
                      placeholder="Explain the corrections required..."
                    />
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-4 pt-2">
                  <button
                    onClick={() => handleCertification("Approved")}
                    disabled={isProcessing || !activeSubmission}
                    className="flex-[2] py-5 bg-[#c2a336] text-[#1d3331] rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] hover:bg-white hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                  >
                    <CheckCircle2 size={18} /> {isLastQuarter ? "Certify Performance" : "Approve & Open Next Period"}
                  </button>
                  <button
                    onClick={() => handleCertification("Rejected")}
                    disabled={isProcessing || !activeSubmission}
                    className={`flex-1 py-5 border rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-3 ${
                      showRejectReason ? "bg-rose-600 border-rose-600 text-white" : "border-rose-500/50 text-rose-400 hover:bg-rose-600 hover:text-white"
                    }`}
                  >
                    <RotateCcw size={18} /> {showRejectReason ? "Confirm Rejection" : "Reject"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ✅ FilePreviewModal */}
      {previewFile && (
        <FilePreviewModal
          url={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {isProcessing && (
        <div className="absolute inset-0 z-[100] bg-[#1d3331]/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8">
          <Loader2 className="animate-spin text-[#c2a336]" size={70} />
          <span className="text-[12px] font-black text-white uppercase tracking-[0.8em] animate-pulse">Syncing Registry...</span>
        </div>
      )}
    </div>
  );
};

export default IndicatorsPageIdModal;