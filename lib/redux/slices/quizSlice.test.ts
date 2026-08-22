import quizReducer, {
  computePoolSignature,
  nextCard,
  openAllWordsQuiz,
  openFsrsQuiz,
  openTodayQuiz,
  previousCard,
  pushQuizHistory,
  type QuizItem,
  type QuizSliceState,
  removeQuizItem,
  selectCanUndoQuiz,
  selectCurrentQuizIndex,
  selectCurrentQuizItem,
  selectQuizCompleted,
  selectQuizFilters,
  selectQuizQueue,
  selectQuizRevealed,
  selectQuizState,
  setMode,
  setPracticeDisplayMode,
  setQuizDirection,
  setQuizFilters,
  setQuizGroupFilter,
  setQuizQueue,
  setQuizRange,
  setQuizSource,
  setRevealed,
  syncQueueItems,
  undoQuizHistory,
  updateQuizItem,
} from './quizSlice';

describe('quizSlice', () => {
  const dummyItems: QuizItem[] = [
    {
      id: 'word-1',
      word: 'abate',
      meaning: 'to lessen',
      definitions: [{ meaning: 'to lessen', partOfSpeech: 'verb', examples: [], userExamples: [] }],
      tags: ['GRE'],
      notes: 'test note',
    },
    {
      id: 'word-2',
      word: 'benign',
      meaning: 'gentle, kindly',
      definitions: [
        { meaning: 'gentle, kindly', partOfSpeech: 'adjective', examples: [], userExamples: [] },
      ],
      tags: ['TOEFL'],
    },
    {
      id: 'word-3',
      word: 'cacophony',
      meaning: 'harsh discordance of sound',
      definitions: [
        {
          meaning: 'harsh discordance of sound',
          partOfSpeech: 'noun',
          examples: [],
          userExamples: [],
        },
      ],
    },
  ];

  it('initializes with default state', () => {
    const state = quizReducer(undefined, { type: '@@INIT' });
    expect(state.mode).toBe('study');
    expect(state.quizRange).toBe('all');
    expect(state.quizSource).toBe('words');
    expect(state.quizDirection).toBe('wordToMeaning');
    expect(state.quizGroupFilter).toBe('all');
    expect(state.queue).toEqual([]);
    expect(state.currentIndex).toBe(0);
    expect(state.revealed).toBe(false);
    expect(state.completed).toBe(false);
    expect(state.history).toEqual([]);
  });

  it('handles setting quiz queue and resets index/revealed/completed', () => {
    const initialState = quizReducer(undefined, { type: '@@INIT' });
    const poolSig = 'all::words::wordToMeaning::all::::';
    const state = quizReducer(
      initialState,
      setQuizQueue({ queue: dummyItems, poolSignature: poolSig })
    );

    expect(state.queue).toHaveLength(3);
    expect(state.queue[0].word).toBe('abate');
    expect(state.currentIndex).toBe(0);
    expect(state.revealed).toBe(false);
    expect(state.completed).toBe(false);
    expect(state.poolSignature).toBe(poolSig);
    expect(state.isInitialized).toBe(true);
  });

  it('handles navigation with nextCard and previousCard', () => {
    let state = quizReducer(undefined, setQuizQueue({ queue: dummyItems, poolSignature: 'test' }));

    state = quizReducer(state, setRevealed(true));
    expect(state.revealed).toBe(true);

    state = quizReducer(state, nextCard());
    expect(state.currentIndex).toBe(1);
    expect(state.revealed).toBe(false);
    expect(state.completed).toBe(false);

    state = quizReducer(state, nextCard());
    expect(state.currentIndex).toBe(2);
    expect(state.completed).toBe(false);

    // Reaching end of queue marks completed
    state = quizReducer(state, nextCard());
    expect(state.completed).toBe(true);

    // Previous card moves backward
    state = quizReducer(state, previousCard());
    expect(state.currentIndex).toBe(1);
    expect(state.revealed).toBe(false);
  });

  it('handles undo history correctly', () => {
    let state = quizReducer(undefined, setQuizQueue({ queue: dummyItems, poolSignature: 'test' }));

    state = quizReducer(
      state,
      pushQuizHistory({
        previousQueue: [...state.queue],
        previousIndex: 0,
        previousRevealed: false,
        previousCompleted: false,
      })
    );

    state = quizReducer(state, nextCard());
    expect(state.currentIndex).toBe(1);
    expect(state.history).toHaveLength(1);

    state = quizReducer(state, undoQuizHistory());
    expect(state.currentIndex).toBe(0);
    expect(state.revealed).toBe(true);
    expect(state.history).toHaveLength(0);
  });

  it('updates a specific quiz item in place without changing queue order', () => {
    let state = quizReducer(undefined, setQuizQueue({ queue: dummyItems, poolSignature: 'test' }));

    state = quizReducer(
      state,
      updateQuizItem({
        id: 'word-2',
        meaning: 'updated meaning',
        notes: 'new notes',
      })
    );

    expect(state.queue[1].id).toBe('word-2');
    expect(state.queue[1].meaning).toBe('updated meaning');
    expect(state.queue[1].notes).toBe('new notes');
    expect(state.queue[0].word).toBe('abate');
    expect(state.queue[2].word).toBe('cacophony');
  });

  it('removes a quiz item and adjusts index safely', () => {
    let state = quizReducer(undefined, setQuizQueue({ queue: dummyItems, poolSignature: 'test' }));

    state = quizReducer(state, nextCard());
    state = quizReducer(state, nextCard());
    expect(state.currentIndex).toBe(2);

    state = quizReducer(state, removeQuizItem('word-3'));
    expect(state.queue).toHaveLength(2);
    expect(state.currentIndex).toBe(1);

    state = quizReducer(state, removeQuizItem('word-1'));
    state = quizReducer(state, removeQuizItem('word-2'));
    expect(state.queue).toHaveLength(0);
    expect(state.completed).toBe(true);
    expect(state.currentIndex).toBe(0);
  });

  it('handles syncQueueItems to refresh card definitions', () => {
    let state = quizReducer(undefined, setQuizQueue({ queue: dummyItems, poolSignature: 'test' }));

    const updatedItems = dummyItems.map((item) => ({
      ...item,
      word: item.word.toUpperCase(),
    }));

    state = quizReducer(state, syncQueueItems(updatedItems));
    expect(state.queue[0].word).toBe('ABATE');
    expect(state.queue[1].word).toBe('BENIGN');
  });

  it('handles shortcut actions: openAllWordsQuiz, openTodayQuiz, openFsrsQuiz', () => {
    let state = quizReducer(undefined, { type: '@@INIT' });

    state = quizReducer(state, openAllWordsQuiz());
    expect(state.mode).toBe('quiz');
    expect(state.quizSource).toBe('words');
    expect(state.quizRange).toBe('all');
    expect(state.quizGroupFilter).toBe('all');

    state = quizReducer(state, openTodayQuiz());
    expect(state.mode).toBe('quiz');
    expect(state.quizSource).toBe('words');
    expect(state.quizRange).toBe('today');

    state = quizReducer(state, openFsrsQuiz());
    expect(state.mode).toBe('quiz');
    expect(state.quizSource).toBe('fsrs');
  });

  it('handles filter setters', () => {
    let state = quizReducer(undefined, { type: '@@INIT' });

    state = quizReducer(state, setMode('quiz'));
    expect(state.mode).toBe('quiz');

    state = quizReducer(state, setQuizRange('today'));
    expect(state.quizRange).toBe('today');

    state = quizReducer(state, setQuizSource('fsrs'));
    expect(state.quizSource).toBe('fsrs');

    state = quizReducer(state, setQuizDirection('meaningToWord'));
    expect(state.quizDirection).toBe('meaningToWord');

    state = quizReducer(state, setQuizGroupFilter('Hard Words'));
    expect(state.quizGroupFilter).toBe('Hard Words');

    state = quizReducer(state, setPracticeDisplayMode('fsrsAgain'));
    expect(state.practiceDisplayMode).toBe('fsrsAgain');

    state = quizReducer(
      state,
      setQuizFilters({
        quizRange: 'custom',
        quizGroupFilter: 'none',
      })
    );
    expect(state.quizRange).toBe('custom');
    expect(state.quizGroupFilter).toBe('none');
  });

  it('computes pool signature properly', () => {
    const sig1 = computePoolSignature({
      quizRange: 'all',
      quizSource: 'words',
      quizDirection: 'wordToMeaning',
      quizGroupFilter: 'all',
      customStart: '2026-01-01T00:00',
      customEnd: '2026-01-02T00:00',
    });
    expect(sig1).toBe('all::words::wordToMeaning::all::::');

    const sig2 = computePoolSignature({
      quizRange: 'custom',
      quizSource: 'words',
      quizDirection: 'spelling',
      quizGroupFilter: 'MyGroup',
      customStart: '2026-01-01T00:00',
      customEnd: '2026-01-02T00:00',
    });
    expect(sig2).toBe('custom::words::spelling::MyGroup::2026-01-01T00:00_2026-01-02T00:00::');
  });

  it('works with selectors correctly', () => {
    const rawState: QuizSliceState = {
      mode: 'quiz',
      quizRange: 'today',
      quizSource: 'words',
      quizDirection: 'wordToMeaning',
      quizGroupFilter: 'all',
      customStart: '2026-01-01T00:00',
      customEnd: '2026-01-02T00:00',
      practiceDisplayMode: 'missed',
      autoPronounceQuizWord: true,
      hideMissedMeanings: false,
      hideSrsPracticeMeanings: false,
      revealedMissedWordIds: {},
      revealedSrsPracticeWordIds: {},
      queue: dummyItems,
      currentIndex: 1,
      revealed: true,
      completed: false,
      history: [
        {
          previousQueue: dummyItems,
          previousIndex: 0,
          previousRevealed: false,
          previousCompleted: false,
        },
      ],
      isInitialized: true,
      poolSignature: 'test-sig',
    };
    const rootState = { quiz: rawState };

    expect(selectQuizState(rootState)).toEqual(rawState);
    expect(selectQuizFilters(rootState)).toEqual({
      mode: 'quiz',
      quizRange: 'today',
      quizSource: 'words',
      quizDirection: 'wordToMeaning',
      quizGroupFilter: 'all',
      customStart: '2026-01-01T00:00',
      customEnd: '2026-01-02T00:00',
      practiceDisplayMode: 'missed',
      autoPronounceQuizWord: true,
      hideMissedMeanings: false,
      hideSrsPracticeMeanings: false,
    });
    expect(selectQuizQueue(rootState)).toEqual(dummyItems);
    expect(selectCurrentQuizIndex(rootState)).toBe(1);
    expect(selectCurrentQuizItem(rootState)).toEqual(dummyItems[1]);
    expect(selectQuizRevealed(rootState)).toBe(true);
    expect(selectQuizCompleted(rootState)).toBe(false);
    expect(selectCanUndoQuiz(rootState)).toBe(true);
  });
});
