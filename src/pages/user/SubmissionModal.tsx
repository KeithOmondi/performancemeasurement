import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  Upload,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Trash2,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { submitIndicatorProgress } from "../../store/slices/userIndicatorSlice";
import type { AppDispatch, RootState } from "../../store/store";
import { type IIndicatorUI, type ISubmissionUI } from "../../store/slices/userIndicatorSlice";
import toast from "react-hot-toast";

interface SubmissionModalProps {
  task: IIndicatorUI | null;
  onClose: () => void;
}

const SubmissionModal = ({ task, onClose }: SubmissionModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { uploading } = useSelector((state: RootState) => state.userIndicators);

  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  
  // 🔹 Sync with Backend: 0 for Annual, otherwise the current activeQuarter
  const isAnnual = task?.reportingCycle === "Annual";
  const [selectedQuarter, setSelectedQuarter] = useState<number>(
    isAnnual ? 0 : (task?.activeQuarter || 1)
  );
  
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // 🔹 Check status of existing submission for the selected period
  const currentPeriodSubmission = useMemo(() => {
    return task?.submissions?.find((s: ISubmissionUI) => s.quarter === selectedQuarter);
  }, [task, selectedQuarter]);

  const isRejected = currentPeriodSubmission?.reviewStatus === "Rejected";
  const isPending = currentPeriodSubmission?.reviewStatus === "Pending";
  const isAccepted = currentPeriodSubmission?.reviewStatus === "Accepted";

  if (!task) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() || files.length === 0) {
      return toast.error("Provide notes and at least one evidence file.");
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("evidence", file));
    formData.append("notes", notes.trim());
    
    // 🔹 The controller uses 'achievedValue' - you might want to add an input for this
    // For now, we default to the target if it's a simple completion, or 0.
    formData.append("achievedValue", String(task.target)); 

    const result = await dispatch(
      submitIndicatorProgress({ id: task._id, formData }),
    );

    if (submitIndicatorProgress.fulfilled.match(result)) {
      setSuccess(true);
      toast.success(
        isRejected
          ? "Correction submitted to Registry"
          : "Your submission has been received by the admin 😁",
      );
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end overflow-hidden">
      <div
        className="absolute inset-0 bg-[#1a3a32]/40 backdrop-blur-sm transition-opacity duration-500"
        onClick={onClose}
      />

      <section className="relative w-100 max-w-lg md:max-w-xl bg-[#fcfdfb] h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-500 ease-out">
        {/* Header */}
        <div className="px-6 py-5 md:px-8 md:py-6 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
          <div className="overflow-hidden text-[#1a3a32]">
            <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter truncate">
              {isRejected ? "Registry Correction" : "Submit Evidence"}
            </h3>
            <p className="text-[#c2a336] text-[9px] font-bold uppercase tracking-[0.15em] mt-0.5 truncate">
              {task.objectiveTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-full transition-all group shrink-0"
          >
            <X
              size={18}
              className="text-slate-400 group-hover:rotate-90 group-hover:text-rose-500 transition-all duration-300"
            />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-[#f8f9fa]">
          {success ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-500">
              <div className="bg-[#1a3a32] w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <div>
                <h4 className="text-lg font-black text-[#1a3a32] uppercase">
                  Submission Successful
                </h4>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mt-1">
                  Status: Awaiting Admin Approval
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {isRejected && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl space-y-1">
                  <p className="text-[9px] text-rose-700 font-black uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle size={12} /> Registry Rejection Notes
                  </p>
                  <p className="text-xs text-rose-600 font-medium italic">
                    "{currentPeriodSubmission?.adminComment || "Audit failed. Please re-verify evidence."}"
                  </p>
                </div>
              )}

              {/* Target Period Selector */}
              {!isAnnual ? (
                <div className="space-y-2.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Reporting Quarter
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((q) => {
                      const sub = task.submissions?.find((s) => s.quarter === q);
                      const isLocked = sub?.reviewStatus === "Pending" || sub?.reviewStatus === "Accepted";

                      return (
                        <button
                          key={q}
                          type="button"
                          disabled={isLocked}
                          onClick={() => setSelectedQuarter(q)}
                          className={`py-2.5 rounded-lg text-[10px] font-black transition-all border ${
                            isLocked
                              ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
                              : selectedQuarter === q
                                ? "bg-[#1a3a32] text-white border-[#1a3a32] shadow-md shadow-emerald-900/10"
                                : "bg-white border-slate-200 text-slate-600 hover:border-[#1a3a32]"
                          }`}
                        >
                          Q{q} {sub?.reviewStatus === "Accepted" && "✓"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <ShieldCheck className="text-indigo-600" size={18} />
                      <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Annual Reporting Cycle</span>
                   </div>
                   <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter text-right">Cycle 0</span>
                </div>
              )}

              {/* Upload Section */}
              <div className="space-y-2.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Evidence Documentation
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${files.length > 0 ? "border-[#1a3a32] bg-emerald-50/30" : "border-slate-200 hover:border-[#1a3a32]/50 bg-white"}`}
                  >
                    <Upload
                      className={`mx-auto mb-2 transition-colors ${files.length > 0 ? "text-[#1a3a32]" : "text-slate-300 group-hover:text-[#1a3a32]"}`}
                      size={24}
                    />
                    <p className="text-[9px] font-black text-[#1a3a32] uppercase tracking-widest">
                      {files.length > 0
                        ? `${files.length} Files Selected`
                        : "Upload New Evidence"}
                    </p>
                  </div>
                </div>
                {files.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 mt-3">
                    {files.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-white p-2.5 px-4 rounded-lg border border-slate-100"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText size={14} className="text-slate-400 shrink-0" />
                          <span className="text-[10px] font-bold text-slate-600 truncate">{f.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-slate-300 hover:text-rose-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Submission Narrative
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    isRejected
                      ? "Address the audit findings and describe evidence updates..."
                      : "Describe the specific achievements and context for this period..."
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl p-4 text-[11px] font-medium min-h-[120px] focus:border-[#1a3a32]/30 outline-none transition-all text-[#1a3a32]"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 md:px-8 md:py-5 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] hidden sm:block">
            Registry Audit Pipeline
          </p>
          <button
            onClick={handleSubmit}
            disabled={uploading || isPending || isAccepted || success}
            className="w-full sm:w-auto bg-[#1a3a32] text-white px-8 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-black/5"
          >
            {uploading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <ShieldCheck size={14} />
            )}
            {isRejected ? "Submit Correction" : "Submit for Audit"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default SubmissionModal;