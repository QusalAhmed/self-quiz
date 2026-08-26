import {
  buildFsrsId,
  computeFsrs,
  computeFsrsIntervals,
  createInitialFsrsRecord,
  formatInterval,
} from './fsrs';

const now = new Date('2026-01-01T12:00:00.000Z');

describe('buildFsrsId', () => {
  it('builds the correct composite key', () => {
    expect(buildFsrsId('abc', 'wordToMeaning')).toBe('abc:fsrs:wordToMeaning');
    expect(buildFsrsId('xyz', 'spelling')).toBe('xyz:fsrs:spelling');
  });
});

describe('createInitialFsrsRecord', () => {
  it('creates a record due immediately', () => {
    const record = createInitialFsrsRecord('w1', 'wordToMeaning', 'Hello', 'A greeting', now);

    expect(record.id).toBe('w1:fsrs:wordToMeaning');
    expect(record.state).toBe('New');
    expect(record.dueAt).toBe(now.toISOString());
    expect(record.lastReviewedAt).toBe(now.toISOString());
    expect(record.isDeleted).toBe(false);
  });
});

describe('computeFsrs', () => {
  it('schedules a new card into learning after a good review and stores lastRating', () => {
    const record = createInitialFsrsRecord('w1', 'wordToMeaning', 'Hello', 'A greeting', now);
    const updated = computeFsrs(record, 'good', now);

    expect(updated.state).toBe('Learning');
    expect(updated.reps).toBe(1);
    expect(updated.dueAt).toBe('2026-01-01T12:10:00.000Z');
    expect(updated.lastReviewedAt).toBe(now.toISOString());
    expect(updated.lastRating).toBe('good');
  });

  it('stores again and hard lastRating correctly and updates lastRating on subsequent reviews', () => {
    const record = createInitialFsrsRecord('w1', 'wordToMeaning', 'Hello', 'A greeting', now);
    const againCard = computeFsrs(record, 'again', now);
    expect(againCard.lastRating).toBe('again');

    const hardCard = computeFsrs(record, 'hard', now);
    expect(hardCard.lastRating).toBe('hard');

    // Subsequent good/easy reviews update lastRating to the latest rating given
    const goodAfterAgain = computeFsrs(againCard, 'good', now);
    expect(goodAfterAgain.lastRating).toBe('good');

    const easyAfterAgain = computeFsrs(againCard, 'easy', now);
    expect(easyAfterAgain.lastRating).toBe('easy');
  });
});

describe('formatInterval', () => {
  it('formats short and long intervals into readable string', () => {
    expect(formatInterval(new Date('2026-01-01T12:00:30.000Z'), now)).toBe('<1m');
    expect(formatInterval(new Date('2026-01-01T12:01:00.000Z'), now)).toBe('1m');
    expect(formatInterval(new Date('2026-01-01T12:10:00.000Z'), now)).toBe('10m');
    expect(formatInterval(new Date('2026-01-01T14:00:00.000Z'), now)).toBe('2h');
    expect(formatInterval(new Date('2026-01-05T12:00:00.000Z'), now)).toBe('4d');
    expect(formatInterval(new Date('2026-02-15T12:00:00.000Z'), now)).toBe('1.5mo');
    expect(formatInterval(new Date('2027-01-01T12:00:00.000Z'), now)).toBe('1y');
  });
});

describe('computeFsrsIntervals', () => {
  it('computes next review intervals for all 4 ratings', () => {
    const record = createInitialFsrsRecord('w1', 'wordToMeaning', 'Hello', 'A greeting', now);
    const intervals = computeFsrsIntervals(record, now);

    expect(intervals.again.intervalText).toBe('1m');
    expect(intervals.hard.intervalText).toBe('6m');
    expect(intervals.good.intervalText).toBe('10m');
    expect(intervals.easy.intervalText).toBe('8d');
  });

  it('respects dynamic FSRS settings for requestRetention and maximumInterval', () => {
    const record = createInitialFsrsRecord('w1', 'wordToMeaning', 'Hello', 'A greeting', now);
    const customIntervals = computeFsrsIntervals(record, now, {
      requestRetention: 0.95,
      maximumIntervalDays: 3,
    });

    expect(customIntervals).toBeDefined();
    expect(customIntervals.good.dueAt).toBeDefined();
  });
});
