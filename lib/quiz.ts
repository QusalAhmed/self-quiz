export type QuizWord = {
  id: string;
  word: string;
  meaning: string;
};

export type QuizQuestion = {
  prompt: string;
  answer: string;
  options: string[];
};

export type RandomSource = () => number;

function shuffle<T>(items: T[], random: RandomSource): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function buildQuizQuestion(
  words: QuizWord[],
  optionCount = 4,
  random: RandomSource = Math.random
): QuizQuestion | null {
  if (words.length < 2) {
    return null;
  }

  const shuffled = shuffle(words, random);
  const target = shuffled[0];
  const distractors = shuffled
    .slice(1)
    .map((word) => word.meaning)
    .filter((meaning, index, all) => all.indexOf(meaning) === index);

  const options = shuffle(
    [target.meaning, ...distractors].slice(0, Math.max(2, optionCount)),
    random
  );

  return {
    prompt: target.word,
    answer: target.meaning,
    options,
  };
}
