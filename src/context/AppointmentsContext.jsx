import React, { createContext, useContext, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

const AppointmentsContext = createContext();

// We'll use a callback pattern to avoid circular dependency
let notificationCallback = null;

export function setNotificationCallback(callback) {
  notificationCallback = callback;
}

export function AppointmentsProvider({ children }) {
  const { users = [], currentUser, token } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const [appointments, setAppointments] = useState([]);

  const counselors = useMemo(() => (users || []).filter(u => u.role === "counselor"), [users]);

  const autoAssignCounselorId = (student) => {
    // Try find counselor with matching college, else first available counselor
    const byCollege = counselors.find(c => c.college && c.college === student.college);
    return (byCollege || counselors[0] || {}).id || null;
  };

  const createAppointment = async ({ student, form }) => {
    const preferredSlots = Array.isArray(form.preferredSlots) ? form.preferredSlots : (form.timeSlot ? [form.timeSlot] : []);

    const response = await fetch(`${apiBase}/api/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        preferredDate: form.date,
        preferredSlots,
        isUrgent: form.isUrgent,
        phoneNumber: form.phoneNumber,
        reason: form.reason,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || "Failed to submit appointment" };
    }

    return { success: true, appointment: data };
  };

  const normalizeAppointment = (apt) => ({
    ...apt,
    preferredDate: apt.preferred_date || apt.preferredDate || null,
    preferredSlots:
      apt.preferred_slots?.split(",").filter(Boolean) ||
      apt.preferredSlots ||
      [],
    scheduledDate: apt.scheduled_date || apt.scheduledDate || null,
    scheduledTimeSlot: apt.scheduled_time || apt.scheduledTimeSlot || null,
    counselorName: apt.counselorName || apt.counselor_name || null,
    studentName: apt.studentName || apt.student_name || null,
    controlNo: apt.controlNo || `APT-${String(apt.id).padStart(6, "0")}`,
    note: apt.counselor_action_note || apt.note || null,
  });

  const updateAppointment = (id, updater) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updater } : a));
  };

  const fetchAppointments = async () => {
    const response = await fetch(`${apiBase}/api/appointments`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to load appointments");
    }
    const normalized = Array.isArray(data) ? data.map(normalizeAppointment) : [];
    setAppointments(normalized);
    return normalized;
  };

  const acceptAppointment = async ({ id, date = null, timeSlot = null, note = null }) => {
    const response = await fetch(`${apiBase}/api/appointments/${id}/accept`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ date, timeSlot, note }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || "Unable to accept appointment" };
    }
    await fetchAppointments();
    return { success: true };
  };

  const rescheduleAppointment = async ({ id, date, timeSlot, note = null }) => {
    const response = await fetch(`${apiBase}/api/appointments/${id}/reschedule`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ date, timeSlot, note }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || "Unable to reschedule appointment" };
    }
    await fetchAppointments();
    return { success: true };
  };

  const rejectAppointment = async ({ id, note = null }) => {
    const response = await fetch(`${apiBase}/api/appointments/${id}/reject`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ note }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || "Unable to reject appointment" };
    }
    await fetchAppointments();
    return { success: true };
  };

  const getAppointmentsForCurrentUser = () => appointments;

  const saveSessionForm = (id, data) => {
    updateAppointment(id, { sessionForm: data });
    return { success: true };
  };

  return (
    <AppointmentsContext.Provider value={{
      appointments,
      createAppointment,
      acceptAppointment,
      rescheduleAppointment,
      rejectAppointment,
      getAppointmentsForCurrentUser,
      fetchAppointments,
      saveSessionForm,
    }}>
      {children}
    </AppointmentsContext.Provider>
  );
}

export function useAppointments() {
  return useContext(AppointmentsContext);
}
