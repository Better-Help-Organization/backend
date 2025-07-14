import { createJwtStrategy } from '../utils/createJwtStrategy';

export const TherapistJwtRefreshStrategy = createJwtStrategy('therapist-jwt-refresh', 'JWT_REFRESH_TOKEN_SECRET_THERAPIST');
export const ClientJwtRefreshStrategy = createJwtStrategy('client-jwt-refresh', 'JWT_REFRESH_TOKEN_SECRET_CLIENT');
export const AdminJwtRefreshStrategy = createJwtStrategy('admin-jwt-refresh', 'JWT_REFRESH_TOKEN_SECRET_ADMIN');
