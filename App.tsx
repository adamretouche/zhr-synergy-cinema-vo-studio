/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IntroStyle, VoiceSettings, EmotionSettings, UsageStats, PlatformStudioMode, HistoryEntry } from './types';
import { ALL_VOICES } from './voices';
import { StyleSelector } from './components/StyleSelector';
import { CostQuotaWidget } from './components/CostQuotaWidget';
import { SavePresetModal } from './components/SavePresetModal';
import { SpendHistoryModal } from './components/SpendHistoryModal';
import { BauhausButton, getColorClass, DownloadIcon } from './components/BauhausComponents';
import { ConfigurationModal } from './components/ConfigurationModal';
import { AIStudioExportModal } from './components/AIStudioExportModal';
import { SystemPromptModal } from './components/SystemPromptModal';
import { DramatizeConfirmModal } from './components/DramatizeConfirmModal';
import { CommandTagsBar } from './components/CommandTagsBar';
import { DeliveryTagsGuideModal } from './components/DeliveryTagsGuideModal';
import { ChangelogModal } from './components/ChangelogModal';
import { MultiSpeakerStudio } from './components/MultiSpeakerStudio';
import { DirectorProfileStudio } from './components/DirectorProfileStudio';
import { DocumentationView } from './components/DocumentationView';
import { generateSpeech, createWavBlob, analyzeEmotion, analyzeDramaticDirection, convertAudioToMp3, tashkeelArabicScript, transcribeAudioToSrt } from './services/geminiService';
import { getCachedAudio, saveToCache, generateCacheKey, clearAllAudioCache } from './lib/audioCache';
import { 
  INTRO_STYLES, 
  CUSTOM_STYLE, 
  SUPPORTED_LANGUAGES,
  DEFAULT_VOICE_SETTINGS, 
  DEFAULT_EMOTION_SETTINGS,
  DEFAULT_MODEL_PRESETS,
  PRESET_STYLES,
  PRESET_TONES,
  PRESET_INTENSITIES,
  PRESET_CADENCES,
} from './constants';

const Footer: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`p-4 border-t-4 border-bauhaus-black bg-white text-[9px] text-gray-500 font-bold uppercase tracking-wider flex justify-between items-center ${className}`}>
    <span>Synergy Cinema Voice-Over Studio — استوديو سينيرجي للأفلام</span>
    <span>ZHR Master Motion & Cinema Studio</span>
  </div>
);

// Helper to check if text contains Arabic characters
const isArabicText = (str: string) => /[\u0600-\u06FF\u0750-\u077F]/.test(str);

// Helper to convert country code to flag emoji
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2 || !/^[A-Z]+$/.test(countryCode.toUpperCase())) {
    return '🌐';
  }
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Animated Sound Wave Equalizer Bars
const EqualizerBars: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => (
  <div className="flex items-center gap-1 h-6 px-2 bg-bauhaus-black rounded-sm">
    <div className={`w-1 bg-bauhaus-yellow transition-all duration-150 ${isPlaying ? 'animate-bounce h-5' : 'h-2'}`} />
    <div className={`w-1 bg-white transition-all duration-200 delay-75 ${isPlaying ? 'animate-bounce h-4' : 'h-1.5'}`} />
    <div className={`w-1 bg-bauhaus-red transition-all duration-150 delay-150 ${isPlaying ? 'animate-bounce h-6' : 'h-3'}`} />
    <div className={`w-1 bg-bauhaus-blue transition-all duration-200 delay-100 ${isPlaying ? 'animate-bounce h-4' : 'h-2'}`} />
    <div className={`w-1 bg-white transition-all duration-150 delay-200 ${isPlaying ? 'animate-bounce h-5' : 'h-1.5'}`} />
  </div>
);

