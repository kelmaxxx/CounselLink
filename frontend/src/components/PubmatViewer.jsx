import React, { useEffect, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, ImageOff } from "lucide-react";

// Small inline image with the same "missing file" fallback used everywhere a
// pubmat is shown, so a wiped upload can never render as a broken icon.
export function PubmatThumb({ src, alt = "Announcement poster", className = "" }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src) return null;
  if (failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 bg-gray-50 text-gray-400 ${className}`}>
        <ImageOff size={20} />
        <span className="text-xs font-medium">Image unavailable</span>
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

export default function PubmatViewer({ src, alt = "Announcement poster", className = "" }) {
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const zoomIn = () => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
  const resetZoom = () => setZoom(1);

  if (!src) return null;

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 min-h-[220px] rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-500 p-6 text-center ${className}`}
        role="img"
        aria-label={`${alt} unavailable`}
      >
        <ImageOff size={28} />
        <p className="text-sm font-medium text-gray-700">Pubmat image unavailable</p>
        <p className="text-xs max-w-xs">
          The image file could not be loaded. It may have been removed from the server, or
          the link is invalid. The announcement text below is still available.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl border border-gray-200 bg-gray-950/90 overflow-hidden select-none ${className}`}>
      {/* Zoom Toolbar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-white shadow-lg">
        <span className="text-xs font-mono font-medium text-gray-300 mr-1 tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={zoomOut}
          disabled={zoom <= 0.5}
          className="p-1 rounded hover:bg-white/20 active:bg-white/30 disabled:opacity-40 disabled:hover:bg-transparent transition text-white"
          title="Zoom out"
        >
          <ZoomOut size={15} />
        </button>
        <button
          type="button"
          onClick={zoomIn}
          disabled={zoom >= 3}
          className="p-1 rounded hover:bg-white/20 active:bg-white/30 disabled:opacity-40 disabled:hover:bg-transparent transition text-white"
          title="Zoom in"
        >
          <ZoomIn size={15} />
        </button>
        <button
          type="button"
          onClick={resetZoom}
          className="p-1 rounded hover:bg-white/20 active:bg-white/30 transition text-white"
          title="Reset zoom"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Image Scroll Viewport */}
      <div className="w-full max-h-[65vh] min-h-[220px] overflow-auto flex items-start justify-center p-2 custom-scrollbar">
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease-out",
          }}
          className="max-w-full h-auto object-contain block mx-auto rounded shadow-md"
        />
      </div>
    </div>
  );
}
