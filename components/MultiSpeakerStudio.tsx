/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { ALL_VOICES } from '../voices';
import {
  generateMultiSpeakerSpeech,
  generateDialogueScript,
  tashkeelArabicScript,
  createWavBlob,
  convertAudioToMp3,
} from '../services/geminiService';
import { BauhausButton, DownloadIcon } from './BauhausComponents';

interface MultiSpeakerStudioProps {
  apiKey?: string;
  model?: string;
  onUsageUpdate?: (tokens: number, cost: number, seconds: number) => void;
}

const PRESET_DIALOGUES = [
  {
    title: '🎙️ بودكاست الذكاء الاصطناعي',
    topic: 'هل سيستبدل الذكاء الاصطناعي كتاب السيناريو والمخرجين في السينما؟',
    speaker1: { name: 'سارة', voice: 'sulafat', personality: 'متحمسة وفضولية جداً' },
    speaker2: { name: 'طارق', voice: 'charon', personality: 'واقعي، متشكك، وعميق النبرة' },
    script: `سارة: طارق، هل تعتقد أن الأفلام القادمة ستُكتب وتُخرج بالكامل بواسطة الذكاء الاصطناعي؟
طارق: مستحيل يا سارة. الذكاء الاصطناعي يعالج الأنماط، لكنه لا يملك الروح الإنسانية ولا يعيش التجربة.
سارة: ولكن انظر إلى قدرته على كتابة حبكات معقدة وتوليد أصوات سينمائية في ثوانٍ معدودة!
طارق: كتابة الحبكة شيء، واللمسة الشعورية التي تبكي المشاهدين في صالات السينما شيء آخر تماماً.
سارة: ربما... ولكن المستقبل يتحرك بسرعة خارقة لا تنتظر المشككين!`,
  },
  {
    title: '⚔️ مناظرة سينمائية حماسية',
    topic: 'من هو أعظم فيلم خيال علمي في تاريخ السينما؟',
    speaker1: { name: 'فارس', voice: 'algenib', personality: 'متحمس وصارم بصوت عميق وجهوري' },
    speaker2: { name: 'منى', voice: 'leda', personality: 'سريعة البديهة ونبرتها واثقة وحادة' },
    script: `فارس: لا جدال في أن فيلم "بين النجوم" إنترستيلار هو قمة السينما العلمية والفلسفية!
منى: على رسلك يا فارس! نسيت فيلم "المصفوفة" الذي أعاد صياغة فهمنا للواقع والبشرية بأكملها؟
فارس: المصفوفة مجرد حركة وأكشن تقني! بينما إنترستيلار يمس أوتار القلب والفيزياء النظرية!
منى: بل المصفوفة ثورة فكرية لم تتكرر حتى يومنا هذا!`,
  },
  {
    title: '🎭 سكتش كوميدي: المشكلة في الكود',
    topic: 'مبرمج مبتدئ يطلب مساعدة مهندس خبير',
    speaker1: { name: 'باسل', voice: 'puck', personality: 'متوتر ومستعجل بنبرة هزلية' },
    speaker2: { name: 'المهندس', voice: 'enceladus', personality: 'هادئ ومصدوم وساخر' },
    script: `باسل: مهندسنا الغالي! السيرفر طاح والعملاء يشتكون!
المهندس: ماذا فعلت في الكود قبل خمس دقائق بالضبط؟
باسل: لا شيء خطير! فقط قمت بتعديل بسيط وحذفت قاعدة البيانات الاحتياطية بالخطأ!
المهندس: فقط؟! كدت أن تعلن إفلاس الشركة وتقول لي تعديل بسيط؟
باسل: المهم الآن... هل لديك فنجان قهوة إضافي ريثما نحل الكارثة؟`,
  },
];

