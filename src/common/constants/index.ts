import { join } from "path";

export interface Tokens {
    client?: string[];
    admin?: string[];
    therapist?: string[];
}


export enum UserTypes {
    ADMIN = "admin",
    CLIENT = "client",
    THERAPIST = "therapist"
}

export enum BaseStatus {
    INACTIVE = "inactive",
    PENDING = "pending",
    ACTIVE = "active",
    SUSPENDED = "suspended",
}

export enum ExpertiseValues {
    IndividualTherapy = "Individual Therapy",
    TeenTherapy = "Teen Therapy",
    CoupleTherapy = "Couple Therapy",
    GroupTherapy = "Group Therapy",
    Anxiety = "Anxiety",
    Depression = "Depression",
    StressManagement = "Stress Management",
    Trauma = "Trauma",
    GriefLoss = "Grief / Loss",
    RelationshipProblems = "Relationship Problems",
    SelfEsteem = "Self Esteem",
    AngerIssues = "Anger Issues",
    PeerPressure = "Peer Pressure",
    AcademicStress = "Academic Stress",
    FamilyIssues = "Family Issues",
    BehavioralChange = "Behavioral Change",
    Bullying = "Bullying",
    SocialIsolation = "Social Isolation",
    CommunicationProblems = "Communication Problems",
    TrustIssues = "Trust Issues",
    IntimacyConcerns = "Intimacy Concerns",
    ParentingChallenges = "Parenting Challenges",
    ConflictResolution = "Conflict Resolution",
    AnxietySupportGroup = "Anxiety Support Group",
    DepressionSupportGroup = "Depression Support Group",
    ParentingSupportGroup = "Parenting Support Group"
}


export enum Gender {
    MALE = "male",
    FEMALE = "female"
} 

export enum QuestionType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
  OPEN = 'open'
}

export enum LevelType {
  ASSOCIATE = 'associate',
  MODERATE = 'moderate',
  ADVANCED = 'advanced'
}

export enum LangCode {
  EN = 'en',
  AM = 'am',
  OR = 'or',
  TI = 'ti',
  OTHER = 'other'
}

export enum ModalName {
  INDIVIDUAL_THERAPY = 'Individual Therapy',
  TEEN_THERAPY = 'Teen Therapy',
  COUPLE_THERAPY = 'Couple Therapy',
  GROUP_THERAPY = 'Group Therapy',
}

export interface TokenPayload {
    id: string
    name: string
    status: BaseStatus,
    type: UserTypes
}

export enum ValidFolders {
  LICENCE = "licence",
  PROFILE = "profile",
  PAYMENT = "payment",
  DEGREE = "degree",
  GOV_ID = "gov_id",
  PROFESSIONAL_LICENSE = "professional_license",
  WORK_EXPERIENCE = "work_experience",
  SPECIAL_TRAINING = "special_training"
}

export enum VERSION {
    ONE = '1'
} 

export enum SessionStatus {
  SCHEDULED = "scheduled",
  STARTED = "started",
  ONGOING = "ongoing",
  DISRUPTED = "disrupted",
  COMPLETED = "completed",
  CANCELED = "cancelled",
  OTHER = "other"
}

export enum SessionType {
  VIDEO = "video",
  CHAT = "chat",
  AUDIO = "audio",
}

export enum ApprovalStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed'
}

export enum DayOfWeek {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
  SUNDAY = 'Sunday',
}

export enum DayPeriod {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
}

export enum SubscriptionStatus {
  PENDING = 'pending',
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELED = 'canceled',
}

export enum SubscriptionType {
  TRIAL = 0,
  MONTHLY = 1,
  QUARTERLY = 3,
  SEMI_ANNUALLY = 6,
  YEARLY = 12,
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
}

export enum PaymentStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = 'rejected'
}

export enum MoodValues {
  HAPPY= 'happy', 
  SAD = 'sad', 
  NEUTRAL = 'neutral',
  ANDGRY = 'angry',
  TIRED = 'tired'
}

export const SessionNotif: Record<string, { code: string; title: string; showNotification: boolean }> = {
  SCHEDULED: { code: "1", title: 'Session scheduled', showNotification: true },
  NEW_MESSAGE: { code: "2", title: 'New message', showNotification: true },
  EDIT_MESSAGE: { code: "3", title: 'Edit message', showNotification: true },
  MESSAGE_READ: { code: "4", title: 'Message Read', showNotification: false },
  INCOMING_CALL: { code: "5", title: 'Incoming Call', showNotification: false },
  CALL_ENDED: { code: "6", title: 'Call Ended', showNotification: true },
  CALL_REJECTED: { code: "7", title: 'Call Rejected', showNotification: true },
  CHAT: { code: "8", title: 'Added to Chat', showNotification: false },
  // Match-related notifications
  MATCH_ACCEPTED: { code: '9', title: 'Match accepted', showNotification: true  },
  MATCH_TAKEN: { code: '10', title: 'Match already taken', showNotification: true  },
  STATUS_CHANGED: { code: '11', title: 'Status Update', showNotification: true  },
  MATCH_REQUEST: { code: '12', title: 'New match request', showNotification: true  },
  TAKEN: { code: "13", title: 'Session slot is no longer available', showNotification: true },
  MESSAGE_REMOVED: { code: "14", title: 'Message has been deleted', showNotification: false },
  CONFIRMED: { code: "15", title: "Upcoming confirmed sessions with client", showNotification: true },
  // 🔔 Scheduled notifications
  PENDING_SESSION_DELETED: { code: "16", title: "🗓️ Pending session removed", showNotification: true, },
  DAILY_MOOD: { code: "17", title: "📝 Daily check-in time!", showNotification: true },
  SESSION_REMINDER_CLIENT: { code: "18", title: "⏰ Don’t forget your session!", showNotification: true },
  SESSION_REMINDER_THERAPIST: { code: "19", title: "📋 Upcoming session alert", showNotification: true },
  THERAPIST_NOTES: { code: "20", title: "🖊️ Don’t forget your notes!", showNotification: true },
  INACTIVITY: { code: "21", title: "👋 We miss you!", showNotification: true },
  SUBSCRIPTION_EXPIRY: { code: "22", title: "⚠️ Subscription expiring soon", showNotification: true },
  SUBSCRIPTION_EXPIRED: { code: "23", title: "❌ Subscription expired", showNotification: true },
  GROUP_SCHEDULED: { code: "24", title: 'Group Session Created', showNotification: true },
  ALL_SESSIONS_COMPLETED: { code: "25", title: "All Sessions Completed", showNotification: true },

} as const;

export enum DefaultParameters {
  VAT="vat",
  NOTIFICATION_EXPIRY="notification expiry",
  PENDING_SESSION_EXPIRY_IN_MINUTES="pending session expiry in minutes"
}

export type SessionNotifValue = (typeof SessionNotif)[keyof typeof SessionNotif];

export const MIN_RATING = 1;
export const MAX_RATING = 5;

export const FILE_UPLOAD_KEY = 'file';

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_FILE_COUNT = 15;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const Tmp_Files_Dir = join(process.cwd(),'uploads','tmp')
export const Final_Files_Dir = join(process.cwd(),'uploads')
