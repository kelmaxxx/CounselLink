// Shared Guidance & Counseling office-hours helper.
// Duty time: Monday–Friday, 9:00 AM – 5:00 PM (server local time).
// Urgent walk-in / same-day requests must follow the same schedule as
// regular appointments: no weekends, no after-hours submissions.

export const OFFICE_HOURS_LABEL = "Monday – Friday, 9:00 AM – 5:00 PM";

export const getOfficeHoursStatus = (now = new Date()) => {
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = now.getHours();

  if (day === 0 || day === 6) {
    return {
      isOpen: false,
      reason: "weekend",
      message:
        `The Guidance and Counseling Office is closed on weekends. Office hours are ${OFFICE_HOURS_LABEL}. ` +
        "Please submit your urgent request during office hours, or proceed to the Division of Student Affairs Office during weekdays for assistance.",
    };
  }

  if (hour < 9 || hour >= 17) {
    return {
      isOpen: false,
      reason: "after-hours",
      message:
        `The Guidance and Counseling Office is currently closed (office hours are ${OFFICE_HOURS_LABEL}). ` +
        "There is no duty counselor right now. Please submit your urgent request during office hours, or proceed to the Division of Student Affairs Office on the next working day.",
    };
  }

  return { isOpen: true, reason: null, message: null };
};
