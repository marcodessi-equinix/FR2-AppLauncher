import { Group, Link } from '../types';

const sortGroups = (groups: Group[]): Group[] => [...groups].sort((left, right) => left.order - right.order);

const sortLinks = (links: Link[]): Link[] => [...links].sort((left, right) => left.order - right.order);

export const upsertGroupInDashboard = (groups: Group[], nextGroup: Group): Group[] => {
  const existing = groups.find((group) => group.id === nextGroup.id);
  const mergedGroup: Group = existing
    ? { ...existing, ...nextGroup, links: existing.links || [] }
    : { ...nextGroup, links: [] };

  return sortGroups([
    ...groups.filter((group) => group.id !== nextGroup.id),
    mergedGroup,
  ]);
};

export const removeGroupFromDashboard = (groups: Group[], groupId: number): Group[] =>
  groups.filter((group) => group.id !== groupId);

export const upsertLinkInDashboard = (groups: Group[], nextLink: Link): Group[] => {
  const cleanedGroups = groups.map((group) => ({
    ...group,
    links: (group.links || []).filter((link) => link.id !== nextLink.id),
  }));

  return cleanedGroups.map((group) => {
    if (group.id !== nextLink.group_id) {
      return group;
    }

    return {
      ...group,
      links: sortLinks([...(group.links || []), nextLink]),
    };
  });
};

export const removeLinkFromDashboard = (groups: Group[], linkId: number): Group[] =>
  groups.map((group) => ({
    ...group,
    links: (group.links || []).filter((link) => link.id !== linkId),
  }));