/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { ALL_VOICES } from '../voices';
import {
  generateSpeech,
  createWavBlob,
  convertAudioToMp3,
  tashkeelArabicScript,
} from '../services/geminiService';
import { BauhausButton, DownloadIcon } from './BauhausComponents';

interface DirectorProfileStudioProps {
  apiKey?: string;
  model?: string;
  onUsageUpdate?: (tokens: number, cost: number, seconds: number) => void;
}

const PRESET_PROFILES = [
  {
    title: '🎬 هوليوود: تريلر سينمائي فخم (Voice of God)',
    characterName: 'ماركوس - المعلق السينمائي',
    voice: 'charon',
    sceneTitle: 'استوديو التسجيل في لوس أنجلوس',
    sceneDescription: 'غرفة عازلة للصوت في ظلمة تامة، فقط شاشة عرض عملاقة تضيء وجه المعلق وهو يقف أمام ميكروفون نيومان الكلاسيكي ذي الغشاء العريض.',
    vocalSmile: false,
    chestResonance: true,
    style: 'هيبة سينمائية ساحقة، نبرة جهورية ذات وقفات مدروسة، حروف ساكنة قاطعة كالرعد، وعمق هائل في طبقة الصدر.',
    dynamics: 'إسقاط صوتي عميق دون صراخ، تفخيم في مخارج الحروف، ونبرة تبث الرهبة والترقب في كل كلمة.',
    pace: 'إيقاع بطيء ومدروس (Slow & Deliberate) مع وقفات ملحمية بين الجمل.',
    accent: 'فصحى سينمائية رصينة خالية من التكلف مع فخامة خليجية ملكية.',
    transcript: 'في عَالَمٍ يَتَسَارَعُ فِيهِ كُلُّ شَيْء... وَتَتَلَاشَى فِيهِ الحُدُود... بَطَلٌ وَاحِد... سَيُعِيدُ كِتَابَةَ التَّارِيخ. قَرِيباً فِي صَالَاتِ السِّينِمَا.',
  },
  {
    title: '☀️ البث المباشر: صباح الطاقة والحيوية (The Morning Hype)',
    characterName: 'جاز ر. (Jaz R.) - مذيع الراديو الحيوي',
    voice: 'puck',
    sceneTitle: 'استوديو لندن الزجاجي المطل على أفق المدينة',
    sceneDescription: 'أضواء الاستوديو الحمراء مشتعلة، المذيع يقف على أطراف أصابعه متحمساً، يرقص على إيقاع الموسيقى السريعة ويداه تتحركان بخفة على أجهزة المكسر.',
    vocalSmile: true,
    chestResonance: false,
    style: 'ابتسامة صوتية ساطعة (Vocal Smile)، الحنك الرخو مرفوع لتظل النبرة مشرقة وجذابة ومعدية بالطاقة الإيجابية.',
    dynamics: 'إسقاط صوتي عالي وحيوي مع مد حروف العلة في كلمات الحماس وضرب الحروف الساكنة بإيقاع خاطف.',
    pace: 'إيقاع سريع ومتدفق بلا فترات صمت ميتة، يلاحق النبضات الموسيقية بحيوية خارقة.',
    accent: 'نبرة حيوية عصرية فصيحة شبابية تمتلئ بالبهجة.',
    transcript: 'نَعَم! طَاقَةٌ هَائِلَةٌ فِي الاسْتُودْيُو الآن! إِذَا كُنْتَ فِي طَرِيقِكَ لِلعَمَلِ أَوْ تَشْرَبُ قَهْوَتَكَ الصَّبَاحِيَّة... ارْفَع الصَّوْتَ وَاسْتَعِد، الْيَوْمَ يَوْمُكَ وَالإِنْجَازُ يَنْتَظِرُك!',
  },
  {
    title: '🌿 وثائقي الطبيعة: هدوء وتأمل بأسلوب Vox',
    characterName: 'ديفيد - راوي الوثائقيات',
    voice: 'sadaltager',
    sceneTitle: 'كابينة التعليق الهادئة في منتصف الليل',
    sceneDescription: 'كوب شاي دافئ، إضاءة خافتة، شاشة تعرض لقطات ماكرو عالية الدقة لتفتح بتلات الزهور وحركة قطرات الندى.',
    vocalSmile: false,
    chestResonance: false,
    style: 'همس دافئ، نبرة معرفية رصينة ومريحة للأعصاب، حميمية صوتية وكأن الراوي يهمس بسر في أذنك.',
    dynamics: 'تحكم فائق في التنفس، نبرة ناعمة ودافئة تبرز تفاصيل المشهد الطبيعي.',
    pace: 'إيقاع هادئ ومنساب مع فواصل تأملية واسعة.',
    accent: 'عربية فصحى ناصعة ومخارج حروف واضحة كالنقاء.',
    transcript: 'فِي سُكُونِ الغَابَةِ العَمِيقَة... حَيْثُ لَا شَيْءَ يَعْلُو فَوْقَ صَوْتِ الرِّيَاح... تَبْدَأُ الحَيَاةُ دَوْرَتَهَا الخَفِيَّةَ مَعَ أَوَّلِ خَيْطٍ مِنَ الفَجْر.',
  },
];

