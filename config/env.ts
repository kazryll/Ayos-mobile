// config/env.ts
// Environment variable loader for Expo / React Native
// Variables must be prefixed with EXPO_PUBLIC_ to be embedded in the client bundle

export const ENV = {
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || "",
  GROQ_API_KEY: process.env.EXPO_PUBLIC_GROQ_API_KEY || "",
};

// Warning: Log if keys are missing (helps with debugging)
if (!ENV.GROQ_API_KEY) {
  console.warn(
    "⚠️ EXPO_PUBLIC_GROQ_API_KEY is not set. Add it to your build environment."
  );
}

if (!ENV.GEMINI_API_KEY) {
  console.warn(
    "⚠️ EXPO_PUBLIC_GEMINI_API_KEY is not set. Add it to your build environment."
  );
}
