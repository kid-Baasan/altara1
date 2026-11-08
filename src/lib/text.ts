// Small text helpers shared by public pages. Content from the admin is plain text; these turn it into safe HTML.

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Escape text, then turn `[label](/path)` into a link. Only same-site paths and https:// URLs are linked. */
export function inlineLinks(text: string): string {
  return escapeHtml(text).replace(/\[([^\]]+)\]\(((?:\/|https:\/\/)[^)\s]*)\)/g, (_m, label: string, href: string) => {
    return `<a href="${href}" class="faq-contact-link">${label}</a>`;
  });
}

/** Blank-line separated paragraphs. */
export const paragraphs = (text: string) => text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

/** "5 Days / 4 Nights". */
export function durationLabel(days: number): string {
  if (days <= 1) return '1 Day';
  return `${days} Days / ${days - 1} Nights`;
}

/** "12 March 2026" from a YYYY-MM-DD date. */
export function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Two-digit day number for itinerary headings ("Day 01"). */
export const dayNumber = (n: number) => String(n).padStart(2, '0');
