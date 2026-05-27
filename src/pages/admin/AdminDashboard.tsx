import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Loader2, ArrowRightCircle, AlertCircle, CheckCircle2, Clock, CalendarDays, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

import { fetchDashboardStats } from "../../store/slices/dashboardSlice";
import {
  fetchAllAdminIndicators,
  type IAdminIndicator,
  type ISubmission,
  type ISubmissionsByPeriod,
} from "../../store/slices/adminIndicatorSlice";
import {
  fetchCalendarEvents,
  fetchUpcomingDeadlines,
  type ICalendarEvent,
} from "../../store/slices/calendarSlice";

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

/* ─── CALENDAR HELPERS ───────────────────────────────────────────────────── */

const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; dot: string; text: string }
> = {
  deadline:     { label: "Deadline",     dot: "bg-red-500",    text: "text-red-700"    },
  submission:   { label: "Submission",   dot: "bg-blue-500",   text: "text-blue-700"   },
  resubmission: { label: "Resubmission", dot: "bg-orange-500", text: "text-orange-700" },
  review:       { label: "Review",       dot: "bg-emerald-500",text: "text-emerald-700"},
  reopen:       { label: "Reopened",     dot: "bg-purple-500", text: "text-purple-700" },
};

const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

const getFirstDayOfMonth = (year: number, month: number) =>
  new Date(year, month, 1).getDay();

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

/* ─── COMPONENT ──────────────────────────────────────────────────────────── */

