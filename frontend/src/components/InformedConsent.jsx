// src/components/InformedConsent.jsx
// Shared informed-consent text + e-sign form, used by the appointment and
// psychological test request wizards.
import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useStudentRecords } from "../context/StudentRecordsContext";
import { BTN, INPUT, LABEL } from "./ui";

const CONSENT_SCOPE_DEFAULT =
  "Counseling services + records handling under MSU DSA Guidance and Counseling Section, RA 10173 (Data Privacy Act of 2012)";

const formatDateTime = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

export default function InformedConsentSection({ currentUser, onConsentChange }) {
  const { getConsent, eSignConsent, setReferralSharingConsent } = useStudentRecords?.() || {};
  const studentId = currentUser?.id;

  const [consent, setConsent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [typedName, setTypedName] = useState(currentUser?.name || "");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [sharingBusy, setSharingBusy] = useState(false);
  const [sharingFeedback, setSharingFeedback] = useState(null);

  useEffect(() => {
    if (!studentId || !getConsent) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    getConsent(studentId)
      .then((data) => {
        if (!mounted) return;
        setConsent(data);
        if (data?.eConsentSignedAt && !data?.revokedAt) onConsentChange?.(true);
      })
      .catch(() => {
        if (mounted) {
          setFeedback({
            type: "error",
            text: "Couldn't reach the server to check your consent status. Please check your connection and try again.",
          });
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const status = !consent
    ? "unsigned"
    : consent.revokedAt
    ? "revoked"
    : consent.eConsentSignedAt
    ? "signed"
    : consent.scanUrl
    ? "paper-on-file"
    : "unsigned";

  const onFile = status === "signed" || status === "paper-on-file";

  const handleSign = async () => {
    if (!agreed) {
      setFeedback({ type: "error", text: "Please tick the agreement box to continue." });
      return;
    }
    if (!typedName.trim()) {
      setFeedback({ type: "error", text: "Please type your full name as your signature." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await eSignConsent(studentId, {
        typedName: typedName.trim(),
        scope: CONSENT_SCOPE_DEFAULT,
      });
      if (res?.success) {
        setConsent(res.consent);
        setFeedback({ type: "success", text: "Consent recorded. Thank you." });
        onConsentChange?.(true);
      } else {
        setFeedback({ type: "error", text: res?.message || "Failed to record consent." });
      }
    } catch {
      setFeedback({
        type: "error",
        text: "Couldn't reach the server to record your consent. Please check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleReferralSharingChoice = async (allow) => {
    setSharingBusy(true);
    setSharingFeedback(null);
    try {
      const res = await setReferralSharingConsent(studentId, allow);
      if (res?.success) {
        setConsent(res.consent);
        setSharingFeedback({ type: "success", text: "Your choice has been saved." });
      } else {
        setSharingFeedback({ type: "error", text: res?.message || "Failed to save your choice." });
      }
    } catch {
      setSharingFeedback({
        type: "error",
        text: "Couldn't reach the server to save your choice. Please check your connection and try again.",
      });
    } finally {
      setSharingBusy(false);
    }
  };

  return (
    <>
      <div className="bg-maroon-50 border border-maroon-200 rounded-lg p-5 max-h-96 overflow-y-auto">
        <div className="space-y-4 text-sm text-maroon-900 leading-relaxed">
          <p>
            Counseling is a confidential process designed to help you address your concerns, come
            to a greater understanding of yourself, and learn effective personal and interpersonal
            coping strategies. It involves a relationship between you and a trained counselor who
            has the desire and willingness to help you accomplish your individual goals. Counseling
            involves sharing sensitive, personal, and private information that may at times be
            distressing. During the course of counseling, there may be periods of increased anxiety
            or confusion. The outcome of counseling is often positive; however, the level of
            satisfaction for any individual is not predictable. Your counselor is available to
            support you throughout the counseling process.
          </p>
          <div>
            <p className="font-semibold mb-1">Confidentiality</p>
            <p>
              All interactions with Counseling Services, including scheduling of or attendance at
              appointments, consent of your sessions, progress in counseling, and your records are
              confidential. No record of counseling is contained in any academic, educational, or
              job placement file. You may request in writing to release specific information about
              your counseling to persons you designate.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">Exceptions to confidentiality</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                The counseling staff works as a team. Your counselor may consult with other
                counseling staff to provide the best possible care. These consultations are for
                professional and training purposes.
              </li>
              <li>
                If there is evidence of clear and imminent danger of harm to self and/or others, a
                counselor is legally required to report this information to the authorities
                responsible for ensuring safety.
              </li>
              <li>
                Philippine law requires that staff of Counseling Services who learn of, or strongly
                suspect, physical or sexual abuse or neglect of any person under 18 years of age
                must report this information to county child protection services.
              </li>
              <li>
                A court order, issued by a judge, may require the Counseling Services staff to
                release information contained in records and / or require a counselor to testify in
                a court hearing.
              </li>
            </ul>
            <p className="mt-2">
              There is no fee for counseling services. If you are referred off campus to health,
              mental health, or substance abuse professionals, you are responsible for their
              charges.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">Acknowledgment</p>
            <p>
              I acknowledge having been informed of my rights and responsibilities as a student
              receiving counseling services at Division of Student Affairs, Guidance and Counseling
              Section, Mindanao State University, Marawi City. I understand the risks and benefits
              of guidance and counseling services, the nature, and the limits of confidentiality. By
              signing below, I agree to the terms and conditions of counseling.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Checking your consent status…</p>
      ) : onFile ? (
        <>
          <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm">
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Consent on file</p>
              {status === "signed" ? (
                <p className="mt-0.5">
                  Signed by {consent.eConsentTypedName} on {formatDateTime(consent.eConsentSignedAt)}.
                </p>
              ) : (
                <p className="mt-0.5">A signed paper consent is on file with your counselor.</p>
              )}
            </div>
          </div>

          <div className="mt-3 px-4 py-3.5 rounded-xl border border-gray-200 bg-white">
            <p className="text-sm font-medium text-gray-900">Sharing with a college representative</p>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              If a college representative refers you for counseling and later requests that
              session's report, do you allow us to share it with them? This only applies to a
              session that came from their referral — it does not affect any other counseling
              record. You can change your answer anytime.
            </p>

            {sharingFeedback && (
              <div
                className={`mt-2 px-3 py-2 rounded-md border text-sm ${
                  sharingFeedback.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                {sharingFeedback.text}
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleReferralSharingChoice(true)}
                disabled={sharingBusy}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition disabled:opacity-50 ${
                  consent?.referralSharingConsent === "yes"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Yes, allow it
              </button>
              <button
                type="button"
                onClick={() => handleReferralSharingChoice(false)}
                disabled={sharingBusy}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition disabled:opacity-50 ${
                  consent?.referralSharingConsent === "no"
                    ? "bg-maroon-600 border-maroon-600 text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                No, don&apos;t share
              </button>
              {!consent?.referralSharingConsent && (
                <span className="text-xs text-gray-400">Not yet decided</span>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 space-y-3">
          {status === "revoked" && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <p>
                Your prior consent was revoked on {formatDateTime(consent.revokedAt)}. Please sign
                again to continue.
              </p>
            </div>
          )}
          {feedback && (
            <div
              className={`px-3 py-2 rounded-md border text-sm ${
                feedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {feedback.text}
            </div>
          )}
          <label
            className={`flex items-start gap-3 cursor-pointer rounded-xl border p-3.5 transition ${
              agreed ? "bg-maroon-50 border-maroon-300" : "bg-white border-gray-200 hover:bg-gray-50"
            }`}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-maroon-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              I have read and understood the informed consent above. I voluntarily agree to the
              terms and conditions of counseling at MSU DSA Guidance and Counseling Section.
            </span>
          </label>

          <div>
            <label className={LABEL}>Type your full name as your signature</label>
            <input
              type="text"
              className={INPUT}
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Full legal name"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button type="button" onClick={handleSign} disabled={busy} className={BTN.primary}>
              {busy ? "Recording…" : "I agree — record my consent"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
