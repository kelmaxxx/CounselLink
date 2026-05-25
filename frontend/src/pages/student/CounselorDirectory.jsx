import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { MessageCircle, User2, Search } from "lucide-react";
import ChatModal from "../../components/ChatModal";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  BTN,
  INPUT,
  initialsOf,
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition flex flex-col"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {initialsOf(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-500 truncate">{c.department || "Counseling"}</p>
                  {c.specialization && (
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                      {c.specialization}
                    </p>
                  )}
                </div>
              </div>
              {c.bio && (
                <p className="text-xs text-gray-600 line-clamp-3 mb-3 leading-relaxed flex-1">
                  {c.bio}
                </p>
              )}
              <div className="flex gap-1.5 mt-auto">
                <Link
                  to={`/student/counselors/${c.id}`}
                  className={`${BTN.secondary} flex-1 h-8 text-xs`}
                >
                  <User2 size={13} /> Profile
                </Link>
                <button
                  onClick={() => setChatWith(c)}
                  className={`${BTN.primary} flex-1 h-8 text-xs`}
                >
                  <MessageCircle size={13} /> Message
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
