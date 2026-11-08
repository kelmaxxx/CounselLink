// Shared sidebar / mobile-tab navigation config, resolved per role.
// Icons live here so the desktop sidebar and the phone tab bar stay in sync.
import {
  Calendar, Users, FileText, User, ClipboardList, BarChart3,
  Settings, BookOpen, AlertCircle, UserCheck, Shield, MessageCircle,
  FileSignature, ArrowRightLeft,
} from "lucide-react";

const PROFILE_BASE_BY_ROLE = {
  student: "/student",
  counselor: "/counselor",
  college_rep: "/rep",
  admin: "/admin",
};

const formatRole = (role) => (role === "representative" ? "college_rep" : role);

export function getRoleBase(role) {
  return PROFILE_BASE_BY_ROLE[formatRole(role)] || "/student";
}

// `short` is used by the phone tab bar, where labels must fit under an icon.
export function getNavGroups(role) {
  const base = getRoleBase(role);
  const messagesItem = { id: "messages", label: "Messages", short: "Messages", icon: MessageCircle, path: "/messages" };
  const profileItem = { id: "profile", label: "My Profile", short: "Profile", icon: User, path: `${base}/profile` };
  const account = [messagesItem, profileItem];

  switch (formatRole(role)) {
    case "student":
      return [
        {
          label: "Workspace",
          items: [
            { id: "dashboard", label: "Dashboard", short: "Home", icon: BarChart3, path: "/" },
            { id: "request-appointment", label: "Request Appointment", short: "Request", icon: Calendar, path: "/student/request-appointment" },
            { id: "my-appointments", label: "My Appointments", short: "Appointments", icon: Calendar, path: "/student/appointments" },
            { id: "consent", label: "My Records", short: "Records", icon: FileSignature, path: "/student/consent" },
          ],
        },
        {
          label: "Account",
          items: [
            { id: "counselor-directory", label: "Counselors", short: "Counselors", icon: Users, path: "/student/counselors" },
            profileItem,
            messagesItem,
          ],
        },
      ];
    case "counselor":
      return [
        {
          label: "Workspace",
          items: [
            { id: "dashboard", label: "Dashboard", short: "Home", icon: BarChart3, path: "/" },
            { id: "manage-students", label: "Student Records", short: "Students", icon: Users, path: "/students" },
            { id: "appointments", label: "Appointments", short: "Appointments", icon: Calendar, path: "/counselor/appointments" },
            { id: "referrals", label: "Referrals", short: "Referrals", icon: ArrowRightLeft, path: "/counselor/referrals" },
            { id: "generate-reports", label: "Reports", short: "Reports", icon: FileText, path: "/counselor/reports" },
          ],
        },
        { label: "Account", items: account },
      ];
    case "college_rep":
      return [
        {
          label: "Workspace",
          items: [
            { id: "dashboard", label: "Dashboard", short: "Home", icon: BarChart3, path: "/" },
            { id: "counseling-data", label: "Counseling Data", short: "Data", icon: BookOpen, path: "/rep/counseling-data" },
            { id: "rep-referrals", label: "Referrals", short: "Referrals", icon: ArrowRightLeft, path: "/rep/referrals" },
            { id: "request-report", label: "Request Report", short: "Report", icon: ClipboardList, path: "/rep/request-report" },
          ],
        },
        { label: "Account", items: account },
      ];
    case "admin":
      return [
        {
          label: "Administration",
          items: [
            { id: "dashboard", label: "Dashboard", short: "Home", icon: BarChart3, path: "/" },
            { id: "pending-registrations", label: "Pending Registrations", short: "Pending", icon: UserCheck, path: "/admin/pending-registrations" },
            { id: "manage-users", label: "Manage Users", short: "Users", icon: Settings, path: "/admin/manage-users" },
            { id: "announcements", label: "Announcements", short: "Announce", icon: AlertCircle, path: "/admin/announcements" },
            { id: "system-logs", label: "System Logs", short: "Logs", icon: Shield, path: "/admin/system-logs" },
          ],
        },
        { label: "Account", items: account },
      ];
    default:
      return [];
  }
}

const MOBILE_NAV_IDS = {
  student: ["dashboard", "my-appointments", "request-appointment", "messages"],
  counselor: ["dashboard", "appointments", "manage-students", "messages"],
  college_rep: ["dashboard", "rep-referrals", "request-report", "messages"],
  admin: ["dashboard", "pending-registrations", "manage-users", "messages"],
};

// Resolves the four shortcut ids to full nav items for the phone tab bar.
export function getMobileNavItems(role) {
  const byId = new Map(
    getNavGroups(role).flatMap((group) => group.items).map((item) => [item.id, item])
  );
  return (MOBILE_NAV_IDS[formatRole(role)] || []).map((id) => byId.get(id)).filter(Boolean);
}
