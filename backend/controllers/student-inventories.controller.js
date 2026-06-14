import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";

const SELECT_FIELDS = `
  i.id, i.student_id AS studentId, i.counselor_id AS counselorId,
  i.form_data AS formData, i.scan_url AS scanUrl, i.scan_filename AS scanFilename,
  i.scan_filetype AS scanFiletype, i.created_at AS createdAt, i.updated_at AS updatedAt,
  s.name AS studentName, s.college AS studentCollege, s.student_id AS studentNumber,
  c.name AS counselorName
`;

const FROM_JOIN = `
  FROM student_inventories i
  JOIN users s ON i.student_id = s.id
  LEFT JOIN users c ON i.counselor_id = c.id
`;

const parseFormData = (row) => {
  if (!row) return row;
  let formData = row.formData;
  if (typeof formData === "string") {
    try { formData = JSON.parse(formData); } catch { formData = null; }
  }
  return { ...row, formData };
};

const canAccess = (req, studentId) => {
  const role = req.user?.role;
  if (role === "admin" || role === "counselor") return true;
  if (role === "student" && req.user?.id === Number(studentId)) return true;
  return false;
};

export const getInventory = async (req, res) => {
  const { studentId } = req.params;
  if (!canAccess(req, studentId)) return res.status(403).json({ message: "Forbidden" });

  const rows = await query(
    `SELECT ${SELECT_FIELDS} ${FROM_JOIN} WHERE i.student_id = ? LIMIT 1`,
    [studentId]
  );
  if (!rows.length) return res.status(404).json({ message: "No inventory record yet" });
  return res.json(parseFormData(rows[0]));
};

export const upsertInventory = async (req, res) => {
  const { studentId } = req.params;
  if (!canAccess(req, studentId)) return res.status(403).json({ message: "Forbidden" });

  const counselorId = req.user?.role === "counselor" ? req.user?.id : null;
  const { formData } = req.body;

  const studentCheck = await query("SELECT id FROM users WHERE id = ? AND role = 'student'", [studentId]);
  if (!studentCheck.length) return res.status(404).json({ message: "Student not found" });

  const existing = await query("SELECT id FROM student_inventories WHERE student_id = ?", [studentId]);

  if (existing.length) {
    if (req.user?.role === "counselor") {
      await query(
        "UPDATE student_inventories SET counselor_id = ?, form_data = ?, updated_at = NOW() WHERE student_id = ?",
        [counselorId, formData ? JSON.stringify(formData) : null, studentId]
      );
    } else {
      await query(
        "UPDATE student_inventories SET form_data = ?, updated_at = NOW() WHERE student_id = ?",
        [formData ? JSON.stringify(formData) : null, studentId]
      );
    }
    await logAction(req, "upsert_inventory", "student_inventory", existing[0].id, { studentId: Number(studentId) });
  } else {
    const result = await query(
      "INSERT INTO student_inventories (student_id, counselor_id, form_data) VALUES (?, ?, ?)",
      [studentId, counselorId, formData ? JSON.stringify(formData) : null]
    );
    await logAction(req, "upsert_inventory", "student_inventory", result.insertId, { studentId: Number(studentId), created: true });
  }

  const rows = await query(`SELECT ${SELECT_FIELDS} ${FROM_JOIN} WHERE i.student_id = ?`, [studentId]);
  return res.json(parseFormData(rows[0]));
};

export const uploadInventoryScan = async (req, res) => {
  const { studentId } = req.params;
  if (!canAccess(req, studentId)) return res.status(403).json({ message: "Forbidden" });

  const counselorId = req.user?.role === "counselor" ? req.user?.id : null;
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const fileUrl = `/uploads/${req.file.filename}`;

  const existing = await query("SELECT id FROM student_inventories WHERE student_id = ?", [studentId]);
  if (existing.length) {
    if (req.user?.role === "counselor") {
      await query(
        "UPDATE student_inventories SET counselor_id = ?, scan_url = ?, scan_filename = ?, scan_filetype = ?, updated_at = NOW() WHERE student_id = ?",
        [counselorId, fileUrl, req.file.originalname, req.file.mimetype, studentId]
      );
    } else {
      await query(
        "UPDATE student_inventories SET scan_url = ?, scan_filename = ?, scan_filetype = ?, updated_at = NOW() WHERE student_id = ?",
        [fileUrl, req.file.originalname, req.file.mimetype, studentId]
      );
    }
  } else {
    await query(
      "INSERT INTO student_inventories (student_id, counselor_id, scan_url, scan_filename, scan_filetype) VALUES (?, ?, ?, ?, ?)",
      [studentId, counselorId, fileUrl, req.file.originalname, req.file.mimetype]
    );
  }

  await logAction(req, "upload_inventory_scan", "student_inventory", Number(studentId), {
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
  });

  const rows = await query(`SELECT ${SELECT_FIELDS} ${FROM_JOIN} WHERE i.student_id = ?`, [studentId]);
  return res.status(201).json(parseFormData(rows[0]));
};

export const deleteInventoryScan = async (req, res) => {
  const { studentId } = req.params;
  if (!canAccess(req, studentId)) return res.status(403).json({ message: "Forbidden" });

  await query(
    "UPDATE student_inventories SET scan_url = NULL, scan_filename = NULL, scan_filetype = NULL, updated_at = NOW() WHERE student_id = ?",
    [studentId]
  );
  await logAction(req, "delete_inventory_scan", "student_inventory", Number(studentId), {});
  return res.json({ message: "Scan removed" });
};
