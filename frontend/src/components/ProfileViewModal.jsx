import React from "react";
import {
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  MessageCircle,
  Hash,
  Building2,
  Award,
  BookOpen,
  Calendar,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Modal, BTN } from "./ui";
import Avatar from "./Avatar";
import { CounselorRatingBadge } from "./RatingStars";

const ROLE_THEME = {
  student: "student",
  counselor: "counselor",
  college_rep: "rep",
  admin: "admin",
};

const ROLE_BANNER = {
  student: "from-maroon-700 to-maroon-600 border-maroon-800/30",
  counselor: "from-emerald-700 to-teal-600 border-emerald-800/30",
  college_rep: "from-blue-700 to-indigo-600 border-indigo-800/30",
  admin: "from-slate-800 to-zinc-700 border-slate-900/40",
};

const ROLE_LABEL = {
  student: "Student",
  counselor: "Counselor",
  admin: "Administrator",
  college_rep: "College Representative",
};

export default function ProfileViewModal({ user, onClose, onOpenChat }) {
  const { currentUser } = useAuth();
  if (!user) return null;

  const showChat = currentUser && currentUser.id !== user.id;
  const isStaff =
    user.role === "counselor" || user.role === "admin" || user.role === "college_rep";

  return (
    <Modal
      open
      onClose={onClose}
      title={user.name || "Profile"}
      subtitle={ROLE_LABEL[user.role] || user.role}
      size="xl"
      footer={
        showChat ? (
          <>
            <button type="button" onClick={onClose} className={BTN.secondary}>
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenChat?.(user);
              }}
              className={BTN.primary}
            >
              <MessageCircle size={14} /> Send message
            </button>
          </>
        ) : (
          <button type="button" onClick={onClose} className={BTN.secondary}>
            Close
          </button>
        )
      }
    >
      <div
        className={`-mx-5 -mt-4 mb-4 px-5 py-5 bg-gradient-to-r text-white border-b ${
          ROLE_BANNER[user.role] || ROLE_BANNER.student
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar
              name={user.name}
              url={user.avatarUrl}
              size="md"
              theme="light"
              ringClassName="ring-2 ring-white/30"
            />
            <div className="min-w-0">
              <h3 className="text-lg font-semibold truncate">{user.name || "—"}</h3>
              <p className="text-xs text-white/85">
                {user.role === "counselor" ? user.specialization || "" : ROLE_LABEL[user.role] || user.role}
                {user.college ? ` · ${user.college}` : ""}
              </p>
            </div>
          </div>
          {user.role === "counselor" && (
            <div className="flex items-center gap-0.5 text-amber-300 flex-shrink-0">
              <CounselorRatingBadge counselorId={user.id} size={15} showLabel={false} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section title="Contact information">
          <Row icon={Mail} label="Email" value={user.email} />
          <Row icon={Phone} label="Contact number" value={user.phone} />
        </Section>

        {user.role === "student" && (
          <Section title="Academic information">
            <Row icon={Hash} label="Student ID" value={user.studentId} />
            <Row icon={GraduationCap} label="College" value={user.college} />
            <Row icon={BookOpen} label="Program" value={user.program} />
            <Row icon={Calendar} label="Year level" value={user.yearLevel} />
          </Section>
        )}

        {isStaff && (
          <Section title="Professional information">
            <Row icon={Hash} label="Employee ID" value={user.employeeId} />
            {user.role === "counselor" && (
              <Row icon={Briefcase} label="Position" value={user.position} />
            )}
            {user.role === "college_rep" ? (
              <Row icon={GraduationCap} label="College" value={user.college} />
            ) : (
              <Row icon={Building2} label="Unit" value={user.department} />
            )}
            {user.role !== "counselor" && user.specialization && (
              <Row icon={Award} label="Specialization" value={user.specialization} />
            )}
            {!user.specialization && user.role !== "college_rep" && !user.department && (
              <Row icon={Briefcase} label="Role" value={ROLE_LABEL[user.role]} />
            )}
          </Section>
        )}
      </div>

      {user.bio && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-1.5">
            About
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{user.bio}</p>
        </div>
      )}
    </Modal>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-2">
        {title}
      </p>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      {Icon && <Icon size={14} className="text-maroon-600 mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <dt className="text-xs text-gray-500">{label}</dt>
        <dd className="text-sm font-medium text-gray-900 truncate">{value}</dd>
      </div>
    </div>
  );
}
