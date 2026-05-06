import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  ArrowLeft, Loader2, TrendingUp, FileText,
  ExternalLink, ShieldCheck, AlertCircle, Clock, Calendar
} from "lucide-react";
import {
  fetchIndicatorDetails,
  clearIndicatorError,
  flattenSubmissions,
  normaliseQuarter,
} from "../../store/slices/userIndicatorSlice";
import SubmissionModal from "./SubmissionModal";
import type { ISubmissionUI, IDocumentUI } from "../../store/slices/userIndicatorSlice";
import FilePreviewModal from "../PreviewModal";

const UserTaskIdPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [previewFile, setPreviewFile]   = useState<{ url: string; name: string } | null>(null);

  const currentIndicator = useAppSelector((s) => s.userIndicators.currentIndicator);
  const loading          = useAppSelector((s) => s.userIndicators.loading);
  const uploading        = useAppSelector((s) => s.userIndicators.uploading);

  useEffect(() => {
    if (id) dispatch(fetchIndicatorDetails(id));
    return () => { dispatch(clearIndicatorError()); };
  }, [id, dispatch]);

  const isAnnual = currentIndicator?.reporting_cycle === "Annual";

  // ── Derived data ────────────────────────────────────────────────────────────

  /**
   * All submissions across every quarter folder, flattened into a single array.
   * Uses the exported helper from the slice so we don't repeat the
   * Object.values(...).flat() pattern throughout the component.
   */
  const allSubmissions = useMemo<ISubmissionUI[]>(
    () => (currentIndicator ? flattenSubmissions(currentIndicator) : []),
    [currentIndicator]
  );

  /**
   * The active submission for the current period.
   *
   * Backend stores the quarter as a normalised string ("Q1"–"Q4" or "Annual"),
   * so we resolve the target key using normaliseQuarter() and look it up
   * directly in the grouped object rather than searching a flat array.
   *
   * For Annual indicators the key is "Annual"; for quarterly it is "Q1"–"Q4".
   * We take index [0] because each quarter's array is sorted newest-first.
   */
  const activeSub = useMemo<ISubmissionUI | undefined>(() => {
    if (!currentIndicator?.submissions) return undefined;

    const targetKey = isAnnual
      ? "Annual"
      : normaliseQuarter(currentIndicator.active_quarter);

    // Find the quarter folder whose key matches the target period
    const matchingEntry = Object.entries(currentIndicator.submissions).find(
      ([key]) => key.startsWith(targetKey + "_")
    );

    return matchingEntry?.[1]?.[0]; // latest submission in that folder
  }, [currentIndicator, isAnnual]);

  /**
   * Rejected documents across ALL quarters, enriched with their quarter label.
   * Uses camelCase fields to match the updated IDocumentUI type.
   */
  const rejectedDocs = useMemo(() => {
    return allSubmissions.flatMap((sub) =>
      (sub.documents ?? [])
        .filter((doc: IDocumentUI) => doc.status === "Rejected")
        .map((doc) => ({
          doc,
          // sub.quarter is already a normalised string ("Q1" / "Annual")
          quarterLabel: sub.quarter === "Annual" ? "Annual" : sub.quarter,
          rejectionReason: doc.rejectionReason, // camelCase
        }))
    );
  }, [allSubmissions]);

  /**
   * Non-rejected documents across ALL quarters.
   */
  const activeDocs = useMemo(() => {
    return allSubmissions.flatMap((sub) =>
      (sub.documents ?? [])
        .filter((doc: IDocumentUI) => doc.status !== "Rejected")
        .map((doc) => ({
          doc,
          quarterLabel: sub.quarter === "Annual" ? "Annual" : sub.quarter,
        }))
    );
  }, [allSubmissions]);

  // reviewStatus is camelCase in the updated ISubmissionUI
  const isGlobalRejected = activeSub?.reviewStatus === "Rejected";

  // ── Loading / empty states ──────────────────────────────────────────────────

  if (loading && !currentIndicator) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fa]">
        <Loader2 className="w-12 h-12 animate-spin text-[#1a3a32] mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Loading Registry...
        </p>
      </div>
    );
  }

  if (!currentIndicator) return null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 lg:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Navigation & Header */}
        <nav className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 group w-fit">
            <div className="p-2 bg-white rounded-full border border-gray-100 shadow-sm group-hover:bg-gray-50 transition-colors">
              <ArrowLeft size={18} className="text-[#1a3a32]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1a3a32]">
              Back to Assignments
            </span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-100 shadow-sm">
              <Calendar size={12} className="text-[#c2a336]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
                {currentIndicator.reporting_cycle} Cycle
              </span>
            </div>

            {isGlobalRejected && (
              <div className="px-4 py-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[9px] font-black uppercase tracking-widest">
                Revision Required
              </div>
            )}

            <button
              onClick={() => setIsModalOpen(true)}
              disabled={uploading}
              className="px-6 py-2.5 rounded-xl bg-[#1a3a32] text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 hover:shadow-xl shadow-md disabled:bg-gray-200"
            >
              {uploading
                ? <Loader2 size={12} className="animate-spin" />
                : (
                  <>
                    <ShieldCheck size={14} />
                    {isAnnual ? "Submit Annual Filing" : "Update Quarter Filing"}
                  </>
                )
              }
            </button>
          </div>
        </nav>

        {/* ── Rejected documents ──────────────────────────────────────────── */}
        {rejectedDocs.length > 0 && (
          <section className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-rose-600">
              <AlertCircle size={16} /> Action Required: Returned Evidence
            </h3>
            <div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-4">
              {rejectedDocs.map(({ doc, quarterLabel, rejectionReason }) => (
                <div
                  key={doc.id}
                  className="bg-rose-50 border border-rose-100 p-5 rounded-[2rem] flex flex-col md:flex-row gap-4 items-start"
                >
                  <div className="p-4 bg-white rounded-2xl text-rose-500 shadow-sm">
                    <FileText size={24} />
                  </div>
                  <div className="flex-1 space-y-1">
                    {/* fileName (camelCase) with fallback */}
                    <p className="text-[10px] font-black text-rose-900 uppercase truncate max-w-[200px]">
                      {doc.fileName ?? "Evidence File"}
                    </p>
                    <p className="text-xs text-rose-700 font-medium italic">
                      "{rejectionReason ?? "Please provide clearer evidence for this metric."}"
                    </p>
                    <div className="pt-2">
                      {/* quarterLabel is already "Q1" or "Annual" — no extra "Q" prefix */}
                      <span className="text-[8px] font-black bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full uppercase">
                        {quarterLabel} Rejected
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Main stats ──────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#c2a336]">
                {currentIndicator.perspective}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-200" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">
                {isAnnual
                  ? "Full Year Target"
                  : `Quarter ${normaliseQuarter(currentIndicator.active_quarter)}`}
              </span>
            </div>
            <h1 className="text-3xl font-serif font-black text-[#1a3a32] leading-tight">
              {currentIndicator.objective?.title}
            </h1>
            <p className="text-gray-400 font-medium italic border-l-4 border-gray-100 pl-6">
              {currentIndicator.activity?.description}
            </p>
          </div>

          <div className="bg-[#1a3a32] p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
            <TrendingUp
              size={80}
              className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-all"
            />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c2a336] mb-2">
              {isAnnual ? "Annual Completion" : "Quarterly Progress"}
            </p>
            <span className="text-6xl font-serif font-bold">
              {Math.round(currentIndicator.progress || 0)}%
            </span>
          </div>
        </div>

        {/* ── Active evidence registry ─────────────────────────────────────── */}
        <section className="space-y-6">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-[#1a3a32]">
            <FileText size={16} className="text-[#c2a336]" /> Document Registry
          </h3>

          {activeDocs.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
              <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">
                No active documents filed in the registry
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeDocs.map(({ doc, quarterLabel }) => {
                // fileName (camelCase) with fallback
                const resolvedName = doc.fileName ?? "UNTITLED_EVIDENCE";
                const isPending    = doc.status === "Pending" || !doc.status;

                return (
                  <div
                    key={doc.id}
                    className="bg-white p-5 rounded-[2rem] border border-gray-100 transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-2xl ${
                        isPending
                          ? "bg-amber-50 text-amber-500"
                          : "bg-emerald-50 text-emerald-500"
                      }`}>
                        {isPending ? <Clock size={20} /> : <ShieldCheck size={20} />}
                      </div>
                      <button
                        onClick={() =>
                          setPreviewFile({ url: doc.evidenceUrl, name: resolvedName })
                        }
                        className="p-2 text-gray-300 hover:text-[#1a3a32] hover:bg-gray-100 rounded-xl transition-all"
                      >
                        <ExternalLink size={16} />
                      </button>
                    </div>

                    <p
                      className="text-[11px] font-black text-[#1a3a32] uppercase truncate"
                      title={resolvedName}
                    >
                      {resolvedName}
                    </p>

                    <div className="flex items-center gap-2 mt-1 mb-4">
                      {/* quarterLabel is "Q1"–"Q4" or "Annual" — safe to render directly */}
                      <span className="text-[8px] font-black text-gray-300 uppercase">
                        {quarterLabel}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isPending
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {doc.status ?? "Under Review"}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-50">
                      <p className="text-[10px] text-slate-400 font-medium italic leading-relaxed">
                        {doc.description
                          ? `"${doc.description}"`
                          : "No description provided."}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {isModalOpen && (
        <SubmissionModal
          task={currentIndicator}
          onClose={() => setIsModalOpen(false)}
        />
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