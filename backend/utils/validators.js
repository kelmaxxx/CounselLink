// Philippine mobile numbers only: starts with 09, exactly 11 digits total.
export const PH_MOBILE_REGEX = /^09\d{9}$/;

export const isValidPhMobile = (value) => PH_MOBILE_REGEX.test(value || "");
