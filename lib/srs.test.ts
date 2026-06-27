import { computeSm2, createInitialSrsRecord, buildSrsId } from './srs';

const initialState = { easeFactor: 2.5, interval: 0, repetitions: 0 };
const now = new Date('2026-01-01T12:00:00Z');

describe('computeSm2', () => {
  describe('again (grade 0)', () => {
    it('resets repetitions and interval to 1', () => {
      const result = computeSm2({ ...initialState, repetitions: 5, interval: 30 }, 'again', now);
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
    });

    it('decrements ease factor by 0.2', () => {
      const result = computeSm2(initialState, 'again', now);
      expect(result.easeFactor).toBeCloseTo(2.3, 5);
    });

    it('clamps ease factor to minimum 1.3', () => {
      const state = { ...initialState, easeFactor: 1.35 };
      const result = computeSm2(state, 'again', now);
      expect(result.easeFactor).toBe(1.3);
    });

    it('schedules next review in 1 day', () => {
      const result = computeSm2(initialState, 'again', now);
      const nextDate = new Date(result.nextReviewAt);
      const diff = nextDate.getDate() - now.getDate();
      expect(diff).toBe(1);
    });
  });

  describe('hard (grade 2)', () => {
    it('resets repetitions and interval', () => {
      const result = computeSm2({ ...initialState, repetitions: 3, interval: 10 }, 'hard', now);
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
    });

    it('decrements ease factor by 0.15', () => {
      const result = computeSm2(initialState, 'hard', now);
      expect(result.easeFactor).toBeCloseTo(2.35, 5);
    });
  });

  describe('good (grade 4)', () => {
    it('interval is 1 on first repetition', () => {
      const result = computeSm2(initialState, 'good', now);
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1);
    });

    it('interval is 6 on second repetition', () => {
      const state = { easeFactor: 2.5, interval: 1, repetitions: 1 };
      const result = computeSm2(state, 'good', now);
      expect(result.repetitions).toBe(2);
      expect(result.interval).toBe(6);
    });

    it('multiplies interval by easeFactor on subsequent repetitions', () => {
      const state = { easeFactor: 2.5, interval: 6, repetitions: 2 };
      const result = computeSm2(state, 'good', now);
      expect(result.interval).toBe(Math.round(6 * 2.5));
    });

    it('does not change ease factor', () => {
      const result = computeSm2(initialState, 'good', now);
      expect(result.easeFactor).toBe(2.5);
    });
  });

  describe('easy (grade 5)', () => {
    it('gives extra interval bonus on later repetitions', () => {
      const state = { easeFactor: 2.5, interval: 6, repetitions: 2 };
      const goodResult = computeSm2(state, 'good', now);
      const easyResult = computeSm2(state, 'easy', now);
      expect(easyResult.interval).toBeGreaterThan(goodResult.interval);
    });

    it('significantly increases ease factor', () => {
      const result = computeSm2(initialState, 'easy', now);
      expect(result.easeFactor).toBeGreaterThan(2.5);
    });
  });
});

describe('buildSrsId', () => {
  it('builds the correct composite key', () => {
    expect(buildSrsId('abc', 'wordToMeaning')).toBe('abc:srs:wordToMeaning');
    expect(buildSrsId('xyz', 'spelling')).toBe('xyz:srs:spelling');
  });
});

describe('createInitialSrsRecord', () => {
  it('creates a record due immediately', () => {
    const record = createInitialSrsRecord('w1', 'wordToMeaning', 'Hello', 'A greeting');
    expect(record.id).toBe('w1:srs:wordToMeaning');
    expect(record.easeFactor).toBe(2.5);
    expect(record.interval).toBe(0);
    expect(record.repetitions).toBe(0);
    expect(record.isDeleted).toBe(false);
    const due = new Date(record.nextReviewAt).getTime();
    expect(due).toBeLessThanOrEqual(Date.now() + 1000); // due now (within 1s)
  });
});
