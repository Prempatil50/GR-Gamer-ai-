import type { ThemePresetId } from './themes';

export type PageCategory =
  | 'general'
  | 'opportunity'
  | 'coding'
  | 'learning'
  | 'writing'
  | 'custom';

export type VoiceName = 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir' | 'Orus';
export type VoiceGender = 'girl' | 'boy';

export const VOICE_OPTIONS: {
  id: VoiceName;
  label: string;
  gender: VoiceGender;
  tone: string;
}[] = [
  { id: 'Kore', label: 'Kore', gender: 'girl', tone: 'Warm & natural female voice' },
  { id: 'Zephyr', label: 'Zephyr', gender: 'girl', tone: 'Bright & conversational female voice' },
  { id: 'Charon', label: 'Charon', gender: 'boy', tone: 'Warm, clear young man voice' },
  { id: 'Orus', label: 'Orus', gender: 'boy', tone: 'Crisp, steady natural male voice' },
  { id: 'Puck', label: 'Puck', gender: 'boy', tone: 'Energetic & friendly young boy voice' },
  { id: 'Fenrir', label: 'Fenrir', gender: 'boy', tone: 'Deep & confident male voice' },
];

export const DEFAULT_VOICE_BY_GENDER: Record<VoiceGender, VoiceName> = {
  girl: 'Kore',
  boy: 'Charon',
};

export function getVoiceGender(voice: VoiceName): VoiceGender {
  return VOICE_OPTIONS.find((v) => v.id === voice)?.gender || 'girl';
}

export type LanguageCode =
  | 'auto'
  | 'en'
  | 'hi'
  | 'hinglish'
  | 'bn'
  | 'mr'
  | 'ta'
  | 'te'
  | 'gu'
  | 'pa'
  | 'ur'
  | 'es'
  | 'fr'
  | 'ar';

export interface LanguageOption {
  id: LanguageCode;
  label: string;
  nativeLabel: string;
  speechLang: string;
  samplePreview: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    id: 'auto',
    label: 'Auto (Multilingual)',
    nativeLabel: 'Auto',
    speechLang: 'en-IN',
    samplePreview: 'Hello! I can understand and reply in English, Hindi, or Hinglish.',
  },
  {
    id: 'en',
    label: 'English',
    nativeLabel: 'English',
    speechLang: 'en-US',
    samplePreview: 'Hello! I am your Aurora AI voice assistant, ready to help you.',
  },
  {
    id: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
    speechLang: 'hi-IN',
    samplePreview: 'नमस्ते! मैं आपका ऑरोरा एआई वॉयस असिस्टेंट हूँ, बताइए क्या मदद करूँ?',
  },
  {
    id: 'hinglish',
    label: 'Hinglish',
    nativeLabel: 'Hinglish',
    speechLang: 'en-IN',
    samplePreview: 'Namaste! Main aapka Aurora AI voice assistant hoon, bataiye kya help chahiye?',
  },
  {
    id: 'bn',
    label: 'Bengali',
    nativeLabel: 'বাংলা',
    speechLang: 'bn-IN',
    samplePreview: 'নমস্কার! আমি আপনার অরোরা এআই অ্যাসিস্ট্যান্ট। কীভাবে সাহায্য করতে পারি?',
  },
  {
    id: 'mr',
    label: 'Marathi',
    nativeLabel: 'मराठी',
    speechLang: 'mr-IN',
    samplePreview: 'नमस्कार! मी तुमचा ऑरोरा एआय असिस्टंट आहे. मी तुम्हाला कशी मदत करू शकतो?',
  },
  {
    id: 'ta',
    label: 'Tamil',
    nativeLabel: 'தமிழ்',
    speechLang: 'ta-IN',
    samplePreview: 'வணக்கம்! நான் உங்கள் Aurora AI உதவியாளர். உங்களுக்கு எப்படி உதவலாம்?',
  },
  {
    id: 'te',
    label: 'Telugu',
    nativeLabel: 'తెలుగు',
    speechLang: 'te-IN',
    samplePreview: 'నమస్కారం! నేను మీ Aurora AI అసిస్టెంట్‌ని. మీకు ఎలా సహాయం చేయగలను?',
  },
  {
    id: 'gu',
    label: 'Gujarati',
    nativeLabel: 'ગુજરાતી',
    speechLang: 'gu-IN',
    samplePreview: 'નમસ્તે! હું તમારો ઓરોરા એઆઈ આસિસ્ટન્ટ છું. હું તમને કેવી રીતે મદદ કરી શકું?',
  },
  {
    id: 'pa',
    label: 'Punjabi',
    nativeLabel: 'ਪੰਜਾਬੀ',
    speechLang: 'pa-IN',
    samplePreview: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ Aurora AI ਸਹਾਇਕ ਹਾਂ। ਦੱਸੋ ਕਿਵੇਂ ਮਦਦ ਕਰਾਂ?',
  },
  {
    id: 'ur',
    label: 'Urdu',
    nativeLabel: 'اردو',
    speechLang: 'ur-PK',
    samplePreview: 'السلام علیکم! میں آپ کا Aurora AI اسسٹنٹ ہوں۔ بتائیں میں آپ کی کیا مدد کر سکتا ہوں؟',
  },
  {
    id: 'es',
    label: 'Spanish',
    nativeLabel: 'Español',
    speechLang: 'es-ES',
    samplePreview: '¡Hola! Soy tu asistente de voz Aurora AI. ¿En qué te puedo ayudar hoy?',
  },
  {
    id: 'fr',
    label: 'French',
    nativeLabel: 'Français',
    speechLang: 'fr-FR',
    samplePreview: 'Bonjour ! Je suis votre assistant vocal Aurora AI. Comment puis-je vous aider ?',
  },
  {
    id: 'ar',
    label: 'Arabic',
    nativeLabel: 'العربية',
    speechLang: 'ar-SA',
    samplePreview: 'مرحباً! أنا مساعدك الصوتي Aurora AI. كيف يمكنني مساعدتك اليوم؟',
  },
];

