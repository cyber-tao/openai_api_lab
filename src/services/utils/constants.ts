// Storage keys for localStorage
export const STORAGE_KEYS = {
  API_CONFIGS: 'openai-lab-configs',
  CHAT_SESSIONS: 'openai-lab-sessions',
  MODEL_PRICES: 'openai-lab-prices',
  APP_SETTINGS: 'openai-lab-settings',
  USAGE_STATS: 'openai-lab-stats',
} as const;

// Default application settings
export const DEFAULT_SETTINGS = {
  theme: 'dark' as const,
  language: 'en' as const,
  autoSave: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  animations: true,
  compactMode: false,
  showStatistics: true,
  keyboardShortcuts: true,
};

// API configuration defaults
export const DEFAULT_API_PARAMETERS = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

// File type configurations
export const SUPPORTED_FILE_TYPES = {
  text: ['.txt', '.md', '.json'],
  document: ['.pdf', '.docx'],
  image: ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  audio: ['.mp3', '.wav', '.m4a'],
} as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILES_PER_MESSAGE = 5;
