import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Mail, Briefcase, Award } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ChatModal from "../../components/ChatModal";

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
    <div className="p-6 max-w-3xl mx-auto">
      <Link
        to="/student/counselors"
        className="inline-flex items-center gap-1 text-sm text-maroon-600 hover:text-maroon-700 mb-4"
      >
        <ArrowLeft size={16} /> Back to Counselors
      </Link>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !user ? (
        <p className="text-sm text-gray-500">Counselor not found.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-maroon-600 text-white flex items-center justify-center text-2xl font-semibold">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-600 capitalize">{user.role?.replace("_", " ")}</p>
            </div>
            <button
              onClick={() => setChatOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-maroon-600 text-white hover:bg-maroon-700"
            >
              <MessageCircle size={16} /> Send Message
            </button>
          </div>

          <dl className="divide-y divide-gray-100">
            {user.department && (
              <Row icon={<Briefcase size={16} />} label="Department" value={user.department} />
            )}
            {user.specialization && (
              <Row icon={<Award size={16} />} label="Specialization" value={user.specialization} />
            )}
            {user.email && <Row icon={<Mail size={16} />} label="Email" value={user.email} />}
          </dl>

          {user.bio && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-1">About</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{user.bio}</p>
            </div>
          )}
        </div>
      )}

      {chatOpen && user && <ChatModal recipientUser={user} onClose={() => setChatOpen(false)} />}
    </div>
  );
}

function Row({ icon, label, value }) {
  return (
    <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
      <dt className="text-sm font-medium text-gray-600 inline-flex items-center gap-2">
        {icon}
        {label}
      </dt>
      <dd className="sm:col-span-2 text-sm text-gray-900">{value}</dd>
    </div>
  );
}
