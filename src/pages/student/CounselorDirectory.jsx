import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Users, MessageCircle, User2 } from "lucide-react";
import ChatModal from "../../components/ChatModal";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function CounselorDirectory() {
  const { token } = useAuth();
  const [counselors, setCounselors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatWith, setChatWith] = useState(null);

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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Users className="text-maroon-600" size={24} /> Counselor Directory
        </h2>
        <p className="text-sm text-gray-600">
          Browse counselors. Open a profile to learn more, or send a quick message.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {counselors.map((c) => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl shadow p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-maroon-600 text-white flex items-center justify-center font-semibold">
                {c.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-500 truncate">{c.department || "Counseling"}</p>
                {c.specialization && (
                  <p className="text-xs text-gray-500 truncate">{c.specialization}</p>
                )}
              </div>
            </div>
            {c.bio && <p className="text-sm text-gray-700 line-clamp-3 mb-3">{c.bio}</p>}
            <div className="flex gap-2">
              <Link
                to={`/student/counselors/${c.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded border text-xs hover:bg-gray-50"
              >
                <User2 size={14} /> View Profile
              </Link>
              <button
                onClick={() => setChatWith(c)}
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-maroon-600 text-white text-xs hover:bg-maroon-700"
              >
                <MessageCircle size={14} /> Send Message
              </button>
            </div>
          </div>
        ))}
        {!loading && counselors.length === 0 && (
          <p className="text-sm text-gray-500 col-span-full text-center py-8">
            No counselors available.
          </p>
        )}
      </div>

      {chatWith && <ChatModal recipientUser={chatWith} onClose={() => setChatWith(null)} />}
    </div>
  );
}
