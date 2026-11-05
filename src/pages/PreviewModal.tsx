import { X, Loader2, AlertCircle, Download, FileSpreadsheet } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { getFileExt, revokeBlobUrl, streamFile } from "../store/slices/streamSlice";

interface PreviewModalProps {
  url: string | undefined;
  fileName: string;
  onClose: () => void;
}

const FilePreviewModal = ({ url, fileName, onClose }: PreviewModalProps) => {
  const dispatch = useAppDispatch();
  const { blobUrl, loading, error } = useAppSelector((state) => state.streamFile);

  const urlExt = getFileExt(url);
  // Some host URLs carry no extension — fall back to the original file name
  const fileExt = urlExt && urlExt.length <= 5 && !urlExt.includes("/") ? urlExt : getFileExt(fileName);
  const isImage = ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(fileExt || "");
  const isPDF = fileExt === "pdf";

  useEffect(() => {
    if (url) {
      dispatch(streamFile({ url, fileName }));
    }
    return () => {
      dispatch(revokeBlobUrl());
    };
  }, [url, fileName, dispatch]);

  const handleClose = () => {
    dispatch(revokeBlobUrl());
    onClose();
  };

  if (!url) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-10">
      <div className="bg-white w-full h-full max-w-6xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="text-[11px] font-black text-[#1a3a32] uppercase tracking-widest truncate max-w-md">
            {fileName || "File Preview"}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            {blobUrl && !loading && !error && (
              <a
                href={blobUrl}
                download={fileName || "document"}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white text-[#1a3a32] rounded-lg text-[9px] font-black uppercase hover:bg-slate-100 transition-colors"
              >
                <Download size={12} /> Download
              </a>
            )}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-rose-100 hover:text-rose-500 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 bg-slate-100 overflow-hidden flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                Loading preview...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3">
              <AlertCircle size={32} className="text-rose-400" />
              <p className="text-xs font-semibold text-slate-500">
                {error || "Failed to load preview."}
              </p>
            </div>
          )}

          {blobUrl && !loading && !error && (
            isImage ? (
              <div className="w-full h-full flex items-center justify-center p-8">
                <img
                  src={blobUrl}
                  alt={fileName}
                  className="max-w-full max-h-full object-contain shadow-lg rounded-lg"
                />
              </div>
            ) : isPDF ? (
              <iframe
                src={`${blobUrl}#toolbar=0`}
                className="w-full h-full border-none"
                title="PDF Preview"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-12 text-center">
                <FileSpreadsheet size={40} className="text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  This file type can't be shown in the browser.
                </p>
                <p className="text-xs text-slate-400">
                  Download it to open in Excel, Word or PowerPoint.
                </p>
                <a
                  href={blobUrl}
                  download={fileName || "document"}
                  className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1a3a32] text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-800 transition-colors"
                >
                  <Download size={14} /> Download file
                </a>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default FilePreviewModal;