const App: React.FC = () => {
  const [currentStyle, setCurrentStyle] = useState<IntroStyle>(INTRO_STYLES[0]);
  const [text, setText] = useState<string>(INTRO_STYLES[0].templateText);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configInitialTab, setConfigInitialTab] = useState<'VOICE' | 'SETTINGS' | 'EMOTION' | 'API'>('VOICE');
  const [isAIStudioExportOpen, setIsAIStudioExportOpen] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>(INTRO_STYLES[0].defaultVoice);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    try {
      const saved = localStorage.getItem('synergy_voice_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Cleanse and sanitize stale pitch/speed from earlier sessions to guarantee human warmth
        return {
          ...DEFAULT_VOICE_SETTINGS,
          ...parsed,
          pitch: 0, // Always enforce pitch 0 to prevent FFmpeg phase vocoder robotic artifacts
          speed: typeof parsed.speed === 'number' && parsed.speed >= 0.85 && parsed.speed <= 1.25 ? parsed.speed : 1.0,
        };
      }
      return DEFAULT_VOICE_SETTINGS;
    } catch {
      return DEFAULT_VOICE_SETTINGS;
    }
  });
  const [emotionSettings, setEmotionSettings] = useState<EmotionSettings>(() => {
    try {
      const saved = localStorage.getItem('synergy_emotion_settings');
      return saved ? JSON.parse(saved) : DEFAULT_EMOTION_SETTINGS;
    } catch {
      return DEFAULT_EMOTION_SETTINGS;
    }
  });
  const [isAnalyzingEmotion, setIsAnalyzingEmotion] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDramatizing, setIsDramatizing] = useState(false);
  const [isPlatformKeyActive, setIsPlatformKeyActive] = useState(false);
  const [apiHealth, setApiHealth] = useState<'CONNECTED' | 'DISCONNECTED' | 'CHECKING'>('CHECKING');
  const [apiHealthDetail, setApiHealthDetail] = useState<{
    isQuota?: boolean;
    isSpendCap?: boolean;
    error?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCooldown, setRetryCooldown] = useState<number>(0);
  const [downloadData, setDownloadData] = useState<{ url: string; filename: string; rawBase64?: string } | null>(null);
  const [isConvertingMp3, setIsConvertingMp3] = useState(false);
  const [isTranscribingSrt, setIsTranscribingSrt] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [flagIndex, setFlagIndex] = useState(0);

  // Platform Studio Mode (Single Voiceover, Multi-Speaker Podcast, Director's Profile, Documentation)
  const [studioMode, setStudioMode] = useState<PlatformStudioMode>('SINGLE');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash-lite-tts');
  const [isQuickDiacritizing, setIsQuickDiacritizing] = useState(false);

  const handleSubStudioUsage = (tokens: number, cost: number, seconds: number) => {
    setUsageStats((prev) => {
      const costToAdd = cost || 0;
      const next: UsageStats = {
        ...prev,
        requestCount: prev.requestCount + 1,
        totalTokens: prev.totalTokens + tokens,
        totalSeconds: prev.totalSeconds + seconds,
        totalCostUSD: Number((prev.totalCostUSD + costToAdd).toFixed(6)),
      };
      localStorage.setItem('synergy_usage_stats', JSON.stringify(next));
      return next;
    });
  };

  const handleQuickDiacritize = async () => {
    if (!text.trim()) return;
    setIsQuickDiacritizing(true);
    try {
      const apiKey = useCustomApiKey && customApiKey ? customApiKey : undefined;
      const diacritized = await tashkeelArabicScript(text, apiKey);
      if (diacritized) {
        setText(diacritized);
        setNotification('✨ تم تشكيل النص العربي بنجاح لضمان نطق سينمائي سليم!');
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err: any) {
      setError(`فشل تشكيل النص: ${err.message || err}`);
    } finally {
      setIsQuickDiacritizing(false);
    }
  };

  // Playback Progress State
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Textarea Ref for tag insertion
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Dramatic Director Performance Profile
  const [dramaticProfile, setDramaticProfile] = useState<{
    active: boolean;
    emotion: string;
    emotionalStyle: string;
    tone: string;
    intensity: number;
    speed: number;
    summary: string;
    directorNotes: string;
  } | null>(null);
  const [showDirectorDetails, setShowDirectorDetails] = useState(false);

  // Custom API Key State
  const [customApiKey, setCustomApiKey] = useState<string>(() => localStorage.getItem('synergy_custom_api_key') || '');
  const [useCustomApiKey, setUseCustomApiKey] = useState<boolean>(() => localStorage.getItem('synergy_use_custom_api_key') === 'true');

  // Custom Presets Management (Ensures Master Demo Models are always available)
  const [customPresets, setCustomPresets] = useState<IntroStyle[]>(() => {
    try {
      const saved = localStorage.getItem('synergy_custom_presets');
      const parsed: IntroStyle[] = saved ? JSON.parse(saved) : [];
      const existingIds = new Set(parsed.map(p => p.id));
      const missingDemos = DEFAULT_MODEL_PRESETS.filter(d => !existingIds.has(d.id));
      if (missingDemos.length > 0) {
        const combined = [...missingDemos, ...parsed];
        localStorage.setItem('synergy_custom_presets', JSON.stringify(combined));
        return combined;
      }
      return parsed.length > 0 ? parsed : DEFAULT_MODEL_PRESETS;
    } catch {
      return DEFAULT_MODEL_PRESETS;
    }
  });
  const [isSavePresetOpen, setIsSavePresetOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<IntroStyle | null>(null);
  const [isDramatizeConfirmOpen, setIsDramatizeConfirmOpen] = useState(false);
  const [isSpendHistoryOpen, setIsSpendHistoryOpen] = useState(false);
  const [isDeliveryGuideOpen, setIsDeliveryGuideOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  // Generation Audit History
  const [generationHistory, setGenerationHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('synergy_generation_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Live Cost & Quota Meter State
  const [usageStats, setUsageStats] = useState<UsageStats>(() => {
    try {
      const saved = localStorage.getItem('synergy_usage_stats');
      return saved ? JSON.parse(saved) : {
        mode: 'FREE',
        totalTokens: 0,
        totalSeconds: 0,
        totalCostUSD: 0,
        requestCount: 0,
        budgetUSD: 4.0,
      };
    } catch {
      return {
        mode: 'FREE',
        totalTokens: 0,
        totalSeconds: 0,
        totalCostUSD: 0,
        requestCount: 0,
        budgetUSD: 4.0,
      };
    }
  });

  const [notification, setNotification] = useState<string | null>(null);

  // Auto-scroll state for languages
  const [isHoveringLang, setIsHoveringLang] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Custom State initialized from constants.ts to match description
  const [customStylePrompt, setCustomStylePrompt] = useState<string>(CUSTOM_STYLE.description);

  // Audio Element Ref for native playback
  const audioElemRef = useRef<HTMLAudioElement | null>(null);
  const generationIdRef = useRef(0);

  // Clear audio data on mount so user always generates fresh audio for their script
  useEffect(() => {
    setDownloadData(null);
  }, []);

  const openConfig = (tab: 'VOICE' | 'SETTINGS' | 'EMOTION' | 'API' = 'SETTINGS') => {
    setConfigInitialTab(tab);
    setIsConfigOpen(true);
  };

  // Cycle flags
  useEffect(() => {
    const interval = setInterval(() => {
      setFlagIndex((prev) => (prev + 1) % SUPPORTED_LANGUAGES.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logic for languages
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = 0;
    const speed = 25; // pixels per second

    const animate = (time: number) => {
      if (!lastTime) lastTime = time;
      const delta = time - lastTime;
      lastTime = time;

      const container = scrollContainerRef.current;
      if (container && !isHoveringLang) {
        container.scrollTop += (speed * delta) / 1000;
        if (container.scrollTop >= container.scrollHeight / 2) {
           container.scrollTop = 0;
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isHoveringLang]);

  // Clear download data when voice, voice settings, or emotions change to ensure regeneration
  useEffect(() => {
    setDownloadData(null);
  }, [selectedVoice, voiceSettings, emotionSettings]);

  // Save API key settings to localStorage
  useEffect(() => {
    localStorage.setItem('synergy_custom_api_key', customApiKey);
    localStorage.setItem('synergy_use_custom_api_key', useCustomApiKey.toString());
  }, [customApiKey, useCustomApiKey]);

  // Save Voice and Emotion settings to localStorage
  useEffect(() => {
    localStorage.setItem('synergy_voice_settings', JSON.stringify(voiceSettings));
  }, [voiceSettings]);

  useEffect(() => {
    localStorage.setItem('synergy_emotion_settings', JSON.stringify(emotionSettings));
  }, [emotionSettings]);

  // Seamless Voice Switching: Harmonizes tone, clears stale director notes, and keeps pitch at 0
  const handleVoiceChange = (newVoice: string) => {
    setSelectedVoice(newVoice);
    setDramaticProfile(null); // Clear previous voice's director blueprint
    setDownloadData(null);

    const voiceData = ALL_VOICES.find(v => v.name.toLowerCase() === newVoice.toLowerCase());
    setVoiceSettings(prev => {
      let nextTone = prev.tone;
      let nextStyle = prev.style;
      if (voiceData && voiceData.ssmlGender === 'FEMALE') {
        if (nextTone === 'deep' || nextTone === 'gravelly') {
          nextTone = 'warm';
        }
      }
      return {
        ...prev,
        pitch: 0, // Guarantees zero DSP pitch-shift artifacts regardless of previous state
        tone: nextTone,
        style: nextStyle,
      };
    });
  };

  // Update text and default voice when style changes
  const handleStyleChange = (style: IntroStyle) => {
    handleStop();
    setCurrentStyle(style);
    setText(style.templateText);
    setSelectedVoice(style.defaultVoice);
    setDramaticProfile(null);
    setError(null);
    
    if (style.customVoiceSettings) {
      setVoiceSettings(style.customVoiceSettings);
    } else {
      setVoiceSettings(DEFAULT_VOICE_SETTINGS);
    }

    if (style.customEmotionSettings) {
      setEmotionSettings(style.customEmotionSettings);
    } else {
      setEmotionSettings(DEFAULT_EMOTION_SETTINGS);
    }

    setDownloadData(null);
  };

  const handleSavePreset = (savedPreset: IntroStyle, mode: 'create' | 'update' = 'create') => {
    if (mode === 'update') {
      const updated = customPresets.map(p => p.id === savedPreset.id ? savedPreset : p);
      setCustomPresets(updated);
      localStorage.setItem('synergy_custom_presets', JSON.stringify(updated));
      if (currentStyle.id === savedPreset.id) {
        setCurrentStyle(savedPreset);
        setText(savedPreset.templateText);
        if (savedPreset.customVoiceSettings) {
          setVoiceSettings(savedPreset.customVoiceSettings);
        }
        if (savedPreset.customEmotionSettings) {
          setEmotionSettings(savedPreset.customEmotionSettings);
        }
      }
      setNotification(`✓ تم تحديث البريسيت "${savedPreset.name}" بنجاح!`);
    } else {
      const newPreset: IntroStyle = {
        ...savedPreset,
        id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        isCustom: true,
      };
      const updated = [newPreset, ...customPresets];
      setCustomPresets(updated);
      localStorage.setItem('synergy_custom_presets', JSON.stringify(updated));
      setCurrentStyle(newPreset);
      setText(newPreset.templateText);
      if (newPreset.customVoiceSettings) {
        setVoiceSettings(newPreset.customVoiceSettings);
      }
      if (newPreset.customEmotionSettings) {
        setEmotionSettings(newPreset.customEmotionSettings);
      }
      setNotification(`✓ تم حفظ البريسيت "${newPreset.name}" بنجاح!`);
    }
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDeletePreset = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا البريسيت المخصص؟')) {
      const updated = customPresets.filter(p => p.id !== id);
      setCustomPresets(updated);
      localStorage.setItem('synergy_custom_presets', JSON.stringify(updated));
      if (currentStyle.id === id) {
        handleStyleChange(INTRO_STYLES[0]);
      }
    }
  };

  const handleExportPresets = () => {
    if (customPresets.length === 0) {
      alert('لا توجد بريسيتات مخصصة محفوظة حالياً لتصديرها.');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customPresets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `synergy_custom_presets_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setNotification(`تم تصدير ${customPresets.length} بريسيت بنجاح!`);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleImportPresets = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) {
          throw new Error('الملف لا يحتوي على مصفوفة بريسيتات صالحة.');
        }
        const existingIds = new Set(customPresets.map(p => p.id));
        const newItems: IntroStyle[] = [];
        for (const item of parsed) {
          if (item && item.name) {
            const id = item.id && !existingIds.has(item.id) ? item.id : `preset-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
            newItems.push({
              ...item,
              id,
              isCustom: true,
            });
            existingIds.add(id);
          }
        }
        if (newItems.length === 0) {
          alert('لم يتم العثور على أي بريسيتات صالحة في الملف.');
          return;
        }
        const updated = [...newItems, ...customPresets];
        setCustomPresets(updated);
        localStorage.setItem('synergy_custom_presets', JSON.stringify(updated));
        setNotification(`تم استيراد ${newItems.length} بريسيت بنجاح!`);
        setTimeout(() => setNotification(null), 3500);
      } catch (err: any) {
        alert(`خطأ في استيراد ملف JSON: ${err.message || 'تنسيق غير صالح'}`);
      }
    };
    reader.readAsText(file);
  };

  const handleInsertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText((prev) => (prev ? `${prev} ${tag} ` : `${tag} `));
      setDownloadData(null);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = text;
    const newText = currentText.substring(0, start) + tag + ' ' + currentText.substring(end);
    setText(newText);
    setDownloadData(null);
    setTimeout(() => {
      textarea.focus();
      const newPos = start + tag.length + 1;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  const handleUpdateBudget = (newBudget: number) => {
    setUsageStats(prev => {
      const next = { ...prev, budgetUSD: newBudget };
      localStorage.setItem('synergy_usage_stats', JSON.stringify(next));
      return next;
    });
  };

  const handleUpdateSpend = (newSpend: number) => {
    setUsageStats(prev => {
      const next = { ...prev, totalCostUSD: newSpend };
      localStorage.setItem('synergy_usage_stats', JSON.stringify(next));
      return next;
    });
    setNotification(`✓ تم ضبط رقم المصروف إلى $${newSpend.toFixed(2)} بنجاح`);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleResetUsageStats = () => {
    if (window.confirm("⚠️ هل أنت متأكد من تصفير عداد الاستهلاك إلى $0.00؟\n\nسيتم تصفير: المصروف، عدد الطلبات، التوكنز، وعدد الثواني لتبدأ دورة جديدة متزامنة مع الـ API.")) {
      const reset: UsageStats = {
        mode: usageStats.mode,
        totalTokens: 0,
        totalSeconds: 0,
        totalCostUSD: 0,
        requestCount: 0,
        budgetUSD: usageStats.budgetUSD || 4.0,
      };
      setUsageStats(reset);
      localStorage.setItem('synergy_usage_stats', JSON.stringify(reset));
      setNotification('✓ تم تصفير عداد الاستهلاك بنجاح لبدء دورة جديدة!');
      setTimeout(() => setNotification(null), 3500);
    }
  };

  const handleClearHistory = () => {
    setGenerationHistory([]);
    localStorage.removeItem('synergy_generation_history');
    setNotification('✓ تم مسح سجل التوليد والمتابعة بنجاح.');
    setTimeout(() => setNotification(null), 3500);
  };

  const handleCustomize = () => {
    handleStop();
    setCurrentStyle(CUSTOM_STYLE);
    setText(CUSTOM_STYLE.templateText);
    setDramaticProfile(null);
    setError(null);
    setDownloadData(null);
    if (!customStylePrompt) setCustomStylePrompt(CUSTOM_STYLE.description);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (audioElemRef.current) {
      audioElemRef.current.pause();
      audioElemRef.current.currentTime = 0;
      audioElemRef.current = null;
    }
    setIsGenerating(false);
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  const handleClearCacheAndRefresh = async () => {
    handleStop();
    await clearAllAudioCache();
    setDownloadData(null);
    setPlaybackProgress(0);
    setAudioDuration(0);
    await checkApiHealth();
    setNotification('✓ تم إفراغ الذاكرة المؤقتة (Audio Cache) وإعادة فحص الاتصال بنجاح.');
    setTimeout(() => setNotification(null), 3500);
  };

  const handleGoHome = () => {
    handleStop();
    const defaultStyle = INTRO_STYLES[0];
    setCurrentStyle(defaultStyle);
    setText(defaultStyle.templateText);
    setSelectedVoice(defaultStyle.defaultVoice);
    if (defaultStyle.customVoiceSettings) {
      setVoiceSettings(defaultStyle.customVoiceSettings);
    } else {
      setVoiceSettings(DEFAULT_VOICE_SETTINGS);
    }
    if (defaultStyle.customEmotionSettings) {
      setEmotionSettings(defaultStyle.customEmotionSettings);
    } else {
      setEmotionSettings(DEFAULT_EMOTION_SETTINGS);
    }
    setDramaticProfile(null);
    setError(null);
    setDownloadData(null);
    setStudioMode('SINGLE');
    setNotification('🏠 تم الرجوع للوضع الافتراضي الرئيسي (Home).');
    setTimeout(() => setNotification(null), 3500);
  };

  const handleResetAllDefaults = () => {
    if (window.confirm('هل تريد استعادة جميع الإعدادات للوضع الافتراضي؟\nسيتم تصفير السرعة والطبقة وإلغاء أي تعديلات مخصصة تجنباً لأي أصوات غير مرغوبة.')) {
      handleStop();
      setVoiceSettings(DEFAULT_VOICE_SETTINGS);
      setEmotionSettings(DEFAULT_EMOTION_SETTINGS);
      setDramaticProfile(null);
      localStorage.removeItem('synergy_voice_settings');
      localStorage.removeItem('synergy_emotion_settings');
      setDownloadData(null);
      setNotification('⏮️ تمت استعادة الضبط الافتراضي للإعدادات والصوت بنجاح.');
      setTimeout(() => setNotification(null), 3500);
    }
  };

  const getStylePrompt = () => {
    return currentStyle.id === 'custom' ? customStylePrompt : currentStyle.description;
  };

  /**
   * Core speech generation and playback pipeline.
   * STRICT REQUIREMENT: Preserves original script text 100% exactly as written!
   */
  const generateAndPlayAudio = async ({
    textToSpeak,
    voiceToUse,
    stylePrompt,
    vSettings,
    eSettings,
    allowPreloaded = true,
  }: {
    textToSpeak: string;
    voiceToUse: string;
    stylePrompt?: string;
    vSettings?: VoiceSettings;
    eSettings?: EmotionSettings;
    allowPreloaded?: boolean;
  }) => {
    if (!textToSpeak.trim()) return;

    handleStop();
    setIsGenerating(true);
    setError(null);
    setDownloadData(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentGenId = ++generationIdRef.current;

    try {
      const rawSettings = vSettings || voiceSettings;
      // Enforce pitch 0 always to eliminate robotic DSP phase vocoder artifacts
      const activeVoiceSettings: VoiceSettings = {
        ...rawSettings,
        pitch: 0,
      };

      // --- GEMINI 2.5 / 3.8 TTS GENERATION (SERVER PROXY) ---
      const activeStyleInstruction = stylePrompt || (dramaticProfile?.directorNotes ? `${getStylePrompt()}\n${dramaticProfile.directorNotes}` : getStylePrompt());
      const activeEmotionSettings = eSettings || emotionSettings;
      const apiKey = useCustomApiKey && customApiKey ? customApiKey : undefined;

      const cacheKey = await generateCacheKey(
        textToSpeak,
        voiceToUse,
        activeStyleInstruction,
        activeVoiceSettings,
        activeEmotionSettings
      );
      const cachedBlob = await getCachedAudio(cacheKey);

      let blob: Blob;
      let rawBase64Audio: string | undefined;

      if (cachedBlob) {
        blob = cachedBlob;
      } else {
        const result = await generateSpeech(
          textToSpeak, // 100% original text preserved verbatim
          voiceToUse,
          activeStyleInstruction,
          apiKey,
          activeVoiceSettings,
          activeEmotionSettings,
          currentStyle.id,
          selectedModel,
          controller.signal
        );

        if (currentGenId !== generationIdRef.current) {
          return;
        }

        // Update live API connectivity status
        if (result.fallback) {
          setApiHealth('DISCONNECTED');
        } else {
          setApiHealth('CONNECTED');
        }

        // Live Cost & Quota Meter Tracking
        setUsageStats((prev) => {
          // Calculate estimated dollar consumption for complete user transparency
          const costToAdd = result.costUSD || (result.tokensUsed ? (result.tokensUsed / 1_000_000) * 0.15 : 0);
          const next: UsageStats = {
            ...prev,
            requestCount: prev.requestCount + 1,
            totalTokens: prev.totalTokens + (result.tokensUsed || 0),
            totalSeconds: prev.totalSeconds + (result.durationSeconds || 0),
            totalCostUSD: Number((prev.totalCostUSD + costToAdd).toFixed(6)),
          };
          localStorage.setItem('synergy_usage_stats', JSON.stringify(next));

          if (next.totalCostUSD >= (next.budgetUSD || 4.0)) {
            setNotification(`⚠️ تنبيه الميزانية: لقد استهلكت سقف الميزانية التقديرية المحدد ($${(next.budgetUSD || 4.0).toFixed(2)})!`);
          }

          return next;
        });

        // Append to Generation History
        const calculatedCost = result.costUSD || (result.tokensUsed ? (result.tokensUsed / 1_000_000) * 0.15 : 0);
        const newHistoryEntry: HistoryEntry = {
          id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date().toISOString(),
          styleName: currentStyle.name,
          voice: voiceToUse,
          textSnippet: textToSpeak.slice(0, 80).trim() + (textToSpeak.length > 80 ? '...' : ''),
          durationSeconds: Number((result.durationSeconds || 0).toFixed(2)),
          tokensUsed: result.tokensUsed || 0,
          costUSD: Number(calculatedCost.toFixed(6)),
          model: selectedModel || 'gemini-3.8-flash-lite-tts',
        };
        setGenerationHistory((prev) => {
          const next = [newHistoryEntry, ...prev.slice(0, 199)];
          localStorage.setItem('synergy_generation_history', JSON.stringify(next));
          return next;
        });

        rawBase64Audio = uint8ArrayToBase64(result.rawData);
        blob = createWavBlob(result.rawData);
        await saveToCache(cacheKey, blob);
      }

      if (currentGenId !== generationIdRef.current) {
        return;
      }

      const audioUrl = URL.createObjectURL(blob);
      setDownloadData({
        url: audioUrl,
        filename: `synergy-intro-${currentStyle.id}-${Date.now()}.wav`,
        rawBase64: rawBase64Audio,
      });

      // Play via HTML5 Audio
      const audio = new Audio(audioUrl);
      audioElemRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPlaybackProgress((audio.currentTime / audio.duration) * 100);
          setAudioDuration(audio.duration);
        }
      };

      audio.onended = () => {
        setIsPlaying(false);
        setPlaybackProgress(0);
        audioElemRef.current = null;
      };

      await audio.play();

      setIsGenerating(false);
      setIsPlaying(true);

    } catch (err: any) {
      if (err?.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        console.log('[Generation Cancelled] Client aborted voice generation.');
        setIsGenerating(false);
        return;
      }
      if (currentGenId !== generationIdRef.current) {
        setIsGenerating(false);
        return;
      }
      console.error("Speech generation error:", err);
      let errorMessage = err instanceof Error ? err.message : String(err);
      
      if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('QUOTA_EXCEEDED')) {
        errorMessage = "تم تجاوز الحد الأقصى للاستخدام (429): يرجى الانتظار دقيقة أو إضافة مفتاح API خاص بك في الإعدادات.";
        setRetryCooldown(30);
      } else if (errorMessage.includes('API key not valid')) {
        errorMessage = "مفتاح API غير صالح: يرجى التحقق من المفتاح في نافذة الإعدادات.";
      }
      
      setError(errorMessage);
      setIsGenerating(false);
      setIsPlaying(false);
    }
  };

  /**
   * Prompt confirmation before running Dramatize to save 70-80% of API tokens!
   */
  const handleDramatizeClick = () => {
    if (!text.trim()) return;
    setIsDramatizeConfirmOpen(true);
  };

  /**
   * DRAMATIZE THE VOICE-OVER PERFORMANCE WHILE PRESERVING ORIGINAL SCRIPT 100% VERBATIM.
   * STRICT REQUIREMENTS:
   * - Never changes, deletes, replaces, or reorders any words.
   * - Calibrates emotional delivery, breathing, cadence, and cinematic pauses.
   * - Shows visual director performance blueprint.
   * - Immediately synthesizes and plays dramatized audio.
   */
  const executeDramatize = async () => {
    if (!text.trim()) return;
    setIsDramatizing(true);
    setError(null);
    handleStop();

    try {
      const apiKey = useCustomApiKey ? customApiKey : undefined;
      
      // Analyze dramatic performance direction in harmony with the System Instructions Preview
      const direction = await analyzeDramaticDirection(text, getStylePrompt(), apiKey);

      const updatedEmotionSettings: EmotionSettings = {
        autoAnalyze: false,
        manualEmotion: direction.emotion,
        emotionalStyle: direction.emotionalStyle,
      };

      const updatedVoiceSettings: VoiceSettings = {
        ...voiceSettings,
        intensity: direction.intensity,
        speed: direction.speed,
        tone: direction.tone,
        style: direction.emotionalStyle,
      };

      setEmotionSettings(updatedEmotionSettings);
      setVoiceSettings(updatedVoiceSettings);

      const newProfile = {
        active: true,
        emotion: direction.emotion,
        emotionalStyle: direction.emotionalStyle,
        tone: direction.tone,
        intensity: direction.intensity,
        speed: direction.speed,
        summary: direction.analysisSummary,
        directorNotes: direction.directorNotes,
      };
      setDramaticProfile(newProfile);

      // Immediately synthesize and play dramatized audio with exact verbatim script
      await generateAndPlayAudio({
        textToSpeak: text, // 100% verbatim script
        voiceToUse: selectedVoice,
        stylePrompt: direction.directorNotes,
        vSettings: updatedVoiceSettings,
        eSettings: updatedEmotionSettings,
        allowPreloaded: false,
      });

    } catch (err: any) {
      console.error("Failed to dramatize voice performance:", err);
      setError("فشل توجيه الأداء الصوتي الدرامي. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsDramatizing(false);
    }
  };

  const handleAnalyzeEmotion = async () => {
    if (!text.trim()) return;
    setIsAnalyzingEmotion(true);
    try {
      const apiKey = useCustomApiKey ? customApiKey : undefined;
      const result = await analyzeEmotion(text, apiKey);
      if (result) {
        setEmotionSettings(prev => ({
          ...prev,
          manualEmotion: result.emotion,
          emotionalStyle: result.style as any
        }));
      }
    } catch (error) {
      console.error('Emotion analysis failed:', error);
    } finally {
      setIsAnalyzingEmotion(false);
    }
  };

  const handlePlay = async () => {
    if (isPlaying) {
      handleStop();
      return;
    }

    if (isGenerating) {
      setIsGenerating(false);
      generationIdRef.current += 1;
      return;
    }

    if (!text.trim()) {
      alert("يرجى إدخال نص التعليق الصوتي في مربع النص أولاً.");
      return;
    }

    // If audio was already generated for this exact current session, replay it cleanly
    if (downloadData?.url) {
      try {
        const audio = new Audio(downloadData.url);
        audioElemRef.current = audio;

        audio.ontimeupdate = () => {
          if (audio.duration) {
            setPlaybackProgress((audio.currentTime / audio.duration) * 100);
            setAudioDuration(audio.duration);
          }
        };

        audio.onended = () => {
          setIsPlaying(false);
          setPlaybackProgress(0);
          audioElemRef.current = null;
        };

        await audio.play();
        setIsPlaying(true);
        return;
      } catch (e) {
        console.warn("Replay failed, regenerating audio:", e);
        setDownloadData(null);
      }
    }

    // Always synthesize fresh audio for the exact text in the box
    await generateAndPlayAudio({
      textToSpeak: text,
      voiceToUse: selectedVoice,
      allowPreloaded: false,
    });
  };

  const handleDownload = async () => {
    if (!downloadData) return;

    try {
      let urlToDownload = downloadData.url;
      let needsRevoke = false;

      if (urlToDownload.startsWith('http')) {
        const response = await fetch(urlToDownload);
        const blob = await response.blob();
        urlToDownload = URL.createObjectURL(blob);
        needsRevoke = true;
      }

      const a = document.createElement('a');
      a.href = urlToDownload;
      a.download = downloadData.filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      if (needsRevoke) {
        setTimeout(() => URL.revokeObjectURL(urlToDownload), 100);
      }
    } catch (err) {
      console.error("Download failed, falling back to open:", err);
      const a = document.createElement('a');
      a.href = downloadData.url;
      a.target = '_blank';
      a.click();
    }
  };

  const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    const chunkSize = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  };

  const handleDownloadMp3 = async () => {
    if (!downloadData) return;
    setIsConvertingMp3(true);
    try {
      let base64 = downloadData.rawBase64;
      if (!base64) {
        const res = await fetch(downloadData.url);
        const arrayBuf = await res.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuf);
        base64 = uint8ArrayToBase64(uint8);
      }
      const mp3Blob = await convertAudioToMp3(base64);
      const mp3Url = URL.createObjectURL(mp3Blob);
      const mp3Filename = downloadData.filename.replace(/\.wav$/i, '') + '.mp3';

      const a = document.createElement('a');
      a.href = mp3Url;
      a.download = mp3Filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(mp3Url), 100);
    } catch (err: any) {
      console.error('MP3 download error:', err);
      alert(`فشل تحميل MP3: ${err.message || String(err)}`);
    } finally {
      setIsConvertingMp3(false);
    }
  };

  const handleExportSrt = async (format: 'srt' | 'json' = 'srt') => {
    if (!downloadData) return;
    setIsTranscribingSrt(true);
    try {
      let base64 = downloadData.rawBase64;
      if (!base64) {
        const res = await fetch(downloadData.url);
        const arrayBuf = await res.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuf);
        base64 = uint8ArrayToBase64(uint8);
      }
      const res = await transcribeAudioToSrt(base64, 'ar');
      if (!res.success) throw new Error(res.error || 'Whisper transcription failed');

      if (format === 'srt') {
        const blob = new Blob([res.srt], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${downloadData.filename.replace(/\.wav$/i, '')}_subtitles.srt`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        setNotification('✓ تم استخراج وتصدير ملف الترجمة المتزامن (.srt) عبر Whisper بنجاح!');
      } else {
        const blob = new Blob([JSON.stringify(res.words, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${downloadData.filename.replace(/\.wav$/i, '')}_word_timestamps.json`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        setNotification('✓ تم تصدير توقيت الكلمات بالمللي ثانية (.json) بنجاح لمشاريع الموشن جرافيك!');
      }
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      console.error('SRT export error:', err);
      alert(`فشل تصدير الترجمة: ${err.message || String(err)}`);
    } finally {
      setIsTranscribingSrt(false);
    }
  };

  // Live check for Gemini API Health & connectivity status
  const checkApiHealth = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }
    try {
      const activeKey = useCustomApiKey && customApiKey ? customApiKey : undefined;
      const url = activeKey 
        ? `/api/gemini/health?apiKey=${encodeURIComponent(activeKey)}`
        : '/api/gemini/health';

      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.connected) {
        setApiHealth('CONNECTED');
        setIsPlatformKeyActive(true);
        setApiHealthDetail(null);
      } else {
        setApiHealth('DISCONNECTED');
        setIsPlatformKeyActive(false);
        const isSpendCap = !!data.isSpendCap || (typeof data.error === 'string' && (data.error.includes('spending cap') || data.error.includes('spend cap')));
        setApiHealthDetail({
          isQuota: !!data.isQuota,
          isSpendCap,
          error: data.error,
        });
      }
    } catch {
      setApiHealth('DISCONNECTED');
      setIsPlatformKeyActive(false);
      setApiHealthDetail({
        isQuota: false,
        isSpendCap: false,
        error: 'Network error or server unreachable',
      });
    }
  }, [useCustomApiKey, customApiKey]);

  useEffect(() => {
    checkApiHealth();
    const interval = setInterval(checkApiHealth, 60000);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkApiHealth();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkApiHealth]);

  // Handle retry cooldown
  useEffect(() => {
    if (retryCooldown > 0) {
      const timer = setTimeout(() => setRetryCooldown(retryCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [retryCooldown]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (downloadData && downloadData.url.startsWith('blob:')) {
        URL.revokeObjectURL(downloadData.url);
      }
    };
  }, [downloadData]);

  const activeVoiceData = ALL_VOICES.find(v => v.name === selectedVoice);
  const activeVoiceLabel = activeVoiceData ? activeVoiceData.name : selectedVoice;

  const promptText = getStylePrompt();
  const promptPreview = promptText.replace(/\n/g, ' ').slice(0, 50);
  const isCustomMode = currentStyle.id === 'custom';
  const isArabic = isArabicText(text);

  return (
    <div className="flex flex-col bg-bauhaus-white font-sans text-bauhaus-black h-screen w-full overflow-hidden">
      {/* Top Bar: Cost & Quota Meter */}
      <CostQuotaWidget
        stats={usageStats}
        onSwitchMode={(newMode) => {
          setUsageStats((prev) => {
            const next = { ...prev, mode: newMode };
            localStorage.setItem('synergy_usage_stats', JSON.stringify(next));
            return next;
          });
        }}
        onUpdateBudget={handleUpdateBudget}
        isPlatformKeyActive={isPlatformKeyActive || (useCustomApiKey && !!customApiKey)}
        apiConnected={apiHealth === 'CONNECTED'}
        isSpendCap={!!apiHealthDetail?.isSpendCap}
        onOpenApiConfig={() => openConfig('API')}
        onOpenHistory={() => setIsSpendHistoryOpen(true)}
        onResetStats={handleResetUsageStats}
      />

      {/* Spending Cap Warning Banner */}
      {apiHealth === 'DISCONNECTED' && apiHealthDetail?.isSpendCap && (
        <div className="bg-[#2d080e] border-b-2 border-red-500 text-white px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono select-none z-20" dir="rtl">
          <div className="flex items-center gap-2">
            <span className="text-base animate-bounce">⚠️</span>
            <span className="font-bold text-red-200">
              تنبيه سقف المصروفات الشهري (Monthly Spending Cap): لقد تم حظر مفتاح الـ API لأن مشروعك في Google AI Studio وصل لسقف الصرف الشهري ($0.00). يتم التوليد الآن عبر الاستوديو الاحتياطي 24kHz.
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="https://ai.studio/spend"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-[11px] uppercase rounded shadow transition-all cursor-pointer border border-black"
            >
              رفع سقف المصروفات في قوقل ↗
            </a>
            <button
              type="button"
              onClick={() => openConfig('API')}
              className="px-3 py-1 bg-white hover:bg-gray-100 text-black font-black text-[11px] uppercase rounded shadow transition-all cursor-pointer border border-black"
            >
              تغيير مفتاح الـ API 🔑
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-1 min-h-0 w-full overflow-hidden">
        <style>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .hover-scrollbar:hover::-webkit-scrollbar {
            display: block;
            width: 8px;
          }
          .hover-scrollbar:hover::-webkit-scrollbar-track {
             background: #F4F4F0;
          }
          .hover-scrollbar:hover::-webkit-scrollbar-thumb {
             background: #1A1A1A;
             border-radius: 4px;
          }
          .hover-scrollbar:hover {
            scrollbar-width: thin;
          }
        `}</style>
        
        {/* Sidebar - Style Selector */}
        <div className="w-full md:w-1/4 md:min-w-[300px] h-[180px] md:h-full flex-shrink-0 border-b-4 md:border-b-0 md:border-r-4 border-bauhaus-black z-10 flex flex-col bg-bauhaus-white">
          <div className="flex-1 min-h-0 relative">
            <StyleSelector 
              selectedStyle={currentStyle} 
              onSelect={handleStyleChange}
              onCustomize={handleCustomize}
              customPresets={customPresets}
              onDeletePreset={handleDeletePreset}
              onEditPreset={(preset) => {
                setEditingPreset(preset);
                setIsSavePresetOpen(true);
              }}
              onSaveCurrentAsPreset={() => {
                setEditingPreset(null);
                setIsSavePresetOpen(true);
              }}
              onExportPresets={handleExportPresets}
              onImportPresets={handleImportPresets}
            />
          </div>
          <Footer className="hidden md:flex" />
        </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 overflow-hidden">
        
        {/* Header / Title Area */}
        <div className="flex-shrink-0 border-b-4 border-bauhaus-black p-3 md:p-6 bg-white flex justify-between items-start z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <img src="/logo.svg" alt="ZHR Synergy V.O" className="w-8 h-8 md:w-9 md:h-9 object-contain drop-shadow" />
              <h1 className="text-xl md:text-3xl lg:text-4xl font-black uppercase tracking-tighter">
                Gemini Speech Studio <span className="text-xs font-bold opacity-60">استوديو تحويل النص إلى كلام</span>
              </h1>
              <span className="text-[10px] font-bold bg-bauhaus-black text-white px-2 py-0.5 rounded-sm">
                Google AI TTS
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {/* Model Selector Dropdown (Gemini 3.8 GA & 2.5 Preview Models) */}
              <div className="flex items-center gap-1.5 border-2 border-bauhaus-black bg-white px-2.5 py-1 text-xs font-bold shadow-sm">
                <span className="text-[10px] text-gray-500 font-extrabold uppercase">النموذج:</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-transparent font-black text-xs text-bauhaus-black focus:outline-none cursor-pointer"
                >
                  <option value="gemini-3.8-flash-lite-tts">Gemini 3.8 Flash-Lite TTS (الأوفر والأسرع ⚡ الافتراضي)</option>
                  <option value="gemini-3.8-flash-tts">Gemini 3.8 Flash TTS (استوديو عالي الدقة 🎙️)</option>
                  <option value="gemini-2.5-flash-preview-tts">Gemini 2.5 Flash TTS (الجيل 2.5 المتوازن ⚙️)</option>
                  <option value="gemini-2.5-pro-preview-tts">Gemini 2.5 Pro TTS (تعبير سينمائي ملحمي 🎬)</option>
                </select>
              </div>

              <span className={`px-2 py-0.5 text-[10px] md:text-xs font-bold uppercase text-white ${getColorClass(currentStyle.color, true)}`}>
                {isCustomMode ? 'Custom Style / مخصص' : 'Current Style / النمط'}
              </span>
              <span className="font-bold uppercase tracking-wider text-xs md:text-sm">{currentStyle.name}</span>
              
              {/* API Status Button with Live Green/Red Lamp */}
              <button 
                onClick={() => openConfig('API')}
                className={`flex items-center gap-2 px-2.5 py-1 border-2 border-bauhaus-black text-white text-[10px] md:text-xs font-bold uppercase transition-all shadow-sm hover:brightness-110 active:translate-y-0.5 cursor-pointer ${
                  apiHealth === 'CONNECTED' 
                    ? 'bg-[#0f2e1b] border-emerald-500' 
                    : apiHealth === 'DISCONNECTED'
                      ? 'bg-[#2e0f14] border-red-500'
                      : 'bg-bauhaus-black'
                }`}
                title={
                  apiHealth === 'CONNECTED' 
                    ? "Gemini API: متصل وشغال بنجاح (🟢) - اضغط لفتح الإعدادات" 
                    : apiHealth === 'DISCONNECTED'
                      ? "Gemini API: مفصول / خطأ 429 (🔴) - اضغط لربط مفتاح جديد أو استخدام الاستوديو الاحتياطي"
                      : "Gemini API: جاري فحص الاتصال..."
                }
              >
                {/* اللمبة التفاعلية: تظهر بالأخضر عند الاتصال، وبالأحمر عند عدم الربط */}
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  {apiHealth === 'CONNECTED' ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
                    </>
                  ) : apiHealth === 'DISCONNECTED' ? (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_8px_#ef4444]"></span>
                  ) : (
                    <span className="animate-pulse relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
                  )}
                </span>
                <span className="tracking-wide">
                  {apiHealth === 'CONNECTED' 
                    ? (useCustomApiKey && customApiKey ? 'API: CUSTOM (🟢 متصل)' : 'API: CONNECTED (🟢 متصل)')
                    : apiHealth === 'DISCONNECTED'
                      ? (apiHealthDetail?.isSpendCap 
                          ? 'API: 429 سقف الصرف مكتمل (اضغط لرفعه ↗)'
                          : 'API: 429 مفصول (🔴 اربط مفتاح)')
                      : 'API: جاري الفحص (🟡)'
                  }
                </span>
              </button>

              {/* Action Buttons: Home, Refresh & Cache Cleaner, Reset to Defaults, Configuration System */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleGoHome}
                  className="flex items-center gap-1 px-2.5 py-1 border-2 border-bauhaus-black bg-white hover:bg-bauhaus-yellow text-bauhaus-black text-[10px] md:text-xs font-black uppercase transition-all shadow-sm active:translate-y-0.5 cursor-pointer"
                  title="الرجوع إلى النمط والسيناريو الافتراضي الرئيسي (Home)"
                >
                  <span>🏠</span>
                  <span>الرئيسية (Home)</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearCacheAndRefresh}
                  className="flex items-center gap-1 px-2.5 py-1 border-2 border-bauhaus-black bg-white hover:bg-gray-100 text-bauhaus-black text-[10px] md:text-xs font-black uppercase transition-all shadow-sm active:translate-y-0.5 cursor-pointer"
                  title="إفراغ كاش الصوت المؤقت وتحديث الاتصال وفحص النظام بالكامل"
                >
                  <span>🔄</span>
                  <span>تحديث ومسح الكاش</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetAllDefaults}
                  className="flex items-center gap-1 px-2.5 py-1 border-2 border-bauhaus-black bg-white hover:bg-bauhaus-red hover:text-white text-bauhaus-black text-[10px] md:text-xs font-black uppercase transition-all shadow-sm active:translate-y-0.5 cursor-pointer"
                  title="تصفير واستعادة كافة الإعدادات الصوتية إلى الوضع الافتراضي النظيف"
                >
                  <span>⏮️</span>
                  <span>استعادة الضبط (Reset)</span>
                </button>

                {/* Configuration System Button */}
                <button
                  type="button"
                  onClick={() => openConfig('SETTINGS')}
                  className="flex items-center gap-1.5 px-3 py-1 border-2 border-bauhaus-black bg-bauhaus-yellow hover:bg-yellow-400 text-bauhaus-black text-[10px] md:text-xs font-black uppercase transition-all shadow-hard-sm active:translate-y-0.5 cursor-pointer"
                  title="فتح نظام الإعدادات والتحكم (Configuration System) لضبط السرعة والطبقة والأصوات والمشاعر ومفتاح الـ API"
                >
                  <span className="text-sm">⚙️</span>
                  <span>Configuration System</span>
                </button>

                {/* Google AI Studio Export & Backup Button */}
                <button
                  type="button"
                  onClick={() => setIsAIStudioExportOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 border-2 border-bauhaus-black bg-blue-600 hover:bg-blue-500 text-white text-[10px] md:text-xs font-black uppercase transition-all shadow-hard-sm active:translate-y-0.5 cursor-pointer"
                  title="تصدير لتطبيق Google AI Studio و Project IDX والنسخ الاحتياطي السحابي"
                >
                  <span className="text-sm">📦</span>
                  <span>تصدير ونسخ AI Studio</span>
                </button>

                {/* Version & Changelog Button */}
                <button
                  type="button"
                  onClick={() => setIsChangelogOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 border-2 border-bauhaus-black bg-bauhaus-black hover:bg-gray-800 text-bauhaus-yellow text-[10px] md:text-xs font-black uppercase transition-all shadow-hard-sm active:translate-y-0.5 cursor-pointer"
                  title="سجل التحديثات والإصدارات (Changelog) - الإصدار v1.0.1-beta"
                >
                  <span>📜</span>
                  <span>v1.0.1-beta</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* Main Workspace Prominent Cost & Usage Meter */}
            <div 
              className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-[#12161f] text-white border-2 border-bauhaus-black shadow-hard-sm"
              dir="rtl"
            >
              {/* Spend Cap Badge */}
              <div 
                onClick={() => setIsSpendHistoryOpen(true)}
                className="flex items-center gap-1.5 px-2 py-0.5 bg-black/60 border border-amber-500/40 rounded cursor-pointer hover:bg-black/90 transition-colors"
                title="اضغط لتعديل رقم المصروف أو السقف الشهري أو تصفير العداد"
              >
                <span className="text-amber-400 font-black text-xs">💰 المصروف:</span>
                <span className="font-mono font-black text-xs text-amber-300">
                  ${usageStats.totalCostUSD >= 1 ? usageStats.totalCostUSD.toFixed(2) : usageStats.totalCostUSD.toFixed(4)}
                </span>
                <span className="text-gray-400 text-[10px] font-mono">
                  / ${(usageStats.budgetUSD || 4.0).toFixed(2)}
                </span>
              </div>

              {/* Stats Counters */}
              <div 
                onClick={() => setIsSpendHistoryOpen(true)}
                className="flex items-center gap-2 text-xs font-mono cursor-pointer hover:opacity-90"
                title="اضغط لعرض وتصدير سجل الطلبات الكامل"
              >
                <span className="text-gray-200 text-xs font-bold font-mono">
                  🎯 {usageStats.requestCount} طلب
                </span>
                <span className="text-gray-600">|</span>
                <span className="text-emerald-400 text-xs font-bold font-mono">
                  🪙 {usageStats.totalTokens.toLocaleString()} توكن
                </span>
                <span className="text-gray-600">|</span>
                <span className="text-cyan-300 text-xs font-bold font-mono">
                  ⏱️ {usageStats.totalSeconds.toFixed(1)}ث
                </span>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-1 mr-1">
                <button
                  type="button"
                  onClick={() => setIsSpendHistoryOpen(true)}
                  className="px-2 py-0.5 bg-bauhaus-yellow hover:bg-yellow-400 text-black border border-black font-black text-[10px] rounded cursor-pointer transition-all shadow-xs"
                  title="تعديل رقم المصروف بالدولار أو سقف الميزانية"
                >
                  ✏️ ضبط الاستهلاك
                </button>
                <button
                  type="button"
                  onClick={handleResetUsageStats}
                  className="px-2 py-0.5 bg-gray-700 hover:bg-red-600 text-white border border-gray-500 font-bold text-[10px] rounded cursor-pointer transition-all"
                  title="تصفير العداد لبدء دورة جديدة"
                >
                  🔄 تصفير
                </button>
                <button
                  type="button"
                  onClick={() => setIsSpendHistoryOpen(true)}
                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 font-bold text-[10px] rounded cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                  title="عرض سجل الطلبات وتصدير CSV أو JSON"
                >
                  <span>📜</span>
                  <span>السجل والتصدير</span>
                </button>
                <a
                  href="https://aistudio.google.com/spend"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 bg-purple-700 hover:bg-purple-600 text-white border border-purple-400 font-bold text-[10px] rounded cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                  title="فتح صفحة الصرف الفعلي لمشروعك في Google AI Studio"
                >
                  <span>🔗</span>
                  <span>AI Studio ($) ↗</span>
                </a>
              </div>
            </div>

            <div className="hidden lg:block text-right">
              <p className="text-xs font-black uppercase tracking-wide leading-tight text-bauhaus-red">
                التعليق الصوتي السينمائي للأفلام
              </p>
              <p className="text-[10px] font-bold uppercase text-gray-500 mt-0.5">
                100% Verbatim Script Preservation
              </p>
            </div>
          </div>
        </div>

        {/* Studio Mode Selector (Single VO, Multi-Speaker, Director's Profile) */}
        <div className="flex border-b-4 border-bauhaus-black bg-white flex-shrink-0 z-10" dir="rtl">
          <button
            onClick={() => setStudioMode('SINGLE')}
            className={`flex-1 py-2.5 px-3 md:px-4 font-black text-xs md:text-sm uppercase tracking-wide transition-all border-l-2 border-bauhaus-black flex items-center justify-center gap-1.5 cursor-pointer ${
              studioMode === 'SINGLE'
                ? 'bg-bauhaus-yellow text-bauhaus-black border-b-4 border-b-bauhaus-black shadow-inner font-black'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>🎙️</span>
            <span>المعلق الفردي السينمائي</span>
          </button>

          <button
            onClick={() => setStudioMode('MULTI_SPEAKER')}
            className={`flex-1 py-2.5 px-3 md:px-4 font-black text-xs md:text-sm uppercase tracking-wide transition-all border-l-2 border-bauhaus-black flex items-center justify-center gap-1.5 cursor-pointer ${
              studioMode === 'MULTI_SPEAKER'
                ? 'bg-bauhaus-red text-white border-b-4 border-b-bauhaus-black shadow-inner font-black'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>👥</span>
            <span>بودكاست وحوار ثنائي (Multi-Speaker)</span>
            <span className="bg-yellow-400 text-black text-[9px] px-1.5 py-0.5 rounded font-black hidden sm:inline">جديد 🔥</span>
          </button>

          <button
            onClick={() => setStudioMode('DIRECTOR_PROFILE')}
            className={`flex-1 py-2.5 px-3 md:px-4 font-black text-xs md:text-sm uppercase tracking-wide transition-all border-l-2 border-bauhaus-black flex items-center justify-center gap-1.5 cursor-pointer ${
              studioMode === 'DIRECTOR_PROFILE'
                ? 'bg-bauhaus-blue text-white border-b-4 border-b-bauhaus-black shadow-inner font-black'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>🎬</span>
            <span>بروفايل المشهد والمخرج</span>
            <span className="bg-white text-blue-900 text-[9px] px-1.5 py-0.5 rounded font-black hidden sm:inline">Google Cookbook</span>
          </button>

          <button
            onClick={() => setStudioMode('DOCUMENTATION')}
            className={`flex-1 py-2.5 px-3 md:px-4 font-black text-xs md:text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              studioMode === 'DOCUMENTATION'
                ? 'bg-indigo-900 text-white border-b-4 border-b-bauhaus-black shadow-inner font-black'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>📖</span>
            <span>دليل ومرجع Gemini الرسمي</span>
            <span className="bg-emerald-400 text-emerald-950 text-[9px] px-1.5 py-0.5 rounded font-black hidden sm:inline">AI Studio</span>
          </button>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div className="bg-amber-100 border-b-2 border-amber-400 px-4 py-2 flex items-center justify-between text-xs text-amber-950 font-bold" dir="rtl">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 text-sm">💡</span>
              <span>{notification}</span>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="text-amber-800 hover:text-black font-black text-sm px-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {studioMode === 'MULTI_SPEAKER' ? (
          <div className="flex-1 bg-bauhaus-white relative overflow-y-auto">
            <MultiSpeakerStudio apiKey={useCustomApiKey && customApiKey ? customApiKey : undefined} model={selectedModel} onUsageUpdate={handleSubStudioUsage} />
          </div>
        ) : studioMode === 'DIRECTOR_PROFILE' ? (
          <div className="flex-1 bg-bauhaus-white relative overflow-y-auto">
            <DirectorProfileStudio apiKey={useCustomApiKey && customApiKey ? customApiKey : undefined} model={selectedModel} onUsageUpdate={handleSubStudioUsage} />
          </div>
        ) : studioMode === 'DOCUMENTATION' ? (
          <div className="flex-1 bg-bauhaus-white relative overflow-y-auto">
            <DocumentationView />
          </div>
        ) : (
          <>
            {/* Text Input & Dramatic Control Area */}
            <div className="flex-1 p-3 md:p-6 bg-bauhaus-white relative flex flex-col min-h-0 overflow-y-auto">
              <div className="flex flex-col h-full">
            
            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-x-4 gap-y-2 mb-2 md:mb-3 flex-shrink-0 z-30 relative">
              
              {/* Prompt Preview Bar */}
              <button
                 onClick={() => setIsPromptOpen(true)}
                 className={`
                    flex-1 min-w-0 text-left px-3 py-1.5 border-2 border-dashed transition-all group flex items-center gap-2 w-full md:w-auto
                    ${isCustomMode 
                        ? 'bg-bauhaus-white border-bauhaus-black hover:bg-bauhaus-yellow' 
                        : 'bg-gray-100 border-gray-300 hover:border-bauhaus-black hover:bg-bauhaus-yellow hover:border-solid'
                    }
                 `}
                 title="System Instructions Preview — معاينة وتعديل تعليمات وتوجيهات النظام المعتمدة"
              >
                 <span className={`text-[10px] font-bold uppercase text-white px-1.5 py-0.5 rounded-sm flex-shrink-0 ${isCustomMode ? 'bg-bauhaus-red' : 'bg-bauhaus-black'}`}>
                    {isCustomMode ? 'Configure / تعديل' : 'System Instructions Preview'}
                 </span>
                 <span className="font-mono text-xs text-gray-600 group-hover:text-bauhaus-black truncate flex-1">
                   {promptPreview}...
                 </span>
              </button>

              <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-auto ml-auto md:ml-0">
                {/* Languages dropdown */}
                <button 
                    type="button"
                    className="relative group cursor-help z-50 text-left focus:outline-none"
                    aria-label="اللغات المدعومة"
                >
                    <div className="flex items-center gap-1.5 py-1 px-2 border-2 border-bauhaus-black bg-white text-xs font-bold">
                        <span>{getFlagEmoji(SUPPORTED_LANGUAGES[flagIndex].code.split('-')[1])}</span>
                        <span className="hidden sm:inline text-[11px] uppercase">{SUPPORTED_LANGUAGES[flagIndex].name.slice(0, 15)}...</span>
                    </div>
                    
                    <div className="absolute top-full pt-1 w-64 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto group-focus:pointer-events-auto z-50 right-0">
                         <div className="bg-bauhaus-white border-4 border-bauhaus-black shadow-hard-sm flex flex-col h-[260px] relative">
                             <div 
                               className="h-full bg-white relative overflow-y-auto no-scrollbar hover-scrollbar"
                               ref={scrollContainerRef}
                               onMouseEnter={() => setIsHoveringLang(true)}
                               onMouseLeave={() => setIsHoveringLang(false)}
                             >
                                <div className="flex flex-col gap-1.5 p-2">
                                    {SUPPORTED_LANGUAGES.map((lang) => (
                                        <div key={`lang-${lang.code}`} className="flex items-center gap-2 text-xs font-bold text-bauhaus-black">
                                            <span className="text-base">{getFlagEmoji(lang.code.split('-')[1])}</span>
                                            <span className="truncate">{lang.name}</span>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    </div>
                </button>
              
                {/* QUICK TASHKEEL BUTTON */}
                <button
                  type="button"
                  onClick={handleQuickDiacritize}
                  disabled={isQuickDiacritizing || isGenerating || !text.trim()}
                  className="flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-yellow-100 border-2 md:border-3 border-bauhaus-black px-2.5 py-1.5 md:py-2 transition-all text-bauhaus-black active:translate-y-0.5 shadow-sm"
                  title="تشكيل النص العربي بالكامل لضمان نطق فصيح وسليم دون أخطاء نحوية"
                >
                  <span>{isQuickDiacritizing ? '⏳' : '✨'}</span>
                  <span className="hidden sm:inline">{isQuickDiacritizing ? 'جاري التشكيل...' : 'تشكيل النص'}</span>
                </button>

                {/* PROMINENT DRAMATIZE PERFORMANCE BUTTON */}
                <button
                  onClick={handleDramatizeClick}
                  disabled={isDramatizing || isGenerating || !text.trim()}
                  className={`
                    flex items-center gap-2 text-xs md:text-sm font-black uppercase border-3 md:border-4 border-bauhaus-black px-3 py-2 md:px-5 md:py-2.5 transition-all
                    focus:outline-none focus:ring-4 focus:ring-bauhaus-yellow
                    ${isDramatizing 
                      ? 'bg-bauhaus-yellow text-bauhaus-black cursor-wait shadow-none animate-pulse' 
                      : 'bg-bauhaus-yellow text-bauhaus-black shadow-hard hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#1A1A1A] active:translate-y-0 active:shadow-none'
                    }
                  `}
                  title="تحويل الأداء الصوتي إلى إلقاء درامي سينمائي مع الحفاظ على النص الأصلي 100% كما كُتب"
                >
                  {isDramatizing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-bauhaus-black rounded-full animate-ping" />
                      <span className="tracking-wider">جارٍ إخراج الأداء الصوتي...</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-lg">🎭</span>
                      <span className="tracking-tight">أداء درامي سينمائي | DRAMATIZE</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* VISUAL DIRECTOR'S BLUEPRINT CARD */}
            {dramaticProfile?.active && (
              <div className="flex-shrink-0 bg-white border-4 border-bauhaus-black p-3 md:p-4 mb-3 shadow-hard transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b-2 border-bauhaus-black pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-bauhaus-red text-white text-[10px] md:text-xs font-black uppercase px-2 py-0.5 tracking-wider">
                      🎬 المخرج الصوتي السينمائي (ACTIVE DIRECTOR BLUEPRINT)
                    </span>
                    <span className="text-xs md:text-sm font-black text-bauhaus-black uppercase">
                      {dramaticProfile.emotion}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase bg-bauhaus-green text-white px-2 py-0.5 border border-bauhaus-black">
                      ✓ النص الأصلي محفوظ 100% حرفياً
                    </span>
                    <button
                      onClick={() => setShowDirectorDetails(!showDirectorDetails)}
                      className="text-[10px] font-bold uppercase underline hover:text-bauhaus-red"
                    >
                      {showDirectorDetails ? 'إخفاء التفاصيل' : 'عرض توجيهات المخرج'}
                    </button>
                  </div>
                </div>

                {/* Director Controls Grid with Dropdowns and Manual Editing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                  
                  {/* 1. STYLE / حالة الأداء */}
                  <div className="bg-gray-50 border-2 border-bauhaus-black p-2 flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] uppercase font-black text-gray-600">STYLE / حالة الأداء</span>
                      <span className="text-[9px] bg-bauhaus-black text-white px-1.5 py-0.2 rounded font-mono uppercase">
                        {dramaticProfile.emotionalStyle}
                      </span>
                    </div>

                    {/* Dropdown Preset Selector */}
                    <div className="space-y-1">
                      <select
                        className="w-full p-1.5 bg-white border-2 border-bauhaus-black font-black uppercase text-[11px] focus:outline-none focus:ring-2 focus:ring-bauhaus-yellow cursor-pointer"
                        value={PRESET_STYLES.some(p => p.value.toLowerCase() === dramaticProfile.emotionalStyle.toLowerCase()) ? dramaticProfile.emotionalStyle.toLowerCase() : '__custom__'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '__custom__') {
                            setDramaticProfile(prev => prev ? ({ ...prev, emotionalStyle: val }) : null);
                            setEmotionSettings(prev => ({ ...prev, emotionalStyle: val }));
                            setVoiceSettings(prev => ({ ...prev, style: val }));
                            setDownloadData(null);
                          }
                        }}
                      >
                        <option disabled value="">-- اختر قالباً / Select Preset --</option>
                        {PRESET_STYLES.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                        <option value="__custom__">✎ مخصص / Custom Text</option>
                      </select>

                      {/* Manual Custom Input */}
                      <input
                        type="text"
                        placeholder="أو اكتب الأسلوب يدوياً..."
                        className="w-full px-2 py-1 bg-white border border-gray-400 font-bold text-xs uppercase focus:border-bauhaus-black focus:outline-none"
                        value={dramaticProfile.emotionalStyle}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDramaticProfile(prev => prev ? ({ ...prev, emotionalStyle: val }) : null);
                          setEmotionSettings(prev => ({ ...prev, emotionalStyle: val }));
                          setVoiceSettings(prev => ({ ...prev, style: val }));
                          setDownloadData(null);
                        }}
                      />
                    </div>
                  </div>

                  {/* 2. TONE / نبرة الصوت */}
                  <div className="bg-gray-50 border-2 border-bauhaus-black p-2 flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] uppercase font-black text-gray-600">TONE / نبرة الصوت</span>
                      <span className="text-[9px] bg-bauhaus-black text-white px-1.5 py-0.2 rounded font-mono uppercase">
                        {dramaticProfile.tone}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <select
                        className="w-full p-1.5 bg-white border-2 border-bauhaus-black font-black uppercase text-[11px] focus:outline-none focus:ring-2 focus:ring-bauhaus-yellow cursor-pointer"
                        value={PRESET_TONES.some(p => p.value.toLowerCase() === dramaticProfile.tone.toLowerCase()) ? dramaticProfile.tone.toLowerCase() : '__custom__'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '__custom__') {
                            setDramaticProfile(prev => prev ? ({ ...prev, tone: val }) : null);
                            setVoiceSettings(prev => ({ ...prev, tone: val }));
                            setDownloadData(null);
                          }
                        }}
                      >
                        <option disabled value="">-- اختر نبرة / Select Tone --</option>
                        {PRESET_TONES.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                        <option value="__custom__">✎ مخصص / Custom Tone</option>
                      </select>

                      <input
                        type="text"
                        placeholder="أو اكتب النبرة يدوياً..."
                        className="w-full px-2 py-1 bg-white border border-gray-400 font-bold text-xs uppercase focus:border-bauhaus-black focus:outline-none"
                        value={dramaticProfile.tone}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDramaticProfile(prev => prev ? ({ ...prev, tone: val }) : null);
                          setVoiceSettings(prev => ({ ...prev, tone: val }));
                          setDownloadData(null);
                        }}
                      />
                    </div>
                  </div>

                  {/* 3. INTENSITY / قوة الأداء */}
                  <div className="bg-gray-50 border-2 border-bauhaus-black p-2 flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] uppercase font-black text-gray-600">INTENSITY / قوة الأداء</span>
                      <span className="text-[9px] bg-bauhaus-red text-white px-1.5 py-0.2 rounded font-mono font-bold">
                        {dramaticProfile.intensity}%
                      </span>
                    </div>

                    <div className="space-y-1">
                      <select
                        className="w-full p-1.5 bg-white border-2 border-bauhaus-black font-black uppercase text-[11px] focus:outline-none focus:ring-2 focus:ring-bauhaus-yellow cursor-pointer"
                        value={dramaticProfile.intensity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setDramaticProfile(prev => prev ? ({ ...prev, intensity: val }) : null);
                          setVoiceSettings(prev => ({ ...prev, intensity: val }));
                          setDownloadData(null);
                        }}
                      >
                        {PRESET_INTENSITIES.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="range"
                          min="30"
                          max="100"
                          step="1"
                          className="flex-1 accent-bauhaus-red cursor-pointer h-2 bg-gray-200 border border-bauhaus-black rounded"
                          value={dramaticProfile.intensity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setDramaticProfile(prev => prev ? ({ ...prev, intensity: val }) : null);
                            setVoiceSettings(prev => ({ ...prev, intensity: val }));
                            setDownloadData(null);
                          }}
                        />
                        <span className="font-mono font-bold text-xs w-9 text-right">{dramaticProfile.intensity}%</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. CADENCE / سرعة الإلقاء */}
                  <div className="bg-gray-50 border-2 border-bauhaus-black p-2 flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] uppercase font-black text-gray-600">CADENCE / سرعة الإلقاء</span>
                      <span className="text-[9px] bg-bauhaus-blue text-white px-1.5 py-0.2 rounded font-mono font-bold">
                        {dramaticProfile.speed}x
                      </span>
                    </div>

                    <div className="space-y-1">
                      <select
                        className="w-full p-1.5 bg-white border-2 border-bauhaus-black font-black uppercase text-[11px] focus:outline-none focus:ring-2 focus:ring-bauhaus-yellow cursor-pointer"
                        value={dramaticProfile.speed}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setDramaticProfile(prev => prev ? ({ ...prev, speed: val }) : null);
                          setVoiceSettings(prev => ({ ...prev, speed: val }));
                          setDownloadData(null);
                        }}
                      >
                        {PRESET_CADENCES.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="range"
                          min="0.70"
                          max="1.30"
                          step="0.05"
                          className="flex-1 accent-bauhaus-blue cursor-pointer h-2 bg-gray-200 border border-bauhaus-black rounded"
                          value={dramaticProfile.speed}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setDramaticProfile(prev => prev ? ({ ...prev, speed: val }) : null);
                            setVoiceSettings(prev => ({ ...prev, speed: val }));
                            setDownloadData(null);
                          }}
                        />
                        <span className="font-mono font-bold text-xs w-9 text-right text-bauhaus-blue">{dramaticProfile.speed}x</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Summary Arc & Apply Button */}
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-yellow-50 border-2 border-bauhaus-yellow p-2.5">
                  <p className="text-xs font-bold text-gray-800 flex-1">
                    <span className="text-bauhaus-black font-black">الخطة الصوتية: </span>
                    {dramaticProfile.summary}
                  </p>
                  
                  {/* Re-generate audio with modified parameters button */}
                  <button
                    onClick={() => {
                      if (!dramaticProfile) return;
                      generateAndPlayAudio({
                        textToSpeak: text,
                        voiceToUse: selectedVoice,
                        stylePrompt: dramaticProfile.directorNotes,
                        vSettings: {
                          ...voiceSettings,
                          intensity: dramaticProfile.intensity,
                          speed: dramaticProfile.speed,
                          tone: dramaticProfile.tone,
                          style: dramaticProfile.emotionalStyle,
                        },
                        eSettings: {
                          ...emotionSettings,
                          emotionalStyle: dramaticProfile.emotionalStyle,
                        },
                        allowPreloaded: false,
                      });
                    }}
                    disabled={isGenerating || isDramatizing}
                    className="flex-shrink-0 px-3 py-1.5 bg-bauhaus-black text-white font-black text-xs uppercase hover:bg-bauhaus-red transition-all shadow-hard-sm"
                  >
                    تطبيق وتشغيل بالتعديلات الجديدة ⚡
                  </button>
                </div>

                {/* Detailed Silent Director Notes */}
                {showDirectorDetails && (
                  <div className="mt-2 p-2 bg-gray-100 border-2 border-bauhaus-black text-xs font-mono text-gray-800">
                    <div className="font-bold uppercase text-[10px] text-gray-500 mb-1">
                      توجيهات التنفس والوقفات الصامتة (Silent Performance Metadata):
                    </div>
                    <textarea
                      rows={2}
                      className="w-full p-2 bg-white border border-gray-400 font-mono text-xs text-gray-900 focus:outline-none focus:border-bauhaus-black"
                      value={dramaticProfile.directorNotes}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDramaticProfile(prev => prev ? ({ ...prev, directorNotes: val }) : null);
                        setDownloadData(null);
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Quick Command Tags Bar */}
            <CommandTagsBar 
              onInsertTag={handleInsertTag} 
              disabled={isGenerating || isDramatizing}
              onOpenGuide={() => setIsDeliveryGuideOpen(true)}
            />

            {/* Prominent Live Script Cost & Stats Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#fef9c3] border-2 border-bauhaus-black mb-2 text-xs font-bold text-bauhaus-black shadow-sm" dir="rtl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base">📊</span>
                <span className="font-black text-black">عداد الاستهلاك المالي التقديري (الصفحة الأولى):</span>
                <span className="font-mono font-black text-amber-900 bg-white px-2 py-0.5 border border-black shadow-xs">
                  💰 المصروف: ${usageStats.totalCostUSD >= 1 ? usageStats.totalCostUSD.toFixed(2) : usageStats.totalCostUSD.toFixed(4)} / ${(usageStats.budgetUSD || 4.0).toFixed(2)}
                </span>
                <span className="font-mono text-gray-800 bg-white px-1.5 py-0.5 border border-gray-400">
                  🎯 {usageStats.requestCount} طلب صوتي
                </span>
                <span className="font-mono text-gray-800 bg-white px-1.5 py-0.5 border border-gray-400">
                  ⏱️ {usageStats.totalSeconds.toFixed(1)} ثانية
                </span>
                <span className="font-mono text-emerald-800 bg-white px-1.5 py-0.5 border border-gray-400">
                  🪙 {usageStats.totalTokens.toLocaleString()} توكن
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsSpendHistoryOpen(true)}
                  className="px-2 py-0.5 bg-bauhaus-yellow hover:bg-yellow-400 text-black border border-black font-black text-[11px] rounded cursor-pointer transition-all shadow-xs"
                  title="تعديل رقم المصروف بالدولار أو سقف الميزانية"
                >
                  ✏️ ضبط الاستهلاك
                </button>
                <button
                  type="button"
                  onClick={handleResetUsageStats}
                  className="px-2 py-0.5 bg-gray-200 hover:bg-red-600 hover:text-white text-gray-800 border border-black font-bold text-[11px] rounded cursor-pointer transition-all"
                  title="تصفير العداد لبدء دورة جديدة"
                >
                  🔄 تصفير
                </button>
                <button
                  type="button"
                  onClick={() => setIsSpendHistoryOpen(true)}
                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white border border-black font-bold text-[11px] rounded cursor-pointer transition-all shadow-xs"
                  title="عرض سجل الطلبات وتصدير CSV أو JSON"
                >
                  📜 السجل والتصدير
                </button>
                <button
                  type="button"
                  onClick={() => openConfig('SETTINGS')}
                  className="px-2.5 py-0.5 bg-bauhaus-black text-white hover:bg-bauhaus-red border border-black font-black text-[11px] uppercase transition-all shadow-xs cursor-pointer flex items-center gap-1"
                  title="فتح نافذة الإعدادات والتحكم (Configuration System)"
                >
                  <span>⚙️</span>
                  <span>Configuration</span>
                </button>
              </div>
            </div>

            {/* Script Textarea Editor */}
            <div className="relative flex-1 min-h-[140px] shadow-hard bg-white border-4 border-bauhaus-black transition-all mb-2 flex flex-col">
              <div className="flex justify-between items-center px-4 py-2 border-b-2 border-gray-200 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                <span>Original Voice-Over Script / نص التعليق الصوتي الأصلي</span>
                <span>{isArabic ? 'اللغة العربية (RTL)' : 'LTR'}</span>
              </div>
              <textarea 
                ref={textareaRef}
                dir={isArabic ? 'rtl' : 'ltr'}
                className="w-full flex-1 resize-none p-4 md:p-6 text-lg md:text-2xl font-bold bg-transparent outline-none placeholder-gray-300 leading-relaxed focus:bg-gray-50"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setDownloadData(null);
                }}
                placeholder="اكتب أو الصق نص التعليق الصوتي هنا..."
              />
              <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-t-2 border-gray-200 text-[10px] md:text-xs font-bold">
                <span className="text-gray-500">
                  {isArabic ? 'سيتم نطق هذا النص بالكامل 100% دون تغيير أي كلمة' : 'Script will be spoken 100% verbatim'}
                </span>
                <span className="bg-bauhaus-black text-white px-2 py-0.5">
                  {text.length} CHARS
                </span>
              </div>
            </div>
            
            {/* Error Message Alert */}
            {error && (
              <div className="flex-shrink-0 mt-2 p-3 bg-bauhaus-red text-white font-bold border-4 border-bauhaus-black flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex-1 text-xs md:text-sm">خطأ: {error}</div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => openConfig('API')}
                    className="px-3 py-1 bg-bauhaus-yellow text-bauhaus-black border-2 border-bauhaus-black text-xs uppercase font-black"
                  >
                    مفتاح API
                  </button>
                  <button 
                    onClick={() => {
                      setError(null);
                      handlePlay();
                    }}
                    disabled={retryCooldown > 0}
                    className="px-3 py-1 bg-white text-bauhaus-black border-2 border-bauhaus-black text-xs uppercase font-black"
                  >
                    {retryCooldown > 0 ? `إعادة بعد ${retryCooldown}ث` : 'إعادة المحاولة'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar & Master Audio Controls */}
        <div className="flex-shrink-0 border-t-4 border-bauhaus-black bg-white p-3 md:p-6 z-20">
          
          {/* Real-time Playback Progress Bar */}
          {isPlaying && (
            <div className="w-full mb-3 flex items-center gap-3">
              <span className="text-[10px] font-mono font-bold text-gray-500">PLAYING</span>
              <div className="flex-1 h-3 bg-gray-100 border-2 border-bauhaus-black relative overflow-hidden">
                <div 
                  className="h-full bg-bauhaus-red transition-all duration-100" 
                  style={{ width: `${playbackProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-bauhaus-black">
                {Math.round(playbackProgress)}%
              </span>
            </div>
          )}

          <div className="flex items-center justify-between relative gap-2">
            
            {/* Left: Dual Download Audio Buttons (WAV Master & MP3 Compact) */}
            <div className="flex-1 flex flex-wrap items-center justify-start min-w-0 gap-2 pr-2">
              <BauhausButton 
                onClick={handleDownload}
                disabled={!downloadData}
                variant="primary"
                icon={<DownloadIcon className="w-4 h-4 md:w-5 md:h-5" />}
                className="text-xs p-2 md:p-3 whitespace-nowrap focus:outline-none focus:ring-4 focus:ring-bauhaus-black"
                title="تحميل الملف الصوتي الأصلي فائق الجودة بصيغة WAV Master (24kHz Linear PCM)"
              >
                <span>WAV | Master</span>
              </BauhausButton>

              <button
                type="button"
                onClick={handleDownloadMp3}
                disabled={!downloadData || isConvertingMp3}
                className={`
                  flex items-center gap-1.5 px-3 py-2 md:py-2.5 border-2 border-bauhaus-black font-bold uppercase text-xs transition-all shadow-hard-sm cursor-pointer
                  ${isConvertingMp3 ? 'bg-gray-300 text-gray-700 cursor-wait' : 'bg-bauhaus-yellow hover:bg-yellow-400 text-bauhaus-black active:translate-y-0.5'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                title="تحميل نسخة مضغوطة عالية الجودة 192kbps MP3 مناسبة للمشاركة والنشر السريع"
              >
                <span>{isConvertingMp3 ? '⏳' : '📥'}</span>
                <span>{isConvertingMp3 ? 'جارِ التحويل...' : 'MP3 | خفيف'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportSrt('srt')}
                disabled={!downloadData || isTranscribingSrt}
                className={`
                  flex items-center gap-1.5 px-3 py-2 md:py-2.5 border-2 border-bauhaus-black font-bold uppercase text-xs transition-all shadow-hard-sm cursor-pointer
                  ${isTranscribingSrt ? 'bg-gray-300 text-gray-700 cursor-wait' : 'bg-purple-600 hover:bg-purple-500 text-white active:translate-y-0.5'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                title="توليد وتصدير ملف ترجمة متزامن بالمللي ثانية (.srt) عبر Whisper للمونتاج والموشن جرافيك"
              >
                <span>{isTranscribingSrt ? '⏳' : '📜'}</span>
                <span>{isTranscribingSrt ? 'تفريغ...' : 'SRT | ترجمة'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportSrt('json')}
                disabled={!downloadData || isTranscribingSrt}
                className={`
                  hidden lg:flex items-center gap-1.5 px-2.5 py-2 md:py-2.5 border-2 border-bauhaus-black font-bold uppercase text-xs transition-all shadow-hard-sm cursor-pointer
                  ${isTranscribingSrt ? 'bg-gray-300 text-gray-700 cursor-wait' : 'bg-white hover:bg-gray-100 text-black active:translate-y-0.5'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                title="تصدير توقيت كل كلمة بدقة بالغة (.json) لمشاريع Remotion وموشن جرافيك ZHR"
              >
                <span>⚡</span>
                <span>Word JSON</span>
              </button>
            </div>

            {/* Center: Play / Stop Action */}
            <div className="flex flex-col items-center justify-center flex-shrink-0 z-10 group">
              <button 
                onClick={handlePlay}
                disabled={isDramatizing}
                className={`
                  w-14 h-14 md:w-20 md:h-20 rounded-full border-4 border-bauhaus-black flex items-center justify-center transition-all shadow-hard
                  focus:outline-none focus:ring-4 focus:ring-bauhaus-yellow
                  ${(isPlaying || isGenerating) ? 'bg-bauhaus-black hover:bg-gray-800' : 'bg-bauhaus-red hover:bg-red-600 hover:-translate-y-1'}
                `}
                aria-label={isGenerating ? "جاري التوليد" : isPlaying ? "إيقاف الصوت" : "تشغيل الصوت"}
              >
                {isGenerating ? (
                   <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white animate-pulse"></div>
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white animate-pulse delay-75"></div>
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white animate-pulse delay-150"></div>
                  </div>
                ) : isPlaying ? (
                  <div className="w-5 h-5 md:w-7 md:h-7 bg-white"></div>
                ) : (
                  <div className="w-0 h-0 border-t-[8px] md:border-t-[14px] border-t-transparent border-l-[14px] md:border-l-[22px] border-l-white border-b-[8px] md:border-b-[14px] border-b-transparent ml-1"></div>
                )}
              </button>
              
              <div className="mt-2 flex items-center gap-2">
                {isPlaying && <EqualizerBars isPlaying={isPlaying} />}
                <span className="font-black uppercase tracking-wider text-[11px] md:text-sm whitespace-nowrap">
                  {isGenerating ? 'جاري التوليد...' : isPlaying ? 'إيقاف | STOP' : 'تشغيل | PLAY'}
                </span>
              </div>
            </div>

            {/* Right: Active Voice Selector & Configuration System Button */}
            <div className="flex-1 flex flex-col items-end justify-center min-w-0 pl-2">
               <div className="text-[10px] font-bold uppercase text-gray-500 mb-1 whitespace-nowrap">
                 المعلق الصوتي ونظام الإعدادات
               </div>
               <div className="flex items-center gap-2">
                 <button 
                   type="button"
                   onClick={() => openConfig('SETTINGS')}
                   className="text-xs md:text-sm font-black border-2 border-bauhaus-black bg-bauhaus-yellow hover:bg-yellow-400 text-bauhaus-black px-3 py-1.5 shadow-hard-sm transition-all cursor-pointer flex items-center gap-1.5"
                   title="فتح نافذة الإعدادات والتحكم (Configuration System) لضبط السرعة والطبقة والمشاعر"
                 >
                   <span>⚙️</span>
                   <span>Configuration System</span>
                 </button>
                 <button 
                   type="button"
                   className={`
                     text-xs md:text-base font-black border-2 px-2.5 py-1 text-right transition-colors max-w-full truncate shadow-hard-sm
                     focus:outline-none focus:ring-4 focus:ring-bauhaus-yellow
                     ${currentStyle.id === 'custom' 
                       ? 'bg-bauhaus-yellow border-bauhaus-black text-bauhaus-black' 
                       : 'bg-bauhaus-black border-bauhaus-black text-white hover:bg-gray-800'
                     }
                   `}
                   onClick={() => openConfig('VOICE')}
                   title="انقر لتغيير صوت المعلق"
                 >
                   {activeVoiceLabel} 🎙️
                 </button>
               </div>
            </div>

          </div>
        </div>
        </>
        )}

        {/* Mobile Footer in Main Content */}
        <Footer className="md:hidden flex-shrink-0" />

      </div>

      {/* Configuration & Prompt Modals */}
      <ConfigurationModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)}
        selectedVoice={selectedVoice}
        onVoiceChange={handleVoiceChange}
        customApiKey={customApiKey}
        onCustomApiKeyChange={setCustomApiKey}
        useCustomApiKey={useCustomApiKey}
        onUseCustomApiKeyChange={setUseCustomApiKey}
        voiceSettings={voiceSettings}
        onVoiceSettingsChange={setVoiceSettings}
        emotionSettings={emotionSettings}
        onEmotionSettingsChange={setEmotionSettings}
        onAnalyzeEmotion={handleAnalyzeEmotion}
        isAnalyzingEmotion={isAnalyzingEmotion}
        initialTab={configInitialTab}
        isPlatformKeyActive={isPlatformKeyActive}
        apiHealth={apiHealth}
        onRecheckHealth={checkApiHealth}
        onOpenAIStudioExport={() => setIsAIStudioExportOpen(true)}
        defaultVoiceSettings={currentStyle.customVoiceSettings}
      />
      
      <AIStudioExportModal
        isOpen={isAIStudioExportOpen}
        onClose={() => setIsAIStudioExportOpen(false)}
        currentStyle={currentStyle}
      />
      
      <SystemPromptModal
        isOpen={isPromptOpen}
        onClose={() => setIsPromptOpen(false)}
        prompt={promptText}
        isEditable={isCustomMode}
        currentVoice={selectedVoice}
        onSave={(newPrompt, newVoice) => {
            setCustomStylePrompt(newPrompt);
            if (newVoice) handleVoiceChange(newVoice);
            setDownloadData(null);
        }}
      />

      <SavePresetModal
        isOpen={isSavePresetOpen}
        onClose={() => {
          setIsSavePresetOpen(false);
          setEditingPreset(null);
        }}
        onSave={handleSavePreset}
        presetToEdit={editingPreset}
        currentVoice={selectedVoice}
        currentText={text}
        voiceSettings={voiceSettings}
        emotionSettings={emotionSettings}
      />

      {/* Credit & Quota Saving Dramatize Confirmation Modal */}
      <DramatizeConfirmModal
        isOpen={isDramatizeConfirmOpen}
        onClose={() => setIsDramatizeConfirmOpen(false)}
        onConfirmDramatize={executeDramatize}
        onProceedDirect={() => {
          generateAndPlayAudio({
            textToSpeak: text,
            voiceToUse: selectedVoice,
            allowPreloaded: false,
          });
        }}
      />

      {/* Spend Management & Generation Audit History Modal */}
      <SpendHistoryModal
        isOpen={isSpendHistoryOpen}
        onClose={() => setIsSpendHistoryOpen(false)}
        stats={usageStats}
        history={generationHistory}
        onUpdateSpend={handleUpdateSpend}
        onUpdateBudget={handleUpdateBudget}
        onResetStats={handleResetUsageStats}
        onClearHistory={handleClearHistory}
      />

      {/* Delivery & Pacing Tags Reference Guide Modal */}
      <DeliveryTagsGuideModal
        isOpen={isDeliveryGuideOpen}
        onClose={() => setIsDeliveryGuideOpen(false)}
        onInsertTag={handleInsertTag}
        onInsertSnippet={(snippet) => {
          setText(snippet);
          setDownloadData(null);
          setNotification('✓ تم إدراج نموذج السكربت الكامل في المحرر بنجاح!');
          setTimeout(() => setNotification(null), 3500);
        }}
      />

      {/* Changelog & Version Release History Modal */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />
    </div>
  </div>
);
};

export default App;