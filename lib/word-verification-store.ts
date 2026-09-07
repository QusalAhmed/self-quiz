import { type AppDatabase, type FsrsRecord, safePatchDoc, type WordRecord } from './db';
import { definitionsToMeaning, getWordDefinitions } from './definitions';
import { updateFsrsRecordContent } from './fsrs';
import { appNotifications } from './notifications';
import { getAppSettings } from './settings';
import { type WordVerificationIssue, type WordVerificationResult } from './word-verification';

export type VerifyAndStoreWordOptions = {
  showNotification?: boolean;
  onSuccess?: (issue: WordVerificationIssue | null) => void;
};

/**
 * Runs background AI / dictionary verification for a word and stores any issues
 * on the word's RxDB document.
 * If the word passes cleanly, any previous verification issue is cleared.
 */
export async function verifyAndStoreWord(
  database: AppDatabase,
  wordId: string,
  options?: VerifyAndStoreWordOptions
): Promise<WordVerificationIssue | null> {
  if (!database) {
    return null;
  }

  const settings = getAppSettings();
  if (settings.ai?.autoVerifyWords === false) {
    return null;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn(`Device offline, skipping background verification for word: ${wordId}`);
    return null;
  }

  try {
    const doc = await database.words.findOne(wordId).exec();
    if (!doc) {
      return null;
    }

    const current = doc.toJSON() as WordRecord;
    const trimmedWord = current.word.trim();
    if (!trimmedWord || trimmedWord.length < 2) {
      return null;
    }

    const definitions = getWordDefinitions(current);
    const payload = {
      word: trimmedWord,
      definitions: definitions.map((d) => ({
        meaning: d.meaning.trim(),
        partOfSpeech: d.partOfSpeech.trim(),
      })),
    };

    const res = await fetch('/api/verify-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.warn(
        `Background verify-word error for "${trimmedWord}": HTTP ${res.status}`,
        errorText
      );
      return null;
    }

    const result: WordVerificationResult = await res.json();

    const refreshedDoc = await database.words.findOne(wordId).exec();
    if (!refreshedDoc) {
      return null;
    }

    const timestamp = new Date().toISOString();

    if (result.overallStatus === 'warning' || result.overallStatus === 'invalid') {
      const issue: WordVerificationIssue = {
        status: result.overallStatus,
        word: result.word,
        isWordValid: result.isWordValid,
        wordSpellingSuggestion: result.wordSpellingSuggestion,
        wordFeedback: result.wordFeedback,
        overallStatus: result.overallStatus,
        definitions: result.definitions,
        suggestedNewDefinition: result.suggestedNewDefinition,
        generatorAiDetails: result.generatorAiDetails,
        verifiedAt: timestamp,
      };

      await safePatchDoc(refreshedDoc, {
        verificationIssue: JSON.stringify(issue),
        updatedAt: timestamp,
      });

      if (options?.showNotification !== false) {
        appNotifications.warning({
          id: `verify-issue-${wordId}`,
          title: `AI Verification Warning: ${result.word}`,
          message: result.wordSpellingSuggestion
            ? `Spelling issue detected (Did you mean "${result.wordSpellingSuggestion}"?)`
            : result.wordFeedback || 'Issue detected with word or definitions.',
          autoClose: 7000,
        });
      }

      options?.onSuccess?.(issue);
      return issue;
    }

    // Word is valid: clear any existing issue
    if (refreshedDoc.verificationIssue) {
      await safePatchDoc(refreshedDoc, {
        verificationIssue: '',
        updatedAt: timestamp,
      });
    }

    options?.onSuccess?.(null);
    return null;
  } catch (error) {
    console.error(`Error in background verification for word ${wordId}:`, error);
    return null;
  }
}

/**
 * Dismisses an existing verification issue on a word.
 */
