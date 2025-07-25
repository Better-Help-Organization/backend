import { join } from "path"

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
}

export enum VERSION {
    ONE = '1'
} 

export const FILE_UPLOAD_KEY = 'image';

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_FILE_COUNT = 15;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const Tmp_Files_Dir = join(process.cwd(),'uploads','tmp')
export const Final_Files_Dir = join(process.cwd(),'uploads')