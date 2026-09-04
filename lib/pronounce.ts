/**
 * Utilities for Merriam-Webster audio pronunciation URLs and phonetic formatting.
 */

export const MERRIAM_WEBSTER_AUDIO_BASE_URL = 'https://media.merriam-webster.com/audio/prons';

/**
 * Computes the Merriam-Webster subdirectory based on the audio filename:
 * 1. If audio begins with "bix", subdirectory is "bix"
 * 2. If audio begins with "gg", subdirectory is "gg"
 * 3. If audio begins with a number or punctuation/symbol, subdirectory is "number"
 * 4. Otherwise, subdirectory is the first lowercase letter of the audio filename
 */
export function getMerriamWebsterSubdirectory(audioFilename: string): string {
  const clean = audioFilename.trim().toLowerCase();
  if (!clean) {
    return 'number';
  }
  if (clean.startsWith('bix')) {
    return 'bix';
  }
  if (clean.startsWith('gg')) {
    return 'gg';
  }
  const firstChar = clean.charAt(0);
  if (/^[0-9\W_]/.test(firstChar)) {
    return 'number';
  }
  return firstChar;
}

/**
 * Builds the complete Merriam-Webster MP3 audio CDN URL from an audio filename identifier.
 *
 * @param audioFilename Base audio filename from Merriam-Webster entry (e.g. "epheme01", "apple001", "intole05")
 * @param ref Reference / language code (e.g. "en/us" or "en_us"). Note: Collegiate API internal ref tags like "c", "me", "la" are normalized to "en/us".
 * @returns Fully qualified MP3 URL
 */
export function buildMerriamWebsterAudioUrl(audioFilename: string, ref = 'en/us'): string {
  const cleanAudio = audioFilename.trim().replace(/\.(mp3|wav)$/i, '');
  if (!cleanAudio) {
    return '';
  }
  // Merriam-Webster Collegiate API returns sound.ref = "c" (or "me", "la") which is the dictionary identifier,
  // NOT the language path segment. The audio CDN requires 'en/us' for English audio files.
  let cleanRef = (ref || '').replace('_', '/').toLowerCase().trim();
  if (
    !cleanRef ||
    cleanRef === 'c' ||
    cleanRef === 'me' ||
    cleanRef === 'la' ||
    cleanRef === 'es' ||
    !cleanRef.includes('/')
  ) {
    cleanRef = 'en/us';
  }
  const subdir = getMerriamWebsterSubdirectory(cleanAudio);
  return `${MERRIAM_WEBSTER_AUDIO_BASE_URL}/${cleanRef}/mp3/${subdir}/${cleanAudio}.mp3`;
}

/**
 * Normalizes any existing Merriam-Webster audio URL that might have a legacy or malformed path
 * (such as /prons/c/mp3/ or /prons/me/mp3/ or /prons/undefined/mp3/) to the canonical /prons/en/us/mp3/ path.
 */
export function normalizeMerriamWebsterAudioUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  let trimmed = url.trim();
  if (trimmed.includes('media.merriam-webster.com/audio/prons/')) {
    trimmed = trimmed.replace(
      /\/audio\/prons\/(?:[a-zA-Z]{1,2}|undefined|null)\/mp3\//i,
      '/audio/prons/en/us/mp3/'
    );
  }
  return trimmed;
}

/**
 * Cleans and standardizes phonetic transcription strings for display.
 */
export function formatPhonetic(rawPhonetic?: string | null): string {
  if (!rawPhonetic) {
    return '';
  }
  let trimmed = rawPhonetic.trim();
  // Remove wrapping quotes if present
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  // If already formatted with slashes or backslashes, normalize
  if (trimmed.startsWith('/') && trimmed.endsWith('/')) {
    return trimmed;
  }
  if (trimmed.startsWith('\\') && trimmed.endsWith('\\')) {
    return trimmed;
  }
  // Otherwise wrap with standard Merriam-Webster backslashes
  return `\\${trimmed}\\`;
}

/**
 * Validates whether a given string is a valid audio URL.
 */
export function isValidAudioUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://')) {
    return false;
  }
  return (
    /\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(trimmed) || trimmed.includes('media.merriam-webster.com')
  );
}

export type ExtractedMwPronunciation = {
  audioFilename: string;
  audioUrl: string;
  phonetic: string;
};

type MwPrsItem = {
  mw?: string;
  sound?: {
    audio?: string;
    ref?: string;
  };
};

