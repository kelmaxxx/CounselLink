import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import { generateInventoryDocx, readSignatureFile, readAvatarFile } from "../utils/inventory-docx.js";
import { generateInventoryPdf, generateCompiledProfilesPdf } from "../utils/inventory-pdf.js";
import { reportableStudentSql } from "../utils/report-eligibility.js";

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

// Roster view for the counselor's compiled reports: every inventory (optionally
// one college) with the student's name/college/number already joined in.
export const listInventories = async (req, res) => {
  if (!canAccess(req, null)) return res.status(403).json({ message: "Forbidden" });
  const { college } = req.query;
  // The roster feeds the Individual Profile report, so it only includes
  // approved students whose consent and data authorization are still active.
  const conditions = [reportableStudentSql("s")];
  const params = [];
  if (college) {
    conditions.push("s.college = ?");
    params.push(college);
  }
  const rows = await query(
    `SELECT ${SELECT_FIELDS} ${FROM_JOIN}
     WHERE ${conditions.join(" AND ")}
     ORDER BY s.name ASC`,
    params
  );
  return res.json(rows.map(parseFormData));
};

export const upsertInventory = async (req, res) => {
  const { studentId } = req.params;
  if (!canAccess(req, studentId)) return res.status(403).json({ message: "Forbidden" });

  const counselorId = req.user?.role === "counselor" ? req.user?.id : null;
  const { formData } = req.body;

  const studentCheck = await query("SELECT id FROM users WHERE id = ? AND role = 'student'", [studentId]);
  if (!studentCheck.length) return res.status(404).json({ message: "Student not found" });

  const existing = await query("SELECT id, form_data FROM student_inventories WHERE student_id = ?", [studentId]);

  if (existing.length) {
    if (req.user?.role === "counselor") {
      await query(
        "UPDATE student_inventories SET counselor_id = ?, form_data = ?, updated_at = NOW() WHERE student_id = ?",
        [counselorId, formData ? JSON.stringify(formData) : null, studentId]
      );
    } else {
      // A student saving a form loaded before a revocation must not clear the
      // authorization state. Only e-signing (a direct write) restores it.
      let merged = formData;
      if (formData) {
        let prev = existing[0].form_data;
        if (typeof prev === "string") {
          try { prev = JSON.parse(prev); } catch { prev = {}; }
        }
        const prevAck = prev?.acknowledgment || {};
        const nextAck = formData.acknowledgment || {};
        merged = {
          ...formData,
          acknowledgment: {
            ...nextAck,
            // The saved record is the source of truth for authorization; only
            // e-signing or a counselor revocation may change these two flags.
            disclaimerAgreed: prevAck.disclaimerAgreed ?? nextAck.disclaimerAgreed,
            disclaimerRevokedAt: prevAck.disclaimerRevokedAt ?? null,
          },
        };
      }
      await query(
        "UPDATE student_inventories SET form_data = ?, updated_at = NOW() WHERE student_id = ?",
        [merged ? JSON.stringify(merged) : null, studentId]
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

const safeFileBase = (name, idNumber) =>
  `inventory_${(name || idNumber || "student")}`
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();

// Loads the saved inventory plus the signature/avatar files needed by both the
// Word and PDF downloads, plus the consent state used to suppress signatures.
const DOWNLOAD_SELECT = `
  SELECT i.form_data AS formData, s.id AS studentId, s.name AS studentName,
         s.student_id AS studentNumber, s.email AS studentEmail,
         s.college AS studentCollege, s.department AS studentDepartment,
         s.signature_url AS studentSignatureUrl, s.avatar_url AS studentAvatarUrl,
         sc.revoked_at AS consentRevokedAt
    FROM student_inventories i
    JOIN users s ON i.student_id = s.id
    LEFT JOIN student_consents sc ON sc.student_id = i.student_id
`;

const buildDownloadData = (rawRow) => {
  const row = parseFormData(rawRow);
  const profile = {
    name: row.studentName,
    studentNumber: row.studentNumber,
    email: row.studentEmail,
  };

  // Check consent status: if consent is revoked or the data-authorization
  // disclaimer was revoked, suppress the student signature from the download
  // so it does not misleadingly appear as current active consent.
  const consentRevoked = rawRow.consentRevokedAt != null;

  // Also check the inventory acknowledgment for disclaimer revocation.
  const ack = row.formData?.acknowledgment || {};
  const disclaimerRevoked = !!ack.disclaimerRevokedAt;

  const signatures = {
    // Suppress the student signature whenever consent or authorization has been revoked.
    studentSignature: (consentRevoked || disclaimerRevoked)
      ? null
      : readSignatureFile(row.studentSignatureUrl),
    studentAvatar: readAvatarFile(row.studentAvatarUrl),
  };

  // Missing files fail silently into a transparent pixel (see inventory-docx.js),
  // so log them — a blank 2x2/signature in the download almost always means the
  // file is gone from the uploads directory (e.g. ephemeral disk was wiped).
  if (row.studentAvatarUrl && !signatures.studentAvatar) {
    console.warn(`Inventory download for student ${row.studentId}: avatar file missing (${row.studentAvatarUrl})`);
  }
  if (row.studentSignatureUrl && !signatures.studentSignature) {
    console.warn(`Inventory download for student ${row.studentId}: student signature file missing (${row.studentSignatureUrl})`);
  }

  return { row, profile, signatures };
};

const loadDownloadData = async (studentId) => {
  const rows = await query(`${DOWNLOAD_SELECT} WHERE i.student_id = ? LIMIT 1`, [studentId]);
  return rows.length ? buildDownloadData(rows[0]) : null;
};

// Renders the saved inventory into a filled-in copy of the official MSU DSA
// Word form and streams it back as a .docx download.
export const downloadInventoryDocx = async (req, res) => {
  const { studentId } = req.params;
  if (!canAccess(req, studentId)) return res.status(403).json({ message: "Forbidden" });

  const loaded = await loadDownloadData(studentId);
  if (!loaded) return res.status(404).json({ message: "No inventory record yet" });
  const { row, profile, signatures } = loaded;

  let buffer;
  try {
    buffer = generateInventoryDocx(row.formData || {}, profile, signatures, {
      // The PDF is rendered in the browser by docx-preview, which only splits
      // pages on explicit breaks — see insertTestRecordPageBreak.
      paginate: req.query.paginate === "1",
    });
  } catch (err) {
    console.error("Inventory docx generation failed:", err);
    return res.status(500).json({ message: "Failed to generate the inventory document" });
  }

  await logAction(req, "download_inventory_docx", "student_inventory", Number(studentId), {});

  const filename = `${safeFileBase(row.studentName, row.studentNumber)}.docx`;
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(buffer);
};

// Fills the official blank PDF with the saved values and streams it back.
// Only the inputs are drawn; the form's own lines never move.
export const downloadInventoryPdf = async (req, res) => {
  const { studentId } = req.params;
  if (!canAccess(req, studentId)) return res.status(403).json({ message: "Forbidden" });

  const loaded = await loadDownloadData(studentId);
  if (!loaded) return res.status(404).json({ message: "No inventory record yet" });
  const { row, profile, signatures } = loaded;

  let buffer;
  try {
    buffer = await generateInventoryPdf(row.formData || {}, profile, signatures);
  } catch (err) {
    console.error("Inventory PDF generation failed:", err);
    return res.status(500).json({ message: "Failed to generate the inventory PDF" });
  }

  await logAction(req, "download_inventory_pdf", "student_inventory", Number(studentId), {});

  const filename = `${safeFileBase(row.studentName, row.studentNumber)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(buffer);
};

// Counselor report: every student profile in a college (optionally one
// department) merged into a single PDF, ordered by name, two pages each.
export const downloadCompiledProfilesPdf = async (req, res) => {
  const college = String(req.query.college || "").trim();
  const department = String(req.query.department || "").trim();
  if (!college) return res.status(400).json({ message: "Select a college." });

  const rows = await query(
    `${DOWNLOAD_SELECT}
      WHERE s.college = ? ${department ? "AND s.department = ?" : ""}
        AND i.form_data IS NOT NULL
        AND ${reportableStudentSql("s")}
      ORDER BY s.name ASC`,
    department ? [college, department] : [college]
  );
  if (!rows.length) {
    return res.status(404).json({
      message: department
        ? `No student profiles on file for ${department}, ${college}.`
        : `No student profiles on file for ${college}.`,
    });
  }

  let buffer;
  try {
    buffer = await generateCompiledProfilesPdf(
      rows.map((rawRow) => {
        const { row, profile, signatures } = buildDownloadData(rawRow);
        return { formData: row.formData, profile, signatures };
      })
    );
  } catch (err) {
    console.error("Compiled profiles PDF generation failed:", err);
    return res.status(500).json({ message: "Failed to generate the compiled profiles PDF" });
  }

  await logAction(req, "download_compiled_profiles_pdf", "student_inventory", null, {
    college,
    department: department || null,
    students: rows.length,
  });

  const filename = `student_profiles_${college}${department ? `_${department}` : ""}`
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
  return res.send(buffer);
};
