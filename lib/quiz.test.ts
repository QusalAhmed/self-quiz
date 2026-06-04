import { buildQuizQuestion } from './quiz';

describe('buildQuizQuestion', () => {
  const words = [
    { id: '1', word: 'abate', meaning: 'to lessen' },
    { id: '2', word: 'benevolent', meaning: 'kind' },
    { id: '3', word: 'candid', meaning: 'truthful' },
  ];

  it('returns null when there are not enough words', () => {
    expect(buildQuizQuestion([words[0]])).toBeNull();
  });

  it('builds a quiz question with the correct answer included', () => {
    const randomSequence = [0.1, 0.2, 0.3, 0.4, 0.5];
    let index = 0;
    const random = () => {
      const value = randomSequence[index % randomSequence.length];
      index += 1;
      return value;
    };

    const question = buildQuizQuestion(words, 3, random);
    expect(question).not.toBeNull();
    expect(question?.options).toContain(question?.answer);
  });
});
