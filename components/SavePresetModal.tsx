/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { VoiceSettings, EmotionSettings, IntroStyle } from '../types';
import { ALL_VOICES } from '../voices';
import { getIcon, getColorClass } from './BauhausComponents';

interface SavePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preset: IntroStyle, mode?: 'create' | 'update') => void;
  presetToEdit?: IntroStyle | null;
  currentVoice: string;
  currentText: string;
  voiceSettings: VoiceSettings;
  emotionSettings: EmotionSettings;
}

const PRESET_NAME_SUGGESTIONS = [
  'وثائقي فخم',
  'إعلان خاطف وسريع',
  'ريلز حماسي',
  'مراجعة تقنية متزنة',
  'قصة سينمائية مؤثرة',
  'شرح تعليمي هادئ',
  'إثارة وتشويق Movie Trailer',
  'بودكاست عفوي وطبيعي'
];

type PresetColor = 'yellow' | 'red' | 'blue' | 'green' | 'black' | 'white';
type PresetIcon = 'circle' | 'square' | 'triangle' | 'half-circle' | 'rect' | 'plus';

const COLOR_OPTIONS: { id: PresetColor; label: string; hex: string; bgClass: string; textClass: string }[] = [
  { id: 'yellow', label: 'أصفر باوهاوس', hex: '#FBC02D', bgClass: 'bg-bauhaus-yellow', textClass: 'text-bauhaus-black' },
  { id: 'red', label: 'أحمر سينمائي', hex: '#D32F2F', bgClass: 'bg-bauhaus-red', textClass: 'text-white' },
  { id: 'blue', label: 'أزرق احترافي', hex: '#1976D2', bgClass: 'bg-bauhaus-blue', textClass: 'text-white' },
  { id: 'green', label: 'أخضر حيوي', hex: '#388E3C', bgClass: 'bg-bauhaus-green', textClass: 'text-white' },
  { id: 'black', label: 'أسود باوهاوس', hex: '#111111', bgClass: 'bg-bauhaus-black', textClass: 'text-white' },
  { id: 'white', label: 'أبيض ناصع', hex: '#FFFFFF', bgClass: 'bg-bauhaus-white', textClass: 'text-bauhaus-black' },
];

const ICON_OPTIONS: { id: PresetIcon; label: string }[] = [
  { id: 'circle', label: 'دائرة' },
  { id: 'square', label: 'مربع' },
  { id: 'triangle', label: 'مثلث' },
  { id: 'half-circle', label: 'نصف دائرة' },
  { id: 'rect', label: 'مستطيل' },
  { id: 'plus', label: 'علامة زائد' },
];

