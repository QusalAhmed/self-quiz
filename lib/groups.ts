import type { GroupRecord, WordRecord } from './db';

export function getWordGroups(word: Pick<WordRecord, 'customGroups'>): string[] {
  return Array.isArray(word.customGroups)
    ? word.customGroups.filter((g) => typeof g === 'string' && g.trim().length > 0)
    : [];
}

export function wordHasGroup(word: Pick<WordRecord, 'customGroups'>, groupName: string): boolean {
  const normalized = groupName.trim();
  if (!normalized) {
    return false;
  }
  return getWordGroups(word).includes(normalized);
}

export function wordHasAnyGroup(word: Pick<WordRecord, 'customGroups'>): boolean {
  return getWordGroups(word).length > 0;
}

export function getActiveGroupNames(groups: GroupRecord[]): string[] {
  return groups
    .filter((g) => !g.isDeleted)
    .map((g) => g.name.trim())
    .filter((name) => name.length > 0)
    .sort((a, b) => a.localeCompare(b));
}

export function replaceGroupInWordGroups(
  groups: string[],
  oldName: string,
  newName: string
): string[] {
  const trimmedNew = newName.trim();
  if (!trimmedNew) {
    return groups.filter((g) => g !== oldName);
  }
  const next = groups.map((g) => (g === oldName ? trimmedNew : g));
  return Array.from(new Set(next));
}

export function removeGroupFromWordGroups(groups: string[], groupName: string): string[] {
  return groups.filter((g) => g !== groupName);
}
