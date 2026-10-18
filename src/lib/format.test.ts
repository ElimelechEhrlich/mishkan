import { describe, expect, it } from 'vitest';
import { splitAnswer } from './format';

describe('splitAnswer', () => {
  it('takes the buttons out of the end of an answer', () => {
    const answer = splitAnswer(
      'הוספתי **משימה**.\n\n[[link:/item/abc-1|לקנות חלב]]\n[[link:/shopping|רשימת הקניות]]',
    );
    expect(answer.text).toBe('הוספתי משימה.');
    expect(answer.links).toEqual([
      { path: '/item/abc-1', title: 'לקנות חלב' },
      { path: '/shopping', title: 'רשימת הקניות' },
    ]);
  });

  it('leaves an answer without buttons as it is, and a link out of the app as text', () => {
    expect(splitAnswer('שלום').links).toEqual([]);
    const outside = splitAnswer('[[link:https://example.com|x]]');
    expect(outside.links).toEqual([]);
    expect(outside.text).toBe('[[link:https://example.com|x]]');
  });
});
