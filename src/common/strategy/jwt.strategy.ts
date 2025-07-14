import { createJwtStrategy } from '../utils/createJwtStrategy';

export const TherapistJwtStrategy = createJwtStrategy('therapist-jwt', 'JWT_ACCESS_TOKEN_SECRET_THERAPIST');
export const ClientJwtStrategy = createJwtStrategy('client-jwt', 'JWT_ACCESS_TOKEN_SECRET_CLIENT');
export const AdminJwtStrategy = createJwtStrategy('admin-jwt', 'JWT_ACCESS_TOKEN_SECRET_ADMIN');