export const SavePresetModal: React.FC<SavePresetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  presetToEdit,
  currentVoice,
  currentText,
  voiceSettings,
  emotionSettings,
}) => {
  const isEditing = Boolean(presetToEdit);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<PresetColor>('yellow');
  const [icon, setIcon] = useState<PresetIcon>('circle');
  const [templateText, setTemplateText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(currentVoice);
  const [updateVoiceSettings, setUpdateVoiceSettings] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync state whenever modal opens or presetToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (presetToEdit) {
        setName(presetToEdit.name || '');
        setDescription(presetToEdit.description || '');
        setColor((presetToEdit.color as PresetColor) || 'yellow');
        setIcon((presetToEdit.icon as PresetIcon) || 'circle');
        setTemplateText(presetToEdit.templateText || currentText);
        setSelectedVoice(presetToEdit.defaultVoice || currentVoice);
        setUpdateVoiceSettings(true);
      } else {
        setName('');
        setDescription('');
        setColor('yellow');
        setIcon('circle');
        setTemplateText(currentText);
        setSelectedVoice(currentVoice);
        setUpdateVoiceSettings(true);
      }
      setShowAdvanced(false);
    }
  }, [isOpen, presetToEdit, currentVoice, currentText]);

  if (!isOpen) return null;

  const handleSaveSubmit = (mode: 'create' | 'update') => {
    if (!name.trim()) return;

    const baseVoiceSettings = (mode === 'update' && presetToEdit?.customVoiceSettings && !updateVoiceSettings)
      ? presetToEdit.customVoiceSettings
      : { ...voiceSettings };

    const baseEmotionSettings = (mode === 'update' && presetToEdit?.customEmotionSettings && !updateVoiceSettings)
      ? presetToEdit.customEmotionSettings
      : { ...emotionSettings };

    const finalPreset: IntroStyle = {
      id: mode === 'update' && presetToEdit ? presetToEdit.id : `preset_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      description: description.trim() || `بريسيت بصوت ${selectedVoice} ونبرة ${baseVoiceSettings.tone}`,
      defaultVoice: selectedVoice,
      templateText: templateText.trim() || currentText,
      color: color,
      icon: icon,
      isCustom: true,
      customVoiceSettings: baseVoiceSettings,
      customEmotionSettings: baseEmotionSettings,
    };

    onSave(finalPreset, mode);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans select-none overflow-y-auto" 
      dir="rtl"
      style={{ textAlign: 'right' }}
    >
      <div className="bg-white border-4 border-bauhaus-black w-full max-w-2xl shadow-2xl p-6 text-right max-h-[92vh] flex flex-col my-auto">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b-4 border-bauhaus-black pb-3 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{isEditing ? '✏️' : '💾'}</span>
            <div>
              <h2 className="text-lg md:text-xl font-black text-bauhaus-black uppercase tracking-tight">
                {isEditing ? `تعديل البريسيت: ${presetToEdit?.name}` : 'حفظ الإعدادات الحالية كـ بريسيت مخصص'}
              </h2>
              <p className="text-[11px] text-gray-600 font-medium">
                {isEditing 
                  ? 'يمكنك تعديل العنوان، الوصف، نمط اللون، أو حفظ التعديلات كـ بريسيت جديد' 
                  : 'احفظ نبرة الصوت والميكسر واللون والنص لاستخدامها بضغطة زر لاحقاً'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center border-2 border-bauhaus-black bg-gray-100 hover:bg-bauhaus-red hover:text-white font-black text-lg cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="space-y-4 overflow-y-auto flex-1 px-1 custom-scrollbar">
          
          {/* Preset Name Field with Suggestions */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-black uppercase text-bauhaus-black">
                📌 عنوان البريسيت (Preset Title): <span className="text-red-600">*</span>
              </label>
              <span className="text-[10px] text-gray-500 font-bold">{name.length}/50 حرف</span>
            </div>
            <input
              type="text"
              required
              maxLength={50}
              placeholder="مثال: إعلان وثائقي فخم، ريلز حماسي، مراجعة تقنية..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border-2 border-bauhaus-black text-sm font-bold outline-none focus:bg-yellow-50 focus:border-bauhaus-blue transition-colors"
              autoFocus
            />

            {/* Quick Suggestions Pills */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-gray-500 self-center">اقتراحات سريعة:</span>
              {PRESET_NAME_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setName(sug)}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-yellow-100 border border-gray-400 text-[10px] font-bold text-gray-700 rounded-sm cursor-pointer transition-colors"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Description / Director Notes Field */}
          <div>
            <label className="block text-xs font-black uppercase mb-1 text-bauhaus-black">
              📝 الوصف والتوجيهات الإخراجية أو الإضافات (Description & Notes):
            </label>
            <textarea
              rows={2}
              placeholder="اكتب توجيهات الأداء الصوتي، النبرة المطلوبة، أو ملاحظات إخراجية خاصة بهذا البريسيت..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border-2 border-bauhaus-black text-xs font-semibold outline-none focus:bg-yellow-50 focus:border-bauhaus-blue resize-none"
            />
          </div>

          {/* Color Style Picker */}
          <div>
            <label className="block text-xs font-black uppercase mb-1.5 text-bauhaus-black">
              🎨 نمط اللون المميز (Color Style & Theme):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COLOR_OPTIONS.map((c) => {
                const isSelected = color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`flex items-center gap-2.5 p-2 border-2 border-bauhaus-black transition-all cursor-pointer text-right ${
                      isSelected 
                        ? 'ring-2 ring-bauhaus-black ring-offset-2 font-black shadow-hard-xs bg-yellow-50' 
                        : 'bg-white hover:bg-gray-50 font-bold opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div 
                      className="w-5 h-5 rounded-full border-2 border-bauhaus-black flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: c.hex }}
                    >
                      {isSelected && (
                        <span className={`text-[10px] font-black ${c.id === 'white' || c.id === 'yellow' ? 'text-black' : 'text-white'}`}>
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="text-xs truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Geometric Icon Selector */}
          <div>
            <label className="block text-xs font-black uppercase mb-1.5 text-bauhaus-black">
              📐 شكل الأيقونة الهندسي (Bauhaus Geometric Icon):
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {ICON_OPTIONS.map((ico) => {
                const isSelected = icon === ico.id;
                return (
                  <button
                    key={ico.id}
                    type="button"
                    onClick={() => setIcon(ico.id)}
                    className={`flex flex-col items-center justify-center p-2 border-2 border-bauhaus-black transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-bauhaus-black text-white shadow-hard-xs ring-1 ring-black' 
                        : 'bg-white text-bauhaus-black hover:bg-gray-100'
                    }`}
                  >
                    <div className="w-5 h-5 flex items-center justify-center mb-1">
                      {getIcon(ico.id, "w-4 h-4")}
                    </div>
                    <span className="text-[10px] font-bold">{ico.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview Card */}
          <div>
            <label className="block text-xs font-black uppercase mb-1 text-gray-600">
              👁️ معاينة حية لشكل البريسيت في القائمة (Live Preset Preview):
            </label>
            <div className="border-2 border-bauhaus-black bg-gray-50 p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center border-2 border-bauhaus-black ${getColorClass(color, false)} bg-opacity-20`}>
                  <div 
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      backgroundColor: COLOR_OPTIONS.find(c => c.id === color)?.hex || '#FBC02D',
                      color: color === 'white' || color === 'yellow' ? '#111' : '#FFF'
                    }}
                  >
                    {getIcon(icon, "w-5 h-5")}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-sm uppercase text-bauhaus-black truncate">
                    {name.trim() || 'عنوان البريسيت التجريبي'}
                  </div>
                  <div className="text-[11px] text-gray-600 truncate">
                    {description.trim() || `بريسيت مخصص بصوت ${selectedVoice}`}
                  </div>
                  <div className="mt-0.5">
                    <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.2 bg-bauhaus-yellow text-black border border-black rounded-xs uppercase">
                      ⭐ مخصص (PRESET)
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 mr-2">
                <div className="w-6 h-6 flex items-center justify-center rounded-sm bg-bauhaus-yellow text-bauhaus-black font-bold text-xs border border-bauhaus-black">
                  ✏️
                </div>
                <div className="w-6 h-6 flex items-center justify-center rounded-sm bg-red-600 text-white font-bold text-xs border border-bauhaus-black">
                  ✕
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Collapsible Settings */}
          <div className="border-2 border-bauhaus-black bg-gray-50">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-3 py-2 flex justify-between items-center text-xs font-black uppercase text-bauhaus-black hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <span>⚙️</span>
                <span>خيارات متقدمة (الصوت، النص الافتراضي، وإعدادات الميكسر)</span>
              </span>
              <span className="text-sm font-bold">{showAdvanced ? '▲ إخفاء' : '▼ إظهار'}</span>
            </button>

            {showAdvanced && (
              <div className="p-3 border-t-2 border-bauhaus-black space-y-3 bg-white">
                
                {/* Voice Selection */}
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1 text-gray-700">
                    🎙️ الصوت المعتمد للبريسيت (Default Voice):
                  </label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full px-2.5 py-1.5 border-2 border-bauhaus-black text-xs font-bold outline-none bg-white cursor-pointer"
                  >
                    {ALL_VOICES.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.ssmlGender === 'FEMALE' ? 'أنثى 👩' : 'ذكر 👨'} - {v.style})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template Script */}
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1 text-gray-700">
                    📜 نص السكربت الافتراضي لهذا البريسيت:
                  </label>
                  <textarea
                    rows={3}
                    value={templateText}
                    onChange={(e) => setTemplateText(e.target.value)}
                    className="w-full px-2.5 py-1.5 border-2 border-bauhaus-black text-xs font-medium outline-none focus:bg-yellow-50"
                    placeholder="نص التعليق الصوتي الافتراضي..."
                  />
                </div>

                {/* Voice Tuning Summary & Update Checkbox */}
                <div className="p-2.5 bg-yellow-50 border border-bauhaus-black flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black">
                    <span>🎚️ إعدادات الميكسر الحالية:</span>
                    <span className="text-gray-600 font-bold">
                      النبرة: {voiceSettings.pitch} | السرعة: {voiceSettings.speed}x | الشدة: {voiceSettings.intensity}% | الأسلوب: {voiceSettings.style}
                    </span>
                  </div>
                  {isEditing && (
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={updateVoiceSettings}
                        onChange={(e) => setUpdateVoiceSettings(e.target.checked)}
                        className="w-4 h-4 cursor-pointer accent-bauhaus-black"
                      />
                      <span>تحديث الإعدادات الصوتية المرفقة بالقيم الحالية للوحة التحكم</span>
                    </label>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>

        {/* Modal Action Buttons Footer */}
        <div className="pt-4 mt-3 border-t-4 border-bauhaus-black flex flex-col sm:flex-row gap-2.5 flex-shrink-0">
          {isEditing ? (
            <>
              {/* Button: Update In-Place */}
              <button
                type="button"
                onClick={() => handleSaveSubmit('update')}
                disabled={!name.trim()}
                className="flex-1 py-2.5 px-4 bg-bauhaus-yellow hover:bg-yellow-400 border-2 border-bauhaus-black text-bauhaus-black font-black uppercase text-xs md:text-sm shadow-hard-sm cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                title="تحديث هذا البريسيت مع الاحتفاظ به في نفس مكانه"
              >
                <span>💾</span>
                <span>حفظ وتحديث البريسيت الحالي ✓</span>
              </button>

              {/* Button: Save as New Preset / Copy */}
              <button
                type="button"
                onClick={() => handleSaveSubmit('create')}
                disabled={!name.trim()}
                className="flex-1 py-2.5 px-4 bg-bauhaus-blue hover:bg-blue-600 border-2 border-bauhaus-black text-white font-black uppercase text-xs md:text-sm shadow-hard-sm cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                title="إنشاء نسخة جديدة منفصلة وعدم تعديل النسخة السابقة"
              >
                <span>📋</span>
                <span>حفظ كـ نسخة جديدة منفصلة</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleSaveSubmit('create')}
              disabled={!name.trim()}
              className="flex-1 py-2.5 px-4 bg-bauhaus-yellow hover:bg-yellow-400 border-2 border-bauhaus-black text-bauhaus-black font-black uppercase text-sm shadow-hard-sm cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <span>💾</span>
              <span>حفظ البريسيت الآن ✓</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 border-2 border-bauhaus-black text-gray-800 font-bold text-xs md:text-sm cursor-pointer transition-all"
          >
            إلغاء
          </button>
        </div>

      </div>
    </div>
  );
};
