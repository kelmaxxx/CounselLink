import { query } from "../config/db.js";

export const listAuditLogs = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const offset = parseInt(req.query.offset, 10) || 0;
  const filterAction = req.query.action;
  const filterActorRole = req.query.actorRole;

  const where = [];
  const params = [];
  if (filterAction) {
    where.push("a.action = ?");
    params.push(filterAction);
  }
  if (filterActorRole) {
    where.push("a.actor_role = ?");
    params.push(filterActorRole);
  }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await query(
    `SELECT a.id, a.actor_id AS actorId, a.actor_role AS actorRole, u.name AS actorName,
            a.action, a.target_type AS targetType, a.target_id AS targetId,
            a.details, a.ip_address AS ipAddress, a.created_at AS createdAt
     FROM audit_logs a
     LEFT JOIN users u ON a.actor_id = u.id
     ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  const countResult = await query(
    `SELECT COUNT(*) AS total FROM audit_logs a ${whereClause}`,
    params
  );

  const items = rows.map((r) => ({
    ...r,
    details: r.details ? (typeof r.details === "string" ? JSON.parse(r.details) : r.details) : null,
  }));

  return res.json({ items, total: countResult[0].total, limit, offset });
};

export const listAuditActions = async (_req, res) => {
  const rows = await query("SELECT DISTINCT action FROM audit_logs ORDER BY action");
  return res.json(rows.map((r) => r.action));
};
