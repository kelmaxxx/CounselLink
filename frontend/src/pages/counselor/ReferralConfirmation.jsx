import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { CheckCircle2, ArrowLeft } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function ReferralConfirmation() {
  const { id } = useParams();
  const { token } = useAuth();
  const [referral, setReferral] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    fetch(`${API_BASE}/api/referrals/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json().then((body) => ({ res, body })))
      .then(({ res, body }) => {
        if (!res.ok) {
          setError(body.message || "Unable to load referral");
        } else {
          setReferral(body);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link
        to="/counselor/referrals"
        className="inline-flex items-center gap-1 text-sm text-maroon-600 hover:text-maroon-700 mb-4"
      >
        <ArrowLeft size={16} /> Back to Referrals
      </Link>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 shadow p-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !referral ? (
          <p className="text-sm text-gray-500">Referral not found.</p>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 text-green-700 p-2 rounded-full">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Referral Confirmed</h2>
                <p className="text-sm text-gray-600">
                  You have accepted this referral and a scheduled appointment was created.
                  {" "}
                  {referral.referrerName} has been notified.
                </p>
              </div>
            </div>

            <dl className="divide-y divide-gray-100">
              <Row label="Student" value={`${referral.studentName} ${referral.studentCollege ? `· ${referral.studentCollege}` : ""}`} />
              <Row label="Referred by" value={referral.referrerName} />
              <Row label="Reason" value={referral.reason} />
              {referral.notes && <Row label="Notes" value={referral.notes} />}
              <Row label="Status" value={<span className="text-green-700 font-semibold">{referral.status}</span>} />
              {referral.decision_note && <Row label="Decision note" value={referral.decision_note} />}
              <Row label="Decided at" value={referral.decided_at ? new Date(referral.decided_at).toLocaleString() : "—"} />
            </dl>

            <p className="text-xs text-gray-500 mt-4">
              This page acts as the formal confirmation slip. Print this for your records or share the
              decision note with the referring College.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
      <dt className="text-sm font-medium text-gray-600">{label}</dt>
      <dd className="sm:col-span-2 text-sm text-gray-900 whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
