import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  ArrowLeft, Loader2, TrendingUp, FileText,
  ExternalLink, ShieldAlert, Info, Trash2,
  ShieldCheck, Lock
} from "lucide-react";
import {
  fetchIndicatorDetails,
  clearIndicatorError,
  deleteRejectedDocument,
} from "../../store/slices/userIndicatorSlice";
import SubmissionModal from "./SubmissionModal";
import type { ISubmissionUI, IDocumentUI } from "../../store/slices/userIndicatorSlice";
import FilePreviewModal from "../PreviewModal";

const UserTaskIdPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Local UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  // Redux state
  const currentIndicator = useAppSelector((state) => state.userIndicators.currentIndicator);
  const loading          = useAppSelector((state) => state.userIndicators.loading);
  const uploading        = useAppSelector((state) => state.userIndicators.uploading);

  useEffect(() => {
    if (id) dispatch(fetchIndicatorDetails(id));
    return () => { dispatch(clearIndicatorError()); };
  }, [id, dispatch]);

  // The active-quarter submission drives the primary status banner.
  const activeSub = useMemo<ISubmissionUI | undefined>(() => {
    if (!currentIndicator) return undefined;
    return currentIndicator.submissions?.find(
      (s: ISubmissionUI) => s.quarter === currentIndicator.active_quarter
    );
  }, [currentIndicator]);

  // Indicator-level status derivation — drives the pill and submit button.
  const registryStatus = useMemo(() => {
    if (!currentIndicator) return { isOpen: false, message: "Syncing...", type: "loading" };
    const { status } = currentIndicator;
    const isRejected = activeSub?.review_status === "Rejected";

    if (status === "Completed")         return { isOpen: false, message: "Dossier Certified", type: "locked"   };
    if (isRejected)                     return { isOpen: true,  message: "Revision Required",  type: "rejected" };
    if (status.includes("Awaiting"))    return { isOpen: true,  message: "Under Review",        type: "review"  };

    return { isOpen: true, message: activeSub ? "Update Filing" : "Registry Active", type: "active" };
  }, [currentIndicator, activeSub]);

  // FIX: Only Rejected documents may be deleted (backend enforces this too).
  // Show the delete button exclusively on docs with status === "Rejected".
  const handleDeleteDoc = (doc: IDocumentUI) => {
    if (doc.status !== "Rejected") return;
    if (window.confirm("Are you sure you want to remove this rejected document from the registry?") && id) {
      dispatch(deleteRejectedDocument({ docId: doc.id, indicatorId: id }));
    }
  };

  // FIX: The updateDocumentDescription thunk doesn't exist yet, so the
  // inline edit feature is disabled entirely. The Edit button is hidden
  // to avoid the silent no-op that was previously just a console.log.
  // Restore the UI block below once the thunk is implemented in the slice.

  // FIX: flatMap guard — filter out submissions with null/undefined documents
  // before mapping so we never produce undefined React children.
  const allDocs = useMemo<Array<{ doc: IDocumentUI; quarter: number }>>(() => {
    return (currentIndicator?.submissions ?? []).flatMap((sub: ISubmissionUI) =>
      (sub.documents ?? []).map((doc: IDocumentUI) => ({ doc, quarter: sub.quarter }))
    );
  }, [currentIndicator]);

  if (loading && !currentIndicator) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fa]">
        <Loader2 className="w-12 h-12 animate-spin text-[#1a3a32] mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Registry...</p>
      </div>
    );
  }

  if (!currentIndicator) return null;

  const isLocked = registryStatus.type === "locked";

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 lg:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Navigation & Header */}
        <nav className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 group w-fit">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform text-[#1a3a32]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1a3a32]">Back to Assignments</span>
          </button>

          <div className="flex items-center gap-4">
            {/* Status pill */}
            <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
              registryStatus.type === "rejected" ? "bg-rose-50 border-rose-100 text-rose-700 animate-pulse" :
              registryStatus.type === "locked"   ? "bg-indigo-50 border-indigo-100 text-indigo-700" :
                                                   "bg-emerald-50 border-emerald-100 text-emerald-700"
            }`}>
              {registryStatus.message}
            </div>

            {/* FIX: Hide the submit button entirely when the indicator is Completed/locked.
                Previously it was always visible and would hit a 409 on the backend. */}
            {!isLocked && (
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={uploading}
                className="px-6 py-2.5 rounded-xl bg-[#1a3a32] text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 hover:shadow-xl shadow-md active:scale-95 disabled:bg-gray-200"
              >
                {uploading
                  ? <Loader2 size={12} className="animate-spin" />
                  : <><ShieldCheck size={14} /> {activeSub ? "Update Submission" : "Submit Evidence"}</>
                }
              </button>
            )}

            {/* Locked indicator — shown in place of the submit button */}
            {isLocked && (
              <div className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 cursor-not-allowed select-none">
                <Lock size={14} /> Certified
              </div>
            )}
          </div>
        </nav>

        {/* Rejection Alert */}
        {activeSub?.review_status === "Rejected" && (
          <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-8 flex gap-6 items-center animate-in slide-in-from-top-4 duration-500">
            <div className="p-4 bg-rose-500 rounded-2xl text-white shadow-lg"><ShieldAlert size={24} /></div>
            <div>
              <h3 className="text-sm font-black text-rose-900 uppercase tracking-widest">Revision Requested</h3>
              <p className="text-rose-700/80 text-sm font-medium italic mt-1">
                "{activeSub.overallRejectionReason || "Please update your filing."}"
              </p>
            </div>
          </div>
        )}

        {/* Main Stats */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#c2a336]">{currentIndicator.perspective}</span>
            <h1 className="text-3xl font-serif font-black text-[#1a3a32] leading-tight">{currentIndicator.objective?.title}</h1>
            <p className="text-gray-400 font-medium italic border-l-4 border-gray-100 pl-6">{currentIndicator.activity?.description}</p>
          </div>
          <div className="bg-[#1a3a32] p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
            <TrendingUp size={80} className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-all" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c2a336] mb-2">Progress Score</p>
            <span className="text-6xl font-serif font-bold">{Math.round(currentIndicator.progress || 0)}%</span>
          </div>
        </div>

        {/* Evidence Registry */}
        <section className="space-y-6">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-[#1a3a32]">
            <FileText size={16} className="text-[#c2a336]" /> Document Registry
          </h3>

          {allDocs.length === 0 && (
            <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest py-8 text-center">
              No documents filed yet
            </p>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* FIX: Iterate the pre-computed allDocs array which is guaranteed
                to contain no undefined entries and carries the quarter reference. */}
            {allDocs.map(({ doc, quarter }) => (
              <div
                key={doc.id}
                className={`bg-white p-5 rounded-[2rem] border transition-all hover:shadow-md ${
                  doc.status === "Rejected" ? "border-rose-200 bg-rose-50/20" : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${doc.status === "Rejected" ? "bg-rose-100 text-rose-600" : "bg-gray-50 text-gray-400"}`}>
                    <FileText size={20} />
                  </div>

                  <div className="flex gap-1">
                    {/* FIX: Edit button hidden — updateDocumentDescription thunk not yet
                        implemented. Restore this button once the thunk exists in the slice.
                    <button
                      onClick={() => handleStartEdit(doc)}
                      className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title="Edit Description"
                    >
                      <Edit3 size={16} />
                    </button>
                    */}

                    {/* FIX: Delete button only rendered for Rejected documents.
                        Previously shown on all docs, causing 400 errors on non-rejected ones. */}
                    {doc.status === "Rejected" && (
                      <button
                        disabled={uploading}
                        onClick={() => handleDeleteDoc(doc)}
                        className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-40"
                        title="Remove Rejected Document"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    <button
                      onClick={() => setPreviewFile({ url: doc.evidence_url, name: doc.file_name || "Evidence" })}
                      className="p-2 text-gray-300 hover:text-[#1a3a32] hover:bg-gray-100 rounded-xl transition-all"
                      title="Preview"
                    >
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] font-black text-[#1a3a32] uppercase truncate">{doc.file_name || "Untitled_Evidence"}</p>

                <div className="flex items-center gap-2 mt-1 mb-4">
                  <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">Q{quarter}</span>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                    doc.status === "Rejected" ? "bg-rose-100 text-rose-700"    :
                    doc.status === "Accepted" ? "bg-emerald-100 text-emerald-700" :
                                               "bg-gray-100 text-gray-500"
                  }`}>
                    {doc.status}
                  </span>
                </div>

                {/* Description & rejection reason — read-only until edit thunk is wired up */}
                <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
                  {doc.description ? (
                    <p className="text-[10px] text-slate-400 font-medium italic leading-relaxed">"{doc.description}"</p>
                  ) : (
                    <p className="text-[9px] text-slate-300 uppercase font-black tracking-widest">No description added</p>
                  )}

                  {doc.rejection_reason && (
                    <div className="flex gap-2 bg-rose-50 p-2 rounded-lg border border-rose-100/50">
                      <Info size={12} className="text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-[9px] text-rose-600 font-black uppercase tracking-tighter leading-tight">
                        {doc.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {isModalOpen && (
        <SubmissionModal task={currentIndicator} onClose={() => setIsModalOpen(false)} />
      )}

      {previewFile && (
        <FilePreviewModal
          url={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default UserTaskIdPage;