export interface VocabTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'templates' | 'callouts';
  html: string;
}

export const VOCABULARY_TEMPLATES: VocabTemplate[] = [
  {
    id: 'synonym-antonym-table',
    title: 'Synonyms & Antonyms Matrix',
    description: 'Structured comparison table with nuances and examples',
    icon: '📊',
    category: 'templates',
    html: `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th>Type</th>
            <th>Words / Phrases</th>
            <th>Nuance & Connotation</th>
            <th>Example Usage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Synonyms</strong></td>
            <td>Word 1, Word 2</td>
            <td>Formal, emphatic</td>
            <td><em>Example sentence showing subtle difference...</em></td>
          </tr>
          <tr>
            <td><strong>Near Synonyms</strong></td>
            <td>Word 3, Word 4</td>
            <td>Informal / conversational</td>
            <td><em>Another realistic example...</em></td>
          </tr>
          <tr>
            <td><strong>Antonyms</strong></td>
            <td>Opposite 1, Opposite 2</td>
            <td>Direct contrast</td>
            <td><em>Sentence demonstrating contrast...</em></td>
          </tr>
        </tbody>
      </table>
      <p></p>
    `,
  },
  {
    id: 'etymology-roots',
    title: 'Etymology & Morphology Breakdown',
    description: 'Root, prefix, suffix, and historical origin breakdown',
    icon: '🏛️',
    category: 'templates',
    html: `
      <div data-callout data-callout-type="etymology" data-callout-icon="🏛️" class="rich-callout rich-callout-etymology">
        <div class="rich-callout-icon" contenteditable="false">🏛️</div>
        <div class="rich-callout-content">
          <p><strong>Morphological Breakdown:</strong></p>
          <ul data-type="taskList">
            <li data-type="taskItem" data-checked="false"><strong>Prefix:</strong> <em>[e.g., re- = again / back]</em></li>
            <li data-type="taskItem" data-checked="false"><strong>Root:</strong> <em>[e.g., Latin spectare = to look / watch]</em></li>
            <li data-type="taskItem" data-checked="false"><strong>Suffix:</strong> <em>[e.g., -ive = tending to / performing]</em></li>
          </ul>
          <p><strong>Historical Origin:</strong> Derived from Latin <em>[origin word]</em> via Old French, meaning <em>"[literal meaning]"</em>.</p>
          <p><strong>Cognates / Word Family:</strong> <em>[Related words sharing root...]</em></p>
        </div>
      </div>
      <p></p>
    `,
  },
  {
    id: 'mnemonic-hook',
    title: 'Mnemonic & Memory Association',
    description: 'Visual hook, phonetic rhyme, and vivid recall story',
    icon: '🧠',
    category: 'templates',
    html: `
      <div data-callout data-callout-type="mnemonic" data-callout-icon="🧠" class="rich-callout rich-callout-mnemonic">
        <div class="rich-callout-icon" contenteditable="false">🧠</div>
        <div class="rich-callout-content">
          <p><strong>Mnemonic Association:</strong></p>
          <p>🔗 <strong>Sounds Like:</strong> <em>"[Rhyme or phonetic sound-alike]"</em></p>
          <p>🎬 <strong>Mental Imagery:</strong> <em>"[Vivid, funny or exaggerated mental picture]"</em></p>
          <p>💡 <strong>Memory Hook Story:</strong> <em>Imagine a scene where [story connecting the word to its definition]...</em></p>
        </div>
      </div>
      <p></p>
    `,
  },
  {
    id: 'collocations-patterns',
    title: 'Collocations & Preposition Patterns',
    description: 'Natural word pairings, verb combos, and prepositions',
    icon: '🔗',
    category: 'templates',
    html: `
      <p><strong>Common Collocations & Natural Phrases:</strong></p>
      <ul>
        <li><strong>Verb + Word:</strong> <em>demonstrate / cultivate / undermine [Word]</em></li>
        <li><strong>Adjective + Word:</strong> <em>striking / remarkable / subtle [Word]</em></li>
        <li><strong>Preposition Combination:</strong> <em>[Word] + in / for / towards</em></li>
        <li><strong>Fixed Idiom / Expression:</strong> <em>"[Common phrase using word]"</em></li>
      </ul>
      <p></p>
    `,
  },
  {
    id: 'fill-in-blank-quiz',
    title: 'Sentence Quiz & Practice Exercise',
    description: 'Fill-in-the-blank sentences for self-testing retention',
    icon: '✍️',
    category: 'templates',
    html: `
      <div data-callout data-callout-type="grammar" data-callout-icon="✍️" class="rich-callout rich-callout-grammar">
        <div class="rich-callout-icon" contenteditable="false">✍️</div>
        <div class="rich-callout-content">
          <p><strong>Self-Quiz Practice Exercise:</strong></p>
          <p>1. The researcher sought to ________ the findings through rigorous peer review.</p>
          <p>2. Despite the pressure, she maintained an air of complete ________.</p>
          <p><span style="font-size: 12px; color: #888888;">(Hint / Solution: Highlight or check definitions to verify)</span></p>
        </div>
      </div>
      <p></p>
    `,
  },
];

export const CALLOUT_PRESETS = [
  { type: 'tip', label: 'Study Tip', icon: '💡', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' },
  {
    type: 'mnemonic',
    label: 'Mnemonic Hook',
    icon: '🧠',
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.08)',
  },
  {
    type: 'warning',
    label: 'Caution / False Friend',
    icon: '⚠️',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
  },
  {
    type: 'grammar',
    label: 'Grammar & Usage',
    icon: '📖',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.08)',
  },
  {
    type: 'etymology',
    label: 'Etymology & History',
    icon: '🏛️',
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.08)',
  },
  {
    type: 'note',
    label: 'General Note',
    icon: 'ℹ️',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.08)',
  },
  {
    type: 'exam',
    label: 'Key Exam Point',
    icon: '🎯',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.08)',
  },
];

export const IPA_SYMBOLS = [
  { symbol: 'ˈ', name: 'Primary Stress' },
  { symbol: 'ˌ', name: 'Secondary Stress' },
  { symbol: 'ː', name: 'Long Vowel' },
  { symbol: 'ə', name: 'Schwa (about)' },
  { symbol: 'æ', name: 'Ash (cat)' },
  { symbol: 'ʌ', name: 'Turned V (cup)' },
  { symbol: 'ɑː', name: 'Open Back (father)' },
  { symbol: 'ɔː', name: 'Open-Mid (law)' },
  { symbol: 'iː', name: 'Close Front (see)' },
  { symbol: 'ɪ', name: 'Near-Close (sit)' },
  { symbol: 'uː', name: 'Close Back (too)' },
  { symbol: 'ʊ', name: 'Near-Close Back (put)' },
  { symbol: 'e', name: 'Close-Mid Front (bed)' },
  { symbol: 'ɜː', name: 'Open-Mid Central (bird)' },
  { symbol: 'eɪ', name: 'Face Diphthong' },
  { symbol: 'aɪ', name: 'Price Diphthong' },
  { symbol: 'ɔɪ', name: 'Choice Diphthong' },
  { symbol: 'oʊ', name: 'Goat Diphthong' },
  { symbol: 'aʊ', name: 'Mouth Diphthong' },
  { symbol: 'ɪə', name: 'Near Diphthong' },
  { symbol: 'eə', name: 'Square Diphthong' },
  { symbol: 'θ', name: 'Theta (think)' },
  { symbol: 'ð', name: 'Eth (this)' },
  { symbol: 'ʃ', name: 'Esh (shoe)' },
  { symbol: 'ʒ', name: 'Ezh (measure)' },
  { symbol: 'tʃ', name: 'Ch (church)' },
  { symbol: 'dʒ', name: 'J (judge)' },
  { symbol: 'ŋ', name: 'Eng (sing)' },
  { symbol: 'j', name: 'Yod (yes)' },
  { symbol: 'w', name: 'Labial (wet)' },
];

export const STUDY_SYMBOLS = [
  { symbol: '→', name: 'Leads to / Becomes' },
  { symbol: '←', name: 'Derived from' },
  { symbol: '↔', name: 'Bidirectional / Equivalence' },
  { symbol: '⇄', name: 'Interchangeable' },
  { symbol: '✓', name: 'Correct / Recommended' },
  { symbol: '✗', name: 'Incorrect / Avoid' },
  { symbol: '★', name: 'Essential' },
  { symbol: '⚡', name: 'Important Note' },
  { symbol: '≈', name: 'Approximately Equal' },
  { symbol: '≠', name: 'Not Equal / Different' },
  { symbol: '•', name: 'Bullet Point' },
  { symbol: '§', name: 'Section' },
  { symbol: '▶', name: 'Play / Example' },
  { symbol: '❝', name: 'Quote Start' },
  { symbol: '❞', name: 'Quote End' },
];

export const FONT_FAMILIES = [
  { value: '', label: 'Default (Inter UI)' },
  { value: "'Plus Jakarta Sans', sans-serif", label: 'Plus Jakarta Sans (Display)' },
  { value: 'Inter, sans-serif', label: 'Inter (Clean Sans)' },
  {
    value: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
    label: 'JetBrains Mono (Code/IPA)',
  },
  { value: "Georgia, 'Times New Roman', serif", label: 'Editorial Serif (Georgia)' },
  { value: "'Merriweather', serif", label: 'Classic Book (Merriweather)' },
  { value: "'Amiri', 'Traditional Arabic', serif", label: 'Arabic & Quran (Amiri)' },
  { value: "'Caveat', cursive, sans-serif", label: 'Handwritten (Caveat)' },
];

export const FONT_SIZES = [
  { value: '11px', label: '11px (Tiny)' },
  { value: '12px', label: '12px (Small)' },
  { value: '13px', label: '13px (Compact)' },
  { value: '14px', label: '14px (Regular)' },
  { value: '16px', label: '16px (Base / Body)' },
  { value: '18px', label: '18px (Medium)' },
  { value: '20px', label: '20px (Large)' },
  { value: '24px', label: '24px (Heading 3)' },
  { value: '28px', label: '28px (Heading 2)' },
  { value: '32px', label: '32px (Heading 1)' },
];

export const LINE_HEIGHTS = [
  { value: '1.15', label: 'Tight (1.15)' },
  { value: '1.35', label: 'Compact (1.35)' },
  { value: '1.6', label: 'Normal (1.6)' },
  { value: '1.85', label: 'Relaxed (1.85)' },
  { value: '2.2', label: 'Spacious (2.2)' },
];

export const COLOR_PALETTE = [
  { color: '#000000', label: 'Black' },
  { color: '#4b5563', label: 'Slate Gray' },
  { color: '#6366f1', label: 'Indigo' },
  { color: '#8b5cf6', label: 'Purple' },
  { color: '#ec4899', label: 'Pink' },
  { color: '#ef4444', label: 'Crimson' },
  { color: '#f97316', label: 'Orange' },
  { color: '#f59e0b', label: 'Amber / Gold' },
  { color: '#10b981', label: 'Emerald' },
  { color: '#06b6d4', label: 'Cyan' },
  { color: '#3b82f6', label: 'Blue' },
];

export const HIGHLIGHT_PALETTE = [
  { color: '#fef08a', label: 'Soft Yellow' },
  { color: '#bbf7d0', label: 'Soft Green' },
  { color: '#bae6fd', label: 'Soft Blue' },
  { color: '#e9d5ff', label: 'Soft Purple' },
  { color: '#fbcfe8', label: 'Soft Pink' },
  { color: '#fed7aa', label: 'Soft Orange' },
  { color: '#fecaca', label: 'Soft Red' },
  { color: '#e2e8f0', label: 'Soft Slate' },
];
