import { getTodayDateString, matchesFsrsReviewDateFilter } from './utils';

describe('matchesFsrsReviewDateFilter', () => {
  const fixedNow = '2026-09-09T12:00:00.000Z';

  it('matches all when filter is "all"', () => {
    expect(
      matchesFsrsReviewDateFilter('2026-09-09T10:00:00.000Z', 'all', undefined, fixedNow)
    ).toBe(true);
    expect(
      matchesFsrsReviewDateFilter('2026-09-25T10:00:00.000Z', 'all', undefined, fixedNow)
    ).toBe(true);
    expect(matchesFsrsReviewDateFilter(undefined, 'all', undefined, fixedNow)).toBe(true);
  });

  it('returns false for missing or invalid dates when filter is not "all"', () => {
    expect(matchesFsrsReviewDateFilter(undefined, 'current', undefined, fixedNow)).toBe(false);
    expect(matchesFsrsReviewDateFilter('invalid-date', 'current', undefined, fixedNow)).toBe(false);
  });

  it('matches overdue and today cards under "current" filter (due by today)', () => {
    // Overdue (yesterday)
    expect(
      matchesFsrsReviewDateFilter('2026-09-08T12:00:00.000Z', 'current', undefined, fixedNow)
    ).toBe(true);
    // Earlier today
    expect(
      matchesFsrsReviewDateFilter('2026-09-09T04:00:00.000Z', 'current', undefined, fixedNow)
    ).toBe(true);
    // Later today
    expect(
      matchesFsrsReviewDateFilter('2026-09-09T13:00:00.000Z', 'current', undefined, fixedNow)
    ).toBe(true);
    // Tomorrow (should not match)
    expect(
      matchesFsrsReviewDateFilter('2026-09-10T12:00:00.000Z', 'current', undefined, fixedNow)
    ).toBe(false);
  });

  it('matches cards due on or before tomorrow under "tomorrow" filter', () => {
    // Today matches
    expect(
      matchesFsrsReviewDateFilter('2026-09-09T12:00:00.000Z', 'tomorrow', undefined, fixedNow)
    ).toBe(true);
    // Tomorrow matches
    expect(
      matchesFsrsReviewDateFilter('2026-09-10T12:00:00.000Z', 'tomorrow', undefined, fixedNow)
    ).toBe(true);
    // Day after tomorrow does not match
    expect(
      matchesFsrsReviewDateFilter('2026-09-11T12:00:00.000Z', 'tomorrow', undefined, fixedNow)
    ).toBe(false);
  });

  it('matches cards due within 7 days under "week" filter', () => {
    // 3 days from now
    expect(
      matchesFsrsReviewDateFilter('2026-09-12T12:00:00.000Z', 'week', undefined, fixedNow)
    ).toBe(true);
    // 6 days from now
    expect(
      matchesFsrsReviewDateFilter('2026-09-15T12:00:00.000Z', 'week', undefined, fixedNow)
    ).toBe(true);
    // 10 days from now does not match
    expect(
      matchesFsrsReviewDateFilter('2026-09-19T12:00:00.000Z', 'week', undefined, fixedNow)
    ).toBe(false);
  });

  it('matches cards due by custom date under "custom" filter', () => {
    const customDate = '2026-09-15';
    // On or before custom date matches
    expect(
      matchesFsrsReviewDateFilter('2026-09-12T12:00:00.000Z', 'custom', customDate, fixedNow)
    ).toBe(true);
    expect(
      matchesFsrsReviewDateFilter('2026-09-15T12:00:00.000Z', 'custom', customDate, fixedNow)
    ).toBe(true);
    // After custom date does not match
    expect(
      matchesFsrsReviewDateFilter('2026-09-17T12:00:00.000Z', 'custom', customDate, fixedNow)
    ).toBe(false);
  });
});

describe('getTodayDateString', () => {
  it('formats date as YYYY-MM-DD', () => {
    const d = new Date(2026, 8, 9); // Month 8 is September
    expect(getTodayDateString(d)).toBe('2026-09-09');
  });
});
