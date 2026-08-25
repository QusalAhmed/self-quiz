/**
 * Quran.com API v4 Client & Metadata Utilities
 * Provides Quran verse fetching (Arabic text, English & Bangla translations, Tafsir, Recitation audio),
 * complete Surah metadata for all 114 chapters, and input parsing utilities.
 */

export interface ChapterMetadata {
  id: number;
  nameSimple: string;
  nameArabic: string;
  nameComplex: string;
  translatedName: string;
  versesCount: number;
  revelationPlace: 'makkah' | 'madinah';
}

export interface QuranTranslationResource {
  id: number;
  name: string;
  authorName: string;
  languageName: 'english' | 'bengali';
}

export interface QuranTafsirResource {
  id: number;
  name: string;
  authorName: string;
  languageName: 'english' | 'bengali' | 'arabic';
}

export interface QuranReciterResource {
  id: number;
  reciterName: string;
  style?: string | null;
}

export interface FetchedVersePayload {
  key: string; // e.g. "2:255" or "94:5-6"
  chapter: number;
  verse: number;
  verseEnd?: number;
  chapterInfo: ChapterMetadata;
  arabicText: string;
  englishTranslation: {
    resourceId: number;
    translatorName: string;
    text: string;
  };
  banglaTranslation: {
    resourceId: number;
    translatorName: string;
    text: string;
  };
  tafsir?: {
    english?: {
      resourceId: number;
      name: string;
      text: string;
    };
    bangla?: {
      resourceId: number;
      name: string;
      text: string;
    };
  };
  audio?: {
    reciterId: number;
    reciterName: string;
    audioUrl: string;
    audioUrls?: string[];
    verseAudios?: { verseNumber: number; audioUrl: string }[];
    durationMs?: number;
  };
  fetchedAt: string;
}

export interface CuratedMotivationalPreset {
  key: string; // e.g. "2:255" or "94:5-6"
  chapter: number;
  verse: number;
  verseEnd?: number;
  theme: string;
  title: string;
  description: string;
  arabicSnippet?: string;
}

/**
 * All 114 Surahs with comprehensive metadata
 */