/**
 * Normalizes a word string for dictionary matching by:
 * - Lowercasing and trimming
 * - Stripping Merriam-Webster syllable markers ('*')
 * - Stripping homograph suffixes (':1', ':2', etc.)
 * - Normalizing inner whitespace and hyphens
 */
export function normalizeDictionaryWord(str?: string | null): string {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str
    .toLowerCase()
    .replace(/:\d+$/, '') // strip homograph id like "caution:1"
    .replace(/[*•·]/g, '') // strip syllable markers
    .trim();
}

/**
 * Checks if a dictionary candidate (headword, run-on, variant, inflection)
 * matches the target word, taking into account hyphens, spaces, and punctuation,
 * while strictly maintaining distinct word boundaries (e.g. "drag on" does not match "dragon").
 */
export function isDictionaryWordMatch(
  candidate?: string | null,
  targetWord?: string | null
): boolean {
  const cleanCand = normalizeDictionaryWord(candidate);
  const cleanTarget = normalizeDictionaryWord(targetWord);
  if (!cleanCand || !cleanTarget) {
    return false;
  }
  if (cleanCand === cleanTarget) {
    return true;
  }
  // Compare with normalized spaces/hyphens
  const candWords = cleanCand.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  const targetWords = cleanTarget.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  return candWords === targetWords;
}

function extractAudioFromPrsList(
  prs?: MwPrsItem[]
): { audioFilename: string; ref: string; phonetic: string } | null {
  if (!Array.isArray(prs)) {
    return null;
  }
  for (const pr of prs) {
    const audio = pr?.sound?.audio;
    if (typeof audio === 'string' && audio.trim().length > 0) {
      const ref = pr?.sound?.ref || 'en/us';
      const phonetic = pr.mw ? formatPhonetic(pr.mw) : '';
      return {
        audioFilename: audio.trim(),
        ref,
        phonetic,
      };
    }
  }
  return null;
}

/**
 * Extracts pronunciation audio filename, full URL, and phonetic representation
 * from Merriam-Webster Dictionary API JSON response entries.
 *
 * When targetWord is provided:
 * 1. Checks undefined run-ons (uros) for exact matches (e.g. "abjectly", "cautionary", "percolation")
 * 2. Checks exact headwords (hwi.hw or meta.id)
 * 3. Checks defined run-ons (dros)
 * 4. Checks inflections (ins)
 * 5. Checks variants (vrs)
 * This prevents derived forms from mistakenly receiving their root headword's pronunciation.
 *
 * When targetWord is omitted, falls back to the first available audio.
 */
