export interface InfoCard {
  id: string;
  title_de: string;
  title_en: string;
  content_de: string;
  content_en: string;
  createdAt: string;
  // Legacy fields from old format — may still exist in DB
  title?: string;
  content?: string;
}

/** Safe accessor: returns the localized title, falling back to legacy `title` field */
export function getCardTitle(card: InfoCard, lang: 'de' | 'en'): string {
  return (lang === 'de' ? card.title_de : card.title_en) || card.title || card.title_de || card.title_en || '';
}

/** Safe accessor: returns the localized content, falling back to legacy `content` field */
export function getCardContent(card: InfoCard, lang: 'de' | 'en'): string {
  return (lang === 'de' ? card.content_de : card.content_en) || card.content || card.content_de || card.content_en || '';
}

/**
 * Returns the newest card creation timestamp.
 * We use this as a lightweight "announcement version" so each browser
 * can decide whether newly added info cards should be shown once again.
 */
export function getLatestInfoCardVersion(cards: InfoCard[]): string | null {
  if (!Array.isArray(cards) || cards.length === 0) {
    return null;
  }

  let latestTimestamp = 0;

  for (const card of cards) {
    const parsed = Date.parse(card.createdAt || '');
    if (!Number.isNaN(parsed) && parsed > latestTimestamp) {
      latestTimestamp = parsed;
    }
  }

  return latestTimestamp > 0 ? new Date(latestTimestamp).toISOString() : null;
}
