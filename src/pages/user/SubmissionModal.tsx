import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X, Upload, CheckCircle2, Loader2, AlertCircle,
  Trash2, ShieldCheck, FileText, Users, Type, RefreshCw
} from "lucide-react";
import { submitIndicatorProgress } from "../../store/slices/userIndicatorSlice";
import type { AppDispatch, RootState } from "../../store/store";
import {
  type IIndicatorUI,
  type ISubmissionUI,
} from "../../store/slices/userIndicatorSlice";
import toast from "react-hot-toast";

interface SubmissionModalProps {
  task: IIndicatorUI | null;
  onClose: () => void;
}

interface ExtendedFile {
  file: File;
  description: string;
}

const SubmissionModal = ({ task, onClose }: SubmissionModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { uploading } = useSelector((state: RootState) => state.userIndicators);

  const [fileEntries, setFileEntries] = useState<ExtendedFile[]>([]);
  const [success, setSuccess] = useState(false);

  const isAnnual = task?.reporting_cycle === "Annual";
  const isTeam = task?.assignee_model === "Team";

  const [selectedQuarter, setSelectedQuarter] = useState<number>(
    isAnnual ? 1 : task?.active_quarter || 1,
  );

  // ─── EFFECTS ───

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // ─── MEMOS ───

  const currentPeriodSubmission = useMemo(
    () => task?.submissions?.find((s: ISubmissionUI) => s.quarter === selectedQuarter),
    [task, selectedQuarter],
  );

  const isRejected = currentPeriodSubmission?.review_status === "Rejected";
  const isAccepted = currentPeriodSubmission?.review_status === "Accepted";

  if (!task) return null;

  // ─── HANDLERS ───

  const handleQuarterChange = (q: number) => {
    // UPDATED: Batching state updates here prevents cascading render errors
    setSelectedQuarter(q);
    setFileEntries([]); 
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(f => ({
        file: f,
        description: ""
      }));
      setFileEntries((prev) => [...prev, ...newFiles].slice(0, 50));
    }
  };

  const updateFileDescription = (index: number, text: string) => {
    setFileEntries(prev => prev.map((item, i) => 
      i === index ? { ...item, description: text } : item
    ));
  };

  const removeFile = (index: number) => {
    setFileEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (fileEntries.length === 0) return toast.error("At least one evidence file is required.");
    if (fileEntries.some(f => !f.description.trim())) {
      return toast.error("Please provide a description for every document.");
    }

    const formData = new FormData();
    const overallNotes = fileEntries.map(f => f.description.trim()).join(" | ");
    
    formData.append("notes", overallNotes); 
    formData.append("quarter", String(selectedQuarter));
    formData.append("achievedValue", String(task.target));
    formData.append("year", String(new Date().getFullYear()));

    fileEntries.forEach((entry) => {
      formData.append("documents", entry.file);
      formData.append("descriptions", entry.description.trim());
    });

    const result = await dispatch(submitIndicatorProgress({ id: task.id, formData }));

    if (submitIndicatorProgress.fulfilled.match(result)) {
      setSuccess(true);
      toast.success(currentPeriodSubmission ? "Registry updated successfully" : "Evidence filed successfully.");
      setTimeout(() => { 
        onClose(); 
        setSuccess(false); 
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end overflow-hidden">
      <div className="absolute inset-0 bg-[#1a3a32]/40 backdrop-blur-sm" onClick={onClose} />

      <section className="relative w-full max-w-lg md:max-w-xl bg-[#fcfdfb] h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-500">
        
        {/* Header */}
        <div className="px-6 py-5 md:px-8 md:py-6 border-b border-slate-100 bg-white flex justify-between items-start shrink-0">
          <div className="text-[#1a3a32] space-y-1">
            <h3 className="text-lg md:text-xl font-serif font-black uppercase tracking-tighter">
              {isRejected ? "Returned for Correction" : currentPeriodSubmission ? "Update Registry" : "Submit Evidence"}
            </h3>
            <div className="flex items-center gap-2">
              <p className="text-[#c2a336] text-[9px] font-bold uppercase tracking-[0.15em]">
                {task.activity?.description}
              </p>
              {isTeam && (
                <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[8px] font-black uppercase border border-indigo-100">
                  <Users size={8} /> Team Filing
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-all group shrink-0 ml-4">
            <X size={18} className="text-slate-400 group-hover:rotate-90 group-hover:text-rose-500 transition-all" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#f8f9fa] custom-scrollbar">
          {success ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="bg-[#1a3a32] w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <h4 className="text-lg font-black text-[#1a3a32] uppercase tracking-tight">Filing Received</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Updating registry record...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {currentPeriodSubmission && !isRejected && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
                  <RefreshCw size={16} className="text-amber-500 shrink-0 mt-0.5 animate-spin-slow" />
                  <div>
                    <p className="text-[10px] text-amber-700 font-black uppercase tracking-tight">Registry Overwrite</p>
                    <p className="text-[10px] text-amber-600/80 font-medium leading-relaxed mt-0.5">
                      Filing a new update will replace all currently stored documents for Q{selectedQuarter}.
                    </p>
                  </div>
                </div>
              )}

              {isRejected && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl">
                  <p className="text-[9px] text-rose-700 font-black uppercase tracking-widest flex items-center gap-2 mb-1">
                    <AlertCircle size={12} /> Revision Required
                  </p>
                  <p className="text-xs text-rose-600 font-medium italic">
                    "{currentPeriodSubmission?.notes || "Please update your filing."}"
                  </p>
                </div>
              )}

              {/* Quarter Selection */}
              {!isAnnual && (
                <div className="space-y-2.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Target Quarter</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((q) => {
                      const status = task.submissions?.find(s => s.quarter === q)?.review_status;
                      const isLocked = status === "Accepted";
                      return (
                        <button
                          key={q}
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleQuarterChange(q)}
                          className={`py-2.5 rounded-lg text-[10px] font-black border transition-all ${
                            isLocked ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed" :
                            selectedQuarter === q ? "bg-[#1a3a32] text-white border-[#1a3a32] shadow-md scale-[1.02]" : 
                            "bg-white border-slate-200 text-slate-600 hover:border-[#c2a336]"
                          }`}
                        >
                          Q{q} {isLocked && "✓"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upload Zone */}
              <div className="space-y-2.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Upload New Evidence</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    multiple 
                    disabled={isAccepted} 
                    onChange={handleFileChange} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed" 
                  />
                  <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    isAccepted ? "bg-slate-50 border-slate-200" : 
                    fileEntries.length > 0 ? "border-[#1a3a32] bg-emerald-50/30" : 
                    "border-slate-200 bg-white group-hover:border-[#c2a336]"
                  }`}>
                    <Upload className={`mx-auto mb-2 ${fileEntries.length > 0 ? "text-[#1a3a32]" : "text-slate-300"}`} size={24} />
                    <p className="text-[9px] font-black text-[#1a3a32] uppercase tracking-widest">
                      {isAccepted ? "Quarter Certified" : "Select Document Batch"}
                    </p>
                    <p className="text-[8px] text-slate-400 uppercase mt-1">PDF, PNG, JPG up to 10MB</p>
                  </div>
                </div>
              </div>

              {/* File Entry Cards */}
              <div className="space-y-4">
                {fileEntries.map((entry, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between p-3 px-4 bg-slate-50/50 border-b border-slate-50">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText size={14} className="text-[#c2a336] shrink-0" />
                        <span className="text-[10px] font-black text-slate-600 truncate">{entry.file.name}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeFile(i)} 
                        className="text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="p-3 bg-white">
                      <div className="flex gap-2 items-start">
                        <Type size={12} className="text-slate-300 mt-1.5 shrink-0" />
                        <textarea
                          placeholder="Provide a brief description of this evidence..."
                          value={entry.description}
                          onChange={(e) => updateFileDescription(i, e.target.value)}
                          className="w-full text-[11px] font-medium text-slate-600 placeholder:text-slate-300 focus:outline-none min-h-[60px] resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 md:px-8 md:py-5 bg-white border-t border-slate-100 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={uploading || success || isAccepted}
            className="w-full bg-[#1a3a32] text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                <span>Syncing Registry...</span>
              </>
            ) : isAccepted ? (
              "Quarterly Record Certified"
            ) : (
              <>
                <ShieldCheck size={14} />
                <span>
                  {currentPeriodSubmission ? "Overwrite & Update" : "Finalize & Submit"} 
                  {fileEntries.length > 0 && ` (${fileEntries.length})`}
                </span>
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
};

export default SubmissionModal;