export function getLanguageOption(code?: string): LanguageOption {
  return LANGUAGE_OPTIONS.find((l) => l.id === code) || LANGUAGE_OPTIONS[0];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  themePreset: ThemePresetId;
  customBgColor: string;
  voiceReplyEnabled: boolean;
  voiceName: VoiceName;
  preferredLanguage?: LanguageCode;
  voiceAutoSend?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ChatPage {
  id: string;
  ownerId: string;
  title: string;
  category: PageCategory;
  systemInstruction: string;
  pinned: boolean;
  messageCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ChatMessage {
  id: string;
  ownerId: string;
  pageId: string;
  role: 'user' | 'model';
  content: string;
  usedVoice: boolean;
  createdAt?: unknown;
}

export interface OpportunityTemplate {
  id: string;
  ownerId?: string;
  title: string;
  description: string;
  category: Exclude<PageCategory, 'general'> | 'general';
  systemInstruction: string;
  starterPrompt: string;
  starterSuggestions?: string[];
  isBuiltIn?: boolean;
  createdAt?: unknown;
}

export interface YouTubeVideoItem {
  videoId: string;
  title: string;
  url: string;
  publishedAt: string;
}

export interface YouTubeChannel {
  id: string;
  ownerId: string;
  channelId: string;
  title: string;
  handle: string;
  channelUrl: string;
  avatarUrl: string;
  description: string;
  recentVideos: YouTubeVideoItem[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface VideoAttachmentPayload {
  file?: File;
  base64?: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
}

export const BUILT_IN_OPPORTUNITIES: OpportunityTemplate[] = [
  {
    id: 'builtin-general',
    title: 'Open AI Page',
    description:
      'Versatile conversational workspace for everyday questions, research, brainstorming, and voice dialogue.',
    category: 'general',
    systemInstruction:
      'You are Aurora, a helpful, intelligent, and clear conversational AI assistant. Respond accurately and concisely in the user’s preferred language (including English, Hindi, or Hinglish).',
    starterPrompt: '',
    starterSuggestions: [
      'Summarize the top productivity habits backed by research',
      'Help me plan a 7-day itinerary for Himachal Pradesh',
      'Compare React Server Components vs traditional SPAs simply',
      'Explain how compound interest works with a real example',
    ],
    isBuiltIn: true,
  },
  {
    id: 'builtin-career',
    title: 'Career & Business Opportunities',
    description:
      'Discover side hustles, refine resumes, prepare for interviews, and craft high-converting client pitches.',
    category: 'opportunity',
    systemInstruction:
      'You are a senior career strategist and startup advisor. Help the user uncover realistic business opportunities, sharpen resumes, draft client outreach, and build concrete 30-day execution plans.',
    starterPrompt:
      'Suggest 5 practical online business or freelance opportunities I can start this month with low investment.',
    starterSuggestions: [
      'Suggest 5 practical freelance opportunities I can start this month',
      'Review my resume bullet points and make them impact-driven',
      'Draft a cold outreach email for web development clients',
      'Create a 30-day roadmap to launch a micro-SaaS product',
    ],
    isBuiltIn: true,
  },
  {
    id: 'builtin-coding',
    title: 'Code & Engineering Studio',
    description:
      'Architecture design, debugging, clean TypeScript/Python implementations, and SQL/API troubleshooting.',
    category: 'coding',
    systemInstruction:
      'You are a staff software engineer. Provide clean, production-grade code, explain trade-offs concisely, highlight edge cases, and format all code snippets with clear language fences.',
    starterPrompt: '',
    starterSuggestions: [
      'Design a scalable REST API rate limiter in Node.js',
      'Explain React useEffect cleanup pitfalls with examples',
      'Write a clean Python script to parse and summarize CSV logs',
      'Help me debug a CORS issue between Vite and Express',
    ],
    isBuiltIn: true,
  },
  {
    id: 'builtin-learning',
    title: 'Learning & Study Mentor',
    description:
      'Break down complex subjects into clear mental models, step-by-step lessons, and quick self-check quizzes.',
    category: 'learning',
    systemInstruction:
      'You are a patient, crystal-clear tutor. Teach using intuitive analogies first, then structured detail, and end with one quick check-in question when helpful.',
    starterPrompt: '',
    starterSuggestions: [
      'Teach me how neural networks learn using a simple analogy',
      'Create a 2-week study schedule for mastering TypeScript',
      'Quiz me with 5 questions on Indian history and check my answers',
      'Explain OAuth 2.0 and JWT authentication step by step',
    ],
    isBuiltIn: true,
  },
  {
    id: 'builtin-writing',
    title: 'Content & Hinglish Writer',
    description:
      'Draft crisp emails, YouTube scripts, LinkedIn posts, and multilingual prose in English, Hindi, or Hinglish.',
    category: 'writing',
    systemInstruction:
      'You are an editorial writer fluent in English, Hindi, and Hinglish. Write naturally with strong hooks, clear structure, and zero corporate fluff.',
    starterPrompt: '',
    starterSuggestions: [
      'Write a crisp YouTube script intro in Hinglish about AI tools',
      'Rewrite this message into a polite, confident client email',
      'Generate 5 engaging LinkedIn post hooks about learning to code',
      'Draft a short product launch announcement without buzzwords',
    ],
    isBuiltIn: true,
  },
];

export const CATEGORY_LABELS: Record<PageCategory, string> = {
  general: 'General Chat',
  opportunity: 'Opportunities',
  coding: 'Code Studio',
  learning: 'Study Mentor',
  writing: 'Writing Desk',
  custom: 'Custom Page',
};
