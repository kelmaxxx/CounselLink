import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { MessageCircle, User2, Search } from "lucide-react";
import ChatModal from "../../components/ChatModal";
import Avatar from "../../components/Avatar";
import { CounselorRatingRibbon } from "../../components/RatingStars";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  BTN,
  INPUT,
} from "../../components/ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function CounselorDirectory() {
  const { token } = useAuth();
  const [counselors, setCounselors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatWith, setChatWith] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_BASE}/api/users?role=counselor`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json().then((body) => ({ res, body })))
      .then(({ res, body }) => {
        if (!res.ok) {
          setError(body.message || "Unable to load counselors");
          return;
        }
        setCounselors(Array.isArray(body) ? body : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    if (!query.trim()) return counselors;
    const q = query.toLowerCase();
    return counselors.filter((c) =>
      [c.name, c.department, c.specialization, c.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [counselors, query]);

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Student"
        title="Counselor directory"
        subtitle="Browse counselors. Open a profile or send a quick message."
      />

      <div className="mb-4 relative max-w-md">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          className={`${INPUT} pl-8`}
          placeholder="Search by name, department, specialization…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <SectionCard noBodyPadding>
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        </SectionCard>
      ) : filtered.length === 0 ? (
        <SectionCard noBodyPadding>
          <EmptyState
            icon={User2}
            title={query ? "No counselors match your search" : "No counselors available"}
            hint={query ? "Try a different name or specialization." : undefined}
          />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="relative flex flex-col items-center text-center bg-white rounded-2xl shadow-sm ring-1 ring-gray-950/5 pt-12 px-5 pb-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Rating ribbon / bookmark hanging from the top-left */}
              <CounselorRatingRibbon
                counselorId={c.id}
                className="absolute top-0 left-5"
              />

              {/* Avatar — shows the uploaded photo, falls back to initials.
                  theme="student" is used only for its maroon fallback palette
                  so the card stays cohesive when a counselor has no photo. */}
              <Avatar
                name={c.name}
                url={c.avatarUrl}
                size="2xl"
                theme="student"
                ringClassName="ring-4 ring-maroon-50"
              />

              {/* Name + role */}
              <p className="mt-4 text-base font-semibold text-gray-900 truncate max-w-full">
                {c.name}
              </p>
              <p className="mt-1 text-xs text-gray-500 truncate max-w-full">
                {c.position || c.department || "Counselor"}
              </p>

              {/* Specialization pill */}
              {(c.specialization || c.department) && (
                <span className="mt-4 inline-flex items-center max-w-full truncate px-3 py-1 rounded-full bg-maroon-50 text-maroon-700 text-[11px] font-semibold uppercase tracking-wide">
                  {c.specialization || c.department}
                </span>
              )}

              {/* Actions */}
              <div className="mt-auto pt-5 border-t border-gray-100 w-full flex gap-2">
                <Link
                  to={`/student/counselors/${c.id}`}
                  className={`${BTN.secondary} flex-1 h-9 text-xs px-3`}
                >
                  <User2 size={14} /> Profile
                </Link>
                <button
                  onClick={() => setChatWith(c)}
                  className={`${BTN.primary} flex-1 h-9 text-xs px-3`}
                >
                  <MessageCircle size={14} /> Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {chatWith && <ChatModal recipientUser={chatWith} onClose={() => setChatWith(null)} />}
    </div>
  );
}
