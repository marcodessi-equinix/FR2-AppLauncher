import { Group, Link } from '../types';

const MAX_ICON_LENGTH = 500000;

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const getTimestamp = (): string => Math.floor(Date.now() / 1000).toString();

const isExportableLink = (link: Link | undefined): link is Link => {
  if (!link) return false;
  return typeof link.url === 'string' && link.url.trim().length > 0;
};

const buildBookmarkLink = (link: Link): string => {
  const title = escapeHtml(link.title?.trim() || link.url.trim());
  const url = escapeHtml(link.url.trim());
  const timestamp = getTimestamp();
  const icon = typeof link.icon === 'string' && link.icon.length > 0 && link.icon.length <= MAX_ICON_LENGTH
    ? ` ICON="${escapeHtml(link.icon)}"`
    : '';

  return `      <DT><A HREF="${url}" ADD_DATE="${timestamp}"${icon}>${title}</A>`;
};

export const buildBookmarksHtml = (groups: Group[]): string => {
  const timestamp = getTimestamp();
  const lines: string[] = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file.',
    '     It will be read and overwritten.',
    '     DO NOT EDIT! -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
    `  <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">AppLauncher</H3>`,
    '  <DL><p>',
  ];

  for (const group of groups) {
    const links = (group.links || []).filter(isExportableLink).sort((left, right) => left.order - right.order);
    if (links.length === 0) {
      continue;
    }

    const groupTitle = escapeHtml(group.title?.trim() || 'Untitled');
    lines.push(`    <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${groupTitle}</H3>`);
    lines.push('    <DL><p>');

    for (const link of links) {
      lines.push(buildBookmarkLink(link));
    }

    lines.push('    </DL><p>');
  }

  lines.push('  </DL><p>');
  lines.push('</DL><p>');

  return `${lines.join('\n')}\n`;
};

export const downloadBookmarksFile = (groups: Group[]): void => {
  const orderedGroups = [...groups].sort((left, right) => left.order - right.order);
  const html = buildBookmarksHtml(orderedGroups);
  const datePart = new Date().toISOString().slice(0, 10);
  const fileName = `applauncher-bookmarks-${datePart}.html`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
};