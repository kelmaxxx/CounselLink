import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Trash2, X } from "lucide-react";

// Canvas-based signature pad — mouse on desktop, touch on mobile.
// Calls onSave(blob) when the user confirms; onClose to dismiss.
export default function SignaturePad({ onSave, onClose, busy = false }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const [empty, setEmpty] = useState(true);

  // Scale canvas buffer to device pixel ratio for crisp rendering on HiDPI screens
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.getContext("2d").scale(dpr, dpr);
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const beginStroke = useCallback((e) => {
    const pos = getPos(e);
    isDrawing.current = true;
    lastPos.current = pos;
    setEmpty(false);
    // Draw a dot so taps without dragging still produce a mark
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "#111827";
    ctx.fill();
  }, []);

  const continueStroke = useCallback((e) => {
    if (!isDrawing.current || !lastPos.current) return;
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  }, []);

  const endStroke = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  // Touch events must be registered imperatively with passive:false so we can
  // call preventDefault() and suppress page scroll while signing.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onTouchStart = (e) => { e.preventDefault(); beginStroke(e); };
    const onTouchMove = (e) => { e.preventDefault(); continueStroke(e); };
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", endStroke);
    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", endStroke);
    };
  }, [beginStroke, continueStroke, endStroke]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.getContext("2d").clearRect(0, 0, width, height);
    setEmpty(true);
  };

  const handleSave = () => {
    if (empty) return;
    canvasRef.current.toBlob((blob) => { if (blob) onSave(blob); }, "image/png");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h2 className="font-semibold text-gray-900 text-base">Draw your signature</h2>
          <button type="button" onClick={onClose} disabled={busy} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-400 px-5 pb-3">
          Sign with your mouse or finger in the box below.
        </p>
        <div className="px-5">
          <canvas
            ref={canvasRef}
            className="w-full h-44 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 cursor-crosshair block"
            onMouseDown={beginStroke}
            onMouseMove={continueStroke}
            onMouseUp={endStroke}
            onMouseLeave={endStroke}
          />
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <button
            type="button"
            onClick={handleClear}
            disabled={empty || busy}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={14} /> Clear
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={empty || busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-maroon-600 text-white hover:bg-maroon-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check size={14} /> {busy ? "Saving…" : "Save signature"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
