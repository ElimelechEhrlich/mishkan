/** A bullet, dash, check mark or number at the head of a line pasted from a list. */
const listMark = /^\s*(?:[-–—•*·▪●◦✓✔☐☑]+|\d+[.)])\s*/u;

/**
 * The items of a shopping list written or pasted one per line, as in a chat message: marks
 * at the head of a line and empty lines are left out, and each item is kept once.
 */
export function shoppingLines(text: string): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(listMark, '').trim();
    if (line !== '' && !seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }
  return lines;
}
