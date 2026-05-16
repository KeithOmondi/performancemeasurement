import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import {
  Loader2,
  AlertCircle,
  FileText,
  Mail,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

import { fetchAllUsers } from "../../store/slices/user/userSlice";
import { useDashboard } from "../../hooks/useDashboard";
import type { AppDispatch, RootState } from "../../store/store";
import { useSelector as useAppSelector } from "react-redux";

/* ─── TYPES ──────────────────────────────────────────────────────────────── */

interface IUser {
  id?:       string;
  _id?:      string;
  name:      string;
  title?:    string;
  pjNumber?: string;
  email?:    string;
}

/* ─── HELPERS ────────────────────────────────────────────────────────────── */

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now  = new Date();
  const diffDays = Math.ceil(
    Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)  return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

/* ─── DONUT CHART ─────────────────────────────────────────────────────────── */

interface DonutProps {
  overdue:       number;
  pendingReview: number;
  returned:      number;
  onTrack:       number;
}

const DonutChart = ({ overdue, pendingReview, returned, onTrack }: DonutProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const total = overdue + pendingReview + returned + onTrack;
    if (total === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr   = window.devicePixelRatio || 1;
    const size  = 140;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx     = size / 2;
    const cy     = size / 2;
    const radius = 54;
    const cutout = 36;
    const gap    = 0.02;

    const slices = [
      { value: overdue,       color: "#E24B4A" },
      { value: pendingReview, color: "#BA7517" },
      { value: returned,      color: "#A32D2D" },
      { value: onTrack,       color: "#3B6D11" },
    ].filter((s) => s.value > 0);

    let startAngle = -Math.PI / 2;
    slices.forEach(({ value, color }) => {
      const sliceAngle = (value / total) * Math.PI * 2 - gap;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      startAngle += sliceAngle + gap;
    });

    // Punch out centre
    ctx.beginPath();
    ctx.arc(cx, cy, cutout, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }, [overdue, pendingReview, returned, onTrack]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Health overview donut chart"
      style={{ width: 140, height: 140 }}
    />
  );
};

/* ─── HEALTH PANEL ────────────────────────────────────────────────────────── */

interface HealthPanelProps {
  total:         number;
  assigned:      number;
  overdue:       number;
  pendingReview: number;
  returned:      number;
  approved:      number;
}

const HealthPanel = ({
  total,
  assigned,
  overdue,
  pendingReview,
  returned,
  approved,
}: HealthPanelProps) => {
  const onTrack = Math.max(0, assigned - overdue - pendingReview - returned - approved);

  const pipeline = [
    { label: "Assigned",            value: assigned,      color: "#185FA5" },
    { label: "Pending review",      value: pendingReview, color: "#BA7517" },
    { label: "Reviewed & approved", value: approved,      color: "#3B6D11" },
    { label: "Returned",            value: returned,      color: "#A32D2D" },
    { label: "Overdue",             value: overdue,       color: "#E24B4A" },
  ];

  const legend = [
    { label: "Overdue",        value: overdue,       color: "#E24B4A" },
    { label: "Pending review", value: pendingReview, color: "#BA7517" },
    { label: "Returned",       value: returned,      color: "#A32D2D" },
    { label: "On track",       value: onTrack,       color: "#3B6D11" },
  ];

  const assignedPct   = total > 0 ? Math.round((assigned / total) * 100) : 0;
  const unassignedPct = 100 - assignedPct;
  const unassigned    = total - assigned;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6">
        Health overview
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Completion pipeline */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
            Completion pipeline
          </p>
          <div className="space-y-3">
            {pipeline.map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-[12px] text-slate-500 w-36 flex-shrink-0">{label}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${total > 0 ? Math.min((value / total) * 100, 100) : 0}%`,
                      background: color,
                    }}
                  />
                </div>
                <span
                  className="text-[13px] font-bold w-6 text-right flex-shrink-0"
                  style={{ color }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut + legend */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
            Distribution
          </p>
          <div className="flex items-center gap-6">
            <DonutChart
              overdue={overdue}
              pendingReview={pendingReview}
              returned={returned}
              onTrack={onTrack}
            />
            <div className="flex-1 space-y-2">
              {legend.map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2 text-[12px]">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-slate-500 flex-1">{label}</span>
                  <span className="font-bold" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assignment rate */}
      <div className="mt-6 pt-5 border-t border-slate-100">
        <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-2">
          <span className="uppercase tracking-widest">Assignment rate</span>
          <span>{assigned} / {total} assigned</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${assignedPct}%`, background: "#185FA5" }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
          <span>{assignedPct}% assigned</span>
          <span>{unassignedPct}% unassigned ({unassigned})</span>
        </div>
      </div>
    </div>
  );
};

/* ─── MAIN COMPONENT ──────────────────────────────────────────────────────── */

const SuperAdminDashboardPage = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { users = [], isLoading: uLoad } = useAppSelector(
    (s: RootState) => s.users
  );

  useEffect(() => {
    dispatch(fetchAllUsers());
  }, [dispatch]);

  const { data, loading, error } = useDashboard();

  /* ─── LOADING ── */
  if (uLoad || loading || !data) {
    return (
      <div className="min-h-screen bg-[#fcfcf7] flex items-center justify-center flex-col">
        <Loader2 className="animate-spin text-[#1d3331] mb-4" size={40} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">
          Loading dashboard data...
        </p>
      </div>
    );
  }

  /* ─── ERROR ── */
  if (error) {
    return (
      <div className="min-h-screen bg-[#fcfcf7] flex items-center justify-center flex-col gap-3">
        <AlertCircle className="text-red-500" size={36} />
        <p className="text-sm text-slate-600">{error}</p>
      </div>
    );
  }

  /* ─── DATA ── */
  const { stats, perspectives, recentSubmissions } = data;

  const userAssignments: Record<string, number> = {};
  recentSubmissions.forEach((s) => {
    userAssignments[s.submittedBy] = (userAssignments[s.submittedBy] || 0) + 1;
  });
  const maxAssignments = Math.max(...Object.values(userAssignments), 1);

  const statCards = [
    { label: "Total indicators", value: stats.total,         color: "bg-[#1d3331]",   icon: FileText,     filter: "ALL"       },
    { label: "Assigned",         value: stats.assigned,      color: "bg-emerald-600", icon: CheckCircle2, filter: "ASSIGNED"  },
    { label: "Unassigned",       value: stats.unassigned,    color: "bg-amber-500",   icon: AlertCircle,  filter: "UNASSIGNED"},
    { label: "Pending review",   value: stats.pendingReview, color: "bg-blue-500",    icon: Clock,        filter: "REVIEW"    },
    { label: "Approved",         value: stats.approved,      color: "bg-emerald-600", icon: CheckCircle2, filter: "ALL"       },
  ];

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-4 md:p-8 text-[#1a2c2c] font-sans">

      {/* Alert banner */}
      {(stats.pendingReview > 0 || stats.overdue > 0) && (
        <div className="bg-[#fff9e6] border border-[#f5e6b3] rounded-lg p-3 mb-8 flex items-center gap-3">
          <AlertCircle size={16} className="text-amber-600" />
          <p className="text-[12px] font-medium text-amber-900">
            {stats.pendingReview > 0 && (
              <>
                <span className="font-bold">{stats.pendingReview} indicators</span>{" "}
                have evidence pending review
              </>
            )}
            {stats.pendingReview > 0 && stats.overdue > 0 && " · "}
            {stats.overdue > 0 && (
              <>
                <span className="font-bold">{stats.overdue} indicators</span>{" "}
                are overdue
              </>
            )}
          </p>
        </div>
      )}

      {/* ── Primary stat cards ── */}
      <div className="space-y-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((card) => (
            <Link
              key={card.label}
              to={`/superadmin/indicators?filter=${card.filter}`}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-serif font-bold text-[#1d3331] group-hover:text-emerald-700 transition-colors">
                    {card.value}
                  </p>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-2">
                    {card.label}
                  </p>
                </div>
                <card.icon size={20} className="text-slate-300 group-hover:text-emerald-600 transition-colors" />
              </div>
              <div className="w-full bg-slate-100 h-[3px] rounded-full overflow-hidden mt-4">
                <div
                  className={`${card.color} h-full transition-all duration-700`}
                  style={{
                    width: `${stats.total > 0 ? Math.min((card.value / stats.total) * 100, 100) : 0}%`,
                  }}
                />
              </div>
            </Link>
          ))}
        </div>

        {/* ── Secondary stats ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/superadmin/indicators?filter=OVERDUE"
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-red-800 transition-all group"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-4xl font-serif font-bold text-red-800">{stats.overdue}</h2>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-1">
                  Overdue indicators
                </p>
              </div>
              <Clock size={20} className="text-red-300" />
            </div>
          </Link>

          <div className="bg-white p-6 rounded-2xl border-l-[5px] border-emerald-600 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-4xl font-serif font-bold text-emerald-700">{stats.approved}</h2>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-1">
                  Reviewed &amp; approved
                </p>
              </div>
              <CheckCircle2 size={20} className="text-emerald-400" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border-l-[5px] border-red-700 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-4xl font-serif font-bold text-red-700">{stats.returnedForCorrection}</h2>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-1">
                  Returned for correction
                </p>
              </div>
              <XCircle size={20} className="text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Health overview panel — sits between stat cards and submissions ── */}
      <HealthPanel
        total={stats.total}
        assigned={stats.assigned}
        overdue={stats.overdue}
        pendingReview={stats.pendingReview}
        returned={stats.returnedForCorrection}
        approved={stats.approved}
      />

      {/* ── Recent submissions + perspectives ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">

        <div className="lg:col-span-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-serif font-bold text-[#1d3331]">Recent submissions</h3>
            <Link
              to="/superadmin/submissions"
              className="text-[10px] font-black bg-[#1d3331] text-white px-4 py-2 rounded uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-800 transition-colors"
            >
              View all <ArrowUpRight size={12} />
            </Link>
          </div>

          {recentSubmissions.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
              <FileText size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No pending submissions to review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSubmissions.slice(0, 5).map((item) => (
                <div
                  key={item.submissionId}
                  className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-emerald-200 transition-all"
                >
                  <div className="flex gap-4 flex-1">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        item.reviewStatus === "Pending" ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-[14px] text-slate-600 font-medium leading-snug">
                        <span className="font-bold text-[#1a2c2c]">{item.submittedBy}</span>{" "}
                        submitted evidence for{" "}
                        <span className="font-bold text-[#1a2c2c]">{item.indicatorTitle}</span>
                      </p>
                      <div className="flex gap-4 mt-2">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                          {formatDate(item.submittedOn)} · Q{item.quarter}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-bold">
                          Achieved: {item.achievedValue}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {item.documentsCount} document{item.documentsCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/superadmin/submissions?id=${item.submissionId}`}
                    className="text-emerald-700 text-[11px] font-bold uppercase hover:border-b hover:border-emerald-700 transition-all ml-4 flex-shrink-0"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Perspectives breakdown */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xl font-serif font-bold text-[#1d3331] mb-6">By perspective</h3>
          {perspectives.map((p) => (
            <div
              key={p.name}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm group hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-[11px] font-black uppercase text-[#1d3331]">{p.name}</h4>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full">
                  {p.completionPercentage}%
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mb-3 uppercase tracking-tighter">
                {p.assignedActivities} / {p.totalActivities} activities assigned
              </p>
              <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#1d3331] h-full group-hover:bg-emerald-700 transition-all duration-500"
                  style={{ width: `${p.completionPercentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Team overview ── */}
      <div className="mt-16 pt-8 border-t border-slate-200">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-serif font-bold text-[#1d3331]">Team overview</h3>
          <Link
            to="/superadmin/team"
            className="text-[10px] font-black border border-slate-300 px-5 py-2 rounded-xl uppercase hover:bg-[#1d3331] hover:text-white transition-all"
          >
            View all team →
          </Link>
        </div>

        {users.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
            <p className="text-sm text-slate-500">No team members found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(users as IUser[]).slice(0, 4).map((member) => {
              const userId          = member.id || member._id || "";
              const assignmentCount = userAssignments[member.name] || 0;

              return (
                <div
                  key={userId}
                  className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm group hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#1d3331] text-white flex items-center justify-center font-bold text-sm uppercase flex-shrink-0">
                      {member.name?.split(" ").map((n) => n[0]).join("").substring(0, 2) || "U"}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[15px] font-serif font-bold leading-tight text-[#1a2c2c] group-hover:text-emerald-700 transition-colors truncate">
                        {member.name}
                      </h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 truncate">
                        {member.title || "Team Member"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">
                      PF: {member.pjNumber || "Not assigned"}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-700">
                      <FileText size={14} />
                      {assignmentCount} indicator{assignmentCount !== 1 ? "s" : ""} assigned
                    </div>
                    {assignmentCount > 0 && (
                      <div className="w-full bg-slate-50 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full"
                          style={{ width: `${(assignmentCount / maxAssignments) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={`/superadmin/team/${userId}`}
                      className="flex-1 bg-slate-50 text-[10px] font-black uppercase py-2.5 rounded-xl text-center hover:bg-slate-100 transition-colors"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={() => (window.location.href = `mailto:${member.email}`)}
                      className="p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <Mail size={14} className="text-slate-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboardPage;