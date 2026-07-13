import { normalizeAiExamples } from './examples';

export type GenerateExamplesParams = {
  word: string;
  meaning: string;
  targetCount: number;
  partOfSpeech: string;
  referenceExamples: string[];
};

export async function generateGoogleExamples(params: GenerateExamplesParams): Promise<string[]> {
  const { word, meaning, targetCount, partOfSpeech, referenceExamples } = params;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('Google AI API key is not configured');
  }

  const model = process.env.GOOGLE_AI_MODEL || 'gemma-4-26b-a4b-it';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const partOfSpeechBlock = partOfSpeech
    ? `\nSelected part of speech: ${partOfSpeech}.`
    : '';
  const referenceBlock =
    referenceExamples.length > 0
      ? `\nReference user examples for this same meaning (use only as guidance, do not copy verbatim):\n${referenceExamples
          .map((example, index) => `${index + 1}. ${example}`)
          .join('\n')}\n`
      : '';

  const systemInstruction = 'You output only raw JSON. No markdown. No explanation. No code fences. Just a JSON object. Reply with ONLY this JSON and nothing else: {"examples":["sentence 1","sentence 2","sentence 3"]}';
  const promptText = `Give me up to ${targetCount} example sentences in English using the word "${word}" ` +
    `(meaning: ${meaning}). Each sentence must clearly reflect this specific meaning.` +
    partOfSpeechBlock +
    ` Prefer ${targetCount} examples if possible, but return fewer if that is more natural or accurate.` +
    referenceBlock;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: promptText,
          },
        ],
      },
    ],
    systemInstruction: {
      parts: [
        {
          text: systemInstruction,
        },
      ],
    },
    generationConfig: {
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn('Google AI HTTP error:', response.status, errorText);
    throw new Error(`Google AI HTTP error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Extract text from non-thought parts of the response candidates
  const textParts = data.candidates?.[0]?.content?.parts
    ?.filter((part: any) => !part.thought && part.text)
    .map((part: any) => part.text)
    .join('') || '';

  if (!textParts) {
    throw new Error('Google AI response did not contain any non-thought text parts');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(textParts);
  } catch (err) {
    console.warn('Failed to parse Google AI response as JSON:', textParts);
    throw new Error('Google AI response was not valid JSON');
  }

  const examples = normalizeAiExamples(parsed?.examples, targetCount);
  if (!examples || examples.length === 0) {
    throw new Error('Google AI returned empty examples');
  }

  return examples;
}
