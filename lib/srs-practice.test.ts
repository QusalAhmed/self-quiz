import { buildSrsPracticeId, createInitialSrsPracticeRecord } from './srs-practice';

describe('buildSrsPracticeId', () => {
  it('builds the correct composite key', () => {
    expect(buildSrsPracticeId('abc', 'wordToMeaning')).toBe('abc:srs-practice:wordToMeaning');
  });
});

describe('createInitialSrsPracticeRecord', () => {
  it('creates a record with the latest difficulty', () => {
    const record = createInitialSrsPracticeRecord(
      'w1',
      'wordToMeaning',
      'Hello',
      'A greeting',
      'good',
      '2026-07-01T00:00:00.000Z'
    );

    expect(record.id).toBe('w1:srs-practice:wordToMeaning');
    expect(record.difficulty).toBe('good');
    expect(record.practicedAt).toBe('2026-07-01T00:00:00.000Z');
    expect(record.updatedAt).toBe('2026-07-01T00:00:00.000Z');
    expect(record.isDeleted).toBe(false);
  });
});