export async function dismissWordVerificationIssue(
  database: AppDatabase,
  wordId: string
): Promise<void> {
  const doc = await database.words.findOne(wordId).exec();
  if (doc) {
    await safePatchDoc(doc, {
      verificationIssue: '',
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * 1-click fix: updates the word spelling to the suggested spelling,
 * syncs related FSRS cards, and re-triggers background verification.
 */
export async function applyWordSpellingFix(
  database: AppDatabase,
  wordId: string,
  correctedWord: string
): Promise<void> {
  const doc = await database.words.findOne(wordId).exec();
  if (!doc) {
    return;
  }

  const current = doc.toJSON() as WordRecord;
  const timestamp = new Date().toISOString();
  const trimmed = correctedWord.trim();

  await safePatchDoc(doc, {
    word: trimmed,
    verificationIssue: '',
    updatedAt: timestamp,
  });

  // Sync associated FSRS records
  const fsrsDocs = await database.fsrsRecords.find({ selector: { wordId } }).exec();
  for (const fsrsDoc of fsrsDocs) {
    const updatedFsrs = updateFsrsRecordContent(
      fsrsDoc.toJSON() as FsrsRecord,
      trimmed,
      current.meaning,
      timestamp
    );
    await database.fsrsRecords.upsert(updatedFsrs);
  }

  // Re-verify in background without intrusive alert
  void verifyAndStoreWord(database, wordId, { showNotification: false });
}

/**
 * 1-click fix: updates a definition's meaning or part of speech,
 * syncs related FSRS cards, and re-triggers background verification.
 */
export async function applyDefinitionFix(
  database: AppDatabase,
  wordId: string,
  defIndex: number,
  newMeaning?: string,
  newPartOfSpeech?: string
): Promise<void> {
  const doc = await database.words.findOne(wordId).exec();
  if (!doc) {
    return;
  }

  const current = doc.toJSON() as WordRecord;
  const currentDefs = getWordDefinitions(current);
  if (!currentDefs[defIndex]) {
    return;
  }

  const updatedDefs = currentDefs.map((d, i) => {
    if (i !== defIndex) {
      return d;
    }
    return {
      ...d,
      ...(newMeaning !== undefined ? { meaning: newMeaning.trim() } : {}),
      ...(newPartOfSpeech !== undefined ? { partOfSpeech: newPartOfSpeech.trim() } : {}),
    };
  });

  const timestamp = new Date().toISOString();
  const nextMeaning = definitionsToMeaning(updatedDefs);

  await safePatchDoc(doc, {
    meaning: nextMeaning,
    definitions: updatedDefs,
    verificationIssue: '',
    updatedAt: timestamp,
  });

  // Sync associated FSRS records
  const fsrsDocs = await database.fsrsRecords.find({ selector: { wordId } }).exec();
  for (const fsrsDoc of fsrsDocs) {
    const updatedFsrs = updateFsrsRecordContent(
      fsrsDoc.toJSON() as FsrsRecord,
      current.word,
      nextMeaning,
      timestamp
    );
    await database.fsrsRecords.upsert(updatedFsrs);
  }

  // Re-verify in background
  void verifyAndStoreWord(database, wordId, { showNotification: false });
}

/**
 * 1-click fix: adds an AI-suggested definition to the word,
 * syncs related FSRS cards, and re-triggers background verification.
 */
export async function applyAddSuggestedDefinition(
  database: AppDatabase,
  wordId: string,
  newDef: { meaning: string; partOfSpeech: string }
): Promise<void> {
  const doc = await database.words.findOne(wordId).exec();
  if (!doc) {
    return;
  }

  const current = doc.toJSON() as WordRecord;
  const currentDefs = getWordDefinitions(current);

  const newDefItem = {
    meaning: newDef.meaning.trim(),
    partOfSpeech: newDef.partOfSpeech.trim(),
    examples: [],
    userExamples: [],
  };

  const updatedDefs =
    currentDefs.length === 1 && !currentDefs[0].meaning.trim()
      ? [newDefItem]
      : [...currentDefs, newDefItem];

  const timestamp = new Date().toISOString();
  const nextMeaning = definitionsToMeaning(updatedDefs);

  await safePatchDoc(doc, {
    meaning: nextMeaning,
    definitions: updatedDefs,
    verificationIssue: '',
    updatedAt: timestamp,
  });

  const fsrsDocs = await database.fsrsRecords.find({ selector: { wordId } }).exec();
  for (const fsrsDoc of fsrsDocs) {
    const updatedFsrs = updateFsrsRecordContent(
      fsrsDoc.toJSON() as FsrsRecord,
      current.word,
      nextMeaning,
      timestamp
    );
    await database.fsrsRecords.upsert(updatedFsrs);
  }

  void verifyAndStoreWord(database, wordId, { showNotification: false });
}