export const DirectorProfileStudio: React.FC<DirectorProfileStudioProps> = ({
  apiKey,
  model,
  onUsageUpdate,
}) => {
  const [profile, setProfile] = useState(PRESET_PROFILES[0]);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isDiacritizing, setIsDiacritizing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [rawAudioBase64, setRawAudioBase64] = useState<string | null>(null);
  const [isConvertingMp3, setIsConvertingMp3] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApplyPreset = (p: typeof PRESET_PROFILES[0]) => {
    setProfile(p);
    setStatusNote(`تم تطبيق بروفايل "${p.title}"`);
    setTimeout(() => setStatusNote(null), 3000);
  };

  const handleDiacritize = async () => {
    if (!profile.transcript.trim()) return;
    setIsDiacritizing(true);
    setError(null);
    try {
      const diacritized = await tashkeelArabicScript(profile.transcript, apiKey);
      if (diacritized) {
        setProfile({ ...profile, transcript: diacritized });
        setStatusNote('تم تشكيل النص بنجاح!');
        setTimeout(() => setStatusNote(null), 3000);
      }
    } catch (err: any) {
      setError(`فشل التشكيل: ${err.message || err}`);
    } finally {
      setIsDiacritizing(false);
    }
  };

  // Compile engineered prompt mimicking Google's Audio Profile paradigm
  const compileProfilePrompt = () => {
    const smileDirective = profile.vocalSmile
      ? '* The Vocal Smile: Hear the warm grin in the audio. Soft palate raised, bright, infectious energy.'
      : '';
    const resonanceDirective = profile.chestResonance
      ? '* Sub-bass Gravitas: Deep chest resonance, measured weight, thunderous presence.'
      : '';

    return `# AUDIO PROFILE: ${profile.characterName}
## THE SCENE: ${profile.sceneTitle}
${profile.sceneDescription}

### DIRECTOR'S NOTES
Style: ${profile.style}
${smileDirective}
${resonanceDirective}
Dynamics: ${profile.dynamics}
Pace: ${profile.pace}
Accent/Timbre: ${profile.accent}

Say the following transcript verbatim:`;
  };

  const handleGenerate = async () => {
    if (!profile.transcript.trim()) {
      alert('يرجى إدخال النص أولاً.');
      return;
    }
    setIsSynthesizing(true);
    setError(null);
    setAudioUrl(null);
    setRawAudioBase64(null);

    try {
      const compiledInstruction = compileProfilePrompt();

      const result = await generateSpeech(
        profile.transcript,
        profile.voice,
        compiledInstruction,
        apiKey,
        {
          pitch: profile.chestResonance ? -4 : 0,
          speed: profile.vocalSmile ? 1.05 : (profile.chestResonance ? 0.92 : 1.0),
          intensity: 85,
          style: 'cinematic',
          tone: profile.chestResonance ? 'deep' : 'warm',
          dialect: 'standard_arabic',
          purpose: 'cinematic',
        },
        undefined,
        undefined,
        model
      );

      const blob = createWavBlob(result.rawData);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      let binary = '';
      for (let i = 0; i < result.rawData.byteLength; i++) {
        binary += String.fromCharCode(result.rawData[i]);
      }
      setRawAudioBase64(btoa(binary));

      if (onUsageUpdate) {
        onUsageUpdate(result.tokensUsed || 0, result.costUSD || 0, result.durationSeconds || 0);
      }

      setStatusNote(`تم توليد أداء المخرج الصوتي بنجاح (${result.durationSeconds?.toFixed(1)} ثانية)!`);
      setTimeout(() => setStatusNote(null), 4000);
    } catch (err: any) {
      console.error('Director profile generation failed:', err);
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
      a.download = `synergy-director-profile-${Date.now()}.mp3`;
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
      <div className="bg-bauhaus-blue text-white p-4 border-b-4 border-bauhaus-black flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="bg-bauhaus-yellow text-bauhaus-black px-2 py-0.5 text-xs font-black uppercase tracking-wider ml-2">
            Hollywood Audio Profile & Scene Architecture
          </span>
          <h2 className="text-xl font-black text-white mt-1">
            استوديو بروفايل المخرج وتوجيه المشهد السينمائي
          </h2>
          <p className="text-xs text-blue-100 font-medium">
            الهيكلية المتقدمة المعتمدة في كراسة جوجل الرسمية (Scene, Director's Notes, Dynamics, Vocal Smile, Cadence)
          </p>
        </div>

        {/* Quick Profiles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-blue-200 ml-1">بروفايلات جاهزة:</span>
          {PRESET_PROFILES.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(p)}
              className="text-xs font-bold bg-white text-bauhaus-black hover:bg-yellow-300 border-2 border-bauhaus-black px-2.5 py-1 transition-all shadow-sm active:translate-y-0.5"
            >
              {p.title.split(':')[0]}
            </button>
          ))}
        </div>
      </div>

      {statusNote && (
        <div className="bg-green-100 border-b-2 border-green-600 text-green-900 px-4 py-2 text-xs font-bold">
          {statusNote}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-b-2 border-red-600 text-red-900 px-4 py-2 text-xs font-bold flex justify-between items-center">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="text-red-700 underline font-black">إغلاق</button>
        </div>
      )}

      {/* Main Form: Profile Directives on left, Script on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-b-4 border-bauhaus-black">
        {/* Left Column: Scene & Notes Directives (5 Cols) */}
        <div className="lg:col-span-5 p-4 border-l-0 lg:border-l-4 border-bauhaus-black bg-gray-50 flex flex-col gap-3">
          <div className="border-2 border-bauhaus-black p-3 bg-white space-y-2">
            <span className="font-black text-xs text-bauhaus-black block pb-1 border-b border-gray-200">
              🎭 هوية المعلق والمشهد (Audio Profile & Scene):
            </span>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-0.5">اسم الشخصية:</label>
              <input
                type="text"
                value={profile.characterName}
                onChange={(e) => setProfile({ ...profile, characterName: e.target.value })}
                className="w-full border-2 border-bauhaus-black p-1 text-xs font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-0.5">الصوت المعتمد (Gemini Voice):</label>
              <select
                value={profile.voice}
                onChange={(e) => setProfile({ ...profile, voice: e.target.value })}
                className="w-full border-2 border-bauhaus-black p-1 text-xs font-bold bg-white focus:outline-none"
              >
                {ALL_VOICES.map((v) => (
                  <option key={v.name} value={v.name.toLowerCase()}>
                    {v.name} ({v.ssmlGender === 'FEMALE' ? 'أنثى' : 'ذكر'} - {v.style})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-0.5">بيئة ومكان المشهد (The Scene):</label>
              <textarea
                value={profile.sceneDescription}
                onChange={(e) => setProfile({ ...profile, sceneDescription: e.target.value })}
                rows={2}
                className="w-full border-2 border-bauhaus-black p-1.5 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Director's Notes Tuning */}
          <div className="border-2 border-bauhaus-black p-3 bg-white space-y-2.5">
            <span className="font-black text-xs text-bauhaus-black block pb-1 border-b border-gray-200">
              🎬 ملاحظات المخرج الصوتي (Director's Directives):
            </span>

            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.vocalSmile}
                  onChange={(e) => setProfile({ ...profile, vocalSmile: e.target.checked })}
                  className="w-4 h-4 accent-bauhaus-yellow"
                />
                <span>ابتسامة الصوت (Vocal Smile)</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.chestResonance}
                  onChange={(e) => setProfile({ ...profile, chestResonance: e.target.checked })}
                  className="w-4 h-4 accent-bauhaus-black"
                />
                <span>رنين الصدر التريلري (Sub-Bass)</span>
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-0.5">الديناميكية ونبرة الصوت (Dynamics & Style):</label>
              <input
                type="text"
                value={profile.style}
                onChange={(e) => setProfile({ ...profile, style: e.target.value })}
                className="w-full border-2 border-bauhaus-black p-1 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-0.5">السرعة والإيقاع (Pace & Cadence):</label>
              <input
                type="text"
                value={profile.pace}
                onChange={(e) => setProfile({ ...profile, pace: e.target.value })}
                className="w-full border-2 border-bauhaus-black p-1 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-0.5">اللهجة ومخارج الحروف (Accent):</label>
              <input
                type="text"
                value={profile.accent}
                onChange={(e) => setProfile({ ...profile, accent: e.target.value })}
                className="w-full border-2 border-bauhaus-black p-1 text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Transcript & Engineered Prompt Preview (7 Cols) */}
        <div className="lg:col-span-7 p-4 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-xs text-bauhaus-black">
                📜 سكريبت التعليق (Transcript):
              </span>
              <button
                type="button"
                onClick={handleDiacritize}
                disabled={isDiacritizing}
                className="text-xs font-bold bg-yellow-100 hover:bg-yellow-200 border border-bauhaus-black px-2 py-0.5 text-gray-800 transition-colors disabled:opacity-50"
              >
                {isDiacritizing ? '⏳ جاري الضبط...' : '✨ تشكيل النص العربي'}
              </button>
            </div>

            <textarea
              value={profile.transcript}
              onChange={(e) => setProfile({ ...profile, transcript: e.target.value })}
              rows={6}
              className="w-full border-3 border-bauhaus-black p-3 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-bauhaus-blue resize-y mb-3"
            />

            {/* Engineered Prompt Preview */}
            <div className="border-2 border-gray-300 bg-gray-50 p-2.5">
              <span className="text-[10px] font-bold text-gray-500 block mb-1">
                🔍 معاينة برومبت المخرج الصوتي الهندسي المرسل لـ Gemini API:
              </span>
              <pre className="text-[10px] text-gray-700 font-mono overflow-x-auto max-h-32 p-2 bg-white border border-gray-200 whitespace-pre-wrap">
                {compileProfilePrompt()}
              </pre>
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-4 pt-3 border-t-2 border-bauhaus-black flex flex-wrap items-center justify-between gap-3">
            <BauhausButton
              onClick={handleGenerate}
              disabled={isSynthesizing}
              variant="primary"
              className="px-6 font-black text-sm flex items-center gap-2"
            >
              {isSynthesizing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  جاري تسجيل الأداء الصوتي للمشهد...
                </>
              ) : (
                '🎬 تسجيل أداء المخرج الصوتي'
              )}
            </BauhausButton>

            {audioUrl && (
              <div className="flex items-center gap-2 bg-gray-100 p-2 border-2 border-bauhaus-black">
                <audio src={audioUrl} controls className="h-8 max-w-[200px]" />
                <a
                  href={audioUrl}
                  download={`synergy-director-${Date.now()}.wav`}
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
                  {isConvertingMp3 ? '...' : 'MP3'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