export const QURAN_CHAPTERS: ChapterMetadata[] = [
  {
    id: 1,
    nameSimple: 'Al-Fatihah',
    nameArabic: 'الفاتحة',
    nameComplex: 'Al-Fātiĥah',
    translatedName: 'The Opener',
    versesCount: 7,
    revelationPlace: 'makkah',
  },
  {
    id: 2,
    nameSimple: 'Al-Baqarah',
    nameArabic: 'البقرة',
    nameComplex: 'Al-Baqarah',
    translatedName: 'The Cow',
    versesCount: 286,
    revelationPlace: 'madinah',
  },
  {
    id: 3,
    nameSimple: "Ali 'Imran",
    nameArabic: 'آل عمران',
    nameComplex: "Āli 'Imrān",
    translatedName: 'Family of Imran',
    versesCount: 200,
    revelationPlace: 'madinah',
  },
  {
    id: 4,
    nameSimple: 'An-Nisa',
    nameArabic: 'النساء',
    nameComplex: 'An-Nisā',
    translatedName: 'The Women',
    versesCount: 176,
    revelationPlace: 'madinah',
  },
  {
    id: 5,
    nameSimple: "Al-Ma'idah",
    nameArabic: 'المائدة',
    nameComplex: "Al-Mā'idah",
    translatedName: 'The Table Spread',
    versesCount: 120,
    revelationPlace: 'madinah',
  },
  {
    id: 6,
    nameSimple: "Al-An'am",
    nameArabic: 'الأنعام',
    nameComplex: "Al-An'ām",
    translatedName: 'The Cattle',
    versesCount: 165,
    revelationPlace: 'makkah',
  },
  {
    id: 7,
    nameSimple: "Al-A'raf",
    nameArabic: 'الأعراف',
    nameComplex: "Al-A'rāf",
    translatedName: 'The Heights',
    versesCount: 206,
    revelationPlace: 'makkah',
  },
  {
    id: 8,
    nameSimple: 'Al-Anfal',
    nameArabic: 'الأنفال',
    nameComplex: 'Al-Anfāl',
    translatedName: 'The Spoils of War',
    versesCount: 75,
    revelationPlace: 'madinah',
  },
  {
    id: 9,
    nameSimple: 'At-Tawbah',
    nameArabic: 'التوبة',
    nameComplex: 'At-Tawbah',
    translatedName: 'The Repentance',
    versesCount: 129,
    revelationPlace: 'madinah',
  },
  {
    id: 10,
    nameSimple: 'Yunus',
    nameArabic: 'يونس',
    nameComplex: 'Yūnus',
    translatedName: 'Jonah',
    versesCount: 109,
    revelationPlace: 'makkah',
  },
  {
    id: 11,
    nameSimple: 'Hud',
    nameArabic: 'هود',
    nameComplex: 'Hūd',
    translatedName: 'Hud',
    versesCount: 123,
    revelationPlace: 'makkah',
  },
  {
    id: 12,
    nameSimple: 'Yusuf',
    nameArabic: 'يوسف',
    nameComplex: 'Yūsuf',
    translatedName: 'Joseph',
    versesCount: 111,
    revelationPlace: 'makkah',
  },
  {
    id: 13,
    nameSimple: "Ar-Ra'd",
    nameArabic: 'الرعد',
    nameComplex: "Ar-Ra'd",
    translatedName: 'The Thunder',
    versesCount: 43,
    revelationPlace: 'madinah',
  },
  {
    id: 14,
    nameSimple: 'Ibrahim',
    nameArabic: 'ابراهيم',
    nameComplex: 'Ibrāhīm',
    translatedName: 'Abraham',
    versesCount: 52,
    revelationPlace: 'makkah',
  },
  {
    id: 15,
    nameSimple: 'Al-Hijr',
    nameArabic: 'الحجر',
    nameComplex: 'Al-Ĥijr',
    translatedName: 'The Rocky Tract',
    versesCount: 99,
    revelationPlace: 'makkah',
  },
  {
    id: 16,
    nameSimple: 'An-Nahl',
    nameArabic: 'النحل',
    nameComplex: 'An-Naĥl',
    translatedName: 'The Bee',
    versesCount: 128,
    revelationPlace: 'makkah',
  },
  {
    id: 17,
    nameSimple: 'Al-Isra',
    nameArabic: 'الإسراء',
    nameComplex: 'Al-Isrā',
    translatedName: 'The Night Journey',
    versesCount: 111,
    revelationPlace: 'makkah',
  },
  {
    id: 18,
    nameSimple: 'Al-Kahf',
    nameArabic: 'الكهف',
    nameComplex: 'Al-Kahf',
    translatedName: 'The Cave',
    versesCount: 110,
    revelationPlace: 'makkah',
  },
  {
    id: 19,
    nameSimple: 'Maryam',
    nameArabic: 'مريم',
    nameComplex: 'Maryam',
    translatedName: 'Mary',
    versesCount: 98,
    revelationPlace: 'makkah',
  },
  {
    id: 20,
    nameSimple: 'Taha',
    nameArabic: 'طه',
    nameComplex: 'Ţāhā',
    translatedName: 'Ta-Ha',
    versesCount: 135,
    revelationPlace: 'makkah',
  },
  {
    id: 21,
    nameSimple: 'Al-Anbya',
    nameArabic: 'الأنبياء',
    nameComplex: 'Al-Anbyā',
    translatedName: 'The Prophets',
    versesCount: 112,
    revelationPlace: 'makkah',
  },
  {
    id: 22,
    nameSimple: 'Al-Hajj',
    nameArabic: 'الحج',
    nameComplex: 'Al-Ĥajj',
    translatedName: 'The Pilgrimage',
    versesCount: 78,
    revelationPlace: 'madinah',
  },
  {
    id: 23,
    nameSimple: "Al-Mu'minun",
    nameArabic: 'المؤمنون',
    nameComplex: "Al-Mu'minūn",
    translatedName: 'The Believers',
    versesCount: 118,
    revelationPlace: 'makkah',
  },
  {
    id: 24,
    nameSimple: 'An-Nur',
    nameArabic: 'النور',
    nameComplex: 'An-Nūr',
    translatedName: 'The Light',
    versesCount: 64,
    revelationPlace: 'madinah',
  },
  {
    id: 25,
    nameSimple: 'Al-Furqan',
    nameArabic: 'الفرقان',
    nameComplex: 'Al-Furqān',
    translatedName: 'The Criterion',
    versesCount: 77,
    revelationPlace: 'makkah',
  },
  {
    id: 26,
    nameSimple: "Ash-Shu'ara",
    nameArabic: 'الشعراء',
    nameComplex: "Ash-Shu'arā",
    translatedName: 'The Poets',
    versesCount: 227,
    revelationPlace: 'makkah',
  },
  {
    id: 27,
    nameSimple: 'An-Naml',
    nameArabic: 'النمل',
    nameComplex: 'An-Naml',
    translatedName: 'The Ant',
    versesCount: 93,
    revelationPlace: 'makkah',
  },
  {
    id: 28,
    nameSimple: 'Al-Qasas',
    nameArabic: 'القصص',
    nameComplex: 'Al-Qaşaş',
    translatedName: 'The Stories',
    versesCount: 88,
    revelationPlace: 'makkah',
  },
  {
    id: 29,
    nameSimple: "Al-'Ankabut",
    nameArabic: 'العنكبوت',
    nameComplex: "Al-'Ankabūt",
    translatedName: 'The Spider',
    versesCount: 69,
    revelationPlace: 'makkah',
  },
  {
    id: 30,
    nameSimple: 'Ar-Rum',
    nameArabic: 'الروم',
    nameComplex: 'Ar-Rūm',
    translatedName: 'The Romans',
    versesCount: 60,
    revelationPlace: 'makkah',
  },
  {
    id: 31,
    nameSimple: 'Luqman',
    nameArabic: 'لقمان',
    nameComplex: 'Luqmān',
    translatedName: 'Luqman',
    versesCount: 34,
    revelationPlace: 'makkah',
  },
  {
    id: 32,
    nameSimple: 'As-Sajdah',
    nameArabic: 'السجدة',
    nameComplex: 'As-Sajdah',
    translatedName: 'The Prostration',
    versesCount: 30,
    revelationPlace: 'makkah',
  },
  {
    id: 33,
    nameSimple: 'Al-Ahzab',
    nameArabic: 'الأحزاب',
    nameComplex: 'Al-Aĥzāb',
    translatedName: 'The Combined Forces',
    versesCount: 73,
    revelationPlace: 'madinah',
  },
  {
    id: 34,
    nameSimple: 'Saba',
    nameArabic: 'سبإ',
    nameComplex: 'Saba',
    translatedName: 'Sheba',
    versesCount: 54,
    revelationPlace: 'makkah',
  },
  {
    id: 35,
    nameSimple: 'Fatir',
    nameArabic: 'فاطر',
    nameComplex: 'Fāţir',
    translatedName: 'Originator',
    versesCount: 45,
    revelationPlace: 'makkah',
  },
  {
    id: 36,
    nameSimple: 'Ya-Sin',
    nameArabic: 'يس',
    nameComplex: 'Yā-Sīn',
    translatedName: 'Ya Sin',
    versesCount: 83,
    revelationPlace: 'makkah',
  },
  {
    id: 37,
    nameSimple: 'As-Saffat',
    nameArabic: 'الصافات',
    nameComplex: 'Aş-Şāffāt',
    translatedName: 'Those who set the Ranks',
    versesCount: 182,
    revelationPlace: 'makkah',
  },
  {
    id: 38,
    nameSimple: 'Sad',
    nameArabic: 'ص',
    nameComplex: 'Şād',
    translatedName: 'The Letter "Saad"',
    versesCount: 88,
    revelationPlace: 'makkah',
  },
  {
    id: 39,
    nameSimple: 'Az-Zumar',
    nameArabic: 'الزمر',
    nameComplex: 'Az-Zumar',
    translatedName: 'The Troops',
    versesCount: 75,
    revelationPlace: 'makkah',
  },
  {
    id: 40,
    nameSimple: 'Ghafir',
    nameArabic: 'غافر',
    nameComplex: 'Ghāfir',
    translatedName: 'The Forgiver',
    versesCount: 85,
    revelationPlace: 'makkah',
  },
  {
    id: 41,
    nameSimple: 'Fussilat',
    nameArabic: 'فصلت',
    nameComplex: 'Fuşşilat',
    translatedName: 'Explained in Detail',
    versesCount: 54,
    revelationPlace: 'makkah',
  },
  {
    id: 42,
    nameSimple: 'Ash-Shuraa',
    nameArabic: 'الشورى',
    nameComplex: 'Ash-Shūraá',
    translatedName: 'The Consultation',
    versesCount: 53,
    revelationPlace: 'makkah',
  },
  {
    id: 43,
    nameSimple: 'Az-Zukhruf',
    nameArabic: 'الزخرف',
    nameComplex: 'Az-Zukhruf',
    translatedName: 'The Ornaments of Gold',
    versesCount: 89,
    revelationPlace: 'makkah',
  },
  {
    id: 44,
    nameSimple: 'Ad-Dukhan',
    nameArabic: 'الدخان',
    nameComplex: 'Ad-Dukhān',
    translatedName: 'The Smoke',
    versesCount: 59,
    revelationPlace: 'makkah',
  },
  {
    id: 45,
    nameSimple: 'Al-Jathiyah',
    nameArabic: 'الجاثية',
    nameComplex: 'Al-Jāthiyah',
    translatedName: 'The Crouching',
    versesCount: 37,
    revelationPlace: 'makkah',
  },
  {
    id: 46,
    nameSimple: 'Al-Ahqaf',
    nameArabic: 'الأحقاف',
    nameComplex: 'Al-Aĥqāf',
    translatedName: 'The Wind-Curved Sandhills',
    versesCount: 35,
    revelationPlace: 'makkah',
  },
  {
    id: 47,
    nameSimple: 'Muhammad',
    nameArabic: 'محمد',
    nameComplex: 'Muĥammad',
    translatedName: 'Muhammad',
    versesCount: 38,
    revelationPlace: 'madinah',
  },
  {
    id: 48,
    nameSimple: 'Al-Fath',
    nameArabic: 'الفتح',
    nameComplex: 'Al-Fatĥ',
    translatedName: 'The Victory',
    versesCount: 29,
    revelationPlace: 'madinah',
  },
  {
    id: 49,
    nameSimple: 'Al-Hujurat',
    nameArabic: 'الحجرات',
    nameComplex: 'Al-Ĥujurāt',
    translatedName: 'The Rooms',
    versesCount: 18,
    revelationPlace: 'madinah',
  },
  {
    id: 50,
    nameSimple: 'Qaf',
    nameArabic: 'ق',
    nameComplex: 'Qāf',
    translatedName: 'The Letter "Qaf"',
    versesCount: 45,
    revelationPlace: 'makkah',
  },
  {
    id: 51,
    nameSimple: 'Adh-Dhariyat',
    nameArabic: 'الذاريات',
    nameComplex: 'Adh-Dhāriyāt',
    translatedName: 'The Winnowing Winds',
    versesCount: 60,
    revelationPlace: 'makkah',
  },
  {
    id: 52,
    nameSimple: 'At-Tur',
    nameArabic: 'الطور',
    nameComplex: 'Aţ-Ţūr',
    translatedName: 'The Mount',
    versesCount: 49,
    revelationPlace: 'makkah',
  },
  {
    id: 53,
    nameSimple: 'An-Najm',
    nameArabic: 'النجم',
    nameComplex: 'An-Najm',
    translatedName: 'The Star',
    versesCount: 62,
    revelationPlace: 'makkah',
  },
  {
    id: 54,
    nameSimple: 'Al-Qamar',
    nameArabic: 'القمر',
    nameComplex: 'Al-Qamar',
    translatedName: 'The Moon',
    versesCount: 55,
    revelationPlace: 'makkah',
  },
  {
    id: 55,
    nameSimple: 'Ar-Rahman',
    nameArabic: 'الرحمن',
    nameComplex: 'Ar-Raĥmān',
    translatedName: 'The Beneficent',
    versesCount: 78,
    revelationPlace: 'madinah',
  },
  {
    id: 56,
    nameSimple: "Al-Waqi'ah",
    nameArabic: 'الواقعة',
    nameComplex: "Al-Wāqi'ah",
    translatedName: 'The Inevitable',
    versesCount: 96,
    revelationPlace: 'makkah',
  },
  {
    id: 57,
    nameSimple: 'Al-Hadid',
    nameArabic: 'الحديد',
    nameComplex: 'Al-Ĥadīd',
    translatedName: 'The Iron',
    versesCount: 29,
    revelationPlace: 'madinah',
  },
  {
    id: 58,
    nameSimple: 'Al-Mujadila',
    nameArabic: 'المجادلة',
    nameComplex: 'Al-Mujādila',
    translatedName: 'The Pleading Woman',
    versesCount: 22,
    revelationPlace: 'madinah',
  },
  {
    id: 59,
    nameSimple: 'Al-Hashr',
    nameArabic: 'الحشر',
    nameComplex: 'Al-Ĥashr',
    translatedName: 'The Exile',
    versesCount: 24,
    revelationPlace: 'madinah',
  },
  {
    id: 60,
    nameSimple: 'Al-Mumtahanah',
    nameArabic: 'الممتحنة',
    nameComplex: 'Al-Mumtaĥanah',
    translatedName: 'She that is to be examined',
    versesCount: 13,
    revelationPlace: 'madinah',
  },
  {
    id: 61,
    nameSimple: 'As-Saf',
    nameArabic: 'الصف',
    nameComplex: 'Aş-Şaf',
    translatedName: 'The Ranks',
    versesCount: 14,
    revelationPlace: 'madinah',
  },
  {
    id: 62,
    nameSimple: "Al-Jumu'ah",
    nameArabic: 'الجمعة',
    nameComplex: "Al-Jumu'ah",
    translatedName: 'Friday',
    versesCount: 11,
    revelationPlace: 'madinah',
  },
  {
    id: 63,
    nameSimple: 'Al-Munafiqun',
    nameArabic: 'المنافقون',
    nameComplex: 'Al-Munāfiqūn',
    translatedName: 'The Hypocrites',
    versesCount: 11,
    revelationPlace: 'madinah',
  },
  {
    id: 64,
    nameSimple: 'At-Taghabun',
    nameArabic: 'التغابن',
    nameComplex: 'At-Taghābun',
    translatedName: 'The Mutual Disillusion',
    versesCount: 18,
    revelationPlace: 'madinah',
  },
  {
    id: 65,
    nameSimple: 'At-Talaq',
    nameArabic: 'الطلاق',
    nameComplex: 'Aţ-Ţalāq',
    translatedName: 'The Divorce',
    versesCount: 12,
    revelationPlace: 'madinah',
  },
  {
    id: 66,
    nameSimple: 'At-Tahrim',
    nameArabic: 'التحريم',
    nameComplex: 'At-Taĥrīm',
    translatedName: 'The Prohibition',
    versesCount: 12,
    revelationPlace: 'madinah',
  },
  {
    id: 67,
    nameSimple: 'Al-Mulk',
    nameArabic: 'الملك',
    nameComplex: 'Al-Mulk',
    translatedName: 'The Sovereignty',
    versesCount: 30,
    revelationPlace: 'makkah',
  },
  {
    id: 68,
    nameSimple: 'Al-Qalam',
    nameArabic: 'القلم',
    nameComplex: 'Al-Qalam',
    translatedName: 'The Pen',
    versesCount: 52,
    revelationPlace: 'makkah',
  },
  {
    id: 69,
    nameSimple: 'Al-Haqqah',
    nameArabic: 'الحاقة',
    nameComplex: 'Al-Ĥāqqah',
    translatedName: 'The Reality',
    versesCount: 52,
    revelationPlace: 'makkah',
  },
  {
    id: 70,
    nameSimple: "Al-Ma'arij",
    nameArabic: 'المعارج',
    nameComplex: "Al-Ma'ārij",
    translatedName: 'The Ascending Stairways',
    versesCount: 44,
    revelationPlace: 'makkah',
  },
  {
    id: 71,
    nameSimple: 'Nuh',
    nameArabic: 'نوح',
    nameComplex: 'Nūĥ',
    translatedName: 'Noah',
    versesCount: 28,
    revelationPlace: 'makkah',
  },
  {
    id: 72,
    nameSimple: 'Al-Jinn',
    nameArabic: 'الجن',
    nameComplex: 'Al-Jinn',
    translatedName: 'The Jinn',
    versesCount: 28,
    revelationPlace: 'makkah',
  },
  {
    id: 73,
    nameSimple: 'Al-Muzzammil',
    nameArabic: 'المزمل',
    nameComplex: 'Al-Muzzammil',
    translatedName: 'The Enshrouded One',
    versesCount: 20,
    revelationPlace: 'makkah',
  },
  {
    id: 74,
    nameSimple: 'Al-Muddaththir',
    nameArabic: 'المدثر',
    nameComplex: 'Al-Muddaththir',
    translatedName: 'The Cloaked One',
    versesCount: 56,
    revelationPlace: 'makkah',
  },
  {
    id: 75,
    nameSimple: 'Al-Qiyamah',
    nameArabic: 'القيامة',
    nameComplex: 'Al-Qiyāmah',
    translatedName: 'The Resurrection',
    versesCount: 40,
    revelationPlace: 'makkah',
  },
  {
    id: 76,
    nameSimple: 'Al-Insan',
    nameArabic: 'الانسان',
    nameComplex: 'Al-Insān',
    translatedName: 'The Man',
    versesCount: 31,
    revelationPlace: 'madinah',
  },
  {
    id: 77,
    nameSimple: 'Al-Mursalat',
    nameArabic: 'المرسلات',
    nameComplex: 'Al-Mursalāt',
    translatedName: 'The Emissaries',
    versesCount: 50,
    revelationPlace: 'makkah',
  },
  {
    id: 78,
    nameSimple: 'An-Naba',
    nameArabic: 'النبإ',
    nameComplex: 'An-Naba',
    translatedName: 'The Tidings',
    versesCount: 40,
    revelationPlace: 'makkah',
  },
  {
    id: 79,
    nameSimple: "An-Nazi'at",
    nameArabic: 'النازعات',
    nameComplex: "An-Nāzi'āt",
    translatedName: 'Those who drag forth',
    versesCount: 46,
    revelationPlace: 'makkah',
  },
  {
    id: 80,
    nameSimple: "'Abasa",
    nameArabic: 'عبس',
    nameComplex: "'Abasa",
    translatedName: 'He Frowned',
    versesCount: 42,
    revelationPlace: 'makkah',
  },
  {
    id: 81,
    nameSimple: 'At-Takwir',
    nameArabic: 'التكوير',
    nameComplex: 'At-Takwīr',
    translatedName: 'The Overthrowing',
    versesCount: 29,
    revelationPlace: 'makkah',
  },
  {
    id: 82,
    nameSimple: 'Al-Infitar',
    nameArabic: 'الانفطار',
    nameComplex: 'Al-Infiţār',
    translatedName: 'The Cleaving',
    versesCount: 19,
    revelationPlace: 'makkah',
  },
  {
    id: 83,
    nameSimple: 'Al-Mutaffifin',
    nameArabic: 'المطففين',
    nameComplex: 'Al-Muţaffifīn',
    translatedName: 'The Defrauding',
    versesCount: 36,
    revelationPlace: 'makkah',
  },
  {
    id: 84,
    nameSimple: 'Al-Inshiqaq',
    nameArabic: 'الانشقاق',
    nameComplex: 'Al-Inshiqāq',
    translatedName: 'The Splitting Open',
    versesCount: 25,
    revelationPlace: 'makkah',
  },
  {
    id: 85,
    nameSimple: 'Al-Buruj',
    nameArabic: 'البروج',
    nameComplex: 'Al-Burūj',
    translatedName: 'The Mansions of the Stars',
    versesCount: 22,
    revelationPlace: 'makkah',
  },
  {
    id: 86,
    nameSimple: 'At-Tariq',
    nameArabic: 'الطارق',
    nameComplex: 'Aţ-Ţāriq',
    translatedName: 'The Morning Star',
    versesCount: 17,
    revelationPlace: 'makkah',
  },
  {
    id: 87,
    nameSimple: "Al-A'la",
    nameArabic: 'الأعلى',
    nameComplex: "Al-A'lā",
    translatedName: 'The Most High',
    versesCount: 19,
    revelationPlace: 'makkah',
  },
  {
    id: 88,
    nameSimple: 'Al-Ghashiyah',
    nameArabic: 'الغاشية',
    nameComplex: 'Al-Ghāshiyah',
    translatedName: 'The Overwhelming',
    versesCount: 26,
    revelationPlace: 'makkah',
  },
  {
    id: 89,
    nameSimple: 'Al-Fajr',
    nameArabic: 'الفجر',
    nameComplex: 'Al-Fajr',
    translatedName: 'The Dawn',
    versesCount: 30,
    revelationPlace: 'makkah',
  },
  {
    id: 90,
    nameSimple: 'Al-Balad',
    nameArabic: 'البلد',
    nameComplex: 'Al-Balad',
    translatedName: 'The City',
    versesCount: 20,
    revelationPlace: 'makkah',
  },
  {
    id: 91,
    nameSimple: 'Ash-Shams',
    nameArabic: 'الشمس',
    nameComplex: 'Ash-Shams',
    translatedName: 'The Sun',
    versesCount: 15,
    revelationPlace: 'makkah',
  },
  {
    id: 92,
    nameSimple: 'Al-Layl',
    nameArabic: 'الليل',
    nameComplex: 'Al-Layl',
    translatedName: 'The Night',
    versesCount: 21,
    revelationPlace: 'makkah',
  },
  {
    id: 93,
    nameSimple: 'Ad-Duhaa',
    nameArabic: 'الضحى',
    nameComplex: 'Ađ-Đuĥā',
    translatedName: 'The Morning Hours',
    versesCount: 11,
    revelationPlace: 'makkah',
  },
  {
    id: 94,
    nameSimple: 'Ash-Sharh',
    nameArabic: 'الشرح',
    nameComplex: 'Ash-Sharĥ',
    translatedName: 'The Relief',
    versesCount: 8,
    revelationPlace: 'makkah',
  },
  {
    id: 95,
    nameSimple: 'At-Tin',
    nameArabic: 'التين',
    nameComplex: 'At-Tīn',
    translatedName: 'The Fig',
    versesCount: 8,
    revelationPlace: 'makkah',
  },
  {
    id: 96,
    nameSimple: "Al-'Alaq",
    nameArabic: 'العلق',
    nameComplex: "Al-'Alaq",
    translatedName: 'The Clot',
    versesCount: 19,
    revelationPlace: 'makkah',
  },
  {
    id: 97,
    nameSimple: 'Al-Qadr',
    nameArabic: 'القدر',
    nameComplex: 'Al-Qadr',
    translatedName: 'The Power',
    versesCount: 5,
    revelationPlace: 'makkah',
  },
  {
    id: 98,
    nameSimple: 'Al-Bayyinah',
    nameArabic: 'البينة',
    nameComplex: 'Al-Bayyinah',
    translatedName: 'The Clear Proof',
    versesCount: 8,
    revelationPlace: 'madinah',
  },
  {
    id: 99,
    nameSimple: 'Az-Zalzalah',
    nameArabic: 'الزلزلة',
    nameComplex: 'Az-Zalzalah',
    translatedName: 'The Earthquake',
    versesCount: 8,
    revelationPlace: 'madinah',
  },
  {
    id: 100,
    nameSimple: "Al-'Adiyat",
    nameArabic: 'العاديات',
    nameComplex: "Al-'Ādiyāt",
    translatedName: 'The Courser',
    versesCount: 11,
    revelationPlace: 'makkah',
  },
  {
    id: 101,
    nameSimple: "Al-Qari'ah",
    nameArabic: 'القارعة',
    nameComplex: "Al-Qāri'ah",
    translatedName: 'The Calamity',
    versesCount: 11,
    revelationPlace: 'makkah',
  },
  {
    id: 102,
    nameSimple: 'At-Takathur',
    nameArabic: 'التكاثر',
    nameComplex: 'At-Takāthur',
    translatedName: 'The Rivalry in world increase',
    versesCount: 8,
    revelationPlace: 'makkah',
  },
  {
    id: 103,
    nameSimple: "Al-'Asr",
    nameArabic: 'العصر',
    nameComplex: "Al-'Aşr",
    translatedName: 'The Declining Day',
    versesCount: 3,
    revelationPlace: 'makkah',
  },
  {
    id: 104,
    nameSimple: 'Al-Humazah',
    nameArabic: 'الهمزة',
    nameComplex: 'Al-Humazah',
    translatedName: 'The Traducer',
    versesCount: 9,
    revelationPlace: 'makkah',
  },
  {
    id: 105,
    nameSimple: 'Al-Fil',
    nameArabic: 'الفيل',
    nameComplex: 'Al-Fīl',
    translatedName: 'The Elephant',
    versesCount: 5,
    revelationPlace: 'makkah',
  },
  {
    id: 106,
    nameSimple: 'Quraysh',
    nameArabic: 'قريش',
    nameComplex: 'Quraysh',
    translatedName: 'Quraysh',
    versesCount: 4,
    revelationPlace: 'makkah',
  },
  {
    id: 107,
    nameSimple: "Al-Ma'un",
    nameArabic: 'الماعون',
    nameComplex: "Al-Mā'ūn",
    translatedName: 'The Small Kindness',
    versesCount: 7,
    revelationPlace: 'makkah',
  },
  {
    id: 108,
    nameSimple: 'Al-Kawthar',
    nameArabic: 'الكوثر',
    nameComplex: 'Al-Kawthar',
    translatedName: 'The Abundance',
    versesCount: 3,
    revelationPlace: 'makkah',
  },
  {
    id: 109,
    nameSimple: 'Al-Kafirun',
    nameArabic: 'الكافرون',
    nameComplex: 'Al-Kāfirūn',
    translatedName: 'The Disbelievers',
    versesCount: 6,
    revelationPlace: 'makkah',
  },
  {
    id: 110,
    nameSimple: 'An-Nasr',
    nameArabic: 'النصر',
    nameComplex: 'An-Naşr',
    translatedName: 'The Divine Support',
    versesCount: 3,
    revelationPlace: 'madinah',
  },
  {
    id: 111,
    nameSimple: 'Al-Masad',
    nameArabic: 'المسد',
    nameComplex: 'Al-Masad',
    translatedName: 'The Palm Fiber',
    versesCount: 5,
    revelationPlace: 'makkah',
  },
  {
    id: 112,
    nameSimple: 'Al-Ikhlas',
    nameArabic: 'الإخلاص',
    nameComplex: 'Al-Ikhlāş',
    translatedName: 'The Sincerity',
    versesCount: 4,
    revelationPlace: 'makkah',
  },
  {
    id: 113,
    nameSimple: 'Al-Falaq',
    nameArabic: 'الفلق',
    nameComplex: 'Al-Falaq',
    translatedName: 'The Daybreak',
    versesCount: 5,
    revelationPlace: 'makkah',
  },
  {
    id: 114,
    nameSimple: 'An-Nas',
    nameArabic: 'الناس',
    nameComplex: 'An-Nās',
    translatedName: 'Mankind',
    versesCount: 6,
    revelationPlace: 'makkah',
  },
];

/**
 * Translations supported with IDs from Quran.com API v4
 */
export const AVAILABLE_TRANSLATIONS: QuranTranslationResource[] = [
  {
    id: 20,
    name: 'Saheeh International',
    authorName: 'Saheeh International',
    languageName: 'english',
  },
  { id: 85, name: 'M.A.S. Abdel Haleem', authorName: 'Abdul Haleem', languageName: 'english' },
  {
    id: 149,
    name: 'Fadel Soliman (Bridges)',
    authorName: 'Fadel Soliman',
    languageName: 'english',
  },
  { id: 84, name: 'Mufti Taqi Usmani', authorName: 'Mufti Taqi Usmani', languageName: 'english' },
  {
    id: 163,
    name: 'Sheikh Mujibur Rahman',
    authorName: 'Darussalaam Publication',
    languageName: 'bengali',
  },
  { id: 161, name: 'Taisirul Quran', authorName: 'Tawheed Publication', languageName: 'bengali' },
  {
    id: 213,
    name: 'Dr. Abu Bakr Muhammad Zakaria',
    authorName: 'Dr. Abu Bakr Muhammad Zakaria',
    languageName: 'bengali',
  },
  { id: 162, name: 'Rawai Al-bayan', authorName: 'Bayaan Foundation', languageName: 'bengali' },
];

/**
 * Tafsirs supported with IDs from Quran.com API v4
 */
export const AVAILABLE_TAFSIRS: QuranTafsirResource[] = [
  {
    id: 169,
    name: 'Tafsir Ibn Kathir (Abridged)',
    authorName: 'Hafiz Ibn Kathir',
    languageName: 'english',
  },
  {
    id: 168,
    name: "Ma'arif al-Qur'an",
    authorName: 'Mufti Muhammad Shafi',
    languageName: 'english',
  },
  {
    id: 166,
    name: 'Tafsir Abu Bakr Zakaria',
    authorName: 'King Fahd Quran Complex',
    languageName: 'bengali',
  },
  {
    id: 165,
    name: 'Tafsir Ahsanul Bayaan',
    authorName: 'Bayaan Foundation',
    languageName: 'bengali',
  },
  {
    id: 164,
    name: 'Tafseer Ibn Kathir (Bangla)',
    authorName: 'Tawheed Publication',
    languageName: 'bengali',
  },
];

/**
 * Available Reciters
 */
export const AVAILABLE_RECITERS: QuranReciterResource[] = [
  { id: 7, reciterName: 'Mishary Rashid Alafasy', style: 'Murattal' },
  { id: 2, reciterName: 'AbdulBaset AbdulSamad', style: 'Murattal' },
  { id: 1, reciterName: 'AbdulBaset AbdulSamad', style: 'Mujawwad' },
  { id: 3, reciterName: 'Abdur-Rahman as-Sudais', style: 'Murattal' },
  { id: 4, reciterName: 'Abu Bakr al-Shatri', style: 'Murattal' },
  { id: 5, reciterName: 'Hani ar-Rifai', style: 'Murattal' },
  { id: 6, reciterName: 'Mahmoud Khalil Al-Husary', style: 'Murattal' },
  { id: 10, reciterName: 'Saud ash-Shuraym', style: 'Murattal' },
];

/**
 * Curated list of famous inspirational & motivational verses (including single verses & ranges)
 */
export const CURATED_INSPIRATIONAL_VERSES: CuratedMotivationalPreset[] = [
  {
    key: '2:255',
    chapter: 2,
    verse: 255,
    theme: 'Protection & Majesty',
    title: 'Ayatul Kursi',
    description:
      'Allah - there is no deity except Him, the Ever-Living, the Sustainer of all existence.',
  },
  {
    key: '2:286',
    chapter: 2,
    verse: 286,
    theme: 'Hope & Capacity',
    title: 'No Soul Burdened Beyond Capacity',
    description: 'Allah does not charge a soul except [with that within] its capacity.',
  },
  {
    key: '3:139',
    chapter: 3,
    verse: 139,
    theme: 'Courage & Resilience',
    title: 'Do Not Despair',
    description:
      'So do not weaken and do not grieve, and you will be superior if you are [true] believers.',
  },
  {
    key: '94:5-6',
    chapter: 94,
    verse: 5,
    verseEnd: 6,
    theme: 'Hardship & Ease',
    title: 'With Hardship Comes Ease (Ayat 5-6)',
    description: 'For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease.',
  },
  {
    key: '65:2-3',
    chapter: 65,
    verse: 2,
    verseEnd: 3,
    theme: 'Trust & Provision',
    title: 'A Way Out & Unseen Provision',
    description:
      'And whoever fears Allah - He will make for him a way out and will provide for him from where he does not expect.',
  },
  {
    key: '39:53',
    chapter: 39,
    verse: 53,
    theme: 'Mercy & Forgiveness',
    title: "Never Despair of Allah's Mercy",
    description:
      'Say, "O My servants who have transgressed against themselves, do not despair of the mercy of Allah. Indeed, Allah forgives all sins."',
  },
  {
    key: '2:152',
    chapter: 2,
    verse: 152,
    theme: 'Remembrance',
    title: 'Remember Me, I Remember You',
    description: 'So remember Me; I will remember you. And be grateful to Me and do not deny Me.',
  },
  {
    key: '2:153',
    chapter: 2,
    verse: 153,
    theme: 'Patience & Prayer',
    title: 'Patience and Prayer',
    description:
      'O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.',
  },
  {
    key: '13:28',
    chapter: 13,
    verse: 28,
    theme: 'Peace of Heart',
    title: 'Assurance of Hearts',
    description: 'Unquestionably, by the remembrance of Allah hearts are assured.',
  },
  {
    key: '93:3-5',
    chapter: 93,
    verse: 3,
    verseEnd: 5,
    theme: 'Comfort & Contentment',
    title: 'Your Lord Has Not Forsaken You',
    description:
      'Your Lord has not taken leave of you, nor has He detested [you]... and your Lord is going to give you, and you will be satisfied.',
  },
  {
    key: '21:87',
    chapter: 21,
    verse: 87,
    theme: 'Supplication in Distress',
    title: 'Dua of Prophet Yunus',
    description:
      'There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.',
  },
  {
    key: '3:173',
    chapter: 3,
    verse: 173,
    theme: 'Supreme Trust',
    title: 'Allah is Sufficient for Us',
    description: 'Sufficient for us is Allah, and [He is] the best Disposer of affairs.',
  },
  {
    key: '55:13',
    chapter: 55,
    verse: 13,
    theme: 'Gratitude',
    title: 'Favors of Your Lord',
    description: 'So which of the favors of your Lord would you deny?',
  },
  {
    key: '112:1-4',
    chapter: 112,
    verse: 1,
    verseEnd: 4,
    theme: 'Purity of Faith',
    title: 'Surah Al-Ikhlas (Complete)',
    description: 'Say: He is Allah, [who is] One. Allah, the Eternal Refuge...',
  },
];

/**
 * Converts Western digits to Bengali numeral glyphs
 */
export function toBanglaNumber(num: number | string): string {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\d/g, (d) => banglaDigits[parseInt(d, 10)] || d);
}

/**
 * Converts Western digits to Eastern Arabic numeral glyphs
 */
export function toArabicNumber(num: number | string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/\d/g, (d) => arabicDigits[parseInt(d, 10)] || d);
}

/**
 * Strips HTML footnotes and formatting tags from Quran.com text
 */
