// Philippine mobile numbers only: starts with 09, exactly 11 digits total.
export const PH_MOBILE_REGEX = /^09\d{9}$/;

export const PHONE_HINT = "Must start with 09 and have 11 digits (e.g. 09123456789).";

// Strips everything but digits and caps the length so the field can never
// hold more than a valid number's worth of characters while typing.
export const sanitizePhoneDigits = (value) => String(value || "").replace(/\D/g, "").slice(0, 11);

export const isValidPhMobile = (value) => PH_MOBILE_REGEX.test(value || "");
