/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export interface VoiceSettings {
  pitch: number; // -20 to 20
  speed: number; // 0.25 to 4.0
  intensity: number; // 0 to 100
  style: string; // natural, cinematic, dramatic, documentary
  tone: string; // deep, warm, sharp, youthful, mature
  dialect: string;
  purpose: string; // advertisement, storytelling, social media, cinematic, podcast
}

export interface EmotionSettings {
  autoAnalyze: boolean;
  manualEmotion?: string;
  emotionalStyle: string; // dramatic, calm, intense, cinematic, natural
}

export interface IntroStyle {
  id: string;
  name: string;
  description: string;
  defaultVoice: string; // Gemini voice name
  templateText: string;
  color: 'red' | 'blue' | 'yellow' | 'white' | 'green' | 'black';
  icon: 'circle' | 'square' | 'triangle' | 'half-circle' | 'rect' | 'plus';
  avatarSrc?: string; // Path to avatar image
  audioSrc?: string; // Path to pre-generated audio file
  isCustom?: boolean;
  customVoiceSettings?: VoiceSettings;
  customEmotionSettings?: EmotionSettings;
}

export interface HistoryEntry {
  id: string;
  timestamp: string; // ISO string
  styleName: string;
  voice: string;
  textSnippet: string;
  durationSeconds: number;
  tokensUsed: number;
  costUSD: number;
  model: string;
}

export interface UsageStats {
  mode: 'FREE' | 'PAID';
  totalTokens: number;
  totalSeconds: number;
  totalCostUSD: number;
  requestCount: number;
  budgetUSD: number; // Monthly spend cap
}

export interface VoiceOption {
  name: string;
  ssmlGender: string;
}

export interface DramaticDirectionResult {
  emotion: string;
  emotionalStyle: string;
  tone: string;
  intensity: number;
  speed: number;
  directorNotes: string;
  analysisSummary: string;
}

export interface SpeakerConfig {
  name: string;
  voice: string;
  gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  personality: string;
}

export interface MultiSpeakerState {
  speaker1: SpeakerConfig;
  speaker2: SpeakerConfig;
  dialogueText: string;
  topic: string;
  styleMode: 'podcast' | 'debate' | 'movie' | 'comedy' | 'interview';
  overallNotes: string;
}

export interface DirectorProfileState {
  characterName: string;
  sceneTitle: string;
  sceneDescription: string;
  vocalSmile: boolean;
  chestResonance: boolean;
  style: string;
  dynamics: string;
  pace: string;
  accent: string;
  transcript: string;
}

export type PlatformStudioMode = 'SINGLE' | 'MULTI_SPEAKER' | 'DIRECTOR_PROFILE' | 'DOCUMENTATION';