const GROUP_CATEGORY_PREFIX = 'group:';

export const DASHBOARD_ALL_CATEGORY = 'all';
export const DASHBOARD_FAVORITES_CATEGORY = 'favorites';

export const getGroupCategoryValue = (groupId: number): string => `${GROUP_CATEGORY_PREFIX}${groupId}`;

export const getGroupIdFromCategory = (category: string | null): number | null => {
  if (!category?.startsWith(GROUP_CATEGORY_PREFIX)) {
    return null;
  }

  const parsed = Number.parseInt(category.slice(GROUP_CATEGORY_PREFIX.length), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};
