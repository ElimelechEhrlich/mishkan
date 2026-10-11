const segmenter = new Intl.Segmenter('he', { granularity: 'grapheme' });

/** The database keeps up to 16 code units for an emoji picture. */
const maxStoredLength = 16;

/**
 * What a typed picture keeps: whole characters only (an emoji such as 👨‍👩‍👧 is one), at most
 * `count` of them, and never more than the database stores.
 */
export function limitEmoji(text: string, count: number): string {
  let kept = '';
  let taken = 0;
  for (const { segment } of segmenter.segment(text)) {
    if (taken === count || kept.length + segment.length > maxStoredLength) {
      break;
    }
    kept += segment;
    taken += 1;
  }
  return kept;
}
