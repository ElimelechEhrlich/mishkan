const moneyFormat = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number): string {
  return moneyFormat.format(amount);
}

/** An answer as plain text: markdown marks a model may still add (bold, headings) taken out. */
export function plainAnswer(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ');
}

/** A button under an answer, to what the assistant just did: a page of the app and its name. */
export type AnswerLink = { readonly path: string; readonly title: string };

const linkLine = /^\[\[link:(\/[^|\]]*)\|([^\]]*)\]\]$/;

/**
 * An answer and the buttons that come at its end, as lines "[[link:/item/<id>|<title>]]";
 * only paths within the app count, anything else stays text.
 */
export function splitAnswer(text: string): { readonly text: string; readonly links: AnswerLink[] } {
  const links: AnswerLink[] = [];
  const kept: string[] = [];
  for (const line of text.split('\n')) {
    const match = linkLine.exec(line.trim());
    if (match?.[1] !== undefined && match[2] !== undefined) {
      links.push({ path: match[1], title: match[2].trim() });
    } else {
      kept.push(line);
    }
  }
  return { text: plainAnswer(kept.join('\n').trim()), links };
}
