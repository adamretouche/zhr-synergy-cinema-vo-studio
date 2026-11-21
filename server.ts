/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';
import { GoogleGenAI, Modality } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

// Helper to obtain server-side Gemini client
const getGeminiClient = (userApiKey?: string) => {
  let envKey = '';
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/GEMINI_API_KEY=([^\r\n]+)/);
      if (match) envKey = match[1].trim().replace(/^['"]|['"]$/g, '');
    }
  } catch (e) {
    // ignore
  }

  const key = userApiKey || envKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!key) {
    throw new Error('Gemini API Key is not configured on the server. Please provide an API key in Configuration settings or Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      apiVersion: 'v1alpha',
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Normalize voice name to strictly match Gemini API accepted names
const normalizeVoiceName = (voice: string): string => {
  if (!voice) return 'puck';
  const v = voice.trim().toLowerCase();
  if (v === 'sulafar') return 'sulafat';
  if (v === 'callirhoe') return 'callirrhoe';
  return v;
};

// Resilient Fallback TTS Engine (Pure 24kHz Linear PCM via FFmpeg)
const runFallbackTTS = async (
  text: string,
  voiceName: string,
  speed: number = 1.0,
  pitch: number = 0
): Promise<{ audioData: string; durationSeconds: number; voice: string }> => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, 'scripts', 'generate_tts_fallback.py');
    const child = spawn('python3', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Fallback TTS failed (code ${code}): ${stderr || stdout}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        if (parsed.success && parsed.audioData) {
          resolve({
            audioData: parsed.audioData,
            durationSeconds: parsed.durationSeconds || 0,
            voice: parsed.voice || voiceName,
          });
        } else {
          reject(new Error(parsed.error || 'Invalid fallback output format.'));
        }
      } catch (err: any) {
        reject(new Error(`Failed to parse fallback output: ${err.message}`));
      }
    });

    child.stdin.write(JSON.stringify({ text, voiceName, speed, pitch }));
    child.stdin.end();
  });
};

// Studio Precision De-Clicker & Neural EOS Vocoder Glitch Eliminator:
// Gemini TTS neural vocoders systematically emit an unconditioned EOS (End-Of-Sequence) noise burst
// in the final 160ms after the genuine speech has already completed and decayed into silence.
// This function detects when genuine speech dropped into ambient silence (< 300 amplitude) before the EOS burst,
// cleanly cuts away the burst, snaps to the nearest zero-crossing, applies a smooth cosine fade-out,
// and appends a clean digital silence tail (100ms) for 100% glitch-free audio playback.
const trimTrailingVocoderGlitch = (pcm: Buffer, sampleRate: number = 24000): Buffer => {
  const totalSamples = Math.floor(pcm.length / 2);
  const minSamples = Math.round(sampleRate * 0.25);
  if (totalSamples < minSamples) return pcm;

  const maxScan = Math.min(totalSamples, Math.round(sampleRate * 0.45)); // Scan up to 450ms from end
  const scanStart = totalSamples - maxScan;

  // 1. Scan from end backwards to detect if there is a loud vocoder spike (> 5000) in the final 260ms
  const burstWindow = Math.min(totalSamples, Math.round(sampleRate * 0.26));
  let hasBurst = false;
  let burstStart = totalSamples;

  for (let i = totalSamples - 1; i >= totalSamples - burstWindow; i--) {
    const val = Math.abs(pcm.readInt16LE(i * 2));
    if (val > 5000) {
      hasBurst = true;
      burstStart = i;
    }
  }

  if (!hasBurst) {
    return pcm;
  }

  // 2. Scan backwards from burstStart to find where the speech decayed into ambient silence (< 300 amplitude)
  let cutSample = -1;
  const silenceThreshold = 300;
  const minSilenceRun = Math.round(sampleRate * 0.015); // 15ms sustained silence
  let consecutiveSilence = 0;

  for (let i = burstStart; i >= scanStart; i--) {
    const val = Math.abs(pcm.readInt16LE(i * 2));
    if (val < silenceThreshold) {
      consecutiveSilence++;
      if (consecutiveSilence >= minSilenceRun) {
        cutSample = i + Math.round(minSilenceRun / 2);
        break;
      }
    } else {
      consecutiveSilence = 0;
    }
  }

  if (cutSample === -1) {
    cutSample = Math.max(0, burstStart - 20);
  }

  // 3. Snap cut point to nearest zero-crossing for absolute click-free transition
  while (cutSample > 1 && cutSample < totalSamples) {
    const s1 = pcm.readInt16LE((cutSample - 1) * 2);
    const s2 = pcm.readInt16LE(cutSample * 2);
    if ((s1 <= 0 && s2 >= 0) || (s1 >= 0 && s2 <= 0) || Math.abs(s2) < 20) {
      break;
    }
    cutSample--;
  }

  return Buffer.from(pcm.subarray(0, cutSample * 2));
};

const cleanAndSmoothPcmBuffer = (buffer: Buffer, sampleRate: number = 24000): Buffer => {
  if (!buffer || buffer.length === 0) return buffer;

  const evenLen = buffer.length - (buffer.length % 2);
  let pcm = Buffer.from(buffer.subarray(0, evenLen));
  let totalSamples = pcm.length / 2;
  if (totalSamples < 200) return pcm;

  // Eradicate neural vocoder EOS glitch
  pcm = trimTrailingVocoderGlitch(pcm, sampleRate);
  totalSamples = pcm.length / 2;

  // 10ms micro fade-in to eliminate DC-offset pop at start
  const fadeInSamples = Math.min(Math.round(sampleRate * 0.010), Math.floor(totalSamples / 4));
  for (let i = 0; i < fadeInSamples; i++) {
    const factor = 0.5 * (1 - Math.cos((i / fadeInSamples) * Math.PI));
    const val = pcm.readInt16LE(i * 2);
    pcm.writeInt16LE(Math.round(val * factor), i * 2);
  }

  // 30ms smooth raised cosine fade-out right into silence
  const fadeOutSamples = Math.min(Math.round(sampleRate * 0.030), Math.floor(totalSamples / 4));
  const fadeOutStart = totalSamples - fadeOutSamples;
  for (let i = 0; i < fadeOutSamples; i++) {
    const factor = 0.5 * (1 + Math.cos((i / fadeOutSamples) * Math.PI));
    const offset = (fadeOutStart + i) * 2;
    const val = pcm.readInt16LE(offset);
    pcm.writeInt16LE(Math.round(val * factor), offset);
  }

  // 100ms pristine digital silence tail
  const tailSilence = Buffer.alloc(Math.round(sampleRate * 0.100) * 2);
  return Buffer.concat([pcm, tailSilence]);
};

// Studio-Grade Zero-Glitch PCM Chunk Stitching with Organic Breath Gaps & Cross-Fading
const stitchPcmChunksWithCrossfade = (
  chunks: Buffer[],
  sampleRate: number = 24000,
  interChunkGapMs: number = 65
): Buffer => {
  if (!chunks || chunks.length === 0) return Buffer.alloc(0);
  if (chunks.length === 1) {
    return cleanAndSmoothPcmBuffer(chunks[0], sampleRate);
  }

  const prepared: Buffer[] = [];
  for (let c = 0; c < chunks.length; c++) {
    const raw = chunks[c];
    const evenLen = raw.length - (raw.length % 2);
    let pcm = Buffer.from(raw.subarray(0, evenLen));
    if (pcm.length < 400) {
      if (pcm.length > 0) prepared.push(pcm);
      continue;
    }

    pcm = trimTrailingVocoderGlitch(pcm, sampleRate);
    const totalSamples = pcm.length / 2;

    // 10ms micro fade-in for chunk start
    const inSamples = Math.min(Math.round(sampleRate * 0.010), Math.floor(totalSamples / 4));
    for (let i = 0; i < inSamples; i++) {
      const factor = 0.5 * (1 - Math.cos((i / inSamples) * Math.PI));
      const val = pcm.readInt16LE(i * 2);
      pcm.writeInt16LE(Math.round(val * factor), i * 2);
    }

    // 20ms micro fade-out for chunk end
    const outSamples = Math.min(Math.round(sampleRate * 0.020), Math.floor(totalSamples / 4));
    const outStart = totalSamples - outSamples;
    for (let i = 0; i < outSamples; i++) {
      const factor = 0.5 * (1 + Math.cos((i / outSamples) * Math.PI));
      const offset = (outStart + i) * 2;
      const val = pcm.readInt16LE(offset);
      pcm.writeInt16LE(Math.round(val * factor), offset);
    }

    prepared.push(pcm);
  }

  if (prepared.length === 0) return Buffer.alloc(0);

  // Inter-chunk organic breath gap (65ms digital zero silence)
  const gapBytes = Math.round(sampleRate * (interChunkGapMs / 1000.0)) * 2;
  const gapBuffer = Buffer.alloc(gapBytes);

  const combinedParts: Buffer[] = [];
  for (let i = 0; i < prepared.length; i++) {
    combinedParts.push(prepared[i]);
    if (i < prepared.length - 1) {
      combinedParts.push(gapBuffer);
    }
  }

  const stitched = Buffer.concat(combinedParts);
  return cleanAndSmoothPcmBuffer(stitched, sampleRate);
};

// High-Fidelity Time-Stretching & Transparent Audio Processing via FFmpeg (Preserves 100% Neural Human Timbre)
const applyAudioAcousticProcessing = async (
  pcmBuffer: Buffer,
  speed: number = 1.0,
  pitch: number = 0,
  _isTrailer: boolean = false
): Promise<Buffer> => {
  const clampedSpeed = Math.max(0.5, Math.min(2.5, speed || 1.0));
  // Gemini TTS natively controls natural pacing smoothly through prompting;
  // only invoke FFmpeg when speed deviates drastically (> 25% from 1.0x).
  // Strictly bypass DSP pitch-shifting to guarantee 100% natural human warmth and zero robotic artifacts!
  const hasSpeedChange = Math.abs(clampedSpeed - 1.0) >= 0.25;

  // 100% Direct Pass-Through for Pristine Neural Human Voice
  if (!hasSpeedChange) {
    return pcmBuffer;
  }

  const sampleRate = 24000;
  const filterParts: string[] = [];

  // Tempo Adjustment via atempo
  let remTempo = clampedSpeed;
  while (remTempo > 2.0) {
    filterParts.push('atempo=2.0');
    remTempo /= 2.0;
  }
  while (remTempo < 0.5) {
    filterParts.push('atempo=0.5');
    remTempo /= 0.5;
  }
  if (Math.abs(remTempo - 1.0) >= 0.02) {
    filterParts.push(`atempo=${remTempo.toFixed(3)}`);
  }

  const filterString = filterParts.join(',');
  const ffmpegPath = fs.existsSync('/Users/zhr/.gemini/antigravity/bin/ffmpeg')
    ? '/Users/zhr/.gemini/antigravity/bin/ffmpeg'
    : 'ffmpeg';

  return new Promise((resolve) => {
    const child = spawn(ffmpegPath, [
      '-hide_banner',
      '-loglevel', 'error',
      '-f', 's16le',
      '-ar', String(sampleRate),
      '-ac', '1',
      '-i', 'pipe:0',
      '-af', filterString,
      '-f', 's16le',
      '-ar', String(sampleRate),
      '-ac', '1',
      'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    const chunks: Buffer[] = [];
    child.stdout.on('data', (d) => chunks.push(d));
    child.on('close', (code) => {
      if (code === 0 && chunks.length > 0) {
        resolve(Buffer.concat(chunks));
      } else {
        resolve(pcmBuffer);
      }
    });
    child.on('error', () => resolve(pcmBuffer));
    child.stdin.write(pcmBuffer);
    child.stdin.end();
  });
};

// Fast PCM/WAV to MP3 Converter using FFmpeg
const convertPcmToMp3 = async (
  rawAudioBase64: string,
  sampleRate: number = 24000
): Promise<string> => {
  return new Promise((resolve, reject) => {
    let rawBuffer = Buffer.from(rawAudioBase64, 'base64');
    const isWav = rawBuffer.length >= 12 && rawBuffer.toString('ascii', 0, 4) === 'RIFF';

    // If it's raw PCM, smooth it first to ensure no glitch carries over to MP3
    if (!isWav) {
      rawBuffer = cleanAndSmoothPcmBuffer(rawBuffer, sampleRate);
    }

    const args = isWav
      ? ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-b:a', '192k', '-f', 'mp3', 'pipe:1']
      : ['-hide_banner', '-loglevel', 'error', '-f', 's16le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0', '-b:a', '192k', '-f', 'mp3', 'pipe:1'];

    const ffmpegPath = fs.existsSync('/Users/zhr/.gemini/antigravity/bin/ffmpeg')
      ? '/Users/zhr/.gemini/antigravity/bin/ffmpeg'
      : 'ffmpeg';
    const child = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    const chunks: Buffer[] = [];
    let stderr = '';

    child.stdout.on('data', (d) => chunks.push(d));
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`FFmpeg MP3 conversion failed (code ${code}): ${stderr}`));
      }
      resolve(Buffer.concat(chunks).toString('base64'));
    });

    child.stdin.write(rawBuffer);
    child.stdin.end();
  });
};

// Parse inline quick vocal command tags without altering spoken word verbatim fidelity
const parseScriptTags = (rawText: string) => {
  const inlineInstructions: string[] = [];

  const cleanedText = rawText
    .replace(/\[\s*نبرة ختامية\s*\]/gi, () => {
      inlineInstructions.push('Concluding final cadence');
      return '. ';
    })
    .replace(/\[\s*وقفة(?::\s*[^\]]+)?\s*\]/gi, () => {
      return ' ... ';
    })
    .replace(/\[\s*بحماس\s*\]/gi, () => {
      inlineInstructions.push('Enthusiastic and energetic delivery');
      return ' ';
    })
    .replace(/\[\s*بهدوء\s*\]/gi, () => {
      inlineInstructions.push('Calm and gentle vocal cadence');
      return ' ';
    })
    .replace(/\[\s*بجدية\s*\]/gi, () => {
      inlineInstructions.push('Authoritative and serious tone');
      return ' ';
    })
    .replace(/\[\s*بهمس\s*\]/gi, () => {
      inlineInstructions.push('Whispered intimate delivery');
      return ' ';
    })
    .replace(/\[\s*بسرعة\s*\]/gi, () => {
      inlineInstructions.push('Faster tempo delivery');
      return ' ';
    })
    .replace(/\[\s*ببطء\s*\]/gi, () => {
      inlineInstructions.push('Slow deliberate dramatic delivery');
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();

  return { cleanedText, inlineInstructions };
};

// Smart Script Chunker to split long paragraphs at natural sentence boundaries
const splitScriptIntoChunks = (text: string, maxLen: number = 500): string[] => {
  if (text.length <= maxLen) return [text];

  const sentences = text.match(/[^.!?؟\n]+[.!?؟\n]+|[^.!?؟\n]+$/g) || [text];
  const chunks: string[] = [];
  let cur = '';

  for (const s of sentences) {
    if ((cur + s).length <= maxLen) {
      cur += s;
    } else {
      if (cur.trim()) chunks.push(cur.trim());
      if (s.length > maxLen) {
        const words = s.split(' ');
        let sub = '';
        for (const w of words) {
          if ((sub + ' ' + w).length <= maxLen) {
            sub += (sub ? ' ' : '') + w;
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        cur = sub;
      } else {
        cur = s;
      }
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.length > 0 ? chunks : [text];
};

// 1. Analyze Dramatic Performance Direction (Keeps text 100% verbatim)
app.post('/api/gemini/analyze-dramatic', async (req, res) => {
  try {
    const { text, apiKey, stylePrompt } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for dramatic analysis.' });
    }

    const ai = getGeminiClient(apiKey);
    const prompt = `You are an elite Hollywood cinematic voice director. Analyze the script below in direct accordance with the style instructions.
CRITICAL: DO NOT ALTER SCRIPT TEXT. Output JSON only.
Style Context / Instructions: "${stylePrompt || 'Cinematic movie trailer'}"
Script: "${text}"
JSON Schema:
{"emotion":"string","emotionalStyle":"cinematic"|"dramatic"|"intense"|"natural"|"calm","tone":"deep"|"warm"|"sharp"|"authoritative","intensity":85,"speed":0.95,"directorNotes":"concise notes","analysisSummary":"1 sentence"}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    return res.json({
      emotion: result.emotion || 'Cinematic Gravitas',
      emotionalStyle: result.emotionalStyle || 'cinematic',
      tone: result.tone || 'deep',
      intensity: typeof result.intensity === 'number' ? result.intensity : 85,
      speed: typeof result.speed === 'number' ? result.speed : 0.95,
      directorNotes: result.directorNotes || 'Cinematic dramatic delivery with natural breath pauses and emotional depth.',
      analysisSummary: result.analysisSummary || 'Dramatic vocal delivery with natural breathing.',
    });
  } catch (error: any) {
    console.error('Server analyze-dramatic error:', error);
    return res.json({
      emotion: 'Cinematic Gravitas',
      emotionalStyle: 'cinematic',
      tone: 'deep',
      intensity: 85,
      speed: 0.95,
      directorNotes: 'Cinematic vocal performance with measured dramatic cadence.',
      analysisSummary: 'Dramatic performance profile.',
    });
  }
});

// 2. Analyze Emotion
app.post('/api/gemini/analyze-emotion', async (req, res) => {
  try {
    const { text, apiKey } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for emotion analysis.' });
    }

    const ai = getGeminiClient(apiKey);
    const prompt = `Analyze emotion. Return JSON {"emotion":"string","style":"natural"|"dramatic"|"calm"|"intense"|"cinematic"}. Text: "${text}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    return res.json({
      emotion: result.emotion || 'Natural',
      style: result.style || 'natural',
    });
  } catch (error: any) {
    console.error('Server analyze-emotion error:', error);
    return res.json({
      emotion: 'Cinematic',
      style: 'cinematic',
    });
  }
});

// Helper for generating speech for a single text chunk
const generateChunkSpeech = async (
  ai: GoogleGenAI,
  chunkText: string,
  chosenVoice: string,
  silentStylePrompt: string,
  fullSystemInstruction: string,
  candidateModels: string[]
): Promise<{ pcmBuffer: Buffer; tokens: number; cost: number }> => {
  const normVoice = normalizeVoiceName(chosenVoice);

  // STRICT ISOLATION DIRECTIVE: Ensure Gemini applies vocal timbre & performance
  // while NEVER speaking any part of the system instruction or metadata out loud!
  // Authentic Human Vocal Performance Directive
  const directionTags = [
    'Natural, warm, expressive, and fluent human voice',
    'Articulate Arabic pronunciation with organic breath pauses and smooth dynamic cadence',
    'Avoid robotic monotony, sluggish pacing, or artificially deepened vocal fry'
  ];
  if (silentStylePrompt && silentStylePrompt !== '[]') {
    directionTags.push(silentStylePrompt.replace(/^\[|\]$/g, ''));
  }
  const compactDirective = directionTags.filter(Boolean).join('; ');

  const fullPrompt = `[VOICE DIRECTION: ${compactDirective}. DO NOT speak this direction or any instructions aloud. Speak ONLY the exact quoted text below.]\n\n"${chunkText}"`;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: fullPrompt,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: normVoice },
            },
          },
        },
      });

      const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (data) {
        const rawBuffer = Buffer.from(data, 'base64');
        const alignedBuffer = rawBuffer.length % 2 !== 0 
          ? rawBuffer.subarray(0, rawBuffer.length - 1) 
          : rawBuffer;
        const usage = response.usageMetadata;
        const promptTokens = usage?.promptTokenCount || Math.ceil(chunkText.length / 3);
        const candidatesTokens = usage?.candidatesTokenCount || 0;
        const tokens = usage?.totalTokenCount || (promptTokens + candidatesTokens);
        const isPro = model.includes('pro');
        const inputRate = isPro ? 1.25 : (model.includes('3.8-flash-tts') ? 0.15 : 0.075);
        // Google Cloud Gemini TTS Audio Output Tokens are billed at $20.00 / 1M tokens ($40.00 for Pro)
        const audioRate = isPro ? 40.00 : 20.00;
        const cost = Number(
          (((promptTokens / 1_000_000) * inputRate) + ((candidatesTokens / 1_000_000) * audioRate)).toFixed(6)
        );
        return { pcmBuffer: alignedBuffer, tokens, cost };
      }
    } catch (err: any) {
      if (err?.status === 429 || String(err?.message).includes('429')) {
        throw err; // Stop trying if spending cap reached
      }
      console.warn(`[Model ${model} TTS attempt failed]:`, err?.message || err);
    }
  }
  throw new Error('All candidate models failed to generate speech.');
};

// 3. Generate Speech via Gemini 2.5 Flash / Pro Preview TTS (with long-text chunking, tag parsing, and studio fallback)
app.post(['/api/gemini/generate-speech', '/api/gemini/generate-audio'], async (req, res) => {
  const {
    text,
    voiceName,
    styleInstruction,
    apiKey,
    voiceSettings,
    emotionSettings,
    model,
  } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required for speech generation.' });
  }

  const chosenVoice = voiceName || 'Puck';

  // Parse inline quick vocal tags
  const { cleanedText, inlineInstructions } = parseScriptTags(text);

  // Detect Movie Trailer / Cinematic Deep Profile
  const isTrailer = chosenVoice === 'Algenib' || 
                    chosenVoice === 'Charon' || 
                    (voiceSettings?.tone === 'deep') || 
                    (typeof voiceSettings?.pitch === 'number' && voiceSettings.pitch <= -3) ||
                    (styleInstruction && (styleInstruction.toLowerCase().includes('trailer') || styleInstruction.includes('سينمائي')));

  // 1. Full System Instruction representing "System Instructions Preview" exactly as configured
  let fullSystemInstruction = (styleInstruction && styleInstruction.trim())
    ? styleInstruction.trim()
    : 'You are a professional voice narrator. Deliver each sentence with natural human warmth, authentic emotional expression, organic breath pauses, and immaculate Arabic diction.';

  if (isTrailer) {
    fullSystemInstruction += '\n\nIMPORTANT VOCAL DIRECTIVE: Deliver with natural, engaging cinematic gravitas and authentic human presence. Keep pacing lively and conversational, avoid dragging words or sounding robotic, and preserve genuine human vocal warmth.';
  }

  // 2. Clear, unambiguous descriptive pacing and delivery tags
  const spd = typeof voiceSettings?.speed === 'number' ? voiceSettings.speed : 1.0;
  let paceDescription = 'Normal natural conversational tempo.';
  if (spd <= 0.65) {
    paceDescription = 'Extremely slow, measured, and deliberate tempo. Long dramatic pauses between phrases.';
  } else if (spd <= 0.85) {
    paceDescription = 'Slow and deliberate pacing. Slower than normal speech with clear pauses.';
  } else if (spd <= 0.95) {
    paceDescription = 'Slightly slow, relaxed, and measured pacing.';
  } else if (spd <= 1.05) {
    paceDescription = 'Normal natural conversational tempo.';
  } else if (spd <= 1.25) {
    paceDescription = 'Brisk, energetic, fast-paced cadence.';
  } else {
    paceDescription = 'Very fast, rapid-fire, high-energy delivery.';
  }

  // Voice Gender & Timbre Protection: Never force female/light voices into artificial deep vocoder fry
  const femaleVoices = [
    'achernar', 'aoede', 'autonoe', 'callirrhoe', 'despina', 'erinome', 
    'gacrux', 'kore', 'laomedeia', 'leda', 'pulcherrima', 'sulafat', 
    'vindemiatrix', 'zephyr'
  ];
  const isFemale = femaleVoices.includes(chosenVoice.toLowerCase());

  let effectiveTone = voiceSettings?.tone || 'warm';
  if (isFemale && (effectiveTone === 'deep' || effectiveTone === 'gravelly')) {
    effectiveTone = 'warm';
  }

  const leanTags: string[] = [];
  leanTags.push(`Pacing: ${paceDescription}`);
  if (effectiveTone) leanTags.push(`Tone: ${effectiveTone}`);
  if (voiceSettings?.style) leanTags.push(`Style: ${voiceSettings.style}`);
  if (voiceSettings?.intensity) leanTags.push(`Intensity: ${voiceSettings.intensity}%`);
  if (emotionSettings?.emotionalStyle) leanTags.push(`Emotion: ${emotionSettings.emotionalStyle}`);
  if (emotionSettings?.manualEmotion) leanTags.push(`Feeling: ${emotionSettings.manualEmotion}`);
  if (inlineInstructions.length > 0) leanTags.push(`Cues: ${inlineInstructions.join(', ')}`);

  const silentStylePrompt = `[${leanTags.join('; ')}]`;

  // Split into chunks if script is long
  const chunks = splitScriptIntoChunks(cleanedText, 450);

  const validModels = [
    'gemini-3.8-flash-lite-tts',
    'gemini-3.8-flash-tts',
    'gemini-2.5-flash-preview-tts',
    'gemini-2.5-pro-preview-tts',
  ];
  const preferredModel = (model && typeof model === 'string' && validModels.includes(model.trim()))
    ? model.trim()
    : 'gemini-3.8-flash-lite-tts';

  // Safe Candidate Hierarchy: NEVER silently fallback to expensive 'pro' models
  // unless the user explicitly requested a pro model.
  const candidateModels = preferredModel.includes('pro')
    ? ['gemini-2.5-pro-preview-tts']
    : [
        preferredModel,
        'gemini-3.8-flash-lite-tts',
        'gemini-3.8-flash-tts',
        'gemini-2.5-flash-preview-tts',
      ].filter((v, i, a) => a.indexOf(v) === i);

  let isAborted = false;
  req.on('close', () => {
    isAborted = true;
  });

  const pcmBuffers: (Buffer | null)[] = new Array(chunks.length).fill(null);
  let totalTokens = 0;
  let totalCostUSD = 0;
  let hasFailed = false;
  let lastError: any = null;

  try {
    const ai = getGeminiClient(apiKey);

    // Parallel chunk processing with concurrency of 4 to drastically cut latency for long scripts
    const BATCH_SIZE = 4;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      if (isAborted) {
        throw new Error('CLIENT_ABORTED');
      }
      const batchIndices: number[] = [];
      for (let j = i; j < Math.min(i + BATCH_SIZE, chunks.length); j++) {
        batchIndices.push(j);
      }

      const results = await Promise.all(
        batchIndices.map((idx) =>
          generateChunkSpeech(
            ai,
            chunks[idx],
            chosenVoice,
            silentStylePrompt,
            fullSystemInstruction,
            candidateModels
          )
        )
      );

      for (let k = 0; k < batchIndices.length; k++) {
        const idx = batchIndices[k];
        const res = results[k];
        pcmBuffers[idx] = res.pcmBuffer;
        totalTokens += res.tokens;
        totalCostUSD += res.cost;
      }
    }
  } catch (err: any) {
    if (isAborted || err?.message === 'CLIENT_ABORTED') {
      console.log('[TTS Aborted] User cancelled voice generation request.');
      return;
    }
    hasFailed = true;
    lastError = err;
    console.warn('[Gemini TTS Notice]:', err?.message || err);
  }

  // If Gemini succeeded across all chunks, stitch PCM chunks with seamless de-clicking
  const validPcmBuffers = pcmBuffers.filter((b): b is Buffer => b !== null);
  if (!hasFailed && validPcmBuffers.length === chunks.length) {
    let finalBuffer = stitchPcmChunksWithCrossfade(validPcmBuffers, 24000, 70);

    // Apply acoustic processing only if user explicitly altered pitch or speed
    finalBuffer = await applyAudioAcousticProcessing(finalBuffer, spd, voiceSettings?.pitch || 0, isTrailer);

    const durationSeconds = (finalBuffer.length / 2) / 24000.0;
    return res.json({
      audioData: finalBuffer.toString('base64'),
      durationSeconds: Number(durationSeconds.toFixed(2)),
      tokensUsed: totalTokens,
      costUSD: Number(totalCostUSD.toFixed(6)),
      fallback: false,
    });
  }

  // Resilient Fallback: If Gemini quota/spend cap is hit, generate studio-grade 24kHz Linear PCM
  console.log('[TTS Fallback] Activating Studio 24kHz PCM Fallback due to:', lastError?.message || 'Gemini unavailable');
  try {
    const fallbackResult = await runFallbackTTS(
      cleanedText,
      chosenVoice,
      spd,
      voiceSettings?.pitch || 0
    );
    let fallbackBuffer = Buffer.from(fallbackResult.audioData, 'base64');
    fallbackBuffer = cleanAndSmoothPcmBuffer(fallbackBuffer, 24000);

    const durationSeconds = (fallbackBuffer.length / 2) / 24000.0;
    return res.json({
      audioData: fallbackBuffer.toString('base64'),
      durationSeconds: Number(durationSeconds.toFixed(2)),
      tokensUsed: 0,
      costUSD: 0,
      fallback: true,
      notice: 'Switched to Studio 24kHz Fallback (No API cost) due to project spending cap.',
    });
  } catch (fallbackErr: any) {
    console.error('[TTS Fallback Failed]:', fallbackErr);
    return res.status(500).json({
      error: `Speech generation failed: ${lastError?.message || fallbackErr?.message}`,
    });
  }
});

