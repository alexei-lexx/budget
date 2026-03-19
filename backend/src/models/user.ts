export interface User {
  id: string; // UUID v4 primary key
  email: string; // Normalized lowercase email
  transactionPatternsLimit?: number; // Maximum number of transaction patterns
  voiceInputLanguage?: string; // BCP 47 language tag for voice input; absent means use browser default
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
