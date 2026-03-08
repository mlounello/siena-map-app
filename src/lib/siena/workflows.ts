import type { MapShellStatus, PoiStatus, PlatformRole, PublicationStatus } from '../../types/siena-maps';
import { hasMinRole } from './permissions';

export const MAP_SHELL_TRANSITIONS: Record<MapShellStatus, MapShellStatus[]> = {
  draft: ['submitted_for_review', 'archived'],
  submitted_for_review: ['approved', 'rejected', 'archived'],
  approved: ['archived'],
  rejected: ['draft', 'submitted_for_review', 'archived'],
  archived: [],
};

export const MAP_PUBLICATION_TRANSITIONS: Record<PublicationStatus, PublicationStatus[]> = {
  unpublished: ['published', 'archived'],
  published: ['unpublished', 'archived'],
  archived: [],
};

export const POI_TRANSITIONS: Record<PoiStatus, PoiStatus[]> = {
  draft: ['submitted_for_review', 'archived'],
  submitted_for_review: ['approved', 'rejected', 'archived'],
  approved: ['published', 'archived'],
  published: ['submitted_for_review', 'archived'],
  rejected: ['draft', 'submitted_for_review', 'archived'],
  archived: [],
};

export function canTransitionMapShell(
  current: MapShellStatus,
  next: MapShellStatus,
  role: PlatformRole
): boolean {
  const allowed = MAP_SHELL_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) return false;

  if (next === 'approved' || next === 'rejected') {
    return hasMinRole(role, 'super_admin');
  }

  return hasMinRole(role, 'department_head');
}

export function canTransitionPoi(current: PoiStatus, next: PoiStatus, role: PlatformRole): boolean {
  const allowed = POI_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) return false;

  if (next === 'approved' || next === 'published' || next === 'rejected') {
    return hasMinRole(role, 'department_head');
  }

  return hasMinRole(role, 'editor');
}

export function shouldAutoPublishOnApproval(
  publishOnApproval: boolean,
  scheduledPublishAt: string | null,
  nowISO: string
): boolean {
  if (!publishOnApproval) return false;
  if (!scheduledPublishAt) return true;
  return new Date(scheduledPublishAt).getTime() <= new Date(nowISO).getTime();
}