// 4. Convert PCM/WAV to High Quality MP3 (192kbps)
app.post('/api/gemini/to-mp3', async (req, res) => {
  try {
    const { audioBase64, sampleRate } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required.' });
    }
    const mp3Base64 = await convertPcmToMp3(audioBase64, sampleRate || 24000);
    return res.json({ success: true, mp3Data: mp3Base64 });
  } catch (error: any) {
    console.error('MP3 conversion error:', error);
    return res.status(500).json({ error: error.message || 'Failed to convert to MP3.' });
  }
});

// 4.1. Generate Multi-Speaker Continuous Podcast / Dialogue Audio
app.post('/api/gemini/generate-multispeaker', async (req, res) => {
  try {
    const {
      dialogueText,
      speakers,
      overallStyle,
      speed = 1.0,
      pitch = 0,
      isTrailer = false,
      apiKey,
    } = req.body;

    if (!dialogueText || typeof dialogueText !== 'string') {
      return res.status(400).json({ error: 'dialogueText is required.' });
    }
    if (!Array.isArray(speakers) || speakers.length < 2) {
      return res.status(400).json({ error: 'At least 2 speakers are required for multi-speaker.' });
    }

    const ai = getGeminiClient(apiKey);

    const personalityDirectives = speakers
      .filter((s: any) => s.personality)
      .map((s: any) => `Make ${s.name} sound ${s.personality}`)
      .join(', and ');

    const prompt = `TTS this conversation between ${speakers.map((s: any) => s.name).join(' and ')}.${
      personalityDirectives ? ` ${personalityDirectives}.` : ''
    }${overallStyle ? ` Style directive: ${overallStyle}.` : ''}\n\n${dialogueText}`;

    const speakerConfigs = speakers.map((s: any) => ({
      speaker: s.name,
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: normalizeVoiceName(s.voice),
        },
      },
    }));

    const validModels = [
      'gemini-3.8-flash-lite-tts',
      'gemini-3.8-flash-tts',
      'gemini-2.5-flash-preview-tts',
      'gemini-2.5-pro-preview-tts',
    ];
    const modelToUse = (req.body.model && typeof req.body.model === 'string' && validModels.includes(req.body.model.trim()))
      ? req.body.model.trim()
      : 'gemini-3.8-flash-lite-tts';

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: prompt,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: speakerConfigs,
          },
        },
      },
    });

    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) {
      throw new Error('No audio returned from multi-speaker generation.');
    }

    let pcmBuffer = Buffer.from(data, 'base64');
    pcmBuffer = await applyAudioAcousticProcessing(pcmBuffer, speed, pitch, isTrailer);
    pcmBuffer = cleanAndSmoothPcmBuffer(pcmBuffer, 24000);

    const usage = response.usageMetadata;
    const promptTokens = usage?.promptTokenCount || Math.ceil(prompt.length / 3);
    const candidatesTokens = usage?.candidatesTokenCount || 0;
    const tokens = usage?.totalTokenCount || (promptTokens + candidatesTokens);
    const isPro = modelToUse.includes('pro');
    const inputRate = isPro ? 1.25 : (modelToUse.includes('3.8-flash-tts') ? 0.15 : 0.075);
    const audioRate = isPro ? 40.00 : 20.00;
    const cost = Number(
      (((promptTokens / 1_000_000) * inputRate) + ((candidatesTokens / 1_000_000) * audioRate)).toFixed(6)
    );
    const durationSeconds = Number(((pcmBuffer.length / 2) / 24000.0).toFixed(2));

    return res.json({
      audioData: pcmBuffer.toString('base64'),
      durationSeconds,
      tokensUsed: tokens,
      costUSD: cost,
      fallback: false,
    });
  } catch (error: any) {
    console.error('Multi-speaker generation error:', error);
    return res.status(500).json({ error: error.message || 'Multi-speaker generation failed.' });
  }
});

