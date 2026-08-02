import { normalizeDefinitions, sanitizeMeaning } from './definitions';

describe('definitions sanitizeMeaning', () => {
  it('replaces newlines with commas', () => {
    expect(sanitizeMeaning('First definition\nSecond definition')).toBe(
      'First definition, Second definition'
    );
  });

  it('handles Windows CRLF newlines', () => {
    expect(sanitizeMeaning('Line one\r\nLine two')).toBe('Line one, Line two');
  });

  it('handles comma followed by newline cleanly', () => {
    expect(sanitizeMeaning('Line one,\nLine two')).toBe('Line one, Line two');
  });

  it('normalizes definitions with newlines replaced by commas', () => {
    const res = normalizeDefinitions([{ meaning: 'Meaning 1\nMeaning 2', partOfSpeech: 'noun' }]);
    expect(res[0].meaning).toBe('Meaning 1, Meaning 2');
  });
});
