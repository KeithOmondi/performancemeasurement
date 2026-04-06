import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  ArrowLeft, Clock, AlertCircle,
  Loader2, TrendingUp, FileText, ExternalLink,
  ShieldAlert, Lock, Users, User,
} from "lucide-react";
import {
  fetchIndicatorDetails,
  clearIndicatorError,
} from "../../store/slices/userIndicatorSlice";
import SubmissionModal from "./SubmissionModal";
import type { ISubmissionUI } from "../../store/slices/userIndicatorSlice";
import FilePreviewModal from "../PreviewModal";

const UserTaskIdPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
  } | null>(null);

  const { currentIndicator, loading, error, uploading } = useAppSelector(
    (state) => state.userIndicators,
  );

  useEffect(() => {
    if (id) dispatch(fetchIndicatorDetails(id));
    return () => {
      dispatch(clearIndicatorError());
    };
  }, [id, dispatch]);

  const registryStatus = useMemo(() => {
    if (!currentIndicator)
      return { isOpen: false, message: "Syncing Registry..." };

    // Updated to SQL snake_case keys
    const targetQ = currentIndicator.active_quarter;
    const now = new Date();
    const deadline = new Date(currentIndicator.deadline);

    if (currentIndicator.status === "Completed")
      return {
        isOpen: false,
        message: "Dossier Certified",
        icon: <Lock size={12} />,
      };
      
    if (
      ["Awaiting Admin Approval", "Awaiting Super Admin"].includes(
        currentIndicator.status,
      )
    )
      return {
        isOpen: false,
        message: "Under Review",
        icon: <Clock size={12} />,
      };

    const activeSub = currentIndicator.submissions?.find(
      (s: ISubmissionUI) => s.quarter === targetQ,
    );

    // Using snake_case for review_status
    if (
      activeSub &&
      (activeSub.review_status === "Accepted" ||
        activeSub.review_status === "Verified")
    )
      return {
        isOpen: false,
        message: "Quarter Certified",
        icon: <ShieldAlert size={12} />,
      };

    if (now > deadline)
      return { isOpen: false, message: "Deadline Passed" };

    if (
      currentIndicator.status.includes("Rejected") ||
      activeSub?.review_status === "Rejected"
    )
      return { isOpen: true, message: "Revision Required" };

    return {
      isOpen: true,
      message: activeSub ? "Add More Evidence" : "Registry Active",
    };
  }, [currentIndicator]);

  if (loading && !currentIndicator) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fa]">
        <Loader2 className="w-12 h-12 animate-spin text-[#1a3a32] mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Fetching Dossier...
        </p>
      </div>
    );
  }

  if (error || !currentIndicator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="text-center p-12 bg-white rounded-[2rem] shadow-xl border border-gray-100 max-w-sm">
          <AlertCircle size={40} className="text-rose-500 mx-auto mb-4" />
          <h2 className="font-serif font-black text-xl text-[#1a3a32]">
            Record Not Found
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="mt-8 w-full py-3 bg-[#1a3a32] text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Updated logic for SQL schema
  const isTeamAssignment = currentIndicator.assignee_model === "Team";
  const activeSub = currentIndicator.submissions?.find(
    (s: ISubmissionUI) => s.quarter === currentIndicator.active_quarter,
  );
  const submitLabel = activeSub ? "Update Filing" : "Submit Evidence";
  const assigneeName = currentIndicator.assigneeName ?? "Unassigned";

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 lg:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* ── Nav ───────────────────────────────────────────────────── */}
        <nav className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 group w-fit"
          >
            <ArrowLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1a3a32]">
              Registry Portal
            </span>
          </button>

          <div className="flex items-center gap-4 flex-wrap">
            {isTeamAssignment && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border bg-violet-50 border-violet-100 text-violet-700">
                <Users size={11} />
                Team Assignment — {assigneeName}
              </div>
            )}

            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                registryStatus.isOpen
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                  : "bg-gray-100 border-gray-200 text-gray-400 shadow-inner"
              }`}
            >
              {registryStatus.isOpen ? (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              ) : (
                <Lock size={10} />
              )}
              {registryStatus.message}
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              disabled={!registryStatus.isOpen || uploading}
              className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${
                registryStatus.isOpen
                  ? "bg-[#1a3a32] text-white hover:shadow-2xl shadow-lg shadow-[#1a3a32]/20"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {submitLabel}
            </button>
          </div>
        </nav>

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 text-[#c2a336]">
              <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                {currentIndicator.perspective}
              </span>
            </div>
            <h1 className="text-2xl font-serif font-black text-[#1a3a32] tracking-tight">
              {currentIndicator.objective?.title || "Strategic Objective"}
            </h1>
            <p className="text-gray-400 font-medium italic border-l-4 border-gray-100 pl-6">
              {currentIndicator.activity?.description}
            </p>
          </div>

          {/* Progress card */}
          <div className="bg-[#1a3a32] p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
            <TrendingUp
              size={80}
              className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"
            />
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c2a336] mb-4">
                Certified Progress
              </p>
              <span className="text-6xl font-serif font-bold tracking-tighter">
                {Math.round(currentIndicator.progress || 0)}%
              </span>
            </div>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">

            {isTeamAssignment && (
              <section className="bg-violet-50 border border-violet-100 rounded-[2rem] p-6 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black text-violet-700 uppercase tracking-widest">
                  <Users size={14} />
                  Group Assignment — {assigneeName}
                </div>
                <p className="text-[11px] text-violet-600 font-medium leading-relaxed">
                  This indicator is assigned to your team. Any member may submit
                  evidence on behalf of the group. Submissions are attributed to
                  the individual who files them.
                </p>
              </section>
            )}

            {/* Documents */}
            <section className="space-y-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-[#1a3a32]">
                <FileText size={16} className="text-[#c2a336]" /> Uploaded
                Documents
              </h3>

              {currentIndicator.submissions?.flatMap(
                (sub: ISubmissionUI) => sub.documents ?? [],
              ).length === 0 ? (
                <div className="py-12 text-center bg-white rounded-[2rem] border border-dashed border-gray-100">
                  <FileText
                    size={28}
                    className="text-gray-200 mx-auto mb-3"
                  />
                  <p className="text-xs text-gray-300 font-bold uppercase tracking-widest">
                    No evidence uploaded yet
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {currentIndicator.submissions?.map((sub: ISubmissionUI) => 
                    sub.documents?.map((doc, i) => (
                      <div
                        key={`${doc.id}-${i}`}
                        className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-[#c2a336]/30 transition-all"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400 group-hover:text-[#c2a336]">
                            <FileText size={18} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[11px] font-black text-[#1a3a32] truncate uppercase tracking-tighter mb-1">
                              {doc.file_name || "Evidence Document"}
                            </p>
                            <span className="text-[8px] font-black text-gray-300 uppercase">
                              Q{sub.quarter}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setPreviewFile({
                              url: doc.evidence_url,
                              name: doc.file_name || "Evidence",
                            })
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-300 hover:text-[#1a3a32] transition-colors"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          </div>

          {/* ── Sidebar ─────────────────────────────────────────────── */}
          <aside className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 sticky top-12 space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b pb-4">
                Task Specification
              </h4>
              <SpecRow label="Current Status" value={currentIndicator.status} />
              <SpecRow
                label="Hard Deadline"
                value={new Date(currentIndicator.deadline).toLocaleDateString()}
                highlight
              />
              <SpecRow
                label="Reporting Cycle"
                value={currentIndicator.reporting_cycle}
              />
              {currentIndicator.reporting_cycle === "Quarterly" && (
                <SpecRow
                  label="Active Quarter"
                  value={`Q${currentIndicator.active_quarter}`}
                />
              )}
              <SpecRow
                label="Assignment Mode"
                value={isTeamAssignment ? "Team" : "Individual"}
              />
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                {isTeamAssignment ? "Assigned Group" : "Assigned To"}
              </h4>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm ${
                    isTeamAssignment ? "bg-violet-500" : "bg-[#1a3a32]"
                  }`}
                >
                  {isTeamAssignment ? (
                    <Users size={16} />
                  ) : (
                    <User size={16} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1a3a32]">
                    {assigneeName}
                  </p>
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">
                    {isTeamAssignment ? "Group" : "Individual Officer"}
                  </p>
                </div>
              </div>
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

/* ── Sub-components ─────────────────────────────────────────────────── */

const SpecRow = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">
      {label}
    </span>
    <span
      className={`text-[11px] font-black uppercase tracking-tight ${
        highlight ? "text-rose-600" : "text-[#1a3a32]"
      }`}
    >
      {value}
    </span>
  </div>
);

export default UserTaskIdPage;