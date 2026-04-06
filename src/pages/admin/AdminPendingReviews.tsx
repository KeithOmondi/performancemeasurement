import { useEffect, useState, useCallback } from "react";
import {
  ArrowRight,
  Loader2,
  User,
  History,
  Search,
  ShieldCheck,
  X,
  Hourglass,
  CheckCircle2,
  CalendarDays,
  Layers,
  FileText,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchAllAdminIndicators,
  getIndicatorByIdAdmin,
  setSelectedIndicator,
} from "../../store/slices/adminIndicatorSlice";
import AdminIndicatorModal from "./AdminIndicatorModal";

const AdminPendingReviews = () => {
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const { pendingAdminReview = [], isLoading, selectedIndicator } =
    useAppSelector((state) => state.adminIndicators);

  useEffect(() => {
    dispatch(fetchAllAdminIndicators({ status: "Awaiting Admin Approval" }));
  }, [dispatch]);

  const handleOpenDossier = useCallback(
    async (id: string) => {
      if (openingId) return; // prevent double-click
      setOpeningId(id);
      await dispatch(getIndicatorByIdAdmin(id));
      setOpeningId(null);
    },
    [dispatch, openingId]
  );

  const handleCloseDrawer = useCallback(() => {
    dispatch(setSelectedIndicator(null));
  }, [dispatch]);

  const filteredRecords = pendingAdminReview.filter(
    (ind) =>
      ind.objective?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ind.assigneeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ind.perspective?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ind.activity?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading && pendingAdminReview.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#fdfcfc]">
        <div className="relative mb-4">
          <Loader2 className="animate-spin text-[#1a3a32]" size={40} />
          <ShieldCheck
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600"
            size={14}
          />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1a3a32] animate-pulse">
          Syncing Registry Ledger...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-[#fdfcfc] min-h-screen font-sans">
      {/* HEADER */}
      <div className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl font-serif font-black text-[#1a3a32] tracking-tighter uppercase leading-none">
              Audit Queue
            </h1>
            <div className="flex items-center bg-[#1a3a32] text-white text-[9px] px-3 py-1.5 rounded-full font-black shadow-lg">
              <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
              {pendingAdminReview.length} PENDING VERIFICATION
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Registry Evidence Review & Frequency Verification
          </p>
        </div>

        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by objective, activity or officer..."
            className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-[#1a3a32]/5 w-72 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[0.5rem] border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Submission Details
                </th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                  Cycle Type
                </th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Performance
                </th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Status
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 size={48} className="text-emerald-100 mb-4" />
                      <p className="text-sm font-black text-[#1a3a32] uppercase tracking-widest">
                        Registry Queue Clear
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((indicator) => {
                  const isResub = indicator.submissions?.some(
                    (s) => s.resubmissionCount > 0 && s.reviewStatus === "Pending"
                  );
                  const isAnnual = indicator.reportingCycle === "Annual";
                  const isOpening = openingId === indicator.id;

                  return (
                    <tr
                      key={indicator.id}
                      className="group hover:bg-slate-50/80 transition-all"
                    >
                      {/* Submission Details */}
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <span className="w-fit text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                            {indicator.perspective}
                          </span>
                          <h3 className="text-[13.5px] font-black text-[#1a3a32] leading-tight max-w-sm">
                            {indicator.objective?.title || "Untitled Objective"}
                          </h3>
                          <div className="flex items-start gap-2 max-w-md">
                            <FileText
                              size={12}
                              className="text-slate-300 mt-0.5 shrink-0"
                            />
                            <p className="text-[11px] font-medium text-slate-500 leading-snug">
                              {indicator.activity?.description ||
                                "No activity description provided."}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <User size={10} className="text-emerald-600" />
                            <span className="text-[10px] font-black text-slate-500 uppercase">
                              {indicator.assigneeName}
                              {indicator.pjNumber ? ` (${indicator.pjNumber})` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cycle Type */}
                      <td className="px-6 py-6 text-center">
                        <div className="flex flex-col items-center justify-center">
                          {isAnnual ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600 border border-amber-100">
                                <CalendarDays size={14} />
                              </div>
                              <span className="text-[9px] font-black text-amber-800 uppercase tracking-tighter">
                                Annual Cycle
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
                                <Layers size={14} />
                              </div>
                              <span className="text-[9px] font-black text-blue-800 uppercase tracking-tighter">
                                Quarter {indicator.activeQuarter}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Performance */}
                      <td className="px-6 py-6">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-[#1a3a32]">
                              {indicator.progress}%
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                              Target: {indicator.unit}
                            </span>
                          </div>
                          <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                            <div
                              className={`h-full transition-all duration-1000 ${
                                isResub ? "bg-amber-500" : "bg-[#1a3a32]"
                              }`}
                              style={{ width: `${indicator.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-6">
                        {isResub ? (
                          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 w-fit px-3 py-1 rounded-xl border border-amber-100">
                            <History size={12} className="animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest">
                              Resubmitted
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 w-fit px-3 py-1 rounded-xl border border-blue-100">
                            <Hourglass size={12} />
                            <span className="text-[9px] font-black uppercase tracking-widest">
                              Initial Audit
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => handleOpenDossier(indicator.id)}
                          disabled={!!openingId}
                          className={`group/btn relative inline-flex items-center gap-3 px-6 py-3 rounded-[0.5rem] text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                            isResub
                              ? "bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-200"
                              : "bg-[#1a3a32] text-white hover:bg-black shadow-lg shadow-emerald-900/10"
                          }`}
                        >
                          {isOpening ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              <span className="relative z-10">Review</span>
                              <ArrowRight
                                size={14}
                                className="relative z-10 group-hover/btn:translate-x-1 transition-transform"
                              />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SLIDE-OVER DRAWER */}
      <div
        className={`fixed inset-0 z-[1000] overflow-hidden transition-all duration-500 ease-in-out ${
          selectedIndicator ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-[#1a3a32]/40 backdrop-blur-sm transition-opacity duration-500 ${
            selectedIndicator ? "opacity-100" : "opacity-0"
          }`}
          onClick={handleCloseDrawer}
        />

        {/* Panel */}
        <section
          className={`absolute inset-y-0 right-0 w-full max-w-[500px] flex transition-transform duration-700 transform ${
            selectedIndicator ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="w-full h-full">
            <div className="h-full flex flex-col bg-[#fcfdfb] shadow-2xl overflow-hidden border-l border-slate-200">
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-8 border-b border-slate-100 bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#1a3a32] text-white rounded-xl shadow-lg">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[#1a3a32] uppercase tracking-tighter">
                      Registry Audit Panel
                    </h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      ID: {selectedIndicator?.id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseDrawer}
                  className="p-2 hover:bg-rose-50 rounded-lg transition-all"
                >
                  <X size={18} className="text-slate-400 hover:text-rose-500" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 relative overflow-y-auto no-scrollbar">
                {selectedIndicator && (
                  <AdminIndicatorModal
                    indicator={selectedIndicator}
                    onClose={handleCloseDrawer}
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminPendingReviews;