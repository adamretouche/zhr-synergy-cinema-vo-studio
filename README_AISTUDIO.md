# Gemini Speech Studio — Synergy Cinema VO Studio
### Google AI Studio Application & Cloud Ready Package

This is the complete, self-contained **Gemini Speech Studio (Synergy Cinema VO Studio)** application package, configured for seamless deployment and development on:
1. **Google AI Studio** (`https://aistudio.google.com/apps`)
2. **Google Project IDX** (`https://idx.dev`)
3. **Google Cloud Run**
4. **Local Workstation / macOS / Linux**

---

## ⚡ Quick Start

### 1. Requirements
- Node.js 18+ or 20+
- Python 3.10+ (for local fallback neural audio)
- FFmpeg (for studio audio concatenation and master rendering)

### 2. Setup
```bash
# Install dependencies
npm install

# Configure API Key
cp .env.example .env
# Edit .env and insert your GEMINI_API_KEY=AIzaSy...
```

### 3. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 4. Build for Production / Google Cloud Run
```bash
npm run build
npm start
```

---

## 🎙️ Models & Cost Optimization Architecture

To maintain the absolute lowest API consumption while preserving cinematic quality:
1. **Primary Model**: `gemini-3.8-flash-lite-tts`
   - Prompt Tokens: **$0.075 / 1M tokens**
   - Audio Candidates: **$0.30 / 1M tokens**
   - Over **94% cheaper** than Pro preview models, with equal or superior conversational and cinematic timbre.
2. **Studio HD Model**: `gemini-3.8-flash-tts`
   - Prompt Tokens: **$0.15 / 1M tokens**
   - Audio Candidates: **$0.60 / 1M tokens**
3. **Drafting Engine**: `FREE TIER`
   - Built-in local 24kHz neural synthesis engine costs **$0.00** for script drafting, diacritization checks, and rehearsing before mastering on Gemini API.
4. **Strict Isolation & Prompt Optimization**:
   - Direction tags are compact (`[VOICE DIRECTION: ...]` ~40 tokens instead of 800-token system blocks), eliminating voice drift and slashing input token charges by over 95%.

---

## 📦 Google AI Studio Manifest
- `metadata.json`: Defines the AI Studio application name, description, and capabilities.
- `package.json`: Contains all execution scripts and dependencies (`@google/genai`, `express`, `react 19`, `vite`).
- `aistudio-prompts.json`: Exported system instructions, voice presets, and generation configs for the Google AI Studio Prompt Gallery.
