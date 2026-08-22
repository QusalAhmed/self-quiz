import {
  buildWordFamilyId,
  buildWordFamilyUserPrompt,
  extractWordFamilyGenerationResponse,
  getUsageFrequencyBadgeProps,
  getUsageFrequencyColor,
  isWordFamilyId,
  normalizeUsageFrequency,
  normalizeWordFamilyMembers,
  parseWordFamilyId,
  wordFamilyMemberToDefinitions,
  wordFamilyMemberToMeaning,
} from './word-family';

describe('Word Family & Usage Frequency Module', () => {
  describe('normalizeUsageFrequency', () => {
    it('normalizes various string formats correctly', () => {
      expect(normalizeUsageFrequency('Top 500')).toBe('Top 500');
      expect(normalizeUsageFrequency('top 1,000')).toBe('Top 1000');
      expect(normalizeUsageFrequency('top-1000')).toBe('Top 1000');
      expect(normalizeUsageFrequency('1k')).toBe('Top 1000');
      expect(normalizeUsageFrequency('Top 2000')).toBe('Top 2000');
      expect(normalizeUsageFrequency('3k')).toBe('Top 3000');
      expect(normalizeUsageFrequency('5k')).toBe('Top 5000');
      expect(normalizeUsageFrequency('10k')).toBe('Top 10000');
      expect(normalizeUsageFrequency('very high')).toBe('Top 1000');
      expect(normalizeUsageFrequency('high')).toBe('Top 3000');
      expect(normalizeUsageFrequency('medium')).toBe('Top 5000');
      expect(normalizeUsageFrequency('low')).toBe('Top 10000');
      expect(normalizeUsageFrequency('rare')).toBe('Rare');
      expect(normalizeUsageFrequency('specialized')).toBe('Rare');
      expect(normalizeUsageFrequency(null)).toBe('');
      expect(normalizeUsageFrequency(undefined)).toBe('');
      expect(normalizeUsageFrequency('')).toBe('');
    });

    it('normalizes numeric ranks correctly', () => {
      expect(normalizeUsageFrequency(250)).toBe('Top 500');
      expect(normalizeUsageFrequency(800)).toBe('Top 1000');
      expect(normalizeUsageFrequency(1500)).toBe('Top 2000');
      expect(normalizeUsageFrequency(2700)).toBe('Top 3000');
      expect(normalizeUsageFrequency(4500)).toBe('Top 5000');
      expect(normalizeUsageFrequency(8500)).toBe('Top 10000');
      expect(normalizeUsageFrequency(25000)).toBe('Rare');
    });
  });

  describe('getUsageFrequencyColor & getUsageFrequencyBadgeProps', () => {
    it('returns appropriate theme colors for each frequency tier', () => {
      expect(getUsageFrequencyColor('Top 500')).toBe('teal');
      expect(getUsageFrequencyColor('Top 1000')).toBe('green');
      expect(getUsageFrequencyColor('Top 2000')).toBe('cyan');
      expect(getUsageFrequencyColor('Top 3000')).toBe('blue');
      expect(getUsageFrequencyColor('Top 5000')).toBe('orange');
      expect(getUsageFrequencyColor('Top 10000')).toBe('grape');
      expect(getUsageFrequencyColor('Rare')).toBe('gray');
    });

    it('returns rich badge presentation properties', () => {
      const badge1k = getUsageFrequencyBadgeProps('Top 1000');
      expect(badge1k.color).toBe('green');
      expect(badge1k.shortLabel).toBe('Top 1k');
      expect(badge1k.tier).toBe('Foundational');

      const badgeRare = getUsageFrequencyBadgeProps('Rare');
      expect(badgeRare.color).toBe('gray');
      expect(badgeRare.shortLabel).toBe('Rare');
      expect(badgeRare.tier).toBe('Rare');
    });
  });

  describe('extractWordFamilyGenerationResponse & normalizeWordFamilyMembers', () => {
    it('extracts rootUsageFrequency, generatorAiDetails, and member frequency metadata', () => {
      const rawAiResponse = {
        rootUsageFrequency: 'Top 1000',
        generatorAiDetails: 'Google Gemma 4 26B',
        members: [
          {
            word: 'decision',
            partOfSpeech: 'noun',
            banglaDefinition: 'সিদ্ধান্ত',
            englishDefinition: 'a choice made after thinking',
            examples: ['Making a good decision is important.'],
            usageFrequency: 'Top 1000',
          },
          {
            word: 'decisive',
            partOfSpeech: 'adjective',
            banglaDefinition: 'চূড়ান্ত',
            englishDefinition: 'producing a definite result',
            examples: ['He gave a decisive answer.'],
            usageFrequency: 'Top 3000',
          },
        ],
      };

      const result = extractWordFamilyGenerationResponse(
        rawAiResponse,
        'decide',
        'Google Gemma 4 26B'
      );

      expect(result.rootUsageFrequency).toBe('Top 1000');
      expect(result.generatorAiDetails).toBe('Google Gemma 4 26B');
      expect(result.members.length).toBe(2);

      expect(result.members[0].word).toBe('decision');
      expect(result.members[0].usageFrequency).toBe('Top 1000');
      expect(result.members[0].generatorAiDetails).toBe('Google Gemma 4 26B');

      expect(result.members[1].word).toBe('decisive');
      expect(result.members[1].usageFrequency).toBe('Top 3000');
      expect(result.members[1].generatorAiDetails).toBe('Google Gemma 4 26B');
    });

    it('excludes the root word from members list', () => {
      const rawList = [
        { word: 'decide', partOfSpeech: 'verb', banglaDefinition: 'সিদ্ধান্ত নেওয়া' },
        { word: 'decision', partOfSpeech: 'noun', banglaDefinition: 'সিদ্ধান্ত' },
      ];

      const members = normalizeWordFamilyMembers(rawList, 'decide', 'Test AI');
      expect(members.length).toBe(1);
      expect(members[0].word).toBe('decision');
    });
  });

  describe('ID and definition conversion helpers', () => {
    it('builds and parses word family IDs', () => {
      const id = buildWordFamilyId('word-123', 'Decision');
      expect(id).toBe('word-123:decision');
      expect(isWordFamilyId(id)).toBe(true);

      const parsed = parseWordFamilyId(id);
      expect(parsed).toEqual({ rootWordId: 'word-123', memberWord: 'decision' });
    });

    it('formats member meanings and definitions', () => {
      const member = {
        banglaDefinition: 'সিদ্ধান্ত',
        englishDefinition: 'a choice',
        partOfSpeech: 'noun',
        examples: ['Good decision.'],
      };

      expect(wordFamilyMemberToMeaning(member)).toBe('সিদ্ধান্ত (a choice)');
      const defs = wordFamilyMemberToDefinitions(member);
      expect(defs.length).toBe(1);
      expect(defs[0].partOfSpeech).toBe('noun');
      expect(defs[0].examples).toEqual(['Good decision.']);
    });

    it('builds user prompt with meaning if provided', () => {
      const prompt = buildWordFamilyUserPrompt('resolve', 'মীমাংসা করা');
      expect(prompt).toContain('resolve');
      expect(prompt).toContain('মীমাংসা করা');
    });
  });
});
