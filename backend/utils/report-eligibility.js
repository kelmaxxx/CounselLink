import { query } from "../config/db.js";

// SQL predicate for a joined `users` row: only approved students who have not
// revoked their informed consent or inventory data authorization are reportable.
// JSON null / missing paths must not count as a revocation, hence the 'null' check.
export const reportableStudentSql = (alias) => `
  ${alias}.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM student_consents sc
    WHERE sc.student_id = ${alias}.id AND sc.revoked_at IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM student_inventories si
    WHERE si.student_id = ${alias}.id
      AND JSON_UNQUOTE(JSON_EXTRACT(si.form_data, '$.acknowledgment.disclaimerRevokedAt')) NOT IN ('null', '')
  )`;

export const isStudentReportExcluded = async (studentId) => {
  const [row] = await query(
    `SELECT (
       EXISTS (SELECT 1 FROM student_consents WHERE student_id = ? AND revoked_at IS NOT NULL)
       OR EXISTS (
         SELECT 1 FROM student_inventories
         WHERE student_id = ?
           AND JSON_UNQUOTE(JSON_EXTRACT(form_data, '$.acknowledgment.disclaimerRevokedAt')) NOT IN ('null', '')
       )
     ) AS excluded`,
    [studentId, studentId]
  );
  return Boolean(Number(row?.excluded));
};
