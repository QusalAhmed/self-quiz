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

/**
 * Extracts pronunciation audio filename, full URL, and phonetic representation
 * from Merriam-Webster Dictionary API JSON response entries.
 */
export function extractMerriamWebsterAudioFromApiResponse(
  apiData: unknown
): ExtractedMwPronunciation | null {
  if (!Array.isArray(apiData) || apiData.length === 0) {
    return null;
  }

  for (const entry of apiData) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    // Check headword information (hwi)
    const hwi = (
      entry as { hwi?: { prs?: Array<{ mw?: string; sound?: { audio?: string; ref?: string } }> } }
    ).hwi;
    if (hwi?.prs && Array.isArray(hwi.prs)) {
      for (const pr of hwi.prs) {
        const audio = pr?.sound?.audio;
        if (typeof audio === 'string' && audio.trim().length > 0) {
          const ref = pr?.sound?.ref || 'en/us';
          const phonetic = pr.mw ? formatPhonetic(pr.mw) : '';
          return {
            audioFilename: audio.trim(),
            audioUrl: buildMerriamWebsterAudioUrl(audio, ref),
            phonetic,
          };
        }
      }
    }

    // Check variants (vrs)
    const vrs = (
      entry as {
        vrs?: Array<{ prs?: Array<{ mw?: string; sound?: { audio?: string; ref?: string } }> }>;
      }
    ).vrs;
    if (Array.isArray(vrs)) {
      for (const vr of vrs) {
        if (Array.isArray(vr?.prs)) {
          for (const pr of vr.prs) {
            const audio = pr?.sound?.audio;
            if (typeof audio === 'string' && audio.trim().length > 0) {
              const ref = pr?.sound?.ref || 'en/us';
              const phonetic = pr.mw ? formatPhonetic(pr.mw) : '';
              return {
                audioFilename: audio.trim(),
                audioUrl: buildMerriamWebsterAudioUrl(audio, ref),
                phonetic,
              };
            }
          }
        }
      }
    }

    // Check undefined run-ons (uros)
    const uros = (
      entry as {
        uros?: Array<{ prs?: Array<{ mw?: string; sound?: { audio?: string; ref?: string } }> }>;
      }
    ).uros;
    if (Array.isArray(uros)) {
      for (const uro of uros) {
        if (Array.isArray(uro?.prs)) {
          for (const pr of uro.prs) {
            const audio = pr?.sound?.audio;
            if (typeof audio === 'string' && audio.trim().length > 0) {
              const ref = pr?.sound?.ref || 'en/us';
              const phonetic = pr.mw ? formatPhonetic(pr.mw) : '';
              return {
                audioFilename: audio.trim(),
                audioUrl: buildMerriamWebsterAudioUrl(audio, ref),
                phonetic,
              };
            }
          }
        }
      }
    }
  }

  return null;
}
