import type { PlatformRole } from '../../types/siena-maps';
import { PLATFORM_ROLE_RANK } from './constants';

export const PLATFORM_PERMISSIONS: Record<PlatformRole, string[]> = {
  viewer: ['read:internal'],
  editor: ['read:internal', 'poi:create', 'poi:edit', 'poi:submit'],
  department_head: [
    'read:internal',
    'poi:create',
    'poi:edit',
    'poi:submit',
    'poi:approve',
    'map:create',
    'map:submit',
    'embed:manage',
    'department:members:manage',
  ],
  super_admin: [
    'read:internal',
    'poi:create',
    'poi:edit',
    'poi:submit',
    'poi:approve',
    'poi:publish',
    'map:create',
    'map:submit',
    'map:approve',
    'map:publish',
    'map:archive',
    'embed:manage',
    'department:manage',
    'department:members:manage',
    'users:manage',
    'categories:manage',
    'settings:manage',
  ],
  owner: [
    'read:internal',
    'poi:create',
    'poi:edit',
    'poi:submit',
    'poi:approve',
    'poi:publish',
    'map:create',
    'map:submit',
    'map:approve',
    'map:publish',
    'map:archive',
    'embed:manage',
    'department:manage',
    'department:members:manage',
    'users:manage',
    'users:owner:manage',
    'categories:manage',
    'settings:manage',
    'system:full',
  ],
};

export function hasMinRole(current: PlatformRole, required: PlatformRole): boolean {
  return PLATFORM_ROLE_RANK[current] >= PLATFORM_ROLE_RANK[required];
}

export function can(current: PlatformRole, permission: string): boolean {
  return PLATFORM_PERMISSIONS[current]?.includes(permission) ?? false;
}
