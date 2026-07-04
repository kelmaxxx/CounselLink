import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MessageCircle,
  Mail,
  Phone,
  Hash,
  Briefcase,
  Award,
  User,
  Users,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import ChatModal from "../../components/ChatModal";
import { CounselorRatingBadge } from "../../components/RatingStars";
import { PageHeader, SectionCard, StatCard, BTN, initialsOf } from "../../components/ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function CounselorPublicProfile() {
  const { id } = useParams();
  const { token, lookupUser } = useAuth();
  const { appointments, fetchAppointments } = useAppointments();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [stats, setStats] = useState({ studentsCount: 0, sessionsCount: 0 });

  useEffect(() => {
    fetchAppointments?.().catch(() => undefined);
  }, [fetchAppointments]);

  useEffect(() => {
    if (!id || !token) return;
    fetch(`${API_BASE}/api/users/${id}/counselor-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((body) => setStats({ studentsCount: body.studentsCount || 0, sessionsCount: body.sessionsCount || 0 }))
      .catch(() => undefined);
  }, [id, token]);

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
            subtitle={user.specialization || user.position || "Counselor"}
            actions={
              <button onClick={() => setChatOpen(true)} className={BTN.primary}>
                <MessageCircle size={15} /> Send message
              </button>
            }
          />

          {/* Hero card */}
          <div className="relative bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-5 mb-4">
            <div className="absolute top-4 right-5">
              <CounselorRatingBadge counselorId={user.id} size={16} />
            </div>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-lg font-semibold flex-shrink-0">
                {initialsOf(user.name) || <User size={24} />}
              </div>
              <div className="flex-1 min-w-0 pr-24">
                <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{user.role?.replace("_", " ")}</p>
                <dl className="mt-3 space-y-2 text-sm">
                  {user.email && <Row icon={Mail} label="Email" value={user.email} />}
                  {user.phone && <Row icon={Phone} label="Contact number" value={user.phone} />}
                  {user.position && <Row icon={Briefcase} label="Position" value={user.position} />}
                  {user.specialization && (
                    <Row icon={Award} label="Specialization" value={user.specialization} />
                  )}
                  {user.employeeId && (
                    <Row icon={Hash} label="Employee number" value={user.employeeId} />
                  )}
                </dl>
              </div>
            </div>
          </div>

          {/* Counseling activity */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard
              label="Students counseled"
              value={stats.studentsCount}
              hint="Distinct students entertained"
              icon={Users}
              accent="bg-blue-500"
            />
            <StatCard
              label="Sessions conducted"
              value={stats.sessionsCount}
              hint="Completed appointments"
              icon={CheckCircle2}
              accent="bg-emerald-500"
            />
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
