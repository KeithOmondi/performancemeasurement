import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  Files,
  Loader2,
  ShieldAlert,
  ArrowUpRight,
  ClipboardCheck,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  processAdminReview,
  type IAdminIndicator,
  type ISubmissionReview,
} from "../../store/slices/adminIndicatorSlice";

interface AdminIndicatorModalProps {
  indicator: IAdminIndicator;
  onClose: () => void;
}

const AdminIndicatorModal: React.FC<AdminIndicatorModalProps> = ({
  indicator,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const { isReviewing } = useAppSelector((state) => state.adminIndicators);

  const [docReviews, setDocReviews] = useState<ISubmissionReview[]>([]);
  const [overallComment, setOverallComment] = useState("");

  useEffect(() => {
    if (indicator.submissions) {
      // Filter for the active quarter being reviewed
      const currentDocs = indicator.submissions
        .filter((s) => s.quarter === indicator.activeQuarter)
        .map((s) => ({
          submissionId: s._id,
          reviewStatus: (s.reviewStatus === "Pending"
            ? "Pending"
            : s.reviewStatus) as any,
          adminComment: s.adminComment || "",
        }));
      setDocReviews(currentDocs);
    }
  }, [indicator]);

  const handleDocReviewChange = (
    subId: string,
    status: "Accepted" | "Rejected",
    comment: string,
  ) => {
    setDocReviews((prev) =>
      prev.map((r) =>
        r.submissionId === subId
          ? { ...r, reviewStatus: status, adminComment: comment }
          : r,
      ),
    );
  };

  const handleAdminSubmit = async () => {
    const hasRejections = docReviews.some((r) => r.reviewStatus === "Rejected");
    const finalStatus = hasRejections
      ? "Rejected by Admin"
      : "Awaiting Super Admin";

    await dispatch(
      processAdminReview({
        id: indicator._id,
        reviewData: {
          status: finalStatus,
          adminOverallComments:
            overallComment ||
            (hasRejections
              ? "Corrections required on evidence."
              : "Verified by Registry."),
          documentReviews: docReviews,
        },
      }),
    ).then((res) => {
      if (processAdminReview.fulfilled.match(res)) onClose();
    });
  };

  const isResubmission = indicator.submissions?.some(
    (s) => s.resubmissionCount > 0,
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f8fafc]">
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* ALERT: RESUBMISSION TRACKING */}
          {isResubmission && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-center gap-4 shadow-sm">
              <ShieldAlert className="text-amber-600" size={20} />
              <div>
                <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">
                  Amended Submission
                </p>
                <p className="text-[11px] text-amber-700 font-medium">
                  Assignee has updated evidence following a prior rejection.
                </p>
              </div>
            </div>
          )}

          {/* INDICATOR HEADER */}
          <div className="bg-white p-8 border border-slate-200 shadow-sm rounded-3xl relative">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black bg-[#1a3a32] text-white px-3 py-1.5 uppercase tracking-[0.15em] rounded-lg">
                {indicator.perspective}
              </span>
              <div className="text-right">
                <p className="text-[8px] font-bold text-slate-400 uppercase">
                  Target Value
                </p>
                <p className="text-sm font-black text-[#1a3a32]">
                  {indicator.target} {indicator.unit}
                </p>
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-4">
              {indicator.objectiveTitle}
            </h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border-l-2 border-emerald-500">
              {indicator.activityDescription}
            </p>
          </div>

          {/* EVIDENCE SECTION */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
              <Files size={14} className="text-[#1a3a32]" /> Registry
              Verification Portfolio
            </h4>

            {indicator.submissions
              .filter((s) => s.quarter === indicator.activeQuarter)
              .map((sub) => {
                const currentReview = docReviews.find(
                  (r) => r.submissionId === sub._id,
                );
                return (
                  <div
                    key={sub._id}
                    className="bg-white p-6 border border-slate-200 shadow-sm rounded-3xl space-y-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-50">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                          <ClipboardCheck
                            className="text-emerald-600"
                            size={20}
                          />
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase">
                            Q{sub.quarter} Achievement Reported
                          </p>
                          <p className="text-2xl font-black text-[#1a3a32]">
                            {sub.achievedValue}
                            <span className="text-xs ml-1 text-slate-400">
                              {indicator.unit}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
                        <button
                          onClick={() =>
                            handleDocReviewChange(
                              sub._id,
                              "Accepted",
                              currentReview?.adminComment || "",
                            )
                          }
                          className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${currentReview?.reviewStatus === "Accepted" ? "bg-emerald-600 text-white shadow-lg" : "hover:bg-white text-slate-500"}`}
                        >
                          <CheckCircle2 size={14} /> Verify
                        </button>
                        <button
                          onClick={() =>
                            handleDocReviewChange(
                              sub._id,
                              "Rejected",
                              currentReview?.adminComment || "",
                            )
                          }
                          className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${currentReview?.reviewStatus === "Rejected" ? "bg-rose-600 text-white shadow-lg" : "hover:bg-white text-slate-500"}`}
                        >
                          <XCircle size={14} /> Flag
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {sub.documents.map((doc: any, i: number) => (
                        <a
                          key={i}
                          href={doc.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-emerald-500 group transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="text-emerald-600" size={18} />
                            <span className="text-[11px] font-bold text-slate-700">
                              {doc.fileName || `Evidence_v${i + 1}`}
                            </span>
                          </div>
                          <ExternalLink
                            size={12}
                            className="text-slate-300 group-hover:text-emerald-500"
                          />
                        </a>
                      ))}
                    </div>

                    <textarea
                      placeholder="Add specific registry notes for this document set..."
                      value={currentReview?.adminComment || ""}
                      onChange={(e) =>
                        handleDocReviewChange(
                          sub._id,
                          currentReview?.reviewStatus as any,
                          e.target.value,
                        )
                      }
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px]"
                    />
                  </div>
                );
              })}
          </div>

          {/* FINAL REMARKS */}
          <div className="space-y-3 pb-12">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
              Registry Summary Remarks
            </h4>
            <textarea
              placeholder="Provide a summary of the verification process..."
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              className="w-full p-5 bg-white border border-slate-200 rounded-3xl text-sm font-medium outline-none shadow-sm focus:border-[#1a3a32] transition-all min-h-[120px]"
            />
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="bg-white border-t border-slate-100 px-8 py-6 flex items-center justify-between shadow-2xl">
        <div>
          <p className="text-[10px] font-black text-[#1a3a32] uppercase tracking-widest">
            Judiciary Performance Portal
          </p>
          <p className="text-[9px] font-bold text-slate-400 uppercase">
            Registry Review & Escalation
          </p>
        </div>

        <button
          onClick={handleAdminSubmit}
          disabled={isReviewing}
          className={`px-10 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 transition-all text-white shadow-lg ${
            docReviews.some((r) => r.reviewStatus === "Rejected")
              ? "bg-rose-600 shadow-rose-200"
              : "bg-[#1a3a32] shadow-slate-200 hover:bg-black"
          }`}
        >
          {isReviewing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ArrowUpRight size={16} />
          )}
          {docReviews.some((r) => r.reviewStatus === "Rejected")
            ? "Flag for Correction"
            : "Verify & Escalate"}
        </button>
      </div>
    </div>
  );
};

export default AdminIndicatorModal;
