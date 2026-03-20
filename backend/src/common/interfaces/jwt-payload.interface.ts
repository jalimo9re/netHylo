import { UserRole } from '@/database/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string | null;
  role: UserRole;
}
