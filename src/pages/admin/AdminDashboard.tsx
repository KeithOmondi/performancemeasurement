import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Loader2, ArrowRightCircle, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";

import { fetchDashboardStats } from "../../store/slices/dashboardSlice";
import {
  fetchAllAdminIndicators,
  type IAdminIndicator,
  type ISubmission,
  type ISubmissionsByPeriod,
} from "../../store/slices/adminIndicatorSlice";

import type { AppDispatch, RootState } from "../../store/store";

/* ─── TYPES ──────────────────────────────────────────────────────────────── */

const ACTIONABLE_STATUSES = new Set([
  "Pending",
  "Awaiting Admin Approval",
  "Awaiting Super Admin",
  "Partially Approved",
  "Rejected by Admin",
  "Rejected by Super Admin",
]);

const flattenSubmissions = (
  submissions: ISubmissionsByPeriod | undefined
): ISubmission[] => Object.values(submissions ?? {}).flat();

const isIndicatorOverdue = (
  indicator: IAdminIndicator,
  currentQuarter: number
): boolean => {
  const status = indicator.status ?? "";
  if (status === "Completed") return false;
  if (!ACTIONABLE_STATUSES.has(status)) return false;
  if (indicator.deadline) return new Date(indicator.deadline) < new Date();
  if (indicator.reportingCycle === "Annual") return false;
  return (
    status === "Pending" &&
    typeof indicator.activeQuarter === "number" &&
    indicator.activeQuarter < currentQuarter
  );
};

/* ─── COMPONENT ──────────────────────────────────────────────────────────── */

