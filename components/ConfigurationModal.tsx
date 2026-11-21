/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ALL_VOICES } from '../voices';
import { VoiceSettings, EmotionSettings } from '../types';


interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: string;
  onVoiceChange: (voiceName: string) => void;
  customApiKey: string;
  onCustomApiKeyChange: (key: string) => void;
  useCustomApiKey: boolean;
  onUseCustomApiKeyChange: (use: boolean) => void;
  voiceSettings: VoiceSettings;
  onVoiceSettingsChange: (settings: VoiceSettings) => void;
  emotionSettings: EmotionSettings;
  onEmotionSettingsChange: (settings: EmotionSettings) => void;
  onAnalyzeEmotion: () => void;
  isAnalyzingEmotion: boolean;
  initialTab?: 'VOICE' | 'SETTINGS' | 'EMOTION' | 'API';
  isPlatformKeyActive: boolean;
  apiHealth?: 'CONNECTED' | 'DISCONNECTED' | 'CHECKING';
  onRecheckHealth?: () => void;
  onOpenAIStudioExport?: () => void;
  defaultVoiceSettings?: VoiceSettings;
}

export const ConfigurationModal: React.FC<ConfigurationModalProps> = ({
  isOpen,
  onClose,
  selectedVoice,
  onVoiceChange,
  customApiKey,
  onCustomApiKeyChange,
  useCustomApiKey,
  onUseCustomApiKeyChange,
  voiceSettings,
  onVoiceSettingsChange,
  emotionSettings,
  onEmotionSettingsChange,
  onAnalyzeEmotion,
  isAnalyzingEmotion,
  initialTab = 'VOICE',
  isPlatformKeyActive,
  apiHealth = 'CHECKING',
  onRecheckHealth,
  onOpenAIStudioExport,
  defaultVoiceSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'VOICE' | 'SETTINGS' | 'EMOTION' | 'API'>(initialTab);
  const [filterGender, setFilterGender] = useState('ALL');
  const [tempApiKey, setTempApiKey] = useState(customApiKey);
  const [showKey, setShowKey] = useState(false);

  // Local state for pending changes
  const [localVoice, setLocalVoice] = useState(selectedVoice);
  const [localVoiceSettings, setLocalVoiceSettings] = useState(voiceSettings);
  const [localEmotionSettings, setLocalEmotionSettings] = useState(emotionSettings);
  const [previewPlayingVoice, setPreviewPlayingVoice] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const playVoicePreview = (voiceName: string) => {
    if (previewPlayingVoice === voiceName) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPreviewPlayingVoice(null);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    const audio = new Audio(`/api/voices/preview/${encodeURIComponent(voiceName)}`);
    previewAudioRef.current = audio;
    setPreviewPlayingVoice(voiceName);

    audio.onended = () => {
      setPreviewPlayingVoice(null);
      previewAudioRef.current = null;
    };
    audio.onerror = () => {
      setPreviewPlayingVoice(null);
      previewAudioRef.current = null;
    };
    audio.play().catch(() => {
      setPreviewPlayingVoice(null);
      previewAudioRef.current = null;
    });
  };

  useEffect(() => {
    if (!isOpen && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setPreviewPlayingVoice(null);
    }
  }, [isOpen]);

  const prevIsOpenRef = useRef(false);

  // Initialize local state strictly when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setLocalVoice(selectedVoice);
      setLocalVoiceSettings(voiceSettings);
      setLocalEmotionSettings(emotionSettings);
      setTempApiKey(customApiKey);
      setActiveTab(initialTab);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, selectedVoice, voiceSettings, emotionSettings, customApiKey, initialTab]);

  const hasChanges = useMemo(() => {
    return localVoice !== selectedVoice || 
           JSON.stringify(localVoiceSettings) !== JSON.stringify(voiceSettings) ||
           JSON.stringify(localEmotionSettings) !== JSON.stringify(emotionSettings) ||
           tempApiKey !== customApiKey;
  }, [localVoice, selectedVoice, localVoiceSettings, voiceSettings, localEmotionSettings, emotionSettings, tempApiKey, customApiKey]);

  const handleSelectVoice = (voiceName: string) => {
    setLocalVoice(voiceName);
    const vData = ALL_VOICES.find(v => v.name.toLowerCase() === voiceName.toLowerCase());
    setLocalVoiceSettings(prev => {
      let nextTone = prev.tone;
      if (vData && vData.ssmlGender === 'FEMALE') {
        if (nextTone === 'deep' || nextTone === 'gravelly') {
          nextTone = 'warm';
        }
      }
      return { ...prev, pitch: 0, tone: nextTone };
    });
  };

  const handleApply = () => {
    if (localVoice !== selectedVoice) onVoiceChange(localVoice);
    onVoiceSettingsChange(localVoiceSettings);
    onEmotionSettingsChange(localEmotionSettings);
    if (tempApiKey !== customApiKey) onCustomApiKeyChange(tempApiKey);
  };

  const [isSavingKey, setIsSavingKey] = useState(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  const handleSaveApiKey = async () => {
    if (!tempApiKey || !tempApiKey.trim()) {
      alert("يرجى إدخال مفتاح Gemini API أولاً.");
      return;
    }
    const cleanKey = tempApiKey.trim();
    setIsSavingKey(true);
    setSaveStatusMessage(null);
    try {
      const res = await fetch('/api/gemini/set-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        onCustomApiKeyChange(cleanKey);
        onUseCustomApiKeyChange(true);
        localStorage.setItem('synergy_custom_api_key', cleanKey);
        localStorage.setItem('synergy_use_custom_api_key', 'true');
        setSaveStatusMessage("✅ تم التحقق من مفتاح الـ API وتفعيله بنجاح! اللمبة الآن خضراء 🟢");
        if (onRecheckHealth) onRecheckHealth();
      } else {
        alert(`❌ فشل تفعيل المفتاح: ${data.error || 'يرجى التأكد من صلاحية المفتاح والاتصال.'}`);
      }
    } catch (err: any) {
      alert(`❌ خطأ في الاتصال بالخادم: ${err.message}`);
    } finally {
      setIsSavingKey(false);
    }
  };

  const updateVoiceSetting = (key: keyof VoiceSettings, value: any) => {
    setLocalVoiceSettings({ ...localVoiceSettings, [key]: value });
  };

  const updateEmotionSetting = (key: keyof EmotionSettings, value: any) => {
    setLocalEmotionSettings({ ...localEmotionSettings, [key]: value });
  };

  // Filter voices
  const filteredVoices = useMemo(() => {
    return ALL_VOICES.filter(voice => {
      const matchGender = filterGender === 'ALL' || voice.ssmlGender === filterGender;
      return matchGender;
    });
  }, [filterGender]);

  // Focus Management
  useEffect(() => {
    if (!isOpen) return;
    const modalElement = document.getElementById('config-modal');
    if (modalElement) {
        const focusableElements = modalElement.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
            (focusableElements[0] as HTMLElement).focus();
        }
    }
  }, [isOpen]);

  // Keyboard Event Trap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bauhaus-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="config-modal-title"
    >
      <div 
        id="config-modal"
        className="relative w-full max-w-5xl max-h-[95vh] flex flex-col bg-bauhaus-white border-4 border-bauhaus-black shadow-hard"
      >
        {/* Header */}
        <div className="bg-bauhaus-yellow border-b-4 border-bauhaus-black p-4 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 id="config-modal-title" className="text-xl md:text-2xl font-bold uppercase flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">⚙</span> Configuration System
            </h2>
            {hasChanges && (
              <button 
                onClick={handleApply}
                className="bg-bauhaus-red text-white px-4 py-1 font-bold uppercase text-xs md:text-sm border-2 border-bauhaus-black shadow-hard-sm hover:-translate-y-0.5 active:translate-y-0 transition-all animate-bounce"
              >
                Apply Changes
              </button>
            )}
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-white border-4 border-black hover:bg-black hover:text-white transition-colors text-xl font-bold focus:outline-none focus:ring-4 focus:ring-bauhaus-red"
            aria-label="Close configuration"
          >
            X
          </button>
        </div>

        {/* Tabs */}
        <div className="flex justify-between items-center border-b-4 border-bauhaus-black bg-white flex-shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex">
            {[
              { id: 'VOICE', label: 'Speaker' },
              { id: 'SETTINGS', label: 'Voice Controls' },
              { id: 'EMOTION', label: 'Emotion' },
              { id: 'API', label: 'API Key' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  px-6 py-3 font-bold uppercase text-sm border-r-4 border-bauhaus-black transition-colors whitespace-nowrap
                  ${activeTab === tab.id ? 'bg-bauhaus-red text-white' : 'bg-white hover:bg-bauhaus-yellow'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {onOpenAIStudioExport && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAIStudioExport();
              }}
              className="mx-4 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase border-2 border-bauhaus-black shadow-hard-sm cursor-pointer flex items-center gap-1.5 transition-transform active:translate-y-0.5"
              title="تصدير لتطبيق Google AI Studio و Project IDX والنسخ الاحتياطي"
            >
              <span>📦</span>
              <span>AI Studio Export & Backup</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto min-h-0 bg-bauhaus-white">
          
          {activeTab === 'VOICE' && (
            <div className="flex flex-col h-full">
              <div className="mb-6">
                <label className="block text-xl font-bold uppercase mb-1">Select Speaker Voice</label>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-4">
                  <div className="flex-1 w-full">
                    <label htmlFor="gender-filter" className="block text-xs font-bold uppercase mb-2">Filter by Gender</label>
                    <select 
                      id="gender-filter"
                      className="w-full p-3 border-4 border-bauhaus-black font-bold bg-white focus:outline-none focus:ring-4 focus:ring-bauhaus-yellow cursor-pointer"
                      value={filterGender}
                      onChange={(e) => setFilterGender(e.target.value)}
                    >
                      <option value="ALL">All Genders / كافة الأصوات</option>
                      <option value="MALE">Male / الأصوات الرجالية</option>
                      <option value="FEMALE">Female / الأصوات النسائية</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 self-stretch md:self-end pb-1">
                    <span className="text-xs font-bold uppercase text-gray-500">الصوت النشط:</span>
                    <span className="px-3 py-1 bg-bauhaus-black text-bauhaus-yellow font-mono font-black text-xs border-2 border-black rounded-xs shadow-xs">
                      {localVoice}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" role="radiogroup" aria-label="Voice Selection">
                {filteredVoices.map((voice) => {
                  const isSelected = localVoice.toLowerCase() === voice.name.toLowerCase();
                  return (
                    <div 
                      key={voice.name}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => handleSelectVoice(voice.name)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectVoice(voice.name);
                        }
                      }}
                      className={`
                        flex items-center justify-between p-3 border-2 border-bauhaus-black cursor-pointer transition-all select-none
                        ${isSelected ? 'bg-bauhaus-black text-white shadow-hard-sm -translate-y-0.5' : 'bg-white hover:bg-bauhaus-yellow hover:text-bauhaus-black'}
                      `}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-5 h-5 flex-shrink-0 border-2 ${isSelected ? 'border-bauhaus-yellow bg-bauhaus-black' : 'border-bauhaus-black bg-white'} rounded-full flex items-center justify-center transition-colors`}>
                          {isSelected && <div className="w-2.5 h-2.5 bg-bauhaus-yellow rounded-full" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`font-bold text-xs truncate ${isSelected ? 'text-bauhaus-yellow' : ''}`}>{voice.name}</span>
                          <span className={`text-[10px] uppercase ${isSelected ? 'text-gray-300' : 'opacity-70'}`}>
                            {voice.ssmlGender} • {voice.style}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            playVoicePreview(voice.name);
                          }}
                          className={`px-2 py-1 text-[10px] font-black border-2 border-current rounded transition-all flex items-center gap-1 cursor-pointer shadow-xs active:translate-y-0.5 ${
                            previewPlayingVoice === voice.name
                              ? 'bg-red-500 text-white border-red-700 animate-pulse'
                              : 'bg-white text-black hover:bg-yellow-300'
                          }`}
                          title="استماع فوري مجاني لنبرة هذا الصوت بدون استهلاك توكنات"
                        >
                          <span>{previewPlayingVoice === voice.name ? '⏹' : '▶'}</span>
                          <span className="text-[9px] uppercase">{previewPlayingVoice === voice.name ? 'إيقاف' : 'معاينة'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'SETTINGS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-4 border-bauhaus-black pb-3 bg-white p-4 shadow-sm">
                <div>
                  <h3 className="text-lg md:text-xl font-black uppercase text-bauhaus-black">
                    🎛️ Voice Controls & Tuning / لوحة التحكم بالصوت
                  </h3>
                  <p className="text-xs font-bold text-gray-500 uppercase mt-0.5">
                    التحكم بسرعة الإلقاء، طبقة الصوت، والنبرة التعبيرية
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const fallback = defaultVoiceSettings || {
                      pitch: 0,
                      speed: 1.0,
                      intensity: 50,
                      style: 'natural',
                      tone: 'warm',
                      purpose: 'cinematic narration',
                      dialect: 'General American',
                    };
                    setLocalVoiceSettings({ ...fallback });
                  }}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-bauhaus-yellow border-2 border-bauhaus-black text-xs font-black uppercase tracking-wide transition-all shadow-sm active:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
                  title="إرجاع كافة السلايدرات إلى القيم الافتراضية الثابتة"
                >
                  <span>↺</span>
                  <span>Reset to Defaults / استعادة الافتراضي</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Voice Adjustment */}
                <div className="space-y-6">
                  <h4 className="text-sm font-black uppercase tracking-wider text-bauhaus-red border-b-2 border-gray-300 pb-1">
                    ضبط النبرة والسرعة (Tone & Speed)
                  </h4>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-bold uppercase flex items-center gap-1.5">
                        <span>Pitch (Tone) / طبقة الصوت</span>
                        <span className="text-[10px] text-gray-500 font-bold">(الافتراضي: 0)</span>
                      </label>
                      <span className="text-xs font-mono bg-bauhaus-black text-white px-2 py-0.5">{localVoiceSettings.pitch}</span>
                    </div>
                    <input 
                      type="range" min="-20" max="20" step="1"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-bauhaus-red"
                      value={localVoiceSettings.pitch}
                      onChange={(e) => updateVoiceSetting('pitch', parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-bold uppercase flex items-center gap-1.5">
                        <span>Speaking Speed / سرعة الإلقاء</span>
                        <span className="text-[10px] text-gray-500 font-bold">(الافتراضي: 1.00x)</span>
                      </label>
                      <span className="text-xs font-mono bg-bauhaus-black text-white px-2 py-0.5">{localVoiceSettings.speed}x</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="2.0" step="0.05"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-bauhaus-blue"
                      value={localVoiceSettings.speed}
                      onChange={(e) => updateVoiceSetting('speed', parseFloat(e.target.value))}
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase mt-1">
                      <span>0.5x (بطيء جداً)</span>
                      <span>1.0x (طبيعي متزن)</span>
                      <span>2.0x (سريع جداً)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        { val: 0.70, label: '0.70x (بطيء درامي)' },
                        { val: 0.85, label: '0.85x (تأني ملحمي)' },
                        { val: 1.00, label: '1.00x (طبيعي - افتراضي)' },
                        { val: 1.15, label: '1.15x (حماسي)' },
                        { val: 1.30, label: '1.30x (إعلان خاطف)' },
                      ].map(p => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => updateVoiceSetting('speed', p.val)}
                          className={`px-2 py-0.5 text-[10px] font-bold border transition-all cursor-pointer ${
                            Math.abs(localVoiceSettings.speed - p.val) < 0.02
                              ? 'bg-bauhaus-blue text-white border-bauhaus-black shadow-sm'
                              : 'bg-white hover:bg-gray-100 border-gray-400 text-gray-800'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-bold uppercase flex items-center gap-1.5">
                        <span>Intensity / الشدة والحماس</span>
                        <span className="text-[10px] text-gray-500 font-bold">(الافتراضي: 50%)</span>
                      </label>
                      <span className="text-xs font-mono bg-bauhaus-black text-white px-2 py-0.5">{localVoiceSettings.intensity}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" step="1"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-bauhaus-green"
                      value={localVoiceSettings.intensity}
                      onChange={(e) => updateVoiceSetting('intensity', parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold uppercase mb-2 flex items-center justify-between">
                      <span>Overall Voice Style / النمط العام</span>
                      <span className="text-[10px] text-gray-500 font-bold">(الافتراضي: Natural)</span>
                    </label>
                    <select 
                      className="w-full p-3 border-4 border-bauhaus-black font-bold bg-white"
                      value={localVoiceSettings.style}
                      onChange={(e) => updateVoiceSetting('style', e.target.value)}
                    >
                      <option value="natural">Natural (طبيعي بشري)</option>
                      <option value="cinematic">Cinematic (سينمائي ملحمي)</option>
                      <option value="dramatic">Dramatic (درامي معبّر)</option>
                      <option value="documentary">Documentary (وثائقي رزين)</option>
                      <option value="newscast">Newscast (إخباري واضح)</option>
                    </select>
                  </div>
                </div>

                {/* Delivery Customization */}
                <div className="space-y-6">
                  <h4 className="text-sm font-black uppercase tracking-wider text-bauhaus-blue border-b-2 border-gray-300 pb-1">
                    خصائص الأداء والهدف (Tone & Purpose)
                  </h4>
                  
                  <div>
                    <label className="block text-sm font-bold uppercase mb-2 flex items-center justify-between">
                      <span>Voice Tone / نبرة الصوت</span>
                      <span className="text-[10px] text-gray-500 font-bold">(الافتراضي: Warm)</span>
                    </label>
                    <select 
                      className="w-full p-3 border-4 border-bauhaus-black font-bold bg-white"
                      value={localVoiceSettings.tone}
                      onChange={(e) => updateVoiceSetting('tone', e.target.value)}
                    >
                      <option value="warm">Warm (دافئ وإنساني)</option>
                      <option value="deep">Deep (رخيم وعميق)</option>
                      <option value="sharp">Sharp (حاسم وحاد)</option>
                      <option value="youthful">Youthful (شبابي حيوي)</option>
                      <option value="mature">Mature (ناضج ووقور)</option>
                      <option value="authoritative">Authoritative (سلطوي وموثوق)</option>
                    </select>
                  </div>

                <div>
                  <label className="block text-sm font-bold uppercase mb-2">Dialect / Accent</label>
                  <input 
                    type="text"
                    className="w-full p-3 border-4 border-bauhaus-black font-bold bg-white"
                    placeholder="e.g., British, Southern, Egyptian Arabic..."
                    value={localVoiceSettings.dialect}
                    onChange={(e) => updateVoiceSetting('dialect', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase mb-2">Final Purpose</label>
                  <select 
                    className="w-full p-3 border-4 border-bauhaus-black font-bold bg-white"
                    value={localVoiceSettings.purpose}
                    onChange={(e) => updateVoiceSetting('purpose', e.target.value)}
                  >
                    <option value="storytelling">Storytelling</option>
                    <option value="advertisement">Advertisement</option>
                    <option value="social media">Social Media Content</option>
                    <option value="cinematic narration">Cinematic Narration</option>
                    <option value="podcast">Podcast</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

          {activeTab === 'EMOTION' && (
            <div className="space-y-8">
              <div className="bg-white border-4 border-bauhaus-black p-6 shadow-hard-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold uppercase">Emotion & Expression System</h3>
                    <p className="text-xs font-bold text-gray-500 uppercase mt-1">Intelligently apply emotions to the voice performance</p>
                  </div>
                  <button 
                    onClick={onAnalyzeEmotion}
                    disabled={isAnalyzingEmotion}
                    className={`
                      px-6 py-3 font-bold uppercase text-sm border-4 border-bauhaus-black shadow-hard-sm transition-all
                      ${isAnalyzingEmotion ? 'bg-gray-200 cursor-wait' : 'bg-bauhaus-yellow hover:-translate-y-1 hover:shadow-hard'}
                    `}
                  >
                    {isAnalyzingEmotion ? 'Analyzing...' : '✨ Auto-Analyze Text'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-bold uppercase mb-2">Detected / Manual Emotion</label>
                    <input 
                      type="text"
                      className="w-full p-3 border-4 border-bauhaus-black font-bold bg-white"
                      placeholder="e.g., Excited, Somber, Urgent..."
                      value={localEmotionSettings.manualEmotion || ''}
                      onChange={(e) => updateEmotionSetting('manualEmotion', e.target.value)}
                    />
                    <p className="text-[10px] font-bold uppercase text-gray-400 mt-2">You can manually override the detected emotion here.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold uppercase mb-2">Emotional Style</label>
                    <select 
                      className="w-full p-3 border-4 border-bauhaus-black font-bold bg-white"
                      value={localEmotionSettings.emotionalStyle}
                      onChange={(e) => updateEmotionSetting('emotionalStyle', e.target.value)}
                    >
                      <option value="natural">Natural</option>
                      <option value="dramatic">Dramatic</option>
                      <option value="calm">Calm</option>
                      <option value="intense">Intense</option>
                      <option value="cinematic">Cinematic</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'API' && (
            <div className="space-y-6">
              <div className="bg-white border-4 border-bauhaus-black p-6 shadow-hard-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold uppercase">Gemini API Integration</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase">{useCustomApiKey ? 'Active' : 'Inactive'}</span>
                    <button 
                      onClick={() => onUseCustomApiKeyChange(!useCustomApiKey)}
                      className={`w-14 h-7 border-4 border-bauhaus-black relative transition-colors ${useCustomApiKey ? 'bg-bauhaus-green' : 'bg-gray-300'}`}
                      title="Toggle between default and custom Gemini API key"
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white border-2 border-bauhaus-black transition-all ${useCustomApiKey ? 'left-7' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Live API Health & Connection Indicator */}
                  <div className={`p-4 border-4 border-bauhaus-black flex flex-col md:flex-row items-center justify-between gap-3 ${
                    apiHealth === 'CONNECTED' ? 'bg-emerald-50 border-emerald-800' : apiHealth === 'DISCONNECTED' ? 'bg-red-50 border-red-800' : 'bg-yellow-50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-4 w-4 items-center justify-center">
                        {apiHealth === 'CONNECTED' ? (
                          <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-[0_0_10px_#10b981] border border-white"></span>
                          </>
                        ) : apiHealth === 'DISCONNECTED' ? (
                          <>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600 shadow-[0_0_10px_#ef4444] border border-white"></span>
                          </>
                        ) : (
                          <>
                            <span className="animate-pulse relative inline-flex rounded-full h-3.5 w-3.5 bg-yellow-500 border border-white"></span>
                          </>
                        )}
                      </div>
                      <div>
                        <div className="font-black text-xs uppercase tracking-wider">
                          حالة اتصال الـ API: {
                            apiHealth === 'CONNECTED' ? '🟢 متصل وشغال (CONNECTED)' : 
                            apiHealth === 'DISCONNECTED' ? '🔴 غير مربوط / مفصول (DISCONNECTED)' : 
                            '🟡 جاري الفحص (CHECKING...)'
                          }
                        </div>
                        <div className="text-[11px] text-gray-600 font-bold">
                          {apiHealth === 'CONNECTED' 
                            ? 'تم التحقق من ربط Gemini API بنجاح، يمكنك توليد التعليق الصوتي بكامل الميزات.'
                            : apiHealth === 'DISCONNECTED'
                              ? 'الـ API غير مربوط أو تجاوز سقف الاستهلاك الشهري (Spend Cap 429). يعمل النظام حالياً بنمط الاستوديو الاحتياطي المجاني 24kHz.'
                              : 'جاري فحص الاتصال بالخادم ونموذج Gemini 2.5 Flash TTS...'
                          }
                        </div>
                      </div>
                    </div>
                    {onRecheckHealth && (
                      <button 
                        type="button"
                        onClick={onRecheckHealth}
                        className="px-3 py-1.5 bg-bauhaus-black text-white text-[10px] font-bold uppercase hover:bg-bauhaus-blue transition-all whitespace-nowrap shadow-sm cursor-pointer"
                      >
                        🔄 إعادة فحص الاتصال
                      </button>
                    )}
                  </div>

                  {/* Spending Cap & Quota Guidance Card */}
                  <div className="p-4 bg-amber-50 border-4 border-amber-600 space-y-3" dir="rtl">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚠️</span>
                      <h4 className="font-black text-sm uppercase text-amber-950">
                        إدارة سقف المصروفات الشهري لـ Google Gemini (Spending Cap 429)
                      </h4>
                    </div>
                    <p className="text-xs text-amber-900 font-bold leading-relaxed">
                      عند ظهور خطأ 429، فهذا يعني أن مشروعك في Google Cloud وصل لسقف المصروفات الشهري ($0.00 الافتراضي).
                      يمكنك رفعه فورياً ليعمل صوت Gemini السينمائي، أو إنشاء مفتاح جديد لمشروع آخر:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <a
                        href="https://ai.studio/spend"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase border-2 border-black shadow-hard-sm transition-all cursor-pointer"
                      >
                        إدارة ورفع سقف المصروفات في Google AI Studio ↗
                      </a>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-white hover:bg-gray-100 text-black font-black text-xs uppercase border-2 border-black shadow-hard-sm transition-all cursor-pointer"
                      >
                        إنشاء مفتاح مجاني جديد ↗
                      </a>
                    </div>
                  </div>

                  {/* Direct API Key Setup & Connection */}
                  <div className="bg-white border-4 border-bauhaus-black p-5 shadow-hard-sm space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-gray-200 pb-2">
                      <h4 className="font-black uppercase text-sm text-bauhaus-black flex items-center gap-2">
                        🔑 ربط وتفعيل مفتاح Gemini API مباشرة
                      </h4>
                      <span className="text-[10px] font-mono bg-bauhaus-yellow px-2 py-0.5 border border-bauhaus-black font-bold">
                        Flash-Lite Ready
                      </span>
                    </div>

                    <p className="text-xs text-gray-700 font-bold leading-relaxed" dir="rtl">
                      ألصق مفتاح Gemini API الخاص بك هنا لتفعيله فورياً. سيتم حفظ المفتاح محلياً وتحديث الخادم واللمبة الخضراء 🟢 تلقائياً.
                    </p>

                    <div className="relative">
                      <label 
                        htmlFor="api-key-input"
                        className="block text-xs font-bold uppercase mb-1 text-gray-800"
                      >
                        Gemini API Key (يبدأ بـ AIza...)
                      </label>
                      <input 
                        id="api-key-input"
                        type={showKey ? "text" : "password"}
                        className="w-full p-3.5 border-4 border-bauhaus-black font-mono text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-bauhaus-yellow"
                        placeholder="AIzaSy..."
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        autoComplete="off"
                        spellCheck="false"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-[34px] px-2 py-1 text-[10px] font-bold uppercase bg-gray-200 hover:bg-gray-300 border border-black cursor-pointer"
                      >
                        {showKey ? 'إخفاء' : 'إظهار'}
                      </button>
                    </div>

                    {saveStatusMessage && (
                      <div className="p-3 bg-emerald-100 border-2 border-emerald-500 text-emerald-950 text-xs font-bold" dir="rtl">
                        {saveStatusMessage}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <div className="text-[11px] text-gray-600 font-bold">
                        ليس لديك مفتاح؟{' '}
                        <a 
                          href="https://aistudio.google.com/app/apikey" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-bauhaus-blue underline hover:text-bauhaus-red"
                        >
                          أنشئ مفتاحاً مجانياً من Google AI Studio ↗
                        </a>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                          type="button"
                          onClick={() => {
                            setTempApiKey('');
                            onCustomApiKeyChange('');
                            localStorage.removeItem('synergy_custom_api_key');
                            setSaveStatusMessage(null);
                          }}
                          className="px-4 py-2.5 bg-white text-bauhaus-black border-2 border-bauhaus-black font-bold uppercase text-xs hover:bg-gray-100 transition-all cursor-pointer"
                        >
                          مسح
                        </button>
                        <button 
                          type="button"
                          disabled={isSavingKey}
                          onClick={handleSaveApiKey}
                          className="px-6 py-2.5 bg-bauhaus-black text-white font-black uppercase text-xs hover:bg-bauhaus-green border-2 border-bauhaus-black transition-all shadow-hard-sm cursor-pointer disabled:opacity-50"
                        >
                          {isSavingKey ? 'جاري الفحص والتفعيل...' : '💾 حفظ وتفعيل المفتاح الآن'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t-4 border-bauhaus-black bg-white flex flex-col sm:flex-row justify-between items-center gap-3 flex-shrink-0">
          <div className="text-xs font-bold uppercase text-gray-500">
            {hasChanges ? '⚠️ توجد تعديلات معلقة لم تُحفظ بعد' : '✓ كافة الإعدادات محدثة وجاهزة'}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button 
              type="button"
              onClick={onClose}
              className="font-bold uppercase text-xs md:text-sm px-4 py-2 border-2 border-transparent hover:underline text-gray-600 hover:text-bauhaus-black cursor-pointer"
            >
              Cancel / إلغاء
            </button>
            <button
              type="button"
              onClick={() => {
                handleApply();
                onClose();
              }}
              className="py-2.5 px-6 bg-bauhaus-black hover:bg-bauhaus-red text-white font-black text-xs md:text-sm uppercase border-2 border-bauhaus-black shadow-hard-sm active:translate-y-0.5 transition-all cursor-pointer"
            >
              💾 Save Configuration / حفظ وتطبيق الإعدادات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
