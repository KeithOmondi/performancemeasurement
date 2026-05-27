import { Search, Bell, Mail, Menu, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  markOneRead,
  markAllRead,
  dismissNotification,
  type INotification,
} from "../../store/slices/notificationslice";

interface HeaderProps {
  onMenuClick: () => void;
}

// ─── Icon map for notification types ─────────────────────────────────────────

const TYPE_CONFIG: Record<
  INotification["type"],
  { dot: string; bg: string; label: string }
> = {
  submission_created: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    label: "New submission",
  },
  resubmission_received: {
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    label: "Resubmission",
  },
  indicator_rejected: {
    dot: "bg-red-500",
    bg: "bg-red-50",
    label: "Rejected",
  },
};

// ─── Single notification row ──────────────────────────────────────────────────

const NotifRow = ({ notif }: { notif: INotification }) => {
  const dispatch = useAppDispatch();
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.submission_created;

  return (
    <div
      onClick={() => !notif.isRead && dispatch(markOneRead(notif.id))}
      className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${
        notif.isRead ? "hover:bg-slate-50" : cfg.bg + " hover:brightness-95"
      }`}
    >
      {/* Status dot */}
      <div className="pt-1.5 flex-shrink-0">
        <div
          className={`w-2 h-2 rounded-full ${
            notif.isRead ? "bg-slate-300" : cfg.dot
          }`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs font-semibold mb-0.5 truncate ${
            notif.isRead ? "text-slate-700" : "text-slate-900"
          }`}
        >
          {notif.title}
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-1">
          {notif.message}
        </p>
        <p className="text-[10px] text-slate-400">
          {new Date(notif.createdAt).toLocaleString()}
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          dispatch(dismissNotification(notif.id));
        }}
        className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors pt-1"
        aria-label="Dismiss notification"
      >
        <X size={13} />
      </button>
    </div>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────

const AdminHeader = ({ onMenuClick }: HeaderProps) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { items, unreadCount } = useAppSelector((state) => state.notifications);

  const [notifOpen, setNotifOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !bellRef.current?.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-slate-100 rounded-md text-slate-600"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <img
            src="/ORHC LOGO.png"
            alt="ORHC Logo"
            className="h-8 md:h-10 object-contain"
          />
          <h1 className="font-bold font-serif text-[10px] md:text-sm uppercase hidden sm:block text-slate-800">
            OFFICE OF THE REGISTRAR HIGH COURT
          </h1>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />
          <input
            type="text"
            placeholder="Search Registry..."
            className="pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-md text-xs focus:ring-1 focus:ring-yellow-500 w-40 lg:w-64"
          />
        </div>

        {/* Notifications + Mail */}
        <div className="flex items-center space-x-1 md:space-x-2 border-x border-slate-200 px-2 md:px-4 relative">
          {/* Bell */}
          <button
            ref={bellRef}
            onClick={() => setNotifOpen((prev) => !prev)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-full relative"
            aria-label="Notifications"
            aria-expanded={notifOpen}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] min-w-[14px] h-3.5 flex items-center justify-center rounded-full border-2 border-white px-0.5 font-bold">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification panel */}
          {notifOpen && (
            <div
              ref={panelRef}
              className="absolute top-12 right-0 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
              role="dialog"
              aria-label="Notifications"
            >
              {/* Panel header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-1.5 text-slate-400 font-normal text-xs">
                      ({unreadCount} unread)
                    </span>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => dispatch(markAllRead())}
                    className="text-[11px] text-emerald-700 font-semibold hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    <Bell size={24} className="mx-auto mb-2 opacity-30" />
                    No notifications
                  </div>
                ) : (
                  items.map((n) => <NotifRow key={n.id} notif={n} />)
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-slate-100 text-center">
                <button className="text-[11px] text-emerald-700 font-semibold hover:underline">
                  View all activity
                </button>
              </div>
            </div>
          )}

          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-full" aria-label="Messages">
            <Mail size={18} />
          </button>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden xl:block">
            <p className="text-[11px] font-black text-[#1a3a32] leading-none uppercase">
              {user?.name || "Admin"}
            </p>
            <p className="text-[9px] text-emerald-600 font-bold uppercase mt-1">
              {user?.role || "ORHC"}
            </p>
          </div>
          
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;