import { useEffect, useState } from "react";
import { AlertCircle, BookOpen, Download, ExternalLink, Loader2 } from "lucide-react";
import { apiPrivate } from "../api/axios";

/* Jump points into the signed PDF (page numbers of the scanned document) */
const SECTIONS = [
  { label: "Cover",                         page: 1 },
  { label: "Terms & obligations",           page: 2 },
  { label: "Signatories",                   page: 4 },
  { label: "Schedule 1 · Targets matrix",   page: 5 },
  { label: "A · Core Business / Mandate",   page: 6 },
  { label: "B · Customer  ·  C · Finance",  page: 8 },
  { label: "D · Innovation  ·  E · Internal", page: 9 },
];

const FILE_NAME = "ORHC-PMMU-2025-2026.pdf";

const PmmuReference = () => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let url: string | null = null;
    apiPrivate
      .get<Blob>("/reference/pmmu", { responseType: "blob" })
      .then((res) => {
        url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
        setBlobUrl(url);
      })
      .catch(() => setError("Could not load the PMMU document."));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-4 md:p-8 font-sans text-[#1a2c2c]">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-[#1d3331] p-2 rounded-lg">
              <BookOpen className="text-[#c2a336]" size={20} />
            </div>
            <h1 className="text-2xl font-black font-serif text-[#1d3331] uppercase tracking-tight">
              PMMU Reference
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-12">
            Signed ORHC PMMU · 1 July 2025 – 30 June 2026
          </p>
        </div>

        {blobUrl && (
          <div className="flex gap-2 ml-12 md:ml-0">
            <a
              href={blobUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase text-[#1d3331] hover:bg-slate-50 transition-colors"
            >
              <ExternalLink size={14} /> Open in new tab
            </a>
            <a
              href={blobUrl}
              download={FILE_NAME}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1d3331] text-white text-[10px] font-black uppercase hover:bg-emerald-800 transition-colors"
            >
              <Download size={14} /> Download
            </a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        {/* Section jump list */}
        <nav className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 h-fit lg:sticky lg:top-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 mb-2">
            Sections
          </p>
          <div className="flex lg:flex-col gap-1 overflow-x-auto">
            {SECTIONS.map((s) => (
              <button
                key={s.page + s.label}
                onClick={() => setPage(s.page)}
                disabled={!blobUrl}
                className={`text-left whitespace-nowrap lg:whitespace-normal px-3 py-2 rounded-xl text-[11px] font-bold transition-colors disabled:opacity-50 ${
                  page === s.page
                    ? "bg-[#1d3331] text-white"
                    : "text-slate-500 hover:bg-slate-50 hover:text-[#1d3331]"
                }`}
              >
                {s.label}
                <span className={`ml-1 text-[9px] font-medium ${page === s.page ? "text-white/60" : "text-slate-300"}`}>
                  p.{s.page}
                </span>
              </button>
            ))}
          </div>
        </nav>

        {/* Viewer */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[80vh] flex items-center justify-center">
          {error ? (
            <div className="flex flex-col items-center gap-3">
              <AlertCircle size={32} className="text-rose-400" />
              <p className="text-xs font-semibold text-slate-500">{error}</p>
            </div>
          ) : !blobUrl ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest">Loading document...</p>
            </div>
          ) : (
            <iframe
              // key forces the viewer to jump when the page changes
              key={page}
              src={`${blobUrl}#page=${page}`}
              title="ORHC PMMU 2025/2026"
              className="w-full h-full border-none"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PmmuReference;