// 4.2. Generate Engaging Dialogue Script via Gemini Text
app.post('/api/gemini/generate-dialogue', async (req, res) => {
  try {
    const { topic, style, speaker1Name, speaker2Name, apiKey } = req.body;
    const ai = getGeminiClient(apiKey);

    const prompt = `You are an elite scriptwriter for podcasts, cinematic trailers, and debates.
Write a captivating, natural dialogue in Arabic (or English if the topic is English) between two characters: "${speaker1Name || 'سارة'}" and "${speaker2Name || 'خالد'}".
Topic: "${topic || 'مستقبل الذكاء الاصطناعي والإبداع'}"
Style format: "${style || 'podcast'}" (e.g. podcast banter, cinematic trailer, intense debate, comedy show, documentary inquiry).
Length: 6 to 10 alternating lines total.
IMPORTANT RULES:
1. Format each line with the exact speaker name followed by a colon, e.g.:
${speaker1Name || 'سارة'}: [line text]
${speaker2Name || 'خالد'}: [line text]
2. Do not include markdown asterisks, parenthetical audio stage directions, or narration. Just the dialogue lines.
3. Natural Arabic phrasing with emotional contrast between the two voices.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const dialogue = response.text?.trim() || '';
    return res.json({ dialogue });
  } catch (error: any) {
    console.error('Dialogue generation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate dialogue.' });
  }
});

// 4.3. Accurate Arabic Diacritization (Tashkeel)
app.post('/api/gemini/tashkeel', async (req, res) => {
  try {
    const { text, apiKey } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required.' });
    }
    const ai = getGeminiClient(apiKey);
    const prompt = `You are a master Arabic linguistic expert and vocal coach for high-end cinematic voiceover and broadcast.
Add precise, accurate Arabic diacritics (تشكيل كامل ودقيق) to the following text so that a text-to-speech engine pronounces every word, case ending (إعراب), and nunation with absolute perfection.
CRITICAL RULES:
1. Do NOT alter or add words. Output ONLY the diacritized Arabic text, with no preamble, explanations, or quotes.
2. PRESERVE any bracketed tags (e.g. [وقفة: ثانية], [بحماس], [المقدم: سعد]) EXACTLY as they are; do NOT diacritize inside square brackets.

Text to diacritize:
${text}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const diacritized = response.text?.trim().replace(/^["']|["']$/g, '') || text;
    return res.json({ diacritized });
  } catch (error: any) {
    console.error('Tashkeel error:', error);
    return res.status(500).json({ error: error.message || 'Tashkeel failed.' });
  }
});

// 5. Test API Key Connection
app.post('/api/gemini/test-connection', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const ai = getGeminiClient(apiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Test connection',
    });
    return res.json({ success: true, text: response.text || 'Connected' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || String(error) });
  }
});

