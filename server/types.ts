type Tenant = 'uvu' | 'uofu';
type Role = 'admin' | 'teacher' | 'ta' | 'student';

const TENANTS: Tenant[] = ['uvu', 'uofu'];
const ROLES: Role[] = ['admin', 'teacher', 'ta', 'student'];

const isTenant = (value: unknown): value is Tenant =>
  typeof value === 'string' && (TENANTS as string[]).includes(value);

const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as string[]).includes(value);

export { Tenant, Role, TENANTS, ROLES, isTenant, isRole };