export function cleanQuranText(html: string): string {
  if (!html) {
    return '';
  }
  return html
    .replace(/<sup[^>]*>.*?<\/sup>/gi, '') // Remove footnote superscripts
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds chapter metadata by ID or name
 */
export function getChapterMetadata(chapterNumber: number): ChapterMetadata | undefined {
  return QURAN_CHAPTERS.find((c) => c.id === chapterNumber);
}

export function findChapterByName(name: string): ChapterMetadata | undefined {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return QURAN_CHAPTERS.find((c) => {
    const simple = c.nameSimple.toLowerCase().replace(/[^a-z0-9]/g, '');
    const translated = c.translatedName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return simple.includes(normalized) || translated.includes(normalized);
  });
}

/**
 * Parses single or batch verse inputs from user UI.
 * Examples:
 * - "2:255" -> [{ chapter: 2, verse: 255, key: "2:255" }]
 * - "94:1-8" -> [{ chapter: 94, verse: 1, verseEnd: 8, key: "94:1-8" }]
 * - "2:255, 94:5-6" -> [{ chapter: 2, verse: 255, key: "2:255" }, { chapter: 94, verse: 5, verseEnd: 6, key: "94:5-6" }]
 * - "Surah Baqarah 255" -> [{ chapter: 2, verse: 255, key: "2:255" }]
 */
export function parseVerseInput(
  rawInput: string
): { chapter: number; verse: number; verseEnd?: number; key: string }[] {
  if (!rawInput || typeof rawInput !== 'string') {
    return [];
  }

  const results: { chapter: number; verse: number; verseEnd?: number; key: string }[] = [];
  const seen = new Set<string>();

  // Split by comma, semicolon, or newline
  const tokens = rawInput
    .split(/[,;\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    // Pattern 1: Chapter:Verse-EndVerse (Range) e.g. "94:1-8" or "2:255-256"
    const rangeMatch = token.match(/^(\d{1,3})\s*[:.]\s*(\d{1,3})\s*-\s*(\d{1,3})$/);
    if (rangeMatch) {
      const chapter = parseInt(rangeMatch[1], 10);
      const startVerse = parseInt(rangeMatch[2], 10);
      const endVerse = parseInt(rangeMatch[3], 10);
      const meta = getChapterMetadata(chapter);

      if (meta && chapter >= 1 && chapter <= 114) {
        const start = Math.max(1, Math.min(startVerse, endVerse));
        const end = Math.min(meta.versesCount, Math.max(startVerse, endVerse));
        if (start === end) {
          const key = `${chapter}:${start}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ chapter, verse: start, key });
          }
        } else {
          const key = `${chapter}:${start}-${end}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ chapter, verse: start, verseEnd: end, key });
          }
        }
      }
      continue;
    }

    // Pattern 2: Chapter:Verse e.g. "2:255", "2.255"
    const singleColonMatch = token.match(/^(\d{1,3})\s*[:.]\s*(\d{1,3})$/);
    if (singleColonMatch) {
      const chapter = parseInt(singleColonMatch[1], 10);
      const verse = parseInt(singleColonMatch[2], 10);
      const meta = getChapterMetadata(chapter);

      if (meta && chapter >= 1 && chapter <= 114 && verse >= 1 && verse <= meta.versesCount) {
        const key = `${chapter}:${verse}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ chapter, verse, key });
        }
      }
      continue;
    }

    // Pattern 3: "Surah [Name or Number] [Verse or Verse Range]"
    const surahTextMatch = token.match(
      /(?:surah|surat)?\s*([a-zA-Z\s'-]+|\d{1,3})\s+(?:ayah|verse|ayat)?\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?/i
    );
    if (surahTextMatch) {
      const chapterQuery = surahTextMatch[1].trim();
      const startVerse = parseInt(surahTextMatch[2], 10);
      const endVerse = surahTextMatch[3] ? parseInt(surahTextMatch[3], 10) : startVerse;

      let meta: ChapterMetadata | undefined;
      if (/^\d+$/.test(chapterQuery)) {
        meta = getChapterMetadata(parseInt(chapterQuery, 10));
      } else {
        meta = findChapterByName(chapterQuery);
      }

      if (meta) {
        const start = Math.max(1, Math.min(startVerse, endVerse));
        const end = Math.min(meta.versesCount, Math.max(startVerse, endVerse));
        if (start === end) {
          const key = `${meta.id}:${start}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ chapter: meta.id, verse: start, key });
          }
        } else {
          const key = `${meta.id}:${start}-${end}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ chapter: meta.id, verse: start, verseEnd: end, key });
          }
        }
      }
    }
  }

  return results;
}

export interface ParsedVerseBatchItem {
  chapter: number;
  verse: number;
  verseEnd?: number;
  key: string;
  surahName: string;
  translatedName: string;
  nameArabic: string;
  totalVersesInSurah: number;
}

export interface ParsedVerseBatchInvalidItem {
  token: string;
  reason: string;
}

export interface ParsedVerseBatchReport {
  validVerses: ParsedVerseBatchItem[];
  invalidTokens: ParsedVerseBatchInvalidItem[];
  totalTokensCount: number;
}

/**
 * Parses batch input text (comma/newline separated chapter:verse or chapter:start-end)
 * and returns detailed reporting of valid verses and any invalid tokens with reasons.
 * Ranges (e.g. 94:1-8 or 94:5-6) are preserved and stored as range records.
 */
export function parseVerseBatchDetailed(rawInput: string): ParsedVerseBatchReport {
  if (!rawInput || typeof rawInput !== 'string') {
    return { validVerses: [], invalidTokens: [], totalTokensCount: 0 };
  }

  const validVerses: ParsedVerseBatchItem[] = [];
  const invalidTokens: ParsedVerseBatchInvalidItem[] = [];
  const seen = new Set<string>();

  // Split by comma, semicolon, or newline
  const tokens = rawInput
    .split(/[,;\n\r]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    let matched = false;

    // Pattern 1: Chapter:Verse-EndVerse (Range) e.g. "94:1-8" or "2:255-256"
    const rangeMatch = token.match(/^(\d{1,3})\s*[:.]\s*(\d{1,3})\s*-\s*(\d{1,3})$/);
    if (rangeMatch) {
      matched = true;
      const chapter = parseInt(rangeMatch[1], 10);
      const startVerse = parseInt(rangeMatch[2], 10);
      const endVerse = parseInt(rangeMatch[3], 10);
      const meta = getChapterMetadata(chapter);

      if (!meta || chapter < 1 || chapter > 114) {
        invalidTokens.push({
          token,
          reason: `Invalid Surah number (${chapter}). Surah number must be between 1 and 114.`,
        });
        continue;
      }

      if (
        startVerse < 1 ||
        startVerse > meta.versesCount ||
        endVerse < 1 ||
        endVerse > meta.versesCount
      ) {
        invalidTokens.push({
          token,
          reason: `Invalid Ayah range for Surah ${meta.nameSimple} (1-${meta.versesCount}).`,
        });
        continue;
      }

      const start = Math.min(startVerse, endVerse);
      const end = Math.max(startVerse, endVerse);
      if (start === end) {
        const key = `${chapter}:${start}`;
        if (!seen.has(key)) {
          seen.add(key);
          validVerses.push({
            chapter,
            verse: start,
            key,
            surahName: meta.nameSimple,
            translatedName: meta.translatedName,
            nameArabic: meta.nameArabic,
            totalVersesInSurah: meta.versesCount,
          });
        }
      } else {
        const key = `${chapter}:${start}-${end}`;
        if (!seen.has(key)) {
          seen.add(key);
          validVerses.push({
            chapter,
            verse: start,
            verseEnd: end,
            key,
            surahName: meta.nameSimple,
            translatedName: meta.translatedName,
            nameArabic: meta.nameArabic,
            totalVersesInSurah: meta.versesCount,
          });
        }
      }
      continue;
    }

    // Pattern 2: Chapter:Verse e.g. "2:255", "2.255"
    const singleColonMatch = token.match(/^(\d{1,3})\s*[:.]\s*(\d{1,3})$/);
    if (singleColonMatch) {
      matched = true;
      const chapter = parseInt(singleColonMatch[1], 10);
      const verse = parseInt(singleColonMatch[2], 10);
      const meta = getChapterMetadata(chapter);

      if (!meta || chapter < 1 || chapter > 114) {
        invalidTokens.push({
          token,
          reason: `Invalid Surah number (${chapter}). Surah number must be between 1 and 114.`,
        });
        continue;
      }

      if (verse < 1 || verse > meta.versesCount) {
        invalidTokens.push({
          token,
          reason: `Surah ${meta.nameSimple} only contains ${meta.versesCount} Ayahs (requested verse: ${verse}).`,
        });
        continue;
      }

      const key = `${chapter}:${verse}`;
      if (!seen.has(key)) {
        seen.add(key);
        validVerses.push({
          chapter,
          verse,
          key,
          surahName: meta.nameSimple,
          translatedName: meta.translatedName,
          nameArabic: meta.nameArabic,
          totalVersesInSurah: meta.versesCount,
        });
      }
      continue;
    }

    // Pattern 3: "Surah [Name or Number] [Verse or Verse Range]"
    const surahTextMatch = token.match(
      /(?:surah|surat)?\s*([a-zA-Z\s'-]+|\d{1,3})\s+(?:ayah|verse|ayat)?\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?/i
    );
    if (surahTextMatch) {
      const chapterQuery = surahTextMatch[1].trim();
      const startVerse = parseInt(surahTextMatch[2], 10);
      const endVerse = surahTextMatch[3] ? parseInt(surahTextMatch[3], 10) : startVerse;

      let meta: ChapterMetadata | undefined;
      if (/^\d+$/.test(chapterQuery)) {
        meta = getChapterMetadata(parseInt(chapterQuery, 10));
      } else {
        meta = findChapterByName(chapterQuery);
      }

      if (meta) {
        matched = true;
        if (
          startVerse < 1 ||
          startVerse > meta.versesCount ||
          endVerse < 1 ||
          endVerse > meta.versesCount
        ) {
          invalidTokens.push({
            token,
            reason: `Surah ${meta.nameSimple} only has ${meta.versesCount} Ayahs (requested: ${startVerse}-${endVerse}).`,
          });
          continue;
        }

        const start = Math.min(startVerse, endVerse);
        const end = Math.max(startVerse, endVerse);
        if (start === end) {
          const key = `${meta.id}:${start}`;
          if (!seen.has(key)) {
            seen.add(key);
            validVerses.push({
              chapter: meta.id,
              verse: start,
              key,
              surahName: meta.nameSimple,
              translatedName: meta.translatedName,
              nameArabic: meta.nameArabic,
              totalVersesInSurah: meta.versesCount,
            });
          }
        } else {
          const key = `${meta.id}:${start}-${end}`;
          if (!seen.has(key)) {
            seen.add(key);
            validVerses.push({
              chapter: meta.id,
              verse: start,
              verseEnd: end,
              key,
              surahName: meta.nameSimple,
              translatedName: meta.translatedName,
              nameArabic: meta.nameArabic,
              totalVersesInSurah: meta.versesCount,
            });
          }
        }
        continue;
      }
    }

    if (!matched) {
      invalidTokens.push({
        token,
        reason: 'Unrecognized format. Expected chapter:verse (e.g. 2:255 or 94:1-8).',
      });
    }
  }

  return {
    validVerses,
    invalidTokens,
    totalTokensCount: tokens.length,
  };
}

// In-Memory verse cache to reduce API calls
const verseMemoryCache = new Map<string, FetchedVersePayload>();

export interface FetchVerseOptions {
  verseEnd?: number; // Optional end verse for range fetching (e.g. 6 in 94:5-6)
  englishTranslationId?: number; // default 20 (Saheeh Int)
  banglaTranslationId?: number; // default 163 (Mujibur Rahman)
  englishTafsirId?: number; // default 169 (Ibn Kathir)
  banglaTafsirId?: number; // default 166 (Abu Bakr Zakaria)
  reciterId?: number; // default 7 (Alafasy)
  forceRefresh?: boolean;
}

/**
 * Fetches verse or verse-range data from Quran.com API v4
 */
export async function fetchVerseFromQuranApi(
  chapter: number,
  verse: number,
  options: FetchVerseOptions = {}
): Promise<FetchedVersePayload> {
  const {
    verseEnd,
    englishTranslationId = 20,
    banglaTranslationId = 163,
    englishTafsirId = 169,
    banglaTafsirId = 166,
    reciterId = 7,
    forceRefresh = false,
  } = options;

  const isRange = typeof verseEnd === 'number' && verseEnd > verse;
  const key = isRange ? `${chapter}:${verse}-${verseEnd}` : `${chapter}:${verse}`;
  const cacheKey = `${key}_en${englishTranslationId}_bn${banglaTranslationId}_rec${reciterId}_taf${englishTafsirId}_${banglaTafsirId}`;

  if (!forceRefresh && verseMemoryCache.has(cacheKey)) {
    return verseMemoryCache.get(cacheKey)!;
  }

  const chapterMeta = getChapterMetadata(chapter);
  if (!chapterMeta) {
    throw new Error(`Invalid chapter number: ${chapter}. Must be between 1 and 114.`);
  }

  if (verse < 1 || verse > chapterMeta.versesCount) {
    throw new Error(
      `Invalid verse number: ${verse} for Surah ${chapterMeta.nameSimple}. Must be between 1 and ${chapterMeta.versesCount}.`
    );
  }

  if (isRange && (verseEnd < 1 || verseEnd > chapterMeta.versesCount || verseEnd < verse)) {
    throw new Error(
      `Invalid verse range: ${verse}-${verseEnd} for Surah ${chapterMeta.nameSimple}. Must be between 1 and ${chapterMeta.versesCount}.`
    );
  }

  const translationIds = `${englishTranslationId},${banglaTranslationId}`;
  const enMeta = AVAILABLE_TRANSLATIONS.find((t) => t.id === englishTranslationId);
  const bnMeta = AVAILABLE_TRANSLATIONS.find((t) => t.id === banglaTranslationId);
  const reciterMeta = AVAILABLE_RECITERS.find((r) => r.id === reciterId);
  const enTafsirMeta = AVAILABLE_TAFSIRS.find((t) => t.id === englishTafsirId);
  const bnTafsirMeta = AVAILABLE_TAFSIRS.find((t) => t.id === banglaTafsirId);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    if (!isRange) {
      // ---------------------------------------------------------------------
      // Single Verse Fetch Mode
      // ---------------------------------------------------------------------
      const verseUrl = `https://api.quran.com/api/v4/verses/by_key/${key}?language=en&words=false&translations=${translationIds}&audio=${reciterId}&fields=text_uthmani,chapter_id,verse_number`;
      const res = await fetch(verseUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Quran.com API error: HTTP ${res.status} (${res.statusText})`);
      }

      const json = await res.json();
      const verseData = json?.verse;
      if (!verseData) {
        throw new Error(`No verse data found for ${key}`);
      }

      const arabicText = verseData.text_uthmani || '';
      let englishText = '';
      let banglaText = '';
      const translationsList = Array.isArray(verseData.translations) ? verseData.translations : [];

      for (const t of translationsList) {
        if (t.resource_id === englishTranslationId) {
          englishText = cleanQuranText(t.text || '');
        } else if (t.resource_id === banglaTranslationId) {
          banglaText = cleanQuranText(t.text || '');
        }
      }

      if (!englishText && translationsList.length > 0) {
        englishText = cleanQuranText(translationsList[0].text || '');
      }
      if (!banglaText && translationsList.length > 1) {
        banglaText = cleanQuranText(translationsList[1].text || '');
      }

      let audioUrl = '';
      if (verseData.audio?.url) {
        const rawUrl = verseData.audio.url;
        audioUrl = rawUrl.startsWith('http') ? rawUrl : `https://verses.quran.com/${rawUrl}`;
      }

      let englishTafsirText = '';
      let banglaTafsirText = '';
      try {
        const [enTafsirRes, bnTafsirRes] = await Promise.allSettled([
          fetch(`https://api.quran.com/api/v4/tafsirs/${englishTafsirId}/by_ayah/${key}`),
          fetch(`https://api.quran.com/api/v4/tafsirs/${banglaTafsirId}/by_ayah/${key}`),
        ]);

        if (enTafsirRes.status === 'fulfilled' && enTafsirRes.value.ok) {
          const enTafsirJson = await enTafsirRes.value.json();
          if (enTafsirJson?.tafsir?.text) {
            englishTafsirText = enTafsirJson.tafsir.text;
          }
        }

        if (bnTafsirRes.status === 'fulfilled' && bnTafsirRes.value.ok) {
          const bnTafsirJson = await bnTafsirRes.value.json();
          if (bnTafsirJson?.tafsir?.text) {
            banglaTafsirText = bnTafsirJson.tafsir.text;
          }
        }
      } catch {
        // Non-critical tafsir fetch error
      }

      const payload: FetchedVersePayload = {
        key,
        chapter,
        verse,
        chapterInfo: chapterMeta,
        arabicText,
        englishTranslation: {
          resourceId: englishTranslationId,
          translatorName: enMeta?.name || 'Saheeh International',
          text: englishText,
        },
        banglaTranslation: {
          resourceId: banglaTranslationId,
          translatorName: bnMeta?.name || 'বাংলা অনুবাদ',
          text: banglaText,
        },
        tafsir: {
          english: englishTafsirText
            ? {
                resourceId: englishTafsirId,
                name: enTafsirMeta?.name || 'Ibn Kathir',
                text: englishTafsirText,
              }
            : undefined,
          bangla: banglaTafsirText
            ? {
                resourceId: banglaTafsirId,
                name: bnTafsirMeta?.name || 'তাফসীর আবু বকর জাকারিয়া',
                text: banglaTafsirText,
              }
            : undefined,
        },
        audio: audioUrl
          ? {
              reciterId,
              reciterName: reciterMeta?.reciterName || 'Mishary Rashid Alafasy',
              audioUrl,
              audioUrls: [audioUrl],
              verseAudios: [{ verseNumber: verse, audioUrl }],
            }
          : undefined,
        fetchedAt: new Date().toISOString(),
      };

      verseMemoryCache.set(cacheKey, payload);
      return payload;
    }

    // ---------------------------------------------------------------------
    // Verse Range Fetch Mode (e.g. 94:5-6)
    // ---------------------------------------------------------------------
    const verseNumbers: number[] = [];
    for (let v = verse; v <= verseEnd; v++) {
      verseNumbers.push(v);
    }

    // Fetch all verses in range concurrently
    const verseResults = await Promise.all(
      verseNumbers.map(async (v) => {
        const singleKey = `${chapter}:${v}`;
        const vUrl = `https://api.quran.com/api/v4/verses/by_key/${singleKey}?language=en&words=false&translations=${translationIds}&audio=${reciterId}&fields=text_uthmani,chapter_id,verse_number`;
        const res = await fetch(vUrl, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Quran.com API error for Ayah ${singleKey}: HTTP ${res.status}`);
        }
        const json = await res.json();
        const vData = json?.verse;
        if (!vData) {
          throw new Error(`No verse data found for Ayah ${singleKey}`);
        }

        const rawArabic = vData.text_uthmani || '';
        let en = '';
        let bn = '';
        const trList = Array.isArray(vData.translations) ? vData.translations : [];
        for (const t of trList) {
          if (t.resource_id === englishTranslationId) {
            en = cleanQuranText(t.text || '');
          } else if (t.resource_id === banglaTranslationId) {
            bn = cleanQuranText(t.text || '');
          }
        }
        if (!en && trList.length > 0) {
          en = cleanQuranText(trList[0].text || '');
        }
        if (!bn && trList.length > 1) {
          bn = cleanQuranText(trList[1].text || '');
        }

        let audio = '';
        if (vData.audio?.url) {
          const rawUrl = vData.audio.url;
          audio = rawUrl.startsWith('http') ? rawUrl : `https://verses.quran.com/${rawUrl}`;
        }

        return {
          verseNumber: v,
          arabic: rawArabic,
          english: en,
          bangla: bn,
          audioUrl: audio,
        };
      })
    );

    clearTimeout(timeoutId);

    // Concurrently fetch Tafsir for all verses in range
    const tafsirResults = await Promise.allSettled(
      verseNumbers.map(async (v) => {
        const singleKey = `${chapter}:${v}`;
        let enTaf = '';
        let bnTaf = '';
        try {
          const [enRes, bnRes] = await Promise.allSettled([
            fetch(`https://api.quran.com/api/v4/tafsirs/${englishTafsirId}/by_ayah/${singleKey}`),
            fetch(`https://api.quran.com/api/v4/tafsirs/${banglaTafsirId}/by_ayah/${singleKey}`),
          ]);

          if (enRes.status === 'fulfilled' && enRes.value.ok) {
            const enJson = await enRes.value.json();
            enTaf = enJson?.tafsir?.text || '';
          }
          if (bnRes.status === 'fulfilled' && bnRes.value.ok) {
            const bnJson = await bnRes.value.json();
            bnTaf = bnJson?.tafsir?.text || '';
          }
        } catch {
          // best effort
        }
        return { verseNumber: v, englishTafsir: enTaf, banglaTafsir: bnTaf };
      })
    );

    // Combine Arabic texts with Ayah end glyphs/numbers
    const combinedArabicText = verseResults
      .map((vr) => `${vr.arabic} ﴿${toArabicNumber(vr.verseNumber)}﴾`)
      .join(' ');

    // Combine English translations with verse indices
    const combinedEnglishText = verseResults
      .map((vr) => `(${vr.verseNumber}) ${vr.english}`)
      .join(' ');

    // Combine Bangla translations with Bengali numeral indices
    const combinedBanglaText = verseResults
      .map((vr) => `(${toBanglaNumber(vr.verseNumber)}) ${vr.bangla}`)
      .join(' ');

    // Combine Tafsirs
    const tafsirList = tafsirResults
      .map((r) => (r.status === 'fulfilled' ? r.value : null))
      .filter(Boolean) as { verseNumber: number; englishTafsir: string; banglaTafsir: string }[];

    const combinedEnglishTafsir = tafsirList
      .filter((t) => Boolean(t.englishTafsir))
      .map((t) => `**Ayah ${t.verseNumber}:**\n${t.englishTafsir}`)
      .join('\n\n');

    const combinedBanglaTafsir = tafsirList
      .filter((t) => Boolean(t.banglaTafsir))
      .map((t) => `**আয়াত ${toBanglaNumber(t.verseNumber)}:**\n${t.banglaTafsir}`)
      .join('\n\n');

    const allAudioUrls = verseResults.map((vr) => vr.audioUrl).filter(Boolean);
    const verseAudios = verseResults
      .filter((vr) => Boolean(vr.audioUrl))
      .map((vr) => ({ verseNumber: vr.verseNumber, audioUrl: vr.audioUrl }));

    const payload: FetchedVersePayload = {
      key,
      chapter,
      verse,
      verseEnd,
      chapterInfo: chapterMeta,
      arabicText: combinedArabicText,
      englishTranslation: {
        resourceId: englishTranslationId,
        translatorName: enMeta?.name || 'Saheeh International',
        text: combinedEnglishText,
      },
      banglaTranslation: {
        resourceId: banglaTranslationId,
        translatorName: bnMeta?.name || 'বাংলা অনুবাদ',
        text: combinedBanglaText,
      },
      tafsir: {
        english: combinedEnglishTafsir
          ? {
              resourceId: englishTafsirId,
              name: enTafsirMeta?.name || 'Ibn Kathir',
              text: combinedEnglishTafsir,
            }
          : undefined,
        bangla: combinedBanglaTafsir
          ? {
              resourceId: banglaTafsirId,
              name: bnTafsirMeta?.name || 'তাফসীর আবু বকর জাকারিয়া',
              text: combinedBanglaTafsir,
            }
          : undefined,
      },
      audio:
        allAudioUrls.length > 0
          ? {
              reciterId,
              reciterName: reciterMeta?.reciterName || 'Mishary Rashid Alafasy',
              audioUrl: allAudioUrls[0],
              audioUrls: allAudioUrls,
              verseAudios,
            }
          : undefined,
      fetchedAt: new Date().toISOString(),
    };

    verseMemoryCache.set(cacheKey, payload);
    return payload;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out while fetching Quran verse ${key} from Quran.com API`);
    }
    throw error;
  }
}
