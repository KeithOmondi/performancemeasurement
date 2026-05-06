import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Loader2, ArrowRightCircle, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";

// Thunks
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import { fetchDashboardStats } from "../../store/slices/dashboardSlice";
import {
  fetchAllAdminIndicators,
  type IAdminIndicator,
  type ISubmissionsByQuarter,
} from "../../store/slices/adminIndicatorSlice";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";

// Types
import type { AppDispatch, RootState } from "../../store/store";

// --- INTERFACES ---

interface IActivity {
  id?: string;
  description: string;
}

interface IObjective {
  id: string;
  name: string;
  activities: IActivity[];
}

interface IStrategicPlan {
  id: string;
  title?: string;
  objectives: IObjective[];
}

interface IPerspectiveStat {
  name: string;
  val: number;
  count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTIONABLE_STATUSES = new Set([
  "Pending",
  "Awaiting Admin Approval",
  "Awaiting Super Admin",
  "Partially Approved",
  "Rejected by Admin",
  "Rejected by Super Admin",
]);

/** Flatten ISubmissionsByQuarter → flat array, newest-first per quarter. */
const flattenSubmissions = (submissions: ISubmissionsByQuarter) =>
  Object.values(submissions ?? {}).flat();

const isIndicatorOverdue = (
  indicator: IAdminIndicator,
  currentQuarter: number
): boolean => {
  const status = indicator.status ?? "";
  if (status === "Completed") return false;
  if (!ACTIONABLE_STATUSES.has(status)) return false;

  if (indicator.deadline) {
    return new Date(indicator.deadline) < new Date();
  }

  if (indicator.reportingCycle === "Annual") return false;

  return (
    status === "Pending" &&
    typeof indicator.activeQuarter === "number" &&
    indicator.activeQuarter < currentQuarter
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminDashboardPage = () => {
  const dispatch = useDispatch<AppDispatch>();

  // ── Selectors ─────────────────────────────────────────────────────────────
  const { isLoading: uLoad } = useSelector((state: RootState) => state.users);

  // No cast needed — allAssignments is IAdminIndicator[] from the slice
  const { allAssignments: indicators, isLoading: iLoad } = useSelector(
    (state: RootState) => state.adminIndicators
  );

  const { stats, loading: sLoad } = useSelector(
    (state: RootState) => state.dashboard
  );

  const { plans = [], loading: pLoad } = useSelector(
    (state: RootState) =>
      state.strategicPlan as unknown as {
        plans: IStrategicPlan[];
        loading: boolean;
      }
  );

  // ── Data Lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchAllUsers());
    dispatch(fetchDashboardStats());
    dispatch(fetchAllAdminIndicators());
    dispatch(getAllStrategicPlans());
  }, [dispatch]);

  // ── Derived Logic ─────────────────────────────────────────────────────────
  const derivedData = useMemo(() => {
    const totalActivities = plans.reduce(
      (acc, p) =>
        acc +
        (p.objectives?.reduce(
          (oAcc, obj) => oAcc + (obj.activities?.length ?? 0),
          0
        ) ?? 0),
      0
    );

    const assignedCount = indicators.length;

    const awaitingReview = indicators.filter((i) =>
      ["Awaiting Admin Approval", "Awaiting Super Admin", "Partially Approved"].includes(
        i.status
      )
    ).length;

    const approved = indicators.filter((i) => i.status === "Completed").length;

    const rejected = indicators.filter((i) =>
      ["Rejected by Admin", "Rejected by Super Admin"].includes(i.status)
    ).length;

    const currentMonth = new Date().getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);
    const overdue = indicators.filter((i) =>
      isIndicatorOverdue(i, currentQuarter)
    ).length;

    return {
      totalActivities,
      assignedCount,
      unassignedCount: Math.max(0, totalActivities - assignedCount),
      awaitingReview,
      approved,
      rejected,
      overdue,
    };
  }, [plans, indicators]);

  const isGlobalLoading = uLoad || sLoad || iLoad || pLoad;

  if (isGlobalLoading && plans.length === 0) {
    return (
      <div className="min-h-screen bg-[#fcfcf7] flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-[#1d3331] mb-4" size={40} />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 text-center">
          Syncing Registry Intelligence...
        </p>
      </div>
    );
  }

  // Top 5 indicators awaiting action — use flattenSubmissions for resubmission check
  const pendingQueue = indicators
    .filter((ind) =>
      ["Awaiting Admin Approval", "Awaiting Super Admin", "Partially Approved"].includes(
        ind.status
      )
    )
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-4 md:p-8 text-[#1a2c2c] font-sans">
      {/* HEADER */}
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

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Total Indicators"
          value={derivedData.totalActivities}
          border="border-[#1d3331]"
        />
        <StatCard
          label="Assigned"
          value={derivedData.assignedCount}
          border="border-slate-300"
        />
        <StatCard
          label="Unassigned"
          value={derivedData.unassignedCount}
          border="border-slate-200"
          textColor="text-slate-400"
        />
        <StatCard
          label="Pending Action"
          value={derivedData.awaitingReview}
          border="border-yellow-500"
          textColor="text-yellow-600"
        />
        <StatCard
          label="Certified Completed"
          value={derivedData.approved}
          border="border-emerald-700"
          textColor="text-emerald-700"
        />
      </div>

      {/* CRITICAL METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-10">
        <div className="bg-white p-5 rounded-xl border-t-4 border-red-800 shadow-sm flex flex-col justify-between h-32">
          <div className="text-4xl font-serif font-bold text-red-800">
            {derivedData.overdue}
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
              {derivedData.approved}
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
              {derivedData.rejected}
            </span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
              Returned for Correction
            </p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
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

                // ✅ Use flattenSubmissions — submissions is now Record<string, ISubmission[]>
                const flat = flattenSubmissions(item.submissions);
                const isResub = flat.some(
                  (s) => s.resubmissionCount > 0 && s.reviewStatus === "Pending"
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
                          "{item.activity?.description}"
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-tighter">
                          {item.assigneeName} •{" "}
                          <span
                            className={
                              isEscalated ? "text-emerald-700" : "text-yellow-600"
                            }
                          >
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

        <div className="lg:col-span-4">
          <h3 className="text-xl font-serif font-bold text-[#1d3331] mb-6">
            Strategic Matrix
          </h3>
          <div className="space-y-4">
            {(stats?.perspectiveStats ?? []).map(
              (p: IPerspectiveStat, idx: number) => (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm group hover:border-[#1d3331]/20 transition-all"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-[#1d3331] transition-colors">
                      {p.name}
                    </h4>
                    <span className="text-[11px] font-black text-[#1d3331]">
                      {p.val}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                    <div
                      className="bg-[#1d3331] h-full transition-all duration-1000"
                      style={{ width: `${p.val}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-3">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                      {p.count} Indicators
                    </p>
                    <p className="text-[9px] text-[#1d3331] font-black uppercase tracking-tighter cursor-pointer">
                      View Focus →
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  border,
  textColor,
}: {
  label: string;
  value: number;
  border: string;
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