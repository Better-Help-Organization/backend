import { createJwtAuthGuard } from "../utils/createJwtAuthGuard";

export const ClientJwtRefreshAuthGuard = createJwtAuthGuard('client-jwt-refresh');
export const TherapistJwtRefreshAuthGuard = createJwtAuthGuard('therapist-jwt-refresh');
export const AdminJwtRefreshAuthGuard = createJwtAuthGuard('admin-jwt-refresh');
