# Environment Variables Setup Guide

## Overview

This project uses Expo's built-in environment variable system to manage sensitive API keys (Groq, Gemini) securely. Keys are **not hardcoded** in the repository.

## Key Principle

**Only variables prefixed with `EXPO_PUBLIC_` are embedded in the client bundle.** This is intentional—they become part of your deployed app because they're public keys.

## Files Involved

- **`config/env.ts`** — Exports API keys via `ENV` object from `process.env.EXPO_PUBLIC_*`
- **`.env`** — Local file (NOT committed) for local dev convenience
- **`.env.example`** — Template showing which variables are needed
- **`.gitignore`** — Ensures `.env` is never committed to git

---

## Setup (Local Development with Expo)

### 1. Create `.env` from template (optional, for convenience)

```bash
cp .env.example .env
```

### 2. Add your API keys

For **local dev** with `expo start`, use `.env`:

```dotenv
EXPO_PUBLIC_GROQ_API_KEY=sk_live_xxxxxxxxxxxx
EXPO_PUBLIC_GEMINI_API_KEY=AIza_xxxxxxxxxxxx
```

**Where to get keys:**

- **Groq**: https://console.groq.com/keys
- **Gemini**: https://ai.google.dev/

### 3. Start the dev server

```bash
npm start
# or
expo start
```

Expo will automatically read `.env` and inject `EXPO_PUBLIC_*` variables into `process.env` during dev.

---

## How It Works

### Environment Variable Loading

**Expo handles this automatically:**

1. When you run `expo start`, Expo reads your `.env` file
2. Variables prefixed with `EXPO_PUBLIC_` are injected into `process.env`
3. At build time, `npx expo export` also reads `.env` or environment variables set in your system/CI

### Code Usage

**`config/env.ts`** exports from `process.env`:

```typescript
export const ENV = {
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || "",
  GROQ_API_KEY: process.env.EXPO_PUBLIC_GROQ_API_KEY || "",
};
```

**Any file needing keys:**

```typescript
import { ENV } from "../config/env";

const GROQ_API_KEY = ENV.GROQ_API_KEY;
// Use in API calls...
```

**Example** (from `services/groqServices.ts`):

```typescript
const response = await fetch(
  "https://api.groq.com/openai/v1/chat/completions",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      /* request */
    }),
  }
);
```

---

## Verification

### Check 1: Verify variables are loaded locally

After starting `npm start`, open browser console and check for warnings:

```javascript
// ⚠️ EXPO_PUBLIC_GROQ_API_KEY is not set. Add it to your build environment.
// ⚠️ EXPO_PUBLIC_GEMINI_API_KEY is not set. Add it to your build environment.
```

**If you see warnings**, the variable is missing from `.env` or system environment.

**If you don't see warnings**, variables are loaded. ✅

### Check 2: Test AI analysis in the app

1. Open the issue reporting wizard
2. Describe an issue
3. Click **Next**
4. Check console — should see AI analysis progress, not 401/403 errors ✅

### Check 3: Inspect in code (temporary debug)

Add to `config/env.ts`:

```typescript
console.log("DEBUG: GROQ_API_KEY prefix:", ENV.GROQ_API_KEY.slice(0, 10));
console.log("DEBUG: GEMINI_API_KEY exists?", !!ENV.GEMINI_API_KEY);
```

Restart the app and check console output. ✅

---

## Build & Deployment

### Local Web Build

Environment variables must be set **before** building:

**PowerShell (temporary, current session only):**

```powershell
$env:EXPO_PUBLIC_GROQ_API_KEY="sk_live_xxxx"
npm run deploy
```

**PowerShell (persistent, requires restart):**

```powershell
setx EXPO_PUBLIC_GROQ_API_KEY "sk_live_xxxx"
# Close and reopen terminal
npm run deploy
```

### GitHub Actions / CI

Add secrets to your repository (**Settings → Secrets and variables → Actions**):

- `GROQ_API_KEY`
- `GEMINI_API_KEY`

In your workflow file (`.github/workflows/deploy.yml`):

```yaml
env:
  EXPO_PUBLIC_GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
  EXPO_PUBLIC_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run deploy # Uses env vars set above
```

### Firebase Hosting

If deploying via Firebase, ensure your build command has the environment variables set:

```bash
export EXPO_PUBLIC_GROQ_API_KEY="sk_live_xxxx"
npm run deploy  # Calls: npx expo export --platform web && firebase deploy
```

---

## Security Best Practices

### ✅ DO:

- Store real keys in `.env` locally (never committed)
- Use `EXPO_PUBLIC_` prefix (Expo convention)
- Set env vars in CI/CD secrets, not in code
- Rotate keys if exposed (see below)
- Use `.env.example` to document required variables

### ❌ DON'T:

- Commit `.env` to git
- Hardcode secrets in source files (TypeScript/JS)
- Share `.env` across team members (each dev should have their own)
- Use identical keys across local, staging, and production

### If Your Key Is Exposed

1. **Rotate immediately**: https://console.groq.com/keys (delete old, create new)
2. **Update `.env` locally** with the new key
3. **Clean git history** (the exposed key was already in commits):

   ```bash
   # Install BFG (one-time)
   choco install bfg  # Windows / or download from https://rtyley.github.io/bfg-repo-cleaner/

   # Remove .env from history
   bfg --delete-files .env
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force
   ```

4. **Notify collaborators** to re-pull the cleaned history

---

## Troubleshooting

### "EXPO_PUBLIC_GROQ_API_KEY is not set" warning appears

**Solution:**

1. Confirm `.env` exists in project root with the variable
2. Confirm the variable name is exactly `EXPO_PUBLIC_GROQ_API_KEY`
3. Restart `npm start`

### "401 Unauthorized" from Groq API

**Solution:**

1. Verify the key in `.env` is correct and active
2. Check Groq dashboard: https://console.groq.com/keys (may need renewal)
3. Generate a new key, update `.env`, restart app

### "403 Permission Denied" from Gemini API

**Solution:**

1. Verify key is active: https://ai.google.dev/
2. Check that Generative Language API is enabled in Google Cloud
3. Update `.env` with a fresh key and restart

### Syntax error during build: "Unexpected token '<'"

**Cause:** Trying to use Node.js libraries (like `dotenv`) in browser code.

**Solution:** Don't import Node-only packages in `config/env.ts`. Expo handles `.env` reading automatically — only set variables and export from `process.env`.

---

## Summary

| File            | Role                                           |
| --------------- | ---------------------------------------------- |
| `config/env.ts` | Exports `ENV` from `process.env.EXPO_PUBLIC_*` |
| `.env`          | Local development secrets (never committed)    |
| `.env.example`  | Template for required variables                |
| `.gitignore`    | Prevents `.env` from being committed           |

**Workflow**: `.env` (local) or CI Secrets → Expo/Build → `process.env.EXPO_PUBLIC_*` → `ENV` → Your code ✅
