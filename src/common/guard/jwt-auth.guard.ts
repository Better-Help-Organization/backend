import { createJwtAuthGuard } from 'src/common/utils/createJwtAuthGuard';

export const ClientJwtAuthGuard = createJwtAuthGuard('client-jwt');
export const TherapistJwtAuthGuard = createJwtAuthGuard('therapist-jwt');
export const AdminJwtAuthGuard = createJwtAuthGuard('admin-jwt');

