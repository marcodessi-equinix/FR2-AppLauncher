import type { Group } from '../types';

export interface LinkAnnouncementSnapshotItem {
  id: number;
  title: string;
  url: string;
  groupId: number;
  groupTitle: string;
}

export interface LinkAnnouncementDiff {
  added: LinkAnnouncementSnapshotItem[];
  removed: LinkAnnouncementSnapshotItem[];
  isFirstRun: boolean;
}

export const LINK_ANNOUNCEMENTS_STORAGE_KEY = 'applauncher_link_snapshot_v1';

const sortSnapshot = (items: LinkAnnouncementSnapshotItem[]): LinkAnnouncementSnapshotItem[] =>
  [...items].sort((left, right) => left.id - right.id);

export const createLinkAnnouncementSnapshot = (groups: Group[]): LinkAnnouncementSnapshotItem[] =>
  sortSnapshot(
    (groups || []).flatMap((group) =>
      (group.links || []).map((link) => ({
        id: link.id,
        title: link.title || '',
        url: link.url || '',
        groupId: group.id,
        groupTitle: group.title || '',
      }))
    )
  );

export const readStoredLinkAnnouncementSnapshot = (): LinkAnnouncementSnapshotItem[] => {
  try {
    const raw = localStorage.getItem(LINK_ANNOUNCEMENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortSnapshot(
      parsed
        .filter((item): item is LinkAnnouncementSnapshotItem => typeof item?.id === 'number')
        .map((item) => ({
          id: item.id,
          title: String(item.title || ''),
          url: String(item.url || ''),
          groupId: Number(item.groupId || 0),
          groupTitle: String(item.groupTitle || ''),
        }))
    );
  } catch {
    return [];
  }
};

export const storeLinkAnnouncementSnapshot = (items: LinkAnnouncementSnapshotItem[]) => {
  localStorage.setItem(LINK_ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(sortSnapshot(items)));
};

export const areLinkAnnouncementSnapshotsEqual = (
  left: LinkAnnouncementSnapshotItem[],
  right: LinkAnnouncementSnapshotItem[]
) => JSON.stringify(sortSnapshot(left)) === JSON.stringify(sortSnapshot(right));

export const diffLinkAnnouncementSnapshots = (
  previous: LinkAnnouncementSnapshotItem[],
  current: LinkAnnouncementSnapshotItem[]
): LinkAnnouncementDiff => {
  const previousMap = new Map(previous.map((item) => [item.id, item]));
  const currentMap = new Map(current.map((item) => [item.id, item]));

  const added = current.filter((item) => !previousMap.has(item.id));
  const removed = previous.filter((item) => !currentMap.has(item.id));

  return {
    added,
    removed,
    isFirstRun: previous.length === 0,
  };
};
