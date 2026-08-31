export const SESSION_REMINDERS_QUEUE = 'session-reminders';
export const SESSION_LIFECYCLE_QUEUE = 'session-lifecycle';

export const SESSION_REMINDER_JOB = 'send-reminder';
export const PENDING_SESSION_EXPIRY_JOB = 'expire-pending-session';

export const REMINDER_DELAYS = [
  { minutes: 1440, jobSuffix: '24h' },
  { minutes: 120, jobSuffix: '2h' },
  { minutes: 15, jobSuffix: '15m' },
];

export function reminderJobId(sessionId: string, jobSuffix: string) {
  return `reminder--${sessionId}--${jobSuffix}`;
}

export function pendingExpiryJobId(sessions: Array<{ id: string; commonId?: string | null }>) {
  if (!sessions.length) return null;

  const baseSession = sessions[0];
  const batchId = baseSession.commonId ?? [...sessions.map((session) => session.id)].sort().join('--');
  return `pending-expiry-batch--${batchId}`;
}
