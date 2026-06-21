import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// Renders 5 stars for a given average. No data yet (average null/undefined)
// defaults to a full 5 stars rather than an empty/low bar.
export function RatingStars({ average, count = 0, size = 14, showLabel = true, className = "" }) {
  const display = average ?? 5;
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5 text-amber-500 flex-shrink-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={size}
            fill={i < Math.round(display) ? "currentColor" : "none"}
            stroke="currentColor"
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {count > 0 ? `${display.toFixed(1)} (${count})` : "No ratings yet"}
        </span>
      )}
    </div>
  );
}

// Fetches and renders a counselor's aggregate Client Feedback Form rating.
// Aggregate-only — never tied to an individual student's submission.
export function CounselorRatingBadge({ counselorId, size = 14, showLabel = true, className = "" }) {
  const { token } = useAuth();
  const [rating, setRating] = useState({ average: null, count: 0 });

  useEffect(() => {
    if (!counselorId || !token) return;
    let mounted = true;
    fetch(`${API_BASE}/api/client-feedback/rating?counselorId=${counselorId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json().then((body) => ({ res, body })))
      .then(({ res, body }) => {
        if (mounted && res.ok) setRating({ average: body.average, count: body.count || 0 });
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [counselorId, token]);

  return (
    <RatingStars
      average={rating.average}
      count={rating.count}
      size={size}
      showLabel={showLabel}
      className={className}
    />
  );
}
