import { query } from "../config/db.js";
import { logAction } from "../utils/audit.js";

const SELECT_FIELDS = `
  c.id, c.student_id AS studentId,
  c.e_consent_signed_at AS eConsentSignedAt, c.e_consent_typed_name AS eConsentTypedName,
  c.e_consent_ip AS eConsentIp,
  c.scan_url AS scanUrl, c.scan_filename AS scanFilename, c.scan_filetype AS scanFiletype,
  c.uploaded_by AS uploadedBy, c.uploaded_at AS uploadedAt,
  c.scope, c.revoked_at AS revokedAt, c.created_at AS createdAt, c.updated_at AS updatedAt,
  c.referral_sharing_consent AS referralSharingConsent,
  c.referral_sharing_decided_at AS referralSharingDecidedAt,
  s.name AS studentName, u.name AS uploaderName
`;

const FROM_JOIN = `
  FROM student_consents c
  JOIN users s ON c.student_id = s.id
  LEFT JOIN users u ON c.uploaded_by = u.id
`;

const canAccess = (req, studentId) => {
  const role = req.user?.role;
  if (role === "admin" || role === "counselor") return true;
  if (role === "student" && req.user?.id === Number(studentId)) return true;
  return false;
};

const getClientIp = (req) =>
  (req.headers?.["x-forwarded-for"] || req.ip || req.socket?.remoteAddress || "")
    .toString().split(",")[0].trim() || null;

export const getConsent = async (req, res) => {
  const { studentId } = req.params;
  if (!canAccess(req, studentId)) return res.status(403).json({ message: "Forbidden" });

  const rows = await query(`SELECT ${SELECT_FIELDS} ${FROM_JOIN} WHERE c.student_id = ? LIMIT 1`, [studentId]);
  if (!rows.length) return res.status(404).json({ message: "No consent record yet" });
  return res.json(rows[0]);
};

export const eSignConsent = async (req, res) => {
  const { studentId } = req.params;
  const { typedName, scope } = req.body;
  const userId = req.user?.id;
  const role = req.user?.role;

  if (role !== "student" || userId !== Number(studentId)) {
    return res.status(403).json({ message: "Only the student can e-sign their own consent" });
  }
  if (!typedName?.trim()) {
    return res.status(400).json({ message: "Typed name is required" });
  }

  const ip = getClientIp(req);
  const existing = await query("SELECT id FROM student_consents WHERE student_id = ?", [studentId]);

  if (existing.length) {
    await query(
      `UPDATE student_consents
       SET e_consent_signed_at = NOW(), e_consent_typed_name = ?, e_consent_ip = ?,
           scope = COALESCE(?, scope), revoked_at = NULL, updated_at = NOW()
       WHERE student_id = ?`,
      [typedName.trim(), ip, scope || null, studentId]
    );
    await logAction(req, "record_consent", "student_consent", existing[0].id, { method: "e-sign" });
  } else {
    const result = await query(
      `INSERT INTO student_consents
        (student_id, e_consent_signed_at, e_consent_typed_name, e_consent_ip, scope)
       VALUES (?, NOW(), ?, ?, ?)`,
      [studentId, typedName.trim(), ip, scope || null]
    );
    await logAction(req, "record_consent", "student_consent", result.insertId, { method: "e-sign", created: true });
  }

  const rows = await query(`SELECT ${SELECT_FIELDS} ${FROM_JOIN} WHERE c.student_id = ?`, [studentId]);
  return res.status(201).json(rows[0]);
};

