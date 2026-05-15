import { query } from "../config/db.js";

export const logAction = async (req, action, targetType = null, targetId = null, details = null) => {
  try {
    const actorId = req.user?.id ?? null;
    const actorRole = req.user?.role ?? null;
    const ip = (req.headers?.["x-forwarded-for"] || req.ip || req.socket?.remoteAddress || "").toString().split(",")[0].trim() || null;
    const detailsJson = details ? JSON.stringify(details) : null;
    await query(
      "INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [actorId, actorRole, action, targetType, targetId, detailsJson, ip]
    );
  } catch (err) {
    console.error("Audit log failed:", err);
  }
};