export const MultiSpeakerStudio: React.FC<MultiSpeakerStudioProps> = ({
  apiKey,
  model,
  onUsageUpdate,
}) => {
  const [speaker1, setSpeaker1] = useState({
    name: 'سارة',
    voice: 'sulafat',
    personality: 'متحمسة ومشرقة ذات طاقة عالية',
  });

  const [speaker2, setSpeaker2] = useState({
    name: 'خالد',
    voice: 'charon',
    personality: 'هادئ، عميق النبرة، ورزين',
  });

  const [script, setScript] = useState<string>(PRESET_DIALOGUES[0].script);
  const [topicPrompt, setTopicPrompt] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isDiacritizing, setIsDiacritizing] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [isTrailerBass, setIsTrailerBass] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [rawAudioBase64, setRawAudioBase64] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isConvertingMp3, setIsConvertingMp3] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const handleApplyPreset = (p: typeof PRESET_DIALOGUES[0]) => {
    setSpeaker1(p.speaker1);
    setSpeaker2(p.speaker2);
    setScript(p.script);
    setStatusNote(`تم تطبيق قالب "${p.title}"`);
    setTimeout(() => setStatusNote(null), 3000);
  };

  const handleGenerateScriptWithAI = async () => {
    if (!topicPrompt.trim()) {
      alert('يرجى كتابة فكرة أو موضوع الحوار أولاً.');
      return;
    }
    setIsGeneratingScript(true);
    setError(null);
    try {
      const generated = await generateDialogueScript(
        topicPrompt,
        'podcast',
        speaker1.name,
        speaker2.name,
        apiKey
      );
      if (generated) {
        setScript(generated);
        setStatusNote('تم توليد الحوار بالذكاء الاصطناعي بنجاح!');
        setTimeout(() => setStatusNote(null), 3500);
      }
    } catch (err: any) {
      setError(`فشل توليد الحوار: ${err.message || err}`);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleDiacritize = async () => {
    if (!script.trim()) return;
    setIsDiacritizing(true);
    setError(null);
    try {
      const diacritized = await tashkeelArabicScript(script, apiKey);
      if (diacritized) {
        setScript(diacritized);
        setStatusNote('تم ضبط التشكيل الحركي والإعرابي بنجاح!');
        setTimeout(() => setStatusNote(null), 3500);
      }
    } catch (err: any) {
      setError(`فشل التشكيل: ${err.message || err}`);
    } finally {
      setIsDiacritizing(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!script.trim()) {
      alert('يرجى إدخال سكريبت الحوار أولاً.');
      return;
    }
    setIsSynthesizing(true);
    setError(null);
    setAudioUrl(null);
    setRawAudioBase64(null);

    try {
      const speakersPayload = [
        { name: speaker1.name, voice: speaker1.voice, personality: speaker1.personality },
        { name: speaker2.name, voice: speaker2.voice, personality: speaker2.personality },
      ];

      const result = await generateMultiSpeakerSpeech(
        script,
        speakersPayload,
        'Natural engaging dialogue with pristine dynamic contrast',
        speed,
        0,
        apiKey,
        model
      );

      const blob = createWavBlob(result.rawData);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Convert Uint8Array to base64
      let binary = '';
      for (let i = 0; i < result.rawData.byteLength; i++) {
        binary += String.fromCharCode(result.rawData[i]);
      }
      setRawAudioBase64(btoa(binary));

      setAudioDuration(result.durationSeconds || 0);

      if (onUsageUpdate) {
        onUsageUpdate(result.tokensUsed || 0, result.costUSD || 0, result.durationSeconds || 0);
      }

      setStatusNote(`تم توليد صوت الحوار الثنائي بنجاح (${result.durationSeconds?.toFixed(1)} ثانية)!`);
      setTimeout(() => setStatusNote(null), 4000);
    } catch (err: any) {
      console.error('Multi-speaker synthesis failed:', err);
      setError(`فشل توليد الصوت: ${err.message || err}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleDownloadMp3 = async () => {
    if (!rawAudioBase64) return;
    setIsConvertingMp3(true);
    try {
      const mp3Blob = await convertAudioToMp3(rawAudioBase64, 24000);
      const url = URL.createObjectURL(mp3Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `synergy-podcast-${Date.now()}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`خطأ في تصدير MP3: ${err.message}`);
    } finally {
      setIsConvertingMp3(false);
    }
  };

  return (
    <div dir="rtl" className="w-full text-right font-sans">
      {/* Header Banner */}
      <div className="bg-bauhaus-yellow p-4 border-b-4 border-bauhaus-black flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="bg-bauhaus-black text-white px-2 py-0.5 text-xs font-black uppercase tracking-wider ml-2">
            Multi-Speaker Podcast & Dialogue Studio
          </span>
          <h2 className="text-xl font-black text-bauhaus-black mt-1">
            استوديو الحوار الثنائي والبودكاست المتعدد
          </h2>
          <p className="text-xs text-gray-800 font-medium">
            توليد محادثات وبودكاست ومناظرات حية بصوتين مختلفين بتناغم عصبي طبيعي فائق الدقة عبر Gemini 2.5 TTS
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-gray-700 ml-1">قوالب جاهزة:</span>
          {PRESET_DIALOGUES.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(p)}
              className="text-xs font-bold bg-white hover:bg-gray-100 border-2 border-bauhaus-black px-2.5 py-1 transition-all shadow-sm active:translate-y-0.5"
            >
              {p.title}
            </button>
          ))}
        </div>
      </div>

      {statusNote && (
        <div className="bg-green-100 border-b-2 border-green-600 text-green-900 px-4 py-2 text-xs font-bold animate-pulse">
          {statusNote}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-b-2 border-red-600 text-red-900 px-4 py-2 text-xs font-bold flex justify-between items-center">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="text-red-700 underline font-black">إغلاق</button>
        </div>
      )}

      {/* Main Grid: Speakers on left, Script on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-b-4 border-bauhaus-black">
        {/* Left Column: Speaker 1 & Speaker 2 Config (5 Cols) */}
        <div className="lg:col-span-5 p-4 border-l-0 lg:border-l-4 border-bauhaus-black bg-gray-50 flex flex-col gap-4">
          {/* Speaker 1 Card */}
          <div className="border-3 border-bauhaus-black p-3.5 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-2 pb-2 border-b-2 border-bauhaus-black">
              <span className="font-black text-sm text-bauhaus-blue flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-bauhaus-blue inline-block" />
                المتحدث الأول (Speaker 1)
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 font-bold border border-blue-400">
                الصوت: {speaker1.voice}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">اسم الشخصية في النص:</label>
                <input
                  type="text"
                  value={speaker1.name}
                  onChange={(e) => setSpeaker1({ ...speaker1, name: e.target.value })}
                  className="w-full border-2 border-bauhaus-black p-1.5 font-bold focus:outline-none focus:bg-yellow-50"
                  placeholder="سارة"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">الصوت المعتمد (من أصوات جيميني الـ 30):</label>
                <select
                  value={speaker1.voice}
                  onChange={(e) => setSpeaker1({ ...speaker1, voice: e.target.value })}
                  className="w-full border-2 border-bauhaus-black p-1.5 font-bold focus:outline-none bg-white"
                >
                  {ALL_VOICES.map((v) => (
                    <option key={v.name} value={v.name.toLowerCase()}>
                      {v.name} ({v.ssmlGender === 'FEMALE' ? 'أنثى' : 'ذكر'} - {v.style})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">طبيعة الشخصية والنبرة (Personality):</label>
                <input
                  type="text"
                  value={speaker1.personality}
                  onChange={(e) => setSpeaker1({ ...speaker1, personality: e.target.value })}
                  className="w-full border-2 border-bauhaus-black p-1.5 text-xs focus:outline-none focus:bg-yellow-50"
                  placeholder="متحمسة وفضولية ذات طاقة عالية"
                />
              </div>
            </div>
          </div>

          {/* Speaker 2 Card */}
          <div className="border-3 border-bauhaus-black p-3.5 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-2 pb-2 border-b-2 border-bauhaus-black">
              <span className="font-black text-sm text-bauhaus-red flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-bauhaus-red inline-block" />
                المتحدث الثاني (Speaker 2)
              </span>
              <span className="text-[10px] bg-red-100 text-red-900 px-2 py-0.5 font-bold border border-red-400">
                الصوت: {speaker2.voice}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">اسم الشخصية في النص:</label>
                <input
                  type="text"
                  value={speaker2.name}
                  onChange={(e) => setSpeaker2({ ...speaker2, name: e.target.value })}
                  className="w-full border-2 border-bauhaus-black p-1.5 font-bold focus:outline-none focus:bg-yellow-50"
                  placeholder="خالد"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">الصوت المعتمد (من أصوات جيميني الـ 30):</label>
                <select
                  value={speaker2.voice}
                  onChange={(e) => setSpeaker2({ ...speaker2, voice: e.target.value })}
                  className="w-full border-2 border-bauhaus-black p-1.5 font-bold focus:outline-none bg-white"
                >
                  {ALL_VOICES.map((v) => (
                    <option key={v.name} value={v.name.toLowerCase()}>
                      {v.name} ({v.ssmlGender === 'FEMALE' ? 'أنثى' : 'ذكر'} - {v.style})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">طبيعة الشخصية والنبرة (Personality):</label>
                <input
                  type="text"
                  value={speaker2.personality}
                  onChange={(e) => setSpeaker2({ ...speaker2, personality: e.target.value })}
                  className="w-full border-2 border-bauhaus-black p-1.5 text-xs focus:outline-none focus:bg-yellow-50"
                  placeholder="هادئ، عميق النبرة، ورزين"
                />
              </div>
            </div>
          </div>

          {/* Acoustic DSP Tuning */}
          <div className="border-2 border-bauhaus-black p-3 bg-white space-y-2">
            <span className="font-bold text-xs text-gray-800 block">🎛️ معالجة الصوت الصوتية (DSP):</span>
            <div className="flex items-center justify-between text-xs">
              <span>السرعة الإيقاعية ({speed.toFixed(2)}x):</span>
              <input
                type="range"
                min="0.75"
                max="1.4"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-32"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isTrailerBass}
                onChange={(e) => setIsTrailerBass(e.target.checked)}
                className="w-4 h-4 accent-bauhaus-black"
              />
              <span>تفعيل رنين الصدر العميق (Sub-Bass Cinematic Presence)</span>
            </label>
          </div>
        </div>

        {/* Right Column: Script Editor & AI Writer (7 Cols) */}
        <div className="lg:col-span-7 p-4 bg-white flex flex-col justify-between">
          <div>
            {/* AI Scriptwriter Bar */}
            <div className="bg-amber-50 border-2 border-bauhaus-black p-3 mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-black text-xs text-bauhaus-black flex items-center gap-1">
                  ✨ كاتب السيناريو الذكي (AI Scriptwriter):
                </span>
                <span className="text-[10px] text-gray-500">يكتب الحوار تلقائياً بصيغة المتحدثين</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={topicPrompt}
                  onChange={(e) => setTopicPrompt(e.target.value)}
                  placeholder="اكتب فكرة الحوار (مثال: مناقشة أحدث كاميرات السينما بين مصور ومخرج)..."
                  className="flex-1 border-2 border-bauhaus-black p-2 text-xs focus:outline-none focus:bg-white"
                />
                <button
                  onClick={handleGenerateScriptWithAI}
                  disabled={isGeneratingScript}
                  className="bg-bauhaus-blue text-white px-3 py-2 text-xs font-bold border-2 border-bauhaus-black hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {isGeneratingScript ? 'جاري الكتابة...' : 'توليد الحوار'}
                </button>
              </div>
            </div>

            {/* Quick Insertion Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-700">إضافة سطر:</span>
                <button
                  type="button"
                  onClick={() => setScript((prev) => `${prev.trim()}\n${speaker1.name}: `)}
                  className="text-xs font-bold bg-blue-100 hover:bg-blue-200 border border-bauhaus-black px-2 py-0.5 text-blue-900"
                >
                  +{speaker1.name}
                </button>
                <button
                  type="button"
                  onClick={() => setScript((prev) => `${prev.trim()}\n${speaker2.name}: `)}
                  className="text-xs font-bold bg-red-100 hover:bg-red-200 border border-bauhaus-black px-2 py-0.5 text-red-900"
                >
                  +{speaker2.name}
                </button>
              </div>

              <button
                type="button"
                onClick={handleDiacritize}
                disabled={isDiacritizing}
                className="text-xs font-bold bg-yellow-100 hover:bg-yellow-200 border border-bauhaus-black px-2.5 py-1 text-gray-800 transition-colors disabled:opacity-50 flex items-center gap-1"
                title="إضافة التشكيل الحركي العربي لضمان نطق سليم بلا أخطاء"
              >
                <span>{isDiacritizing ? '⏳ جاري الضبط...' : '✨ تشكيل النص العربي (تَشْكِيل)'}</span>
              </button>
            </div>

            {/* Script Textarea */}
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={11}
              className="w-full border-3 border-bauhaus-black p-3 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-bauhaus-yellow resize-y"
              placeholder={`اكتب الحوار هنا بهذا الشكل بالضبط:\n${speaker1.name}: سطر المتحدث الأول...\n${speaker2.name}: رد المتحدث الثاني...`}
            />

            <p className="text-[11px] text-gray-500 mt-1">
              💡 شرط أساسي في Gemini Multi-Speaker: يجب أن يبدأ كل سطر باسم المتحدث متبوعاً بنقطتين (<code className="font-bold">{speaker1.name}:</code> و <code className="font-bold">{speaker2.name}:</code>) ليعرف النموذج أي صوت يخص كل جملة.
            </p>
          </div>

          {/* Action Bar */}
          <div className="mt-4 pt-3 border-t-2 border-bauhaus-black flex flex-wrap items-center justify-between gap-3">
            <BauhausButton
              onClick={handleGenerateAudio}
              disabled={isSynthesizing}
              variant="danger"
              className="px-6 font-black text-sm flex items-center gap-2"
            >
              {isSynthesizing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  جاري التوليد عبر Gemini 2.5 TTS...
                </>
              ) : (
                '🎙️ توليد الحوار الصوتي الكامل'
              )}
            </BauhausButton>

            {/* Audio Player and Exports if Audio Available */}
            {audioUrl && (
              <div className="flex items-center gap-2 bg-gray-100 p-2 border-2 border-bauhaus-black">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  controls
                  className="h-8 max-w-[200px]"
                />

                <a
                  href={audioUrl}
                  download={`synergy-podcast-${Date.now()}.wav`}
                  className="bg-white hover:bg-gray-200 border-2 border-bauhaus-black px-2.5 py-1 text-xs font-bold flex items-center gap-1"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  WAV
                </a>

                <button
                  onClick={handleDownloadMp3}
                  disabled={isConvertingMp3}
                  className="bg-bauhaus-black hover:bg-gray-800 text-white border-2 border-bauhaus-black px-2.5 py-1 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  {isConvertingMp3 ? 'تحويل...' : 'MP3'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
