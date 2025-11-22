// config/env.ts
// Simple environment variable loader that works without babel plugin

export const ENV = {
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
};
