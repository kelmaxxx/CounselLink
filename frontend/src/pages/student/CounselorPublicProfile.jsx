import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Mail, Briefcase, Award, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ChatModal from "../../components/ChatModal";
import { PageHeader, SectionCard, BTN, initialsOf } from "../../components/ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function CounselorPublicProfile() {
  const { id } = useParams();
  const { token, lookupUser } = useAuth();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!id || !token) return;
    setLoading(true);
    setError("");
    (async () => {
      try {
        if (lookupUser) {
          const u = await lookupUser(Number(id));
          if (u) {
            setUser(u);
            return;
          }
        }
        const res = await fetch(`${API_BASE}/api/users/lookup/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || "Counselor not found");
        setUser(body);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token, lookupUser]);

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      <Link
        to="/student/counselors"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4 transition"
      >
        <ArrowLeft size={14} /> Back to counselors
      </Link>

      {loading ? (
        <SectionCard noBodyPadding>
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        </SectionCard>
      ) : error ? (
        <div className="px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      ) : !user ? (
        <SectionCard>
          <p className="text-sm text-gray-500 text-center py-4">Counselor not found.</p>
        </SectionCard>
      ) : (
        <>
          <PageHeader
            eyebrow="Counselor profile"
            title={user.name}
            subtitle={`${user.department || "Counselor"}${user.specialization ? ` · ${user.specialization}` : ""}`}
            actions={
              <button onClick={() => setChatOpen(true)} className={BTN.primary}>
                <MessageCircle size={15} /> Send message
              </button>
            }
          />

          {/* Hero card */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-lg font-semibold flex-shrink-0">
                {initialsOf(user.name) || <User size={24} />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{user.role?.replace("_", " ")}</p>
                <dl className="mt-3 space-y-2 text-sm">
                  {user.department && (
                    <Row icon={Briefcase} label="Department" value={user.department} />
                  )}
                  {user.specialization && (
                    <Row icon={Award} label="Specialization" value={user.specialization} />
                  )}
                  {user.email && <Row icon={Mail} label="Email" value={user.email} />}
                </dl>
              </div>
            </div>
          </div>

          {user.bio && (
            <SectionCard title="About" subtitle="Approach and background">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {user.bio}
              </p>
            </SectionCard>
          )}
        </>
      )}

      {chatOpen && user && <ChatModal recipientUser={user} onClose={() => setChatOpen(false)} />}
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-baseline">
      <dt className="text-xs font-medium text-gray-500 inline-flex items-center gap-1.5 uppercase tracking-wider">
        {Icon && <Icon size={11} className="text-gray-400" />}
        {label}
      </dt>
      <dd className="sm:col-span-3 text-sm text-gray-900">{value}</dd>
    </div>
  );
}
