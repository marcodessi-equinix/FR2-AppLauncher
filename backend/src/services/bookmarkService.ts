import * as cheerio from 'cheerio';
import db from '../db/index';
import { normalizeStoredIconValue } from '../lib/iconPolicy';

function isAllowedUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

interface ImportResult {
  success: boolean;
  groups: number;
  links: number;
  message: string;
}


export interface ParsedLink {
  title: string;
  url: string;
  icon?: string;
  selected?: boolean; // Frontend helper
}

export interface ParsedGroup {
  title: string;
  links: ParsedLink[];
  selected?: boolean; // Frontend helper
  targetGroup?: string; // Rename/Assign capability
}

export interface ImportPreviewData {
  groups: ParsedGroup[];
  totalLinks: number;
}

export function parseBookmarksFromHtml(html: string): ImportPreviewData {
  const $ = cheerio.load(html);
  const groups: ParsedGroup[] = [];
  let totalLinks = 0;

  // Find all <h3> elements on the page (these are the folders/categories in most browsers' bookmark exports)
  $('h3').each((_, h3) => {
      const $h3 = $(h3);
      const groupTitle = $h3.text().trim();
      
      if (!groupTitle) return; // Skip empty folder names
      
      const groupLinks: ParsedLink[] = [];

      // Find the associated <dl> tag that should contain the links
      let $dl = $h3.next('dl');
      if (!$dl.length) $dl = $h3.parent().next('dl');
      if (!$dl.length) $dl = $h3.closest('dt').next('dl');

      if ($dl.length) {
          // Find all <a> tags inside this <dl> (the actual bookmarks)
          // Deeply nested folders are flattened into the parent group
          $dl.find('a').each((_, a) => {
              const $link = $(a);
              const title = $link.text().trim();
              const url = $link.attr('href');
              
              // Skip invalid or dangerous URLs
              if (title && url && isAllowedUrl(url)) {
                  const icon = normalizeStoredIconValue($link.attr('icon') || '');

                  groupLinks.push({ title, url, icon });
                  totalLinks++;
              }
          });
      }

      // Only add folders that contain actual links
      if (groupLinks.length > 0) {
          groups.push({ title: groupTitle, links: groupLinks });
      }
  });

  return { groups, totalLinks };
}

export function saveImportedData(data: ImportPreviewData, keepExisting: boolean = false) {
    let totalGroups = 0;
    let totalLinks = 0;

    const importTx = db.transaction(() => {
        if (!keepExisting) {
            db.exec('DELETE FROM links');
            db.exec('DELETE FROM groups');
            db.exec("DELETE FROM sqlite_sequence WHERE name IN ('links', 'groups')");
        }

        // Get max order if keeping existing
        let groupOrder = 0;
        if (keepExisting) {
            const row = db.prepare('SELECT MAX("order") as maxOrder FROM groups').get() as { maxOrder: number };
            groupOrder = (row?.maxOrder || 0) + 1;
        }

        const insertGroup = db.prepare('INSERT INTO groups (title, "order") VALUES (?, ?)');
        const insertLink = db.prepare('INSERT INTO links (group_id, title, url, description, icon, "order") VALUES (?, ?, ?, ?, ?, ?)');

        for (const group of data.groups) {
            // Check if group exists (by title) if we want to merge?
            let groupId: number | bigint;
            let isNewGroup = false;
            
            const existingGroup = db.prepare('SELECT id FROM groups WHERE title = ?').get(group.title) as { id: number } | undefined;
            
            if (existingGroup) {
                 groupId = existingGroup.id;
            } else {
                 const info = insertGroup.run(group.title, groupOrder++);
                 groupId = info.lastInsertRowid;
                 isNewGroup = true;
            }

            if (isNewGroup || !keepExisting) totalGroups++;

            // Get max link order for this group
            let linkOrder = 0;
            const linkRow = db.prepare('SELECT MAX("order") as maxOrder FROM links WHERE group_id = ?').get(groupId) as { maxOrder: number };
            linkOrder = (linkRow?.maxOrder || 0) + 1;

            for (const link of group.links) {
                insertLink.run(groupId, link.title, link.url, '', link.icon || '', linkOrder++);
                totalLinks++;
            }
        }
    });

    importTx();
    return { success: true, groups: totalGroups, links: totalLinks, message: 'Import successful' };
}

