// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const s = localStorage.getItem("currentUser");
    return s ? JSON.parse(s) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const authFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  const parseResponseJson = async (response) => {
    const text = await response.text();
    if (!text) return {};
    try { return JSON.parse(text); } catch { return {}; }
  };

  // login by identifier + password
  // For students: identifier is studentId (strict match)
  // For staff (admin, counselor, college_rep): identifier is email (case-insensitive)
  const login = async ({ identifier, password, role }) => {
    setLoading(true);
    setError(null);
    let response;
    try {
      response = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, role }),
      });
    } catch (err) {
      setLoading(false);
      setError("Unable to connect to server");
      return { success: false, message: "Unable to connect to server" };
    }

    try {
      const data = await parseResponseJson(response);
      if (!response.ok) {
        const message = data.message || `Login failed (HTTP ${response.status})`;
        setError(message);
        return { success: false, message, status: data.status };
      }

      setCurrentUser(data.user);
      setToken(data.token);
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      return { success: true, user: data.user };
    } finally {
      setLoading(false);
    }
  };

  // signup (adds to in-memory users, returns user) - FOR STUDENT: pending approval
  const signup = async ({ name, email, password, role = "student", college = null, studentId = null, phone = "", corFile, avatarFile }) => {
    setLoading(true);
    setError(null);
    try {
      let corMeta = {};
      if (corFile) {
        const formData = new FormData();
        formData.append("cor", corFile);
        let uploadResponse;
        try {
          uploadResponse = await fetch(`${apiBase}/api/uploads/cor`, { method: "POST", body: formData });
        } catch (err) {
          setError("Unable to connect to server");
          return { success: false, message: "Unable to connect to server" };
        }
        const uploadData = await parseResponseJson(uploadResponse);
        if (!uploadResponse.ok) {
          const message = uploadData.message || `COR upload failed (HTTP ${uploadResponse.status})`;
          setError(message);
          return { success: false, message };
        }
        corMeta = {
          corUrl: uploadData.corUrl,
          corFileName: uploadData.corFileName,
          corFileType: uploadData.corFileType,
        };
      }

      let avatarMeta = {};
      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        let uploadResponse;
        try {
          uploadResponse = await fetch(`${apiBase}/api/uploads/avatar`, { method: "POST", body: formData });
        } catch (err) {
          setError("Unable to connect to server");
          return { success: false, message: "Unable to connect to server" };
        }
        const uploadData = await parseResponseJson(uploadResponse);
        if (!uploadResponse.ok) {
          const message = uploadData.message || `Avatar upload failed (HTTP ${uploadResponse.status})`;
          setError(message);
          return { success: false, message };
        }
        avatarMeta = {
          avatarUrl: uploadData.avatarUrl,
          avatarFileName: uploadData.avatarFileName,
          avatarFileType: uploadData.avatarFileType,
        };
      }

      let response;
      try {
        response = await fetch(`${apiBase}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, college, studentId, phone, role, ...corMeta, ...avatarMeta }),
        });
      } catch (err) {
        setError("Unable to connect to server");
        return { success: false, message: "Unable to connect to server" };
      }
      const data = await parseResponseJson(response);
      if (!response.ok) {
        const message = data.message || `Registration failed (HTTP ${response.status})`;
        setError(message);
        return { success: false, message };
      }
      return { success: true, message: data.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    setUsers([]);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    sessionStorage.removeItem("welcomeShown");
  };

  const fetchPendingRegistrations = async () => {
    const response = await authFetch(`${apiBase}/api/admin/pending-registrations`);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Unable to load pending registrations");
    }
    return response.json();
  };

  const approveRegistration = async (userId, { program, yearLevel }) => {
    const response = await authFetch(
      `${apiBase}/api/admin/pending-registrations/${userId}/approve`,
      {
        method: "PUT",
        body: JSON.stringify({ program, yearLevel }),
      }
    );
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Unable to approve registration");
    }
    return response.json();
  };

  const rejectRegistration = async (userId, { reason }) => {
    const response = await authFetch(
      `${apiBase}/api/admin/pending-registrations/${userId}/reject`,
      {
        method: "PUT",
        body: JSON.stringify({ reason }),
      }
    );
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Unable to reject registration");
    }
    return response.json();
  };

  const refreshCurrentUser = async () => {
    const response = await authFetch(`${apiBase}/api/users/me`);
    if (!response.ok) return null;
    const fresh = await response.json();
    const merged = { ...(currentUser || {}), ...fresh };
    setCurrentUser(merged);
    localStorage.setItem("currentUser", JSON.stringify(merged));
    return merged;
  };

  const updateProfile = async (updates) => {
    const response = await authFetch(`${apiBase}/api/users/me`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    const data = await parseResponseJson(response);
    if (!response.ok) {
      throw new Error(data.message || "Unable to update profile");
    }
    const merged = { ...(currentUser || {}), ...data };
    setCurrentUser(merged);
    localStorage.setItem("currentUser", JSON.stringify(merged));
    return merged;
  };

  const fetchUsers = async () => {
    const response = await authFetch(`${apiBase}/api/users`);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Unable to load users");
    }
    const data = await response.json();
    setUsers(data);
    return data;
  };

  const fetchUsersByRole = async (role) => {
    const response = await authFetch(`${apiBase}/api/users?role=${role}`);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Unable to load users");
    }
    return await response.json();
  };

  const lookupUser = async (id) => {
    if (!id) return null;
    try {
      const response = await authFetch(`${apiBase}/api/users/lookup/${id}`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  };

  const createUser = async ({ name, email, password, role, college }) => {
    const response = await authFetch(`${apiBase}/api/users`, {
      method: "POST",
      body: JSON.stringify({ name, email, password, role, college }),
    });
    const data = await parseResponseJson(response);
    if (!response.ok) {
      return { success: false, message: data.message || "Failed to create user" };
    }
    setUsers((prev) => [data, ...prev]);
    return { success: true, user: data };
  };

  const updateUser = async (id, updates) => {
    const response = await authFetch(`${apiBase}/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    const data = await parseResponseJson(response);
    if (!response.ok) {
      return { success: false, message: data.message || "Failed to update user" };
    }
    setUsers((prev) => prev.map((u) => (u.id === data.id ? data : u)));
    return { success: true, user: data };
  };

  const deleteUser = async (id) => {
    const response = await authFetch(`${apiBase}/api/users/${id}`, { method: "DELETE" });
    const data = await parseResponseJson(response);
    if (!response.ok) {
      return { success: false, message: data.message || "Failed to delete user" };
    }
    setUsers((prev) => prev.filter((u) => u.id !== Number(id)));
    return { success: true };
  };

  // Auto-fetch users for admins (full directory), counselors, and college reps
  // (students in their own college + counselors, scoped server-side).
  useEffect(() => {
    if (!token) return;
    if (currentUser?.role === "admin") {
      fetchUsers().catch((err) => console.error("Failed to load users:", err));
    } else if (currentUser?.role === "counselor") {
      Promise.all([
        fetchUsersByRole("student"),
        fetchUsersByRole("counselor"),
        fetchUsersByRole("college_rep"),
      ])
        .then(([students, counselors, reps]) => setUsers([...students, ...counselors, ...reps]))
        .catch((err) => console.error("Failed to load users:", err));
    } else if (currentUser?.role === "college_rep") {
      Promise.all([
        fetchUsersByRole("student"),
        fetchUsersByRole("counselor"),
      ])
        .then(([students, counselors]) => setUsers([...students, ...counselors]))
        .catch((err) => console.error("Failed to load users:", err));
    }
  }, [token, currentUser?.role]);

  return (
    <AuthContext.Provider value={{
      users,
      currentUser,
      token,
      loading,
      error,
      login,
      signup,
      logout,
      setUsers,
      fetchPendingRegistrations,
      approveRegistration,
      rejectRegistration,
      refreshCurrentUser,
      updateProfile,
      fetchUsers,
      fetchUsersByRole,
      lookupUser,
      createUser,
      updateUser,
      deleteUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
