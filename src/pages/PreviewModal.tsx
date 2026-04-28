import { X, Loader2, AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { revokeBlobUrl, streamFile } from "../store/slices/streamSlice";

interface PreviewModalProps {
  url: string | undefined; // Allowed undefined to match parent state
  fileName: string;
  onClose: () => void;
}

const FilePreviewModal = ({ url, fileName, onClose }: PreviewModalProps) => {
  const dispatch = useAppDispatch();
  const { blobUrl, loading, error } = useAppSelector((state) => state.streamFile);

  // ✅ Defensive check: Calculate extension only if URL exists to avoid .split() error
  const safeUrl = url || "";
  const fileExt = safeUrl ? safeUrl.split(/[#?]/)[0].split(".").pop()?.toLowerCase() : "";
  
  const isImage = ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(fileExt || "");
  const isPDF = fileExt === "pdf";

  useEffect(() => {
    // ✅ Only attempt to stream if the URL is valid
    if (url) {
      dispatch(streamFile(url));
    }

    // Cleanup: revoke blob URL from memory when modal unmounts
    return () => {
      dispatch(revokeBlobUrl());
    };
  }, [url, dispatch]);

  const handleClose = () => {
    dispatch(revokeBlobUrl()); // Free memory immediately on close
    onClose();
  };

  // ✅ Prevent rendering if URL is missing
  if (!url) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-10">
      <div className="bg-white w-full h-full max-w-6xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="text-[11px] font-black text-[#1a3a32] uppercase tracking-widest truncate max-w-md">
            {fileName || "File Preview"}
          </h3>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-rose-100 hover:text-rose-500 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewer */}
        <div className="flex-1 bg-slate-100 overflow-hidden flex items-center justify-center">

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                Loading preview...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex flex-col items-center gap-3">
              <AlertCircle size={32} className="text-rose-400" />
              <p className="text-xs font-semibold text-slate-500">
                Failed to load preview.
              </p>
            </div>
          )}

          {/* Success State - File Rendering */}
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
              <div className="flex flex-col items-center justify-center h-full gap-2 p-12 text-center">
                <p className="text-sm font-semibold text-slate-600">
                  This file type cannot be previewed in the browser.
                </p>
                <p className="text-xs text-slate-400">
                  Supported previews: images and PDFs.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;