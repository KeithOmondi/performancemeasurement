import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { apiPrivate } from "../../api/axios";

interface Props {
  objectiveId: string;
  objectiveTitle: string;
  /** "icon" for tight table cells, "full" for cards */
  variant?: "icon" | "full";
}

/**
 * Downloads a folder as a ZIP: summary PDF + every evidence document,
 * organised by indicator and reporting period.
 */
const DownloadFolderButton = ({ objectiveId, objectiveTitle, variant = "full" }: Props) => {
  const [busy, setBusy] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation(); // don't toggle the folder card it sits in
    if (busy) return;
    setBusy(true);
    const toastId = toast.loading("Preparing folder download…");
    try {
      const res = await apiPrivate.get<Blob>(`/examiner/folders/${objectiveId}/download`, {
        responseType: "blob",
        timeout: 0, // large folders can take a while to zip
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${objectiveTitle.replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 60) || "folder"}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success("Folder downloaded.", { id: toastId });
    } catch {
      toast.error("Could not download this folder.", { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  const icon = busy ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />;

  return variant === "icon" ? (
    <button
      onClick={handleDownload}
      disabled={busy}
      title="Download folder (ZIP)"
      className="p-1.5 border border-slate-200 text-[#1d3331] rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
    >
      {icon}
    </button>
  ) : (
    <button
      onClick={handleDownload}
      disabled={busy}
      className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-[#1d3331] rounded-lg text-[9px] font-black uppercase hover:bg-slate-50 transition-colors disabled:opacity-50"
    >
      {icon}
      {busy ? "Preparing…" : "Download"}
    </button>
  );
};

export default DownloadFolderButton;
