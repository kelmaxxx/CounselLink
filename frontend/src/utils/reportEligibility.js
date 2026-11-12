// Session and test-result rows carry the student's account status plus the
// consent/authorization revocation flags from the API. Generated reports only
// include approved students who have not revoked either.
export function isReportableStudent(row) {
  if (!row) return false;
  if (row.studentStatus && row.studentStatus !== "approved") return false;
  return !row.consentRevoked && !row.authorizationRevoked;
}
