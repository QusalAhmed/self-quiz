import type { GroupRecord, WordRecord } from './db';
import {
  getActiveGroupNames,
  getWordGroups,
  removeGroupFromWordGroups,
  replaceGroupInWordGroups,
  wordHasAnyGroup,
  wordHasGroup,
} from './groups';

describe('groups utility', () => {
  describe('getActiveGroupNames', () => {
    it('returns sorted unique group names and ignores deleted or empty groups', () => {
      const groups: GroupRecord[] = [
        {
          id: '1',
          name: 'Include',
          createdAt: '',
          updatedAt: '',
          isDeleted: false,
          lastSyncedAt: '',
        },
        {
          id: '2',
          name: 'Include',
          createdAt: '',
          updatedAt: '',
          isDeleted: false,
          lastSyncedAt: '',
        },
        {
          id: '3',
          name: '  GRE  ',
          createdAt: '',
          updatedAt: '',
          isDeleted: false,
          lastSyncedAt: '',
        },
        {
          id: '4',
          name: 'DeletedGroup',
          createdAt: '',
          updatedAt: '',
          isDeleted: true,
          lastSyncedAt: '',
        },
        {
          id: '5',
          name: '   ',
          createdAt: '',
          updatedAt: '',
          isDeleted: false,
          lastSyncedAt: '',
        },
        {
          id: '6',
          name: 'Academic',
          createdAt: '',
          updatedAt: '',
          isDeleted: false,
          lastSyncedAt: '',
        },
      ];

      const result = getActiveGroupNames(groups);
      expect(result).toEqual(['Academic', 'GRE', 'Include']);
    });

    it('returns empty array when no active groups exist', () => {
      expect(getActiveGroupNames([])).toEqual([]);
    });
  });

  describe('getWordGroups', () => {
    it('extracts non-empty trimmed strings from word.customGroups', () => {
      const word: Pick<WordRecord, 'customGroups'> = {
        customGroups: ['SAT', '  ', 'GRE'],
      };
      expect(getWordGroups(word)).toEqual(['SAT', 'GRE']);
    });

    it('handles undefined or non-array customGroups gracefully', () => {
      expect(getWordGroups({ customGroups: undefined as any })).toEqual([]);
    });
  });

  describe('wordHasGroup & wordHasAnyGroup', () => {
    it('checks group existence correctly', () => {
      const word: Pick<WordRecord, 'customGroups'> = {
        customGroups: ['Verbs', 'Nouns'],
      };
      expect(wordHasGroup(word, 'Verbs')).toBe(true);
      expect(wordHasGroup(word, '  Verbs  ')).toBe(true);
      expect(wordHasGroup(word, 'Adjectives')).toBe(false);
      expect(wordHasGroup(word, '')).toBe(false);
      expect(wordHasAnyGroup(word)).toBe(true);
      expect(wordHasAnyGroup({ customGroups: [] })).toBe(false);
    });
  });

  describe('replaceGroupInWordGroups & removeGroupFromWordGroups', () => {
    it('replaces a group name with trimming and deduplication', () => {
      const list = ['GRE', 'OldGroup'];
      const replaced = replaceGroupInWordGroups(list, 'OldGroup', 'NewGroup');
      expect(replaced).toEqual(['GRE', 'NewGroup']);
    });

    it('removes the group if new name is empty', () => {
      const list = ['GRE', 'OldGroup'];
      const replaced = replaceGroupInWordGroups(list, 'OldGroup', '   ');
      expect(replaced).toEqual(['GRE']);
    });

    it('removes group correctly', () => {
      const list = ['A', 'B', 'C'];
      expect(removeGroupFromWordGroups(list, 'B')).toEqual(['A', 'C']);
    });
  });
});
