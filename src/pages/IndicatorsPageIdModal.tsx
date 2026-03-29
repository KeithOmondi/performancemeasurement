import  { useState } from "react";
import { 
  X, 
  File,  
  ExternalLink, 
  CheckCircle2,
  User,
  AlertCircle,
  FileText
} from "lucide-react";
import { type IIndicator, type ISubmission } from "../store/slices/indicatorSlice"; // Adjust path

interface Props {
  indicator: IIndicator; // Use the real interface
  allStaff: any[];
  onClose: () => void;
}

const IndicatorsPageIdModal = ({ indicator, onClose }: Props) => {
  const [activeTab, setActiveTab] = useState<"overview" | "evidence" | "team">("overview");

  // Flatten all documents from all quarters for the "Evidence" tab
  const allSubmissions: ISubmission[] = indicator.submissions || [];

  return (
    <div className="flex flex-col h-full bg-[#fcfcf7]">
      {/* --- HEADER --- */}
      <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${indicator.progress === 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Ref: {indicator._id.slice(-8).toUpperCase()} • {indicator.reportingCycle}
            </span>
            <h2 className="text-lg font-bold text-[#1d3331] leading-tight line-clamp-1">
              {indicator.activityDescription || "Indicator Details"}
            </h2>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
          <X size={20} />
        </button>
      </div>

      {/* --- NAVIGATION --- */}
      <div className="flex px-6 bg-white border-b border-slate-100 gap-6">
        {["overview", "evidence", "team"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
              activeTab === tab 
                ? "border-[#1d3331] text-[#1d3331]" 
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* --- CONTENT --- */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* TAB: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Progress</p>
                <p className="text-2xl font-serif font-bold text-[#1d3331]">{indicator.progress}%</p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${indicator.progress}%` }} />
                </div>
              </div>
              <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                  {indicator.status}
                </span>
              </div>
            </div>

            <div className="p-6 bg-[#1d3331] text-white rounded-3xl">
              <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Instructions / Objective</h4>
              <p className="text-sm leading-relaxed font-medium">
                {indicator.instructions || indicator.objectiveTitle || "No specific instructions provided for this registry entry."}
              </p>
            </div>
          </div>
        )}

        {/* TAB: EVIDENCE (THE ACTUAL FILES) */}
        {activeTab === "evidence" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {allSubmissions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
                <AlertCircle className="mx-auto text-slate-200 mb-2" size={32} />
                <p className="text-[10px] font-black text-slate-400 uppercase">No documents have been filed yet</p>
              </div>
            ) : (
              allSubmissions.map((sub) => (
                <div key={sub._id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 text-[#1d3331] text-[9px] font-black rounded uppercase">
                      Quarter {sub.quarter}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase italic">
                      Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {sub.documents.map((doc, idx) => (
                    <div key={idx} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-emerald-200 transition-all shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600">
                          {doc.fileType === 'raw' ? <FileText size={18} /> : <File size={18} />}
                        </div>
                        <div>
                          <p className="text-[12px] font-bold text-slate-700 truncate max-w-[200px]">
                            {doc.fileName || `Evidence_Doc_${idx + 1}`}
                          </p>
                          <p className="text-[9px] text-slate-400 uppercase font-black">{doc.fileType}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a 
                          href={doc.evidenceUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 text-slate-400 hover:text-[#1d3331] transition-colors"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  ))}
                  
                  {sub.notes && (
                    <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100/50">
                        <p className="text-[10px] text-amber-800 italic">" {sub.notes} "</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB: TEAM */}
        {activeTab === "team" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <h3 className="text-[11px] font-black text-[#1d3331] uppercase tracking-widest mb-4">Lead Assignee</h3>
             <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl">
                <div className="h-12 w-12 rounded-full bg-[#1d3331] flex items-center justify-center text-white font-bold">
                  {indicator.assigneeDisplayName?.[0] || <User size={20} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1d3331]">{indicator.assigneeDisplayName || "Unassigned"}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                    {indicator.assignmentType} Assignment
                  </p>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* --- FOOTER --- */}
      <div className="p-6 bg-slate-50 border-t border-slate-100">
        <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase">Weight: {indicator.weight}%</span>
            <span className="text-[10px] font-black text-slate-400 uppercase">UoM: {indicator.unit}</span>
        </div>
        <button className="w-full py-3 bg-[#1d3331] text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all active:scale-[0.98]">
          Generate Summary Audit
        </button>
      </div>
    </div>
  );
};

export default IndicatorsPageIdModal;