const AdminDashboardPage = () => {
  const dispatch = useDispatch<AppDispatch>();

  /* ── Calendar local state ── */
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  /* ── Selectors ── */
  const { allAssignments: indicators, isLoading: iLoad } = useSelector(
    (state: RootState) => state.adminIndicators
  );

  const { data, loading: sLoad } = useSelector(
    (state: RootState) => state.dashboard
  );

  const {
    events: calendarEvents,
    upcomingDeadlines,
    isLoadingFeed: calLoad,
    isLoadingUpcoming: upLoad,
  } = useSelector((state: RootState) => state.calendar);

  /* ── Fetch ── */
  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchAllAdminIndicators());
    dispatch(fetchUpcomingDeadlines({ days: 30 }));
  }, [dispatch]);

  /* Refetch calendar events when month/year changes */
  useEffect(() => {
    const from = new Date(calYear, calMonth, 1).toISOString().split("T")[0];
    const to   = new Date(calYear, calMonth + 1, 0).toISOString().split("T")[0];
    dispatch(fetchCalendarEvents({ from, to }));
  }, [dispatch, calMonth, calYear]);

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

  /* ── Stats ── */
  const stats        = data?.stats;
  const perspectives = data?.perspectives ?? [];

  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const localOverdue   = indicators.filter((i) =>
    isIndicatorOverdue(i, currentQuarter)
  ).length;
  const overdueCount = stats?.overdue ?? localOverdue;

  /* ── Pending queue ── */
  const pendingQueue = indicators
    .filter((ind) =>
      ["Awaiting Admin Approval", "Awaiting Super Admin", "Partially Approved"].includes(
        ind.status
      )
    )
    .slice(0, 5);

  /* ── Calendar: build a map of day → events for the current month ── */
  const eventsByDay = calendarEvents.reduce<Record<number, ICalendarEvent[]>>(
    (acc, ev) => {
      const d = new Date(ev.date);
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate();
        if (!acc[day]) acc[day] = [];
        acc[day].push(ev);
      }
      return acc;
    },
    {}
  );

  const daysInMonth   = getDaysInMonth(calYear, calMonth);
  const firstDayOfWeek = getFirstDayOfMonth(calYear, calMonth);
  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
    setSelectedDay(null);
  };

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
        <StatCard label="Total Indicators"   value={stats?.total ?? 0}         border="border-[#1d3331]" />
        <StatCard label="Assigned"           value={stats?.assigned ?? 0}      border="border-slate-300" />
        <StatCard label="Unassigned"         value={stats?.unassigned ?? 0}    border="border-slate-200"  textColor="text-slate-400" />
        <StatCard label="Pending Action"     value={stats?.pendingReview ?? 0} border="border-yellow-500" textColor="text-yellow-600" />
        <StatCard label="Certified Completed"value={stats?.approved ?? 0}      border="border-emerald-700" textColor="text-emerald-700" />
      </div>

      {/* Critical metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-10">
        <div className="bg-white p-5 rounded-xl border-t-4 border-red-800 shadow-sm flex flex-col justify-between h-32">
          <div className="text-4xl font-serif font-bold text-red-800">{overdueCount}</div>
          <div className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">
            Overdue &amp; Critical
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-xl border-l-[6px] border-[#1d3331] shadow-sm flex items-center h-32 group hover:shadow-md transition-all">
          <CheckCircle2 size={32} className="text-[#1d3331] mr-4 opacity-20 group-hover:opacity-40 transition-opacity" />
          <div>
            <span className="text-4xl font-serif font-bold text-[#1d3331]">{stats?.approved ?? 0}</span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
              Verified Final Output
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-xl border-l-[6px] border-orange-600 shadow-sm flex items-center h-32 group hover:shadow-md transition-all">
          <AlertCircle size={32} className="text-orange-600 mr-4 opacity-20 group-hover:opacity-40 transition-opacity" />
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-10">

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
                  (s: ISubmission) => s.resubmissionCount > 0 && s.reviewStatus === "Pending"
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
                          className={`${isEscalated ? "text-emerald-600" : "text-yellow-500"} opacity-40`}
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
                        <span className="block text-[11px] font-black text-[#1d3331]">{item.progress}%</span>
                        <span className="block text-[8px] text-slate-400 font-bold uppercase">{item.unit}</span>
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

        {/* Strategic matrix */}
        <div className="lg:col-span-4">
          <h3 className="text-xl font-serif font-bold text-[#1d3331] mb-6">Strategic Matrix</h3>
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
                    <span className="text-[11px] font-black text-[#1d3331]">{p.completionPercentage}%</span>
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

      {/* ─── CALENDAR SECTION ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* Mini calendar */}
        <div className="lg:col-span-5">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-xl font-serif font-bold text-[#1d3331] flex items-center gap-2">
                <CalendarDays size={20} className="opacity-60" />
                Activity Calendar
              </h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Submissions, reviews &amp; deadlines
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-50 transition-colors text-slate-400 hover:text-[#1d3331]"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-[#1d3331] tracking-wide">
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-slate-50 transition-colors text-slate-400 hover:text-[#1d3331]"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-2">
              {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
                <div key={d} className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Loading overlay */}
            {calLoad ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 size={20} className="animate-spin text-slate-300" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-y-1">
                {/* Empty cells before first day */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {/* Day cells */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const hasEvents    = !!eventsByDay[day]?.length;
                  const isToday      =
                    day === today.getDate() &&
                    calMonth === today.getMonth() &&
                    calYear  === today.getFullYear();
                  const isSelected   = selectedDay === day;
                  const hasDeadline  = eventsByDay[day]?.some((e) => e.type === "deadline");

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`
                        relative flex flex-col items-center justify-center rounded-lg py-1.5 text-[11px] font-bold transition-all
                        ${isSelected  ? "bg-[#1d3331] text-white shadow-md" : ""}
                        ${isToday && !isSelected ? "bg-[#1d3331]/10 text-[#1d3331]" : ""}
                        ${!isToday && !isSelected ? "text-slate-600 hover:bg-slate-50" : ""}
                      `}
                    >
                      {day}
                      {hasEvents && !isSelected && (
                        <div className="flex gap-0.5 mt-0.5">
                          {hasDeadline && <span className="w-1 h-1 rounded-full bg-red-500" />}
                          {eventsByDay[day]?.some((e) => e.type === "submission") && (
                            <span className="w-1 h-1 rounded-full bg-blue-400" />
                          )}
                          {eventsByDay[day]?.some((e) => e.type === "review") && (
                            <span className="w-1 h-1 rounded-full bg-emerald-400" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex gap-4 mt-4 pt-4 border-t border-slate-50 flex-wrap">
              {Object.entries(EVENT_TYPE_CONFIG).map(([, cfg]) => (
                <div key={cfg.label} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    {cfg.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected-day event list */}
          {selectedDay !== null && (
            <div className="mt-4 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {MONTH_NAMES[calMonth]} {selectedDay} — {selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}
              </p>
              {selectedEvents.length === 0 ? (
                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest text-center py-4">
                  No events on this day
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((ev) => {
                    const cfg = EVENT_TYPE_CONFIG[ev.type] ?? EVENT_TYPE_CONFIG.submission;
                    return (
                      <div key={ev.id} className="flex items-start gap-3 group">
                        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-[#1d3331] leading-snug truncate">
                            {ev.activityDescription ?? ev.title}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                            {ev.assigneeName ?? "Unassigned"} ·{" "}
                            <span className={cfg.text}>{cfg.label}</span>
                            {ev.quarter ? ` · Q${ev.quarter}` : ""}
                          </p>
                        </div>
                        <Link
                          to={`/admin/indicators/${ev.indicatorId}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[#1d3331]"
                        >
                          <ArrowRightCircle size={14} />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upcoming deadlines */}
        <div className="lg:col-span-7">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-xl font-serif font-bold text-[#1d3331]">
                Upcoming Deadlines
              </h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Next 30 days · All indicators
              </p>
            </div>
          </div>

          {upLoad ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={20} className="animate-spin text-slate-300" />
            </div>
          ) : upcomingDeadlines.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                No upcoming deadlines
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.slice(0, 8).map((dl) => {
                const isOverdue  = dl.days_remaining <= 0;
                const isUrgent   = dl.days_remaining > 0 && dl.days_remaining <= 3;
                const deadlineDate = new Date(dl.date).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short",
                });

                return (
                  <div
                    key={dl.id}
                    className={`
                      bg-white p-4 rounded-xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between
                      group hover:shadow-md transition-all
                      ${isOverdue ? "border-l-4 border-l-red-500 border-slate-100" : ""}
                      ${isUrgent  ? "border-l-4 border-l-orange-400 border-slate-100" : ""}
                      ${!isOverdue && !isUrgent ? "border-slate-100" : ""}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        flex-shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center
                        ${isOverdue ? "bg-red-50" : isUrgent ? "bg-orange-50" : "bg-slate-50"}
                      `}>
                        <span className={`text-[13px] font-black leading-none ${isOverdue ? "text-red-700" : isUrgent ? "text-orange-600" : "text-[#1d3331]"}`}>
                          {isOverdue ? (
                            <AlertTriangle size={16} />
                          ) : (
                            <>
                              <span className="block text-center">{new Date(dl.date).getDate()}</span>
                            </>
                          )}
                        </span>
                        {!isOverdue && (
                          <span className={`text-[8px] font-bold uppercase ${isUrgent ? "text-orange-400" : "text-slate-400"}`}>
                            {new Date(dl.date).toLocaleDateString("en-GB", { month: "short" })}
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-bold text-[#1d3331] leading-snug line-clamp-1">
                          {dl.activityDescription ?? "—"}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                          {dl.assigneeName ?? "Unassigned"}
                          {dl.perspective ? ` · ${dl.perspective}` : ""}
                          {dl.reportingCycle === "Quarterly" && dl.quarter ? ` · Q${dl.quarter}` : " · Annual"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-3 sm:mt-0">
                      <div className="text-right">
                        <span className={`block text-[11px] font-black ${isOverdue ? "text-red-600" : isUrgent ? "text-orange-500" : "text-slate-500"}`}>
                          {isOverdue
                            ? `${Math.abs(dl.days_remaining)}d overdue`
                            : dl.days_remaining === 0
                            ? "Due today"
                            : `${dl.days_remaining}d left`}
                        </span>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase">
                          {deadlineDate}
                        </span>
                      </div>
                      <Link
                        to={`/admin/indicators/${dl.indicatorId}`}
                        className="bg-[#1d3331] text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                      >
                        <ArrowRightCircle size={16} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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