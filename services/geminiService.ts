/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { VoiceSettings, EmotionSettings, DramaticDirectionResult } from "../types";

// Audio Decoding Helper
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Detect if byte stream already contains a valid RIFF WAVE header
function isWav(data: Uint8Array): boolean {
  return (
    data.length >= 12 &&
    data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 && // 'RIFF'
    data[8] === 0x57 && data[9] === 0x41 && data[10] === 0x56 && data[11] === 0x45    // 'WAVE'
  );
}

function decodePcm(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): AudioBuffer {
  const byteOffset = data.byteOffset;
  const byteLength = data.byteLength - (data.byteLength % 2);
  const dataInt16 = new Int16Array(data.buffer.slice(byteOffset, byteOffset + byteLength));
  const frameCount = Math.floor(dataInt16.length / numChannels);
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  if (isWav(data)) {
    try {
      const copy = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      return await ctx.decodeAudioData(copy);
    } catch (wavErr) {
      console.warn("Native decodeAudioData on WAV failed, falling back to PCM slice:", wavErr);
      const pcmSlice = data.slice(44);
      return decodePcm(pcmSlice, ctx, sampleRate, numChannels);
    }
  }

  return decodePcm(data, ctx, sampleRate, numChannels);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export function createWavBlob(samples: Uint8Array, sampleRate: number = 24000): Blob {
  if (isWav(samples)) {
    return new Blob([samples], { type: 'audio/wav' });
  }

  // Ensure strict 16-bit word alignment (even byte count) to prevent decoding glitch/pop
  const evenLength = samples.length - (samples.length % 2);
  const buffer = new ArrayBuffer(44 + evenLength);
  const view = new DataView(buffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + evenLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, evenLength, true);

  const dataView = new Uint8Array(buffer, 44);
  dataView.set(samples.subarray(0, evenLength));

  return new Blob([buffer], { type: 'audio/wav' });
}

export interface GeneratedAudio {
  buffer: AudioBuffer;
  rawData: Uint8Array;
  tokensUsed?: number;
  costUSD?: number;
  durationSeconds?: number;
  fallback?: boolean;
}

/**
 * Generates spoken audio via Google Gemini 3.8 Flash & Gemini 3.8 Flash-Lite TTS.
 * STRICT COMPLIANCE: Reads original script verbatim with zero altered or spoken markup words.
 */
export const generateSpeech = async (
  text: string, 
  voiceName: string,
  styleInstruction?: string,
  apiKey?: string,
  voiceSettings?: VoiceSettings,
  emotionSettings?: EmotionSettings,
  styleId?: string,
  model?: string,
  signal?: AbortSignal
): Promise<GeneratedAudio> => {
  const response = await fetch('/api/gemini/generate-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      text,
      voiceName,
      styleInstruction,
      apiKey,
      voiceSettings,
      emotionSettings,
      styleId,
      model,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || `HTTP ${response.status}: Failed to generate speech.`);
  }

  const data = await response.json();
  const base64Audio = data.audioData;
  if (!base64Audio) {
    throw new Error("No audio data received from speech generation endpoint.");
  }

  const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 24000,
  });

  try {
    const audioBytes = decode(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, outputAudioContext, 24000, 1);
    return {
      buffer: audioBuffer,
      rawData: audioBytes,
      tokensUsed: data.tokensUsed || 0,
      costUSD: data.costUSD || 0,
      durationSeconds: data.durationSeconds ?? (audioBuffer.duration || 0),
      fallback: !!data.fallback,
    };
  } finally {
    await outputAudioContext.close();
  }
};

/**
 * Analyzes script text via the server-side Gemini endpoint.
 * Derives emotional arc, pauses, breath cues, and pacing without changing a single word.
 */
export const analyzeDramaticDirection = async (
  text: string, 
  stylePrompt?: string,
  apiKey?: string
): Promise<DramaticDirectionResult> => {
  const response = await fetch('/api/gemini/analyze-dramatic', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, stylePrompt, apiKey }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || `HTTP ${response.status}: Failed to analyze dramatic direction.`);
  }

  return await response.json();
};