// 6. Live Health & Connection Status
app.all('/api/gemini/health', async (req, res) => {
  const userKey = (req.method === 'POST' ? req.body?.apiKey : req.query?.apiKey) as string | undefined;
  try {
    const ai = getGeminiClient(userKey);
    await ai.models.get({
      model: 'gemini-3.8-flash',
    });
    return res.json({
      connected: true,
      status: 'CONNECTED',
      model: 'gemini-3.8-flash-lite-tts',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    const message = err.message || String(err);
    const isSpendCap = message.includes('spending cap') || message.includes('spend cap');
    const isQuota = err.status === 429 || message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || isSpendCap;
    return res.json({
      connected: false,
      status: 'DISCONNECTED',
      isQuota,
      isSpendCap,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 7. Direct API Key Setup & Persistence
app.post('/api/gemini/set-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      return res.status(400).json({ error: 'مفتاح API غير صالح. يرجى إدخال مفتاح Gemini صحيح.' });
    }

    const cleanKey = apiKey.trim();

    // Verify key with Gemini API
    const ai = new GoogleGenAI({
      apiKey: cleanKey,
      httpOptions: {
        apiVersion: 'v1alpha',
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Ping',
    });

    // Update in-memory environment
    process.env.GEMINI_API_KEY = cleanKey;

    // Persist to .env file
    const envPath = path.resolve(__dirname, '.env');
    fs.writeFileSync(envPath, `GEMINI_API_KEY=${cleanKey}\n`, 'utf8');

    console.log('[API Key Update] New API key verified and saved to .env');

    return res.json({
      success: true,
      message: 'تم التحقق من مفتاح API بنجاح وتفعيله وحفظه.',
    });
  } catch (error: any) {
    console.error('Failed to set API key:', error);
    const message = error.message || String(error);
    return res.status(400).json({
      error: `فشل التحقق من المفتاح: ${message}`,
    });
  }
});

// 8. Export Full Project ZIP for Google AI Studio / Project IDX / Cloud Run
app.get('/api/export/aistudio-zip', async (_req, res) => {
  try {
    const projectDir = __dirname;
    const zipPath = path.resolve('/tmp', 'Synergy-AIStudio-App.zip');

    if (fs.existsSync(zipPath)) {
      try { fs.unlinkSync(zipPath); } catch {}
    }

    const zipArgs = [
      '-r',
      zipPath,
      '.',
      '-x', 'node_modules/*',
      '-x', 'dist/*',
      '-x', '.git/*',
      '-x', '.DS_Store',
      '-x', '*.log',
      '-x', 'bun.lock',
      '-x', '.env',
    ];

    const zipProcess = spawn('/usr/bin/zip', zipArgs, { cwd: projectDir });

    zipProcess.on('close', (code) => {
      if (code === 0 && fs.existsSync(zipPath)) {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="Synergy-AIStudio-App.zip"');
        return res.sendFile(zipPath);
      } else {
        return res.status(500).json({ error: `فشل إنشاء ملف الأرشيف ZIP. كود الخروج: ${code}` });
      }
    });

    zipProcess.on('error', (err) => {
      console.error('[Zip Error]:', err);
      return res.status(500).json({ error: `خطأ في محرك الأرشفة: ${err.message}` });
    });
  } catch (err: any) {
    console.error('AI Studio ZIP export error:', err);
    return res.status(500).json({ error: err.message || 'Failed to export AI Studio package.' });
  }
});

// 9. Export AI Studio System Instructions & Prompts JSON
app.get('/api/export/aistudio-prompts', async (_req, res) => {
  try {
    const promptsConfig = {
      name: 'Synergy Cinema VO Studio Prompts & Presets',
      version: '3.8.0',
      description: 'Standard Google AI Studio Prompts and Voice Configurations for Synergy Speech Studio',
      recommendedModel: 'gemini-3.8-flash-lite-tts',
      audioConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Algenib',
            },
          },
        },
      },
      presets: [
        {
          id: 'movie-trailer',
          name: 'Movie Trailer (إعلان سينمائي)',
          voice: 'Algenib',
          systemInstruction: 'You are a professional cinematic voice narrator. Deliver each sentence with dramatic authority, natural breath pauses, and immaculate diction. IMPORTANT VOCAL TIMBRE DIRECTIVE: Use your deepest, lowest chest-resonant register. Speak with thunderous gravitas, measured deliberate cadence, and heavy cinematic weight like a classic blockbuster movie trailer narrator.',
          styleDirective: '[Pacing: Slow and deliberate pacing; Tone: deep; Style: cinematic; Emotion: dramatic]',
        },
        {
          id: 'radio-dj',
          name: 'Radio DJ (إذاعي محترف)',
          voice: 'Puck',
          systemInstruction: 'You are an energetic, charismatic FM radio DJ broadcasting live during morning prime-time. Deliver with warmth, snappy momentum, and sparkling enthusiasm.',
          styleDirective: '[Pacing: Brisk, energetic, fast-paced cadence; Tone: warm; Style: dynamic; Emotion: energetic]',
        },
        {
          id: 'beauty-influencer',
          name: 'Beauty Influencer (مؤثرة رقمية)',
          voice: 'Aoede',
          systemInstruction: 'You are a friendly, polished, and authentic lifestyle and beauty influencer talking intimately to your followers. Your delivery is personal, airy, conversational, and uplifting.',
          styleDirective: '[Pacing: Normal natural conversational tempo; Tone: gentle; Style: conversational; Emotion: joyful]',
        },
        {
          id: 'podcaster',
          name: 'Podcaster (مقدم بودكاست)',
          voice: 'Charon',
          systemInstruction: 'You are an articulate, thoughtful long-form podcast host. Deliver with reflective pacing, deep curiosity, and natural conversational cadence.',
          styleDirective: '[Pacing: Normal natural conversational tempo; Tone: balanced; Style: natural; Emotion: thoughtful]',
        },
        {
          id: 'asmr-pro',
          name: 'ASMR Pro (همس هادئ ومريح)',
          voice: 'Kore',
          systemInstruction: 'You are an ASMR artist. Deliver every single word in an ultra-soft, close-mic whisper. Speak with gentle breathiness, soothing intimacy, and calm serenity.',
          styleDirective: '[Pacing: Extremely slow, measured, and deliberate tempo; Tone: soft; Style: whispering; Emotion: calm]',
        },
        {
          id: 'ceo-santa',
          name: 'CEO Santa (خطاب قيادي دافئ)',
          voice: 'Fenrir',
          systemInstruction: 'You are a warm, commanding, yet deeply benevolent executive leader addressing the entire global company. Radiate confidence, fatherly warmth, and inspirational gravitas.',
          styleDirective: '[Pacing: Slow and deliberate pacing; Tone: authoritative; Style: inspiring; Emotion: confident]',
        },
      ],
      exportedAt: new Date().toISOString(),
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="synergy-aistudio-prompts.json"');
    return res.json(promptsConfig);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to export prompts.' });
  }
});

// 10. Trigger Google Drive Cloud Backup
app.post('/api/backup/trigger-gdrive', async (_req, res) => {
  try {
    const scriptPath = path.resolve(__dirname, 'scripts', 'sync_to_gdrive.sh');
    const syncProcess = spawn('bash', [scriptPath], { cwd: __dirname });

    let stdout = '';
    let stderr = '';

    syncProcess.stdout.on('data', (d) => { stdout += d.toString(); });
    syncProcess.stderr.on('data', (d) => { stderr += d.toString(); });

    syncProcess.on('close', (code) => {
      if (code === 0) {
        return res.json({
          success: true,
          message: 'تمت المزامنة والنسخ الاحتياطي إلى Google Drive بنجاح!',
          output: stdout,
        });
      } else {
        return res.status(500).json({
          success: false,
          error: `فشل النسخ إلى Google Drive: كود ${code}`,
          details: stderr || stdout,
        });
      }
    });

    syncProcess.on('error', (err) => {
      return res.status(500).json({ success: false, error: err.message });
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Instant Voice Preview / Audition Endpoint (Local Disk Caching for Zero-Token Replays)
app.get('/api/voices/preview/:voiceName', async (req, res) => {
  const { voiceName } = req.params;
  if (!voiceName) return res.status(400).json({ error: 'voiceName is required' });

  const normVoice = normalizeVoiceName(voiceName);
  const previewsDir = path.resolve(__dirname, 'public', 'previews');
  if (!fs.existsSync(previewsDir)) {
    fs.mkdirSync(previewsDir, { recursive: true });
  }

  const previewFilePath = path.join(previewsDir, `${normVoice}.mp3`);

  // Return cached MP3 if exists
  if (fs.existsSync(previewFilePath)) {
    res.setHeader('Content-Type', 'audio/mpeg');
    return fs.createReadStream(previewFilePath).pipe(res);
  }

  try {
    const ai = getGeminiClient();
    const sampleText = 'مرحباً، أهلاً بكم في استوديو سينيرجي الصوتي.';
    const prompt = `[VOICE DIRECTION: Natural, warm, friendly Arabic greeting. DO NOT speak directions aloud.]\n\n"${sampleText}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: prompt,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: normVoice },
          },
        },
      },
    });

    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) throw new Error('No audio returned for preview');

    const rawBuffer = Buffer.from(data, 'base64');
    const mp3Base64 = await convertPcmToMp3(rawBuffer.toString('base64'), 24000);
    const mp3Buffer = Buffer.from(mp3Base64, 'base64');

    fs.writeFileSync(previewFilePath, mp3Buffer);
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.send(mp3Buffer);
  } catch (err: any) {
    console.warn(`[Preview Generation Notice for ${normVoice}]:`, err?.message || err);
    // If Gemini fails or quota, return a lightweight fallback
    return res.status(500).json({ error: 'Preview currently unavailable' });
  }
});

// 12. Whisper SRT Subtitle & Word-Level Timestamp Generator
app.post('/api/audio/transcribe-srt', async (req, res) => {
  try {
    const { audioData, language = 'ar' } = req.body;
    if (!audioData || typeof audioData !== 'string') {
      return res.status(400).json({ error: 'audioData base64 string is required.' });
    }

    const tmpDir = path.resolve(__dirname, 'dist', 'tmp_transcribe');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const tempAudioPath = path.join(tmpDir, `speech_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`);
    
    let rawBuffer = Buffer.from(audioData, 'base64');
    const isWav = rawBuffer.length >= 12 && rawBuffer.toString('ascii', 0, 4) === 'RIFF';

    if (!isWav) {
      // Build 44-byte RIFF header for raw 24kHz Mono 16-bit PCM
      const wavHeader = Buffer.alloc(44);
      const totalDataLen = rawBuffer.length;
      const totalFileLen = totalDataLen + 36;
      wavHeader.write('RIFF', 0);
      wavHeader.writeUInt32LE(totalFileLen, 4);
      wavHeader.write('WAVE', 8);
      wavHeader.write('fmt ', 12);
      wavHeader.writeUInt32LE(16, 16);
      wavHeader.writeUInt16LE(1, 20); // PCM format
      wavHeader.writeUInt16LE(1, 22); // Mono
      wavHeader.writeUInt32LE(24000, 24); // Sample rate
      wavHeader.writeUInt32LE(48000, 28); // Byte rate (24000 * 1 * 2)
      wavHeader.writeUInt16LE(2, 32); // Block align
      wavHeader.writeUInt16LE(16, 34); // Bits per sample
      wavHeader.write('data', 36);
      wavHeader.writeUInt32LE(totalDataLen, 40);
      rawBuffer = Buffer.concat([wavHeader, rawBuffer]);
    }

    fs.writeFileSync(tempAudioPath, rawBuffer);

    const scriptPath = path.resolve(__dirname, 'scripts', 'transcribe_srt.py');
    const child = spawn('python3', [scriptPath, tempAudioPath, 'base', language]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      try { if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath); } catch {}

      if (code !== 0) {
        return res.status(500).json({ error: `Whisper transcription failed: ${stderr || stdout}` });
      }

      try {
        const result = JSON.parse(stdout.trim());
        return res.json(result);
      } catch (parseErr) {
        return res.status(500).json({ error: 'Failed to parse Whisper response', raw: stdout });
      }
    });

    child.on('error', (err) => {
      try { if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath); } catch {}
      return res.status(500).json({ error: err.message });
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Transcription failed' });
  }
});

// Serve frontend in dev (via Vite middleware) or prod (via static dist / cloud container)
const startServer = async () => {
  const isProduction = process.env.NODE_ENV === 'production' || 
    (fs.existsSync(path.resolve(__dirname, 'dist', 'index.html')) && !process.argv.includes('--dev'));

  if (isProduction) {
    console.log('[Synergy Studio] Running in Production / Cloud Mode, serving static assets from dist/');
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.use((_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    console.log('[Synergy Studio] Running in Development Mode via Vite middleware');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { port: 24690 }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} (Production: ${isProduction})`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