const AdminDashboardPage = () => {
  const dispatch = useDispatch<AppDispatch>();

  /* ── Selectors ── */
  const { allAssignments: indicators, isLoading: iLoad } = useSelector(
    (state: RootState) => state.adminIndicators
  );

  /* ── Dashboard slice — single source of truth for all stats ── */
  const { data, loading: sLoad } = useSelector(
    (state: RootState) => state.dashboard
  );

  /* ── Fetch ── */
  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchAllAdminIndicators());
  }, [dispatch]);

  /* ── Loading ── */
  if ((sLoad || iLoad) && !data) {
    return (
      <div className="min-h-screen bg-[#fcfcf7] flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-[#1d3331] mb-4" size={40} />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 text-center">
          Syncing Registry Intelligence...
        </p>
      </div>
    );
  }

  /* ── Stats — read directly from server response, no re-derivation ── */
  const stats = data?.stats;
  const perspectives = data?.perspectives ?? [];

  /* ── The only thing we still derive locally: overdue count.
        The server's overdue uses deadline < NOW() which is correct, but
        the admin page also needs the per-quarter overdue logic that lives
        in isIndicatorOverdue(). We use the server value as the primary
        number and fall back gracefully if data hasn't loaded. ── */
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const localOverdue   = indicators.filter((i) =>
    isIndicatorOverdue(i, currentQuarter)
  ).length;

  /* Use server overdue when available (most accurate), local as fallback */
  const overdueCount = stats?.overdue ?? localOverdue;

  /* ── Pending queue for the verification table ── */
  const pendingQueue = indicators
    .filter((ind) =>
      ["Awaiting Admin Approval", "Awaiting Super Admin", "Partially Approved"].includes(
        ind.status
      )
    )
    .slice(0, 5);

  /* ─── RENDER ── */
  return (
    <div className="min-h-screen bg-[#fcfcf7] p-4 md:p-8 text-[#1a2c2c] font-sans">

      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1d3331]">
            Management Intelligence
          </h1>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">
            Institutional Performance Oversight
          </p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-[9px] text-slate-400 font-bold uppercase">Registry Status</p>
          <p className="text-[10px] font-black text-emerald-700 uppercase">
            Operational / Real-time Sync
          </p>
        </div>
      </div>

      {/* Primary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Total Indicators"
          value={stats?.total ?? 0}
          border="border-[#1d3331]"
        />
        <StatCard
          label="Assigned"
          value={stats?.assigned ?? 0}
          border="border-slate-300"
        />
        <StatCard
          label="Unassigned"
          value={stats?.unassigned ?? 0}
          border="border-slate-200"
          textColor="text-slate-400"
        />
        <StatCard
          label="Pending Action"
          value={stats?.pendingReview ?? 0}
          border="border-yellow-500"
          textColor="text-yellow-600"
        />
        <StatCard
          label="Certified Completed"
          value={stats?.approved ?? 0}
          border="border-emerald-700"
          textColor="text-emerald-700"
        />
      </div>

      {/* Critical metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-10">
        <div className="bg-white p-5 rounded-xl border-t-4 border-red-800 shadow-sm flex flex-col justify-between h-32">
          <div className="text-4xl font-serif font-bold text-red-800">
            {overdueCount}
          </div>
          <div className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">
            Overdue &amp; Critical
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-xl border-l-[6px] border-[#1d3331] shadow-sm flex items-center h-32 group hover:shadow-md transition-all">
          <CheckCircle2
            size={32}
            className="text-[#1d3331] mr-4 opacity-20 group-hover:opacity-40 transition-opacity"
          />
          <div>
            <span className="text-4xl font-serif font-bold text-[#1d3331]">
              {stats?.approved ?? 0}
            </span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
              Verified Final Output
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-xl border-l-[6px] border-orange-600 shadow-sm flex items-center h-32 group hover:shadow-md transition-all">
          <AlertCircle
            size={32}
            className="text-orange-600 mr-4 opacity-20 group-hover:opacity-40 transition-opacity"
          />
          <div>
            <span className="text-4xl font-serif font-bold text-orange-600">
              {stats?.returnedForCorrection ?? 0}
            </span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
              Returned for Correction
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* Pending verification queue */}
        <div className="lg:col-span-8">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-xl font-serif font-bold text-[#1d3331]">
                Pending Verification Queue
              </h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Submissions requiring administrative audit
              </p>
            </div>
            <Link
              to="/admin/reviewer"
              className="text-[10px] font-black text-[#1d3331] uppercase tracking-widest hover:underline"
            >
              View All →
            </Link>
          </div>

          <div className="space-y-3">
            {pendingQueue.length > 0 ? (
              pendingQueue.map((item) => {
                const isEscalated = item.status === "Awaiting Super Admin";
                const flat        = flattenSubmissions(item.submissions);
                const isResub     = flat.some(
                  (s: ISubmission) =>
                    s.resubmissionCount > 0 && s.reviewStatus === "Pending"
                );

                return (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm group hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Clock
                          size={18}
                          className={`${
                            isEscalated ? "text-emerald-600" : "text-yellow-500"
                          } opacity-40`}
                        />
                        {isResub && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1d3331] italic leading-snug line-clamp-1">
                          &ldquo;{item.activity?.description}&rdquo;
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-tighter">
                          {item.assigneeName} ·{" "}
                          <span className={isEscalated ? "text-emerald-700" : "text-yellow-600"}>
                            {item.status}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 sm:mt-0">
                      <div className="text-right mr-2">
                        <span className="block text-[11px] font-black text-[#1d3331]">
                          {item.progress}%
                        </span>
                        <span className="block text-[8px] text-slate-400 font-bold uppercase">
                          {item.unit}
                        </span>
                      </div>
                      <Link
                        to={`/admin/indicators/${item.id}`}
                        className="bg-[#1d3331] text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                      >
                        <ArrowRightCircle size={16} />
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                  Verification Queue Clear
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Strategic matrix — perspectives from dashboard slice */}
        <div className="lg:col-span-4">
          <h3 className="text-xl font-serif font-bold text-[#1d3331] mb-6">
            Strategic Matrix
          </h3>
          <div className="space-y-4">
            {perspectives.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                  No perspective data
                </p>
              </div>
            ) : (
              perspectives.map((p) => (
                <div
                  key={p.name}
                  className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm group hover:border-[#1d3331]/20 transition-all"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-[#1d3331] transition-colors">
                      {p.name}
                    </h4>
                    <span className="text-[11px] font-black text-[#1d3331]">
                      {p.completionPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                    <div
                      className="bg-[#1d3331] h-full transition-all duration-1000"
                      style={{ width: `${p.completionPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-3">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                      {p.assignedActivities} / {p.totalActivities} assigned
                    </p>
                    <p className="text-[9px] text-[#1d3331] font-black uppercase tracking-tighter cursor-pointer">
                      View Focus →
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── STAT CARD ──────────────────────────────────────────────────────────── */

const StatCard = ({
  label,
  value,
  border,
  textColor,
}: {
  label:      string;
  value:      number;
  border:     string;
  textColor?: string;
}) => (
  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative h-32 flex flex-col justify-between group hover:shadow-md transition-all">
    <div className={`text-4xl font-serif font-bold ${textColor ?? "text-[#1d3331]"}`}>
      {value}
    </div>
    <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">
      {label}
    </div>
    <div
      className={`absolute bottom-4 left-4 right-4 h-1 border-b-[3px] ${border} opacity-70 group-hover:opacity-100 transition-opacity`}
    />
  </div>
);

export default AdminDashboardPage;