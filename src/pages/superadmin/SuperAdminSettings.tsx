import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Settings, UploadCloud, UserCheck, X } from "lucide-react";
import toast from "react-hot-toast";
import { apiPrivate } from "../../api/axios";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchAllUsers } from "../../store/slices/user/userSlice";

interface UploaderUser {
  id: string;
  name: string;
  email: string;
  pjNumber?: string;
  title?: string;
}

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

/* ─── EVIDENCE UPLOADER CARD ─────────────────────────────────────────────── */

const EvidenceUploaderCard = () => {
  const dispatch = useAppDispatch();
  const { users, isLoading: usersLoading } = useAppSelector((s) => s.users);

  const [current, setCurrent] = useState<UploaderUser | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchAllUsers());
    apiPrivate
      .get<{ user: UploaderUser | null }>("/users/evidence-uploader")
      .then((res) => {
        setCurrent(res.data.user);
        setSelected(res.data.user?.id ?? "");
      })
      .catch(() => toast.error("Could not load the current evidence uploader."))
      .finally(() => setLoading(false));
  }, [dispatch]);

  // Only active standard users can be selected
  const candidates = useMemo(
    () =>
      users
        .filter((u) => u.role === "user" && u.isActive)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );

  const save = async (userId: string | null) => {
    setSaving(true);
    try {
      const res = await apiPrivate.put<{ user: UploaderUser | null; message: string }>(
        "/users/evidence-uploader",
        { userId }
      );
      setCurrent(res.data.user);
      setSelected(res.data.user?.id ?? "");
      toast.success(res.data.message);
    } catch (err) {
      toast.error(errorMessage(err, "Could not update the evidence uploader."));
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    if (!current) return;
    if (!window.confirm(`Remove ${current.name}'s access to upload evidence on every indicator?`)) return;
    save(null);
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="bg-violet-50 p-2 rounded-lg">
          <UploadCloud className="text-violet-600" size={18} />
        </div>
        <div>
          <h2 className="text-[13px] font-black text-[#1d3331] uppercase tracking-tight">
            Evidence Uploader
          </h2>
          <p className="text-[11px] text-slate-500 mt-1 max-w-xl">
            One officer who can upload evidence on <span className="font-bold">every</span> indicator —
            submit, resubmit, add and manage pending documents — not just their own. Their actions are
            recorded under their own name.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {/* Current holder */}
          <div className="mb-5 px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
            {current ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1d3331] text-white flex items-center justify-center text-[10px] font-black uppercase">
                    {current.name.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-[#1d3331]">{current.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {current.email}{current.pjNumber ? ` · PJ ${current.pjNumber}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClear}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 text-rose-500 rounded-lg text-[9px] font-black uppercase hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-colors disabled:opacity-50"
                >
                  <X size={12} /> Remove
                </button>
              </>
            ) : (
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                No evidence uploader selected
              </p>
            )}
          </div>

          {/* Picker */}
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            {current ? "Change to" : "Select officer"}
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                disabled={usersLoading || saving}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium text-[#1d3331] outline-none focus:border-[#1d3331] transition-colors pr-10"
              >
                <option value="">— Choose an active standard user —</option>
                {candidates.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.pjNumber || u.email})
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <button
              onClick={() => save(selected)}
              disabled={!selected || selected === current?.id || saving}
              className="px-5 py-3 rounded-xl bg-[#1d3331] text-white text-[11px] font-black uppercase hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
              {current ? "Replace" : "Assign"}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">
            Only one officer can hold this at a time. It is removed automatically if their role changes
            or their account is deactivated.
          </p>
        </>
      )}
    </section>
  );
};

/* ─── PAGE ───────────────────────────────────────────────────────────────── */

const SuperAdminSettings = () => (
  <div className="min-h-screen bg-[#fcfcf7] p-4 md:p-8 font-sans text-[#1a2c2c]">
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="bg-[#1d3331] p-2 rounded-lg">
          <Settings className="text-[#c2a336]" size={20} />
        </div>
        <h1 className="text-2xl font-black font-serif text-[#1d3331] uppercase tracking-tight">
          Settings
        </h1>
      </div>
      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-12">
        System-wide access and configuration
      </p>
    </div>

    <div className="max-w-3xl space-y-6">
      <EvidenceUploaderCard />
    </div>
  </div>
);

export default SuperAdminSettings;
