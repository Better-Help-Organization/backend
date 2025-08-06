import { join } from "path";

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

export enum Gender {
    MALE = "male",
    FEMALE = "female"
} 

export enum QuestionType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
  OPEN = 'open'
}

export enum SessionFormat {
  VIDEO = 'video',
  PHONE = 'phone',
  TEXT = 'text'
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
  TI = 'ti'
}

export enum ModalName {
  INDIVIDUAL_THERAPY = 'Individual Therapy',
  TEEN_THERAPY = 'Teen Therapy',
  COUPLE_THERAPY = 'Couple Therapy',
  GROUP_THERAPY = 'Group Therapy',
}

export interface TokenPayload {
    id: string
    status: BaseStatus,
    type: UserTypes
}

export enum ValidFolders {
  LICENCE = "licence",
  PROFILE = "profile"
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

export enum DayOfWeek {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
  SUNDAY = 'Sunday',
}

export const SessionNotif: Record<string, { code: string; title: string }> = {
  SCHEDULED: { code: "1", title: 'Session scheduled' },
  NEW_MESSAGE: { code: "2", title: 'New message' },
  EDIT_MESSAGE: { code: "3", title: 'Edit message' },
  INCOMING_CALL: { code: "4", title: 'Incoming Call' },
} as const;

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