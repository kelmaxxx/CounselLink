// Renders a formal request letter exactly as filed/printed, reusing the same
// HTML builder used for PDF download. Mirrors ReportPreview's scaled iframe.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildRequestLetterHTML, resolveSignatureDataUrl } from "../../utils/requestLetter";

export default function LetterPreview({ letter, height = 620 }) {
  const [repSig, setRepSig] = useState(null);
  const [counSig, setCounSig] = useState(null);
  const [scale, setScale] = useState(1);
  // Grow the iframe to the letter's real height so the preview never gets its
  // own scrollbar inside the modal's scroll area.
  const [contentHeight, setContentHeight] = useState(
    typeof height === "number" ? height : 0
  );
  const containerRef = useRef(null);

  // Signatures resolve async; the preview mounts fresh per letter (callers render
  // it conditionally), so no reset is needed when the URLs change.
  useEffect(() => {
    let cancelled = false;
    if (letter?.repSignatureUrl) {
      resolveSignatureDataUrl(letter.repSignatureUrl).then((u) => {
        if (!cancelled) setRepSig(u);
      });
    }
    if (letter?.counselorSignatureUrl) {
      resolveSignatureDataUrl(letter.counselorSignatureUrl).then((u) => {
        if (!cancelled) setCounSig(u);
      });
    }
    return () => { cancelled = true; };
  }, [letter?.repSignatureUrl, letter?.counselorSignatureUrl]);

  useEffect(() => {
    const PAPER_PX = 816;
    const update = () => {
      if (containerRef.current) {
        const available = containerRef.current.clientWidth - 24;
        setScale(available < PAPER_PX ? available / PAPER_PX : 1);
      }
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);
    return () => ro?.disconnect();
  }, []);

  const html = useMemo(
    () => buildRequestLetterHTML(letter || {}, { repSignatureImageUrl: repSig, counselorSignatureImageUrl: counSig }),
    [letter, repSig, counSig]
  );

  const frameHeight = typeof height === "number" ? Math.max(height, contentHeight) : height;

  return (
    <div ref={containerRef} className="bg-gray-100 p-3 sm:p-6 rounded-xl flex justify-center min-h-[300px]">
      <div
        className="bg-white rounded-md shadow-md overflow-hidden origin-top-left"
        style={{
          width: "8.5in",
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: "top left",
          marginBottom: scale < 1 ? `${-(frameHeight * (1 - scale))}px` : undefined,
        }}
      >
        <iframe
          title={letter?.subject || "Request letter preview"}
          srcDoc={html}
          sandbox="allow-same-origin"
          scrolling="no"
          onLoad={(e) => {
            const doc = e.currentTarget.contentDocument;
            const measured = doc
              ? Math.max(doc.body?.scrollHeight || 0, doc.documentElement?.scrollHeight || 0)
              : 0;
            if (measured) setContentHeight(measured);
          }}
          className="w-full border-0 bg-white"
          style={{ height: typeof frameHeight === "number" ? `${frameHeight}px` : frameHeight }}
        />
      </div>
    </div>
  );
}
