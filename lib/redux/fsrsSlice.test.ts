import { createInitialFsrsRecord } from '@/lib/fsrs';
import fsrsReducer, {
  answerCard,
  loadDeck,
  resetSession,
  revealAnswer,
  selectCanUndo,
  selectCardCounts,
  selectCurrentCard,
  selectIsDeckComplete,
  tickTimer,
  undoAnswer,
} from './slices/fsrsSlice';

const baseDate = new Date('2026-01-01T12:00:00.000Z');

describe('fsrsSlice', () => {
  const card1 = createInitialFsrsRecord('w1', 'wordToMeaning', 'Apple', 'A fruit', baseDate);
  const card2 = createInitialFsrsRecord(
    'w2',
    'wordToMeaning',
    'Book',
    'Something to read',
    baseDate
  );

  it('should load a deck of cards and initialize due queue', () => {
    const state = fsrsReducer(undefined, loadDeck([card1, card2]));

    expect(Object.keys(state.cards)).toHaveLength(2);
    expect(state.queue).toHaveLength(2);
    expect(state.currentCardId).toBe('w1:fsrs:wordToMeaning');
    expect(state.isRevealed).toBe(false);
  });

  it('should optimistically update a card state when answered', () => {
    let state = fsrsReducer(undefined, loadDeck([card1, card2]));
    state = fsrsReducer(state, revealAnswer());
    expect(state.isRevealed).toBe(true);

    // Answer 'good'
    state = fsrsReducer(
      state,
      answerCard({ cardId: card1.id, rating: 'good', nowIso: baseDate.toISOString() })
    );

    const updatedCard1 = state.cards[card1.id];
    expect(updatedCard1.reps).toBe(1);
    expect(updatedCard1.state).toBe('Learning');
    expect(state.isRevealed).toBe(false);
    expect(state.reviewLogsCount).toBe(1);
  });

  it('should allow undoing an answered card', () => {
    let state = fsrsReducer(undefined, loadDeck([card1, card2]));
    expect(selectCanUndo({ fsrs: state })).toBe(false);

    state = fsrsReducer(state, revealAnswer());
    state = fsrsReducer(
      state,
      answerCard({ cardId: card1.id, rating: 'good', nowIso: baseDate.toISOString() })
    );

    expect(selectCanUndo({ fsrs: state })).toBe(true);
    expect(state.reviewLogsCount).toBe(1);
    expect(state.currentCardId).toBe(card2.id);

    // Perform Undo
    state = fsrsReducer(state, undoAnswer());

    expect(selectCanUndo({ fsrs: state })).toBe(false);
    expect(state.cards[card1.id].reps).toBe(0);
    expect(state.currentCardId).toBe(card1.id);
    expect(state.isRevealed).toBe(true);
    expect(state.reviewLogsCount).toBe(0);
  });

  it('should dynamically add cards to queue when timer ticks past dueAt', () => {
    const nowMs = Date.now();
    const futureDate = new Date(nowMs + 60000); // 60s in the future
    const futureCard = {
      ...card1,
      dueAt: futureDate.toISOString(),
    };

    let state = fsrsReducer(undefined, loadDeck([futureCard]));
    expect(state.queue).toHaveLength(0);

    // Tick timer 30 seconds later (still not due)
    state = fsrsReducer(state, tickTimer(new Date(nowMs + 30000).toISOString()));
    expect(state.queue).toHaveLength(0);

    // Tick timer 65 seconds later (now due!)
    state = fsrsReducer(state, tickTimer(new Date(nowMs + 65000).toISOString()));
    expect(state.queue).toHaveLength(1);
    expect(state.queue[0]).toBe(futureCard.id);
    expect(state.currentCardId).toBe(futureCard.id);
  });

  it('should calculate card counts correctly', () => {
    const state = fsrsReducer(undefined, loadDeck([card1, card2]));
    const counts = selectCardCounts({ fsrs: state });

    expect(counts.newCount).toBe(2);
    expect(counts.learningCount).toBe(0);
    expect(counts.reviewCount).toBe(0);
    expect(counts.totalDueCount).toBe(2);
  });

  it('should detect when deck is complete', () => {
    let state = fsrsReducer(undefined, loadDeck([]));
    expect(selectIsDeckComplete({ fsrs: state })).toBe(true);

    state = fsrsReducer(undefined, loadDeck([card1]));
    expect(selectIsDeckComplete({ fsrs: state })).toBe(false);
  });
});
