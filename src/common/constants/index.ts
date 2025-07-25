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

export enum LANG {
    EN = "english",
    AM = "amharic"
} 

export interface TokenPayload {
    id: string
    status: BaseStatus,
    type: UserTypes
}

export enum ValidFolders {
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


export const SessionNotif: Record<string, { code: string; title: string }> = {
  SCHEDULED: { code: "1", title: 'session_scheduled' },
  NEW_MESSAGE: { code: "2", title: 'new_message' },
} as const;

export type SessionNotifValue = (typeof SessionNotif)[keyof typeof SessionNotif];


export const FILE_UPLOAD_KEY = 'image';

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_FILE_COUNT = 15;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const Tmp_Files_Dir = join(process.cwd(),'uploads','tmp')
export const Final_Files_Dir = join(process.cwd(),'uploads')