/**
 * Analyzes emotion via server-side Gemini endpoint.
 */
export const analyzeEmotion = async (text: string, apiKey?: string): Promise<{ emotion: string; style: string }> => {
  const response = await fetch('/api/gemini/analyze-emotion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, apiKey }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || `HTTP ${response.status}: Failed to analyze emotion.`);
  }

  return await response.json();
};

/**
 * Backward compatibility helper: preserves the user's text verbatim.
 */
export const dramatizeText = async (text: string, _styleInstruction?: string, _apiKey?: string): Promise<string> => {
  return text;
};

/**
 * Converts PCM or WAV audio buffer (base64) to high-quality 192kbps MP3 via server FFmpeg.
 */
export const convertAudioToMp3 = async (
  rawAudioBase64: string,
  sampleRate: number = 24000
): Promise<Blob> => {
  const response = await fetch('/api/gemini/to-mp3', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ audioBase64: rawAudioBase64, sampleRate }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || 'فشل تحويل الصوت إلى صيغة MP3');
  }

  const data = await response.json();
  const mp3Bytes = decode(data.mp3Data);
  return new Blob([mp3Bytes], { type: 'audio/mp3' });
};

/**
 * Generates continuous multi-speaker podcast or dialogue audio via Gemini 3.8 Multi-Speaker TTS.
 */
export const generateMultiSpeakerSpeech = async (
  dialogueText: string,
  speakers: { name: string; voice: string; personality?: string }[],
  overallStyle?: string,
  speed?: number,
  pitch?: number,
  apiKey?: string,
  model?: string,
  signal?: AbortSignal
): Promise<GeneratedAudio> => {
  const response = await fetch('/api/gemini/generate-multispeaker', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      dialogueText,
      speakers,
      overallStyle,
      speed,
      pitch,
      apiKey,
      model,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || `HTTP ${response.status}: Failed to generate multi-speaker speech.`);
  }

  const data = await response.json();
  const base64Audio = data.audioData;
  if (!base64Audio) {
    throw new Error('No audio data received from multi-speaker endpoint.');
  }

  const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 24000,
  });

  try {
    const audioBytes = decode(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, outputAudioContext, 24000, 1);
    return {
      buffer: audioBuffer,
      rawData: audioBytes,
      tokensUsed: data.tokensUsed || 0,
      costUSD: data.costUSD || 0,
      durationSeconds: data.durationSeconds ?? (audioBuffer.duration || 0),
      fallback: !!data.fallback,
    };
  } finally {
    await outputAudioContext.close();
  }
};

/**
 * Generates an engaging 2-character dialogue script on any topic using Gemini.
 */
export const generateDialogueScript = async (
  topic: string,
  style: string = 'podcast',
  speaker1Name: string = 'سارة',
  speaker2Name: string = 'خالد',
  apiKey?: string
): Promise<string> => {
  const response = await fetch('/api/gemini/generate-dialogue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic, style, speaker1Name, speaker2Name, apiKey }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to generate dialogue script.');
  }

  const data = await response.json();
  return data.dialogue || '';
};

/**
 * Adds precise Arabic diacritics (تَشْكِيل) to ensure flawless phonetic delivery.
 */
export const tashkeelArabicScript = async (
  text: string,
  apiKey?: string
): Promise<string> => {
  const response = await fetch('/api/gemini/tashkeel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, apiKey }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to diacritize Arabic script.');
  }

  const data = await response.json();
  return data.diacritized || text;
};

export interface TranscribeResult {
  success: boolean;
  text: string;
  srt: string;
  words: { word: string; start: number; end: number; probability: number }[];
  error?: string;
}

/**
 * Transcribes audio via Whisper to generate word-level timestamps and SRT subtitles.
 */
export const transcribeAudioToSrt = async (
  audioBase64: string,
  language: string = 'ar'
): Promise<TranscribeResult> => {
  const response = await fetch('/api/audio/transcribe-srt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ audioData: audioBase64, language }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to transcribe audio to SRT.');
  }

  return await response.json();
};