export const uploadConsentScan = async (req, res) => {
  const { studentId } = req.params;
  const counselorId = req.user?.id;
  const { scope } = req.body;
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const fileUrl = `/uploads/${req.file.filename}`;
  const existing = await query("SELECT id FROM student_consents WHERE student_id = ?", [studentId]);

  if (existing.length) {
    await query(
      `UPDATE student_consents
       SET scan_url = ?, scan_filename = ?, scan_filetype = ?,
           uploaded_by = ?, uploaded_at = NOW(),
           scope = COALESCE(?, scope), revoked_at = NULL, updated_at = NOW()
       WHERE student_id = ?`,
      [fileUrl, req.file.originalname, req.file.mimetype, counselorId, scope || null, studentId]
    );
  } else {
    await query(
      `INSERT INTO student_consents
        (student_id, scan_url, scan_filename, scan_filetype, uploaded_by, uploaded_at, scope)
       VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
      [studentId, fileUrl, req.file.originalname, req.file.mimetype, counselorId, scope || null]
    );
  }

  await logAction(req, "upload_consent_scan", "student_consent", Number(studentId), {
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
  });

  const rows = await query(`SELECT ${SELECT_FIELDS} ${FROM_JOIN} WHERE c.student_id = ?`, [studentId]);
  return res.status(201).json(rows[0]);
};

export const deleteConsentScan = async (req, res) => {
  const { studentId } = req.params;
  await query(
    `UPDATE student_consents
     SET scan_url = NULL, scan_filename = NULL, scan_filetype = NULL,
         uploaded_by = NULL, uploaded_at = NULL, updated_at = NOW()
     WHERE student_id = ?`,
    [studentId]
  );
  await logAction(req, "delete_consent_scan", "student_consent", Number(studentId), {});
  return res.json({ message: "Scan removed" });
};

// Separate from the primary informed consent: whether the student allows a
// referral session's report to be shared with the referring College
// Representative. Normally the student sets this themselves; a counselor can
// also confirm it on the student's behalf during a session, for students who
// can't sign in yet (referred/walk-in placeholder accounts) but have agreed
// in person. Can be changed at any time.
export const setReferralSharingConsent = async (req, res) => {
  const { studentId } = req.params;
  const { allow } = req.body;
  const userId = req.user?.id;
  const role = req.user?.role;

  const isSelf = role === "student" && userId === Number(studentId);
  const isCounselor = role === "counselor";
  if (!isSelf && !isCounselor) {
    return res.status(403).json({ message: "Only the student or their counselor can set this preference" });
  }
  if (typeof allow !== "boolean") {
    return res.status(400).json({ message: "allow (boolean) is required" });
  }

  const existing = await query("SELECT id FROM student_consents WHERE student_id = ?", [studentId]);

  if (!existing.length) {
    if (!isCounselor) {
      return res.status(409).json({ message: "Sign the informed consent first" });
    }
    // A counselor confirming this in person doesn't require the student to
    // have already e-signed/uploaded the primary consent online.
    const result = await query(
      `INSERT INTO student_consents (student_id, referral_sharing_consent, referral_sharing_decided_at)
       VALUES (?, ?, NOW())`,
      [studentId, allow ? "yes" : "no"]
    );
    await logAction(req, "set_referral_sharing_consent", "student_consent", result.insertId, {
      allow,
      confirmedBy: role,
    });
  } else {
    await query(
      `UPDATE student_consents
       SET referral_sharing_consent = ?, referral_sharing_decided_at = NOW(), updated_at = NOW()
       WHERE student_id = ?`,
      [allow ? "yes" : "no", studentId]
    );
    await logAction(req, "set_referral_sharing_consent", "student_consent", existing[0].id, {
      allow,
      confirmedBy: role,
    });
  }

  const rows = await query(`SELECT ${SELECT_FIELDS} ${FROM_JOIN} WHERE c.student_id = ?`, [studentId]);
  return res.json(rows[0]);
};

export const revokeConsent = async (req, res) => {
  const { studentId } = req.params;
  await query(
    "UPDATE student_consents SET revoked_at = NOW(), updated_at = NOW() WHERE student_id = ?",
    [studentId]
  );
  await logAction(req, "revoke_consent", "student_consent", Number(studentId), {});
  return res.json({ message: "Consent revoked" });
};
