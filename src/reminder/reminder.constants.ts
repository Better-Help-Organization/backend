export const SESSION_REMINDERS_QUEUE = 'session-reminders';
export const SESSION_LIFECYCLE_QUEUE = 'session-lifecycle';

export const SESSION_REMINDER_JOB = 'send-reminder';
export const PENDING_SESSION_EXPIRY_JOB = 'expire-pending-session';
export const SUBSCRIPTION_EXPIRY_REMINDER_JOB = 'subscription-expiry-reminder';
export const SUBSCRIPTION_EXPIRY_DAY_JOB = 'subscription-expiry-day';

export const REMINDER_DELAYS = [
  { minutes: 1440, jobSuffix: '24h' },
  { minutes: 120, jobSuffix: '2h' },
  { minutes: 15, jobSuffix: '15m' },
];