export function extractMerriamWebsterAudioFromApiResponse(
  apiData: unknown,
  targetWord?: string
): ExtractedMwPronunciation | null {
  if (!Array.isArray(apiData) || apiData.length === 0) {
    return null;
  }

  // Phase 1: Targeted matching when targetWord is provided
  if (targetWord && typeof targetWord === 'string' && targetWord.trim().length > 0) {
    // 1a. Check undefined run-ons (uros) across all entries
    // Derived adverbs, adjectives, and nouns like "abjectly", "cautionary", "percolation"
    // are indexed under root headwords in uros with their own dedicated audio recordings.
    for (const entry of apiData) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const uros = (entry as { uros?: Array<{ ure?: string; prs?: MwPrsItem[] }> }).uros;
      if (Array.isArray(uros)) {
        for (const uro of uros) {
          if (isDictionaryWordMatch(uro?.ure, targetWord)) {
            const extracted = extractAudioFromPrsList(uro?.prs);
            if (extracted) {
              return {
                audioFilename: extracted.audioFilename,
                audioUrl: buildMerriamWebsterAudioUrl(extracted.audioFilename, extracted.ref),
                phonetic: extracted.phonetic,
              };
            }
          }
        }
      }
    }

    // 1b. Check exact headword (hwi.hw or meta.id) across all entries
    for (const entry of apiData) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const hwi = (entry as { hwi?: { hw?: string; prs?: MwPrsItem[] }; meta?: { id?: string } })
        .hwi;
      const metaId = (entry as { meta?: { id?: string } }).meta?.id;
      if (isDictionaryWordMatch(hwi?.hw, targetWord) || isDictionaryWordMatch(metaId, targetWord)) {
        const extracted = extractAudioFromPrsList(hwi?.prs);
        if (extracted) {
          return {
            audioFilename: extracted.audioFilename,
            audioUrl: buildMerriamWebsterAudioUrl(extracted.audioFilename, extracted.ref),
            phonetic: extracted.phonetic,
          };
        }
      }
    }

    // 1c. Check defined run-ons (dros) across all entries
    for (const entry of apiData) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const dros = (entry as { dros?: Array<{ drp?: string; prs?: MwPrsItem[] }> }).dros;
      if (Array.isArray(dros)) {
        for (const dro of dros) {
          if (isDictionaryWordMatch(dro?.drp, targetWord)) {
            const extracted = extractAudioFromPrsList(dro?.prs);
            if (extracted) {
              return {
                audioFilename: extracted.audioFilename,
                audioUrl: buildMerriamWebsterAudioUrl(extracted.audioFilename, extracted.ref),
                phonetic: extracted.phonetic,
              };
            }
          }
        }
      }
    }

    // 1d. Check inflections (ins) across all entries
    for (const entry of apiData) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const ins = (entry as { ins?: Array<{ if?: string; prs?: MwPrsItem[] }> }).ins;
      if (Array.isArray(ins)) {
        for (const inf of ins) {
          if (isDictionaryWordMatch(inf?.if, targetWord)) {
            const extracted = extractAudioFromPrsList(inf?.prs);
            if (extracted) {
              return {
                audioFilename: extracted.audioFilename,
                audioUrl: buildMerriamWebsterAudioUrl(extracted.audioFilename, extracted.ref),
                phonetic: extracted.phonetic,
              };
            }
          }
        }
      }
    }

    // 1e. Check variants (vrs) across all entries
    for (const entry of apiData) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const vrs = (entry as { vrs?: Array<{ va?: string; vl?: string; prs?: MwPrsItem[] }> }).vrs;
      if (Array.isArray(vrs)) {
        for (const vr of vrs) {
          if (
            isDictionaryWordMatch(vr?.va, targetWord) ||
            isDictionaryWordMatch(vr?.vl, targetWord)
          ) {
            const extracted = extractAudioFromPrsList(vr?.prs);
            if (extracted) {
              return {
                audioFilename: extracted.audioFilename,
                audioUrl: buildMerriamWebsterAudioUrl(extracted.audioFilename, extracted.ref),
                phonetic: extracted.phonetic,
              };
            }
          }
        }
      }
    }

    // Target word was provided, but no exact matching section with audio was found.
    // Return null so fallback strategies (DictionaryAPI or TTS) can pronounce the actual word,
    // rather than speaking an unrelated root headword.
    return null;
  }

  // Phase 2: Fallback when targetWord is omitted (backward compatibility)
  for (const entry of apiData) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    // Check headword information (hwi)
    const hwi = (entry as { hwi?: { prs?: MwPrsItem[] } }).hwi;
    const hwiExtracted = extractAudioFromPrsList(hwi?.prs);
    if (hwiExtracted) {
      return {
        audioFilename: hwiExtracted.audioFilename,
        audioUrl: buildMerriamWebsterAudioUrl(hwiExtracted.audioFilename, hwiExtracted.ref),
        phonetic: hwiExtracted.phonetic,
      };
    }

    // Check variants (vrs)
    const vrs = (entry as { vrs?: Array<{ prs?: MwPrsItem[] }> }).vrs;
    if (Array.isArray(vrs)) {
      for (const vr of vrs) {
        const vrExtracted = extractAudioFromPrsList(vr?.prs);
        if (vrExtracted) {
          return {
            audioFilename: vrExtracted.audioFilename,
            audioUrl: buildMerriamWebsterAudioUrl(vrExtracted.audioFilename, vrExtracted.ref),
            phonetic: vrExtracted.phonetic,
          };
        }
      }
    }

    // Check undefined run-ons (uros)
    const uros = (entry as { uros?: Array<{ prs?: MwPrsItem[] }> }).uros;
    if (Array.isArray(uros)) {
      for (const uro of uros) {
        const uroExtracted = extractAudioFromPrsList(uro?.prs);
        if (uroExtracted) {
          return {
            audioFilename: uroExtracted.audioFilename,
            audioUrl: buildMerriamWebsterAudioUrl(uroExtracted.audioFilename, uroExtracted.ref),
            phonetic: uroExtracted.phonetic,
          };
        }
      }
    }
  }

  return null;
}
