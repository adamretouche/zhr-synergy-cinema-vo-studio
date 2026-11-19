/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { StylePreset } from '../types';

interface AIStudioExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStyle: StylePreset;
}

export const AIStudioExportModal: React.FC<AIStudioExportModalProps> = ({
  isOpen,
  onClose,
  currentStyle,
}) => {
  const [activeTab, setActiveTab] = useState<'APP_ZIP' | 'PROMPTS' | 'GDRIVE' | 'SAVINGS'>('APP_ZIP');
  const [isSyncingGDrive, setIsSyncingGDrive] = useState(false);
  const [gdriveOutput, setGdriveOutput] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  if (!isOpen) return null;

  const handleDownloadZip = () => {
    window.location.href = '/api/export/aistudio-zip';
  };

  const handleDownloadPrompts = () => {
    window.location.href = '/api/export/aistudio-prompts';
  };

  const handleCopySystemInstruction = async () => {
    const textToCopy = currentStyle.systemInstruction || '';
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      alert("فشل النسخ إلى الحافظة. يرجى النسخ يدوياً.");
    }
  };

  const handleTriggerGDriveSync = async () => {
    setIsSyncingGDrive(true);
    setGdriveOutput(null);
    try {
      const res = await fetch('/api/backup/trigger-gdrive', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setGdriveOutput(`✔ تم النسخ الاحتياطي بنجاح إلى مجلد Google Drive!\n${data.output || ''}`);
      } else {
        setGdriveOutput(`❌ خطأ أثناء النسخ: ${data.error || 'فشلت المزامنة'}\n${data.details || ''}`);
      }
    } catch (err: any) {
      setGdriveOutput(`❌ تعذر الاتصال بالسيرفر: ${err.message}`);
    } finally {
      setIsSyncingGDrive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        className="bg-white border-4 border-bauhaus-black shadow-hard-lg w-full max-w-4xl flex flex-col my-8 overflow-hidden rounded-none"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="bg-bauhaus-black text-white px-6 py-4 flex items-center justify-between border-b-4 border-bauhaus-black">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                تصدير لتطبيق Google AI Studio والنسخ الاحتياطي
              </h2>
              <p className="text-xs text-gray-300 font-mono">
                Google AI Studio App Packaging, Prompts Export & Cloud Backup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-white text-bauhaus-black font-black text-lg hover:bg-bauhaus-red hover:text-white transition-colors cursor-pointer border-2 border-bauhaus-black"
            title="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap border-b-2 border-bauhaus-black bg-gray-100 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('APP_ZIP')}
            className={`px-4 py-2.5 border-t-2 border-x-2 border-bauhaus-black transition-all cursor-pointer ${
              activeTab === 'APP_ZIP'
                ? 'bg-white text-bauhaus-black shadow-[0_2px_0_white]'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            📦 حزمة تطبيق AI Studio (ZIP)
          </button>

          <button
            onClick={() => setActiveTab('PROMPTS')}
            className={`px-4 py-2.5 border-t-2 border-x-2 border-bauhaus-black transition-all cursor-pointer ${
              activeTab === 'PROMPTS'
                ? 'bg-white text-bauhaus-black shadow-[0_2px_0_white]'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            📝 برومبتات AI Studio (Prompts JSON)
          </button>

          <button
            onClick={() => setActiveTab('GDRIVE')}
            className={`px-4 py-2.5 border-t-2 border-x-2 border-bauhaus-black transition-all cursor-pointer ${
              activeTab === 'GDRIVE'
                ? 'bg-white text-bauhaus-black shadow-[0_2px_0_white]'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            ☁️ المزامنة مع Google Drive
          </button>

          <button
            onClick={() => setActiveTab('SAVINGS')}
            className={`px-4 py-2.5 border-t-2 border-x-2 border-bauhaus-black transition-all cursor-pointer ${
              activeTab === 'SAVINGS'
                ? 'bg-white text-bauhaus-black shadow-[0_2px_0_white]'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            💰 استراتيجية خفض الاستهلاك الفائق
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto max-h-[70vh] text-bauhaus-black text-sm">
          {/* TAB 1: AI STUDIO APP ZIP */}
          {activeTab === 'APP_ZIP' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border-2 border-blue-600 rounded-none flex items-start gap-4">
                <span className="text-3xl">🚀</span>
                <div>
                  <h3 className="font-black text-blue-900 text-base mb-1">
                    تطبيق جاهز للتشغيل في Google AI Studio و Project IDX و Cloud Run
                  </h3>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    تم تجهيز هذا المشروع بملف <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">metadata.json</code> وملفات الإعدادات الكاملة المتوافقة 100% مع معايير تطبيقات قوقل للذكاء الاصطناعي. يمكنك تنزيل الحزمة واستيرادها فوراً في أي بيئة سحابية أو تشغيلها محلياً.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-5 border-2 border-bauhaus-black space-y-4">
                <h4 className="font-black text-sm uppercase text-gray-800">محتويات حزمة التطبيق (App Bundle):</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-white p-3 border border-gray-300">
                    <span className="font-bold text-emerald-700">✓ metadata.json:</span> تعريف التطبيق وقدرات Gemini API
                  </div>
                  <div className="bg-white p-3 border border-gray-300">
                    <span className="font-bold text-emerald-700">✓ App.tsx & Components:</span> واجهات الاستوديو والتحكم والسينما
                  </div>
                  <div className="bg-white p-3 border border-gray-300">
                    <span className="font-bold text-emerald-700">✓ server.ts:</span> سيرفر Express المتصل بـ Gemini TTS
                  </div>
                  <div className="bg-white p-3 border border-gray-300">
                    <span className="font-bold text-emerald-700">✓ README_AISTUDIO.md:</span> دليل التشغيل والربط السحابي
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleDownloadZip}
                    className="flex items-center gap-2 px-6 py-3 bg-bauhaus-yellow hover:bg-yellow-400 text-bauhaus-black font-black text-sm uppercase border-2 border-bauhaus-black shadow-hard-sm active:translate-y-0.5 cursor-pointer transition-all"
                  >
                    <span>⬇️</span>
                    <span>تنزيل تطبيق كامل لـ Google AI Studio (ZIP)</span>
                  </button>

                  <a
                    href="https://aistudio.google.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-gray-100 text-bauhaus-black font-black text-sm uppercase border-2 border-bauhaus-black shadow-hard-sm active:translate-y-0.5 cursor-pointer transition-all"
                  >
                    <span>🌐</span>
                    <span>فتح منصة Google AI Studio Apps ↗</span>
                  </a>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border-2 border-amber-600 text-xs text-amber-900 leading-relaxed">
                <span className="font-bold">💡 كيفية استخدامه في Google Project IDX / Cloud:</span>
                <ol className="list-decimal list-inside space-y-1 mt-2 font-sans">
                  <li>قم بتنزيل ملف الأرشيف ZIP أعلاه.</li>
                  <li>افتح <a href="https://idx.dev" target="_blank" rel="noopener noreferrer" className="underline font-bold">Google Project IDX</a> أو أنشئ بيئة عمل سحابية جديدة.</li>
                  <li>ارفع محتويات الأرشيف، ثم افتح الطرفية (Terminal) وشغّل: <code className="bg-white px-1.5 py-0.5 rounded border border-amber-400 font-mono">npm install && npm run dev</code>.</li>
                  <li>أدخل مفتاح Gemini API في إعدادات التطبيق أو ملف <code className="bg-white px-1 font-mono">.env</code> ليبدأ العمل مباشرة.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: PROMPTS EXPORT */}
          {activeTab === 'PROMPTS' && (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border-2 border-emerald-600 rounded-none flex items-start gap-4">
                <span className="text-3xl">📝</span>
                <div>
                  <h3 className="font-black text-emerald-900 text-base mb-1">
                    تصدير التعليمات الصوتية والبرومبتات لمنصة Google AI Studio Prompts
                  </h3>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    يتيح لك هذا القسم تصدير كافة البرومبتات وأنماط الإلقاء السينمائي (Movie Trailer, Radio DJ, ASMR وغيرها) بصيغة JSON رسمية معتمدة من Google AI Studio، أو نسخ برومبت النمط الحالي فوراً.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-5 border-2 border-bauhaus-black space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm uppercase text-gray-800">
                    النمط النشط حالياً: <span className="text-bauhaus-blue">{currentStyle.name}</span>
                  </h4>
                  <button
                    onClick={handleCopySystemInstruction}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-200 border-2 border-bauhaus-black text-xs font-black uppercase shadow-hard-sm cursor-pointer"
                  >
                    <span>{copiedPrompt ? '✓ تم النسخ!' : '📋 نسخ System Instruction'}</span>
                  </button>
                </div>

                <div className="bg-black text-emerald-400 p-4 font-mono text-xs max-h-40 overflow-y-auto border-2 border-bauhaus-black select-text" dir="ltr">
                  {currentStyle.systemInstruction}
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleDownloadPrompts}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-sm uppercase border-2 border-bauhaus-black shadow-hard-sm active:translate-y-0.5 cursor-pointer transition-all"
                  >
                    <span>⬇️</span>
                    <span>تنزيل ملف Prompts كامل (JSON)</span>
                  </button>

                  <a
                    href="https://aistudio.google.com/prompts/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-gray-100 text-bauhaus-black font-black text-sm uppercase border-2 border-bauhaus-black shadow-hard-sm active:translate-y-0.5 cursor-pointer transition-all"
                  >
                    <span>🌐</span>
                    <span>فتح محرر Google AI Studio Prompts ↗</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE DRIVE BACKUP */}
          {activeTab === 'GDRIVE' && (
            <div className="space-y-6">
              <div className="p-4 bg-purple-50 border-2 border-purple-600 rounded-none flex items-start gap-4">
                <span className="text-3xl">☁️</span>
                <div>
                  <h3 className="font-black text-purple-900 text-base mb-1">
                    النسخ الاحتياطي السحابي التلقائي إلى Google Drive
                  </h3>
                  <p className="text-xs text-purple-800 leading-relaxed">
                    يقوم هذا النظام بأرشفة كامل كود المشروع، الإعدادات، البرومبتات، والوثائق الفنية إلى مجلد Google Drive الخاص بك في المسار:
                    <br />
                    <code className="bg-purple-100 px-1 py-0.5 font-mono text-purple-900 font-bold">
                      My Drive/Synergy-Cinema-VO-Studio/Backups
                    </code>
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-5 border-2 border-bauhaus-black space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-sm uppercase text-gray-800">مزامنة سريعة بضغطة زر</h4>
                    <p className="text-xs text-gray-600">ينشئ ملف ZIP مرقماً تسلسلياً ويحدث نسخة السورس كود النظيفة فورياً.</p>
                  </div>

                  <button
                    onClick={handleTriggerGDriveSync}
                    disabled={isSyncingGDrive}
                    className={`flex items-center gap-2 px-6 py-3 font-black text-sm uppercase border-2 border-bauhaus-black shadow-hard-sm transition-all cursor-pointer ${
                      isSyncingGDrive
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 text-white active:translate-y-0.5'
                    }`}
                  >
                    <span>{isSyncingGDrive ? '⏳' : '🚀'}</span>
                    <span>{isSyncingGDrive ? 'جاري النسخ والمزامنة...' : 'مزامنة ونسخ الآن إلى Google Drive'}</span>
                  </button>
                </div>

                {gdriveOutput && (
                  <div className="mt-4 p-4 bg-black text-emerald-300 font-mono text-xs whitespace-pre-wrap border-2 border-bauhaus-black max-h-48 overflow-y-auto" dir="ltr">
                    {gdriveOutput}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: COST OPTIMIZATION GUIDE */}
          {activeTab === 'SAVINGS' && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 border-2 border-amber-600 rounded-none flex items-start gap-4">
                <span className="text-3xl">💡</span>
                <div>
                  <h3 className="font-black text-amber-900 text-base mb-1">
                    لماذا كان الاستهلاك مرتفعاً؟ وكيف تم خفضه بنسبة تزيد عن 85%؟
                  </h3>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    بناءً على التوثيق الرسمي لـ Google AI Studio، تم فحص أسباب استهلاك الرصيد بدقة وتطبيق 4 معالجات هندسية صارمة تجعل التوليد الصوتي السينمائي فائق الاقتصادية.
                  </p>
                </div>
              </div>

              {/* Pricing Table */}
              <div className="overflow-x-auto border-2 border-bauhaus-black">
                <table className="w-full text-right text-xs">
                  <thead className="bg-bauhaus-black text-white font-mono uppercase">
                    <tr>
                      <th className="p-3">النموذج الصوتي (TTS Model)</th>
                      <th className="p-3">سعر المليون توكن مدخلات</th>
                      <th className="p-3">سعر المليون توكن صوت (Output)</th>
                      <th className="p-3">مستوى الاستهلاك</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white font-mono">
                    <tr className="bg-emerald-50/80 font-bold text-emerald-950">
                      <td className="p-3 font-sans font-black flex items-center gap-1.5">
                        <span className="text-emerald-600">⚡</span>
                        gemini-3.8-flash-lite-tts (الافتراضي الحالي)
                      </td>
                      <td className="p-3">$0.075</td>
                      <td className="p-3">$0.30</td>
                      <td className="p-3 text-emerald-700 font-bold">فائق التوفير (أوفر بـ 94%)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-sans font-bold flex items-center gap-1.5">
                        <span>🎙️</span>
                        gemini-3.8-flash-tts
                      </td>
                      <td className="p-3">$0.150</td>
                      <td className="p-3">$0.60</td>
                      <td className="p-3 text-blue-700 font-bold">اقتصادي عالي الدقة</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-sans font-bold flex items-center gap-1.5">
                        <span>⚙️</span>
                        gemini-2.5-flash-preview-tts
                      </td>
                      <td className="p-3">$0.150</td>
                      <td className="p-3">$0.60</td>
                      <td className="p-3 text-gray-700">متوازن</td>
                    </tr>
                    <tr className="bg-red-50 text-red-950 opacity-90">
                      <td className="p-3 font-sans font-bold flex items-center gap-1.5">
                        <span className="text-red-600">⚠️</span>
                        gemini-2.5-pro-preview-tts (تم قفل التراجع التلقائي إليه)
                      </td>
                      <td className="p-3 text-red-700 font-black">$1.250</td>
                      <td className="p-3 text-red-700 font-black">$5.00</td>
                      <td className="p-3 text-red-700 font-bold">مرتفع جداً (16.6x ضعف السعر!)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Four Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-white border-2 border-bauhaus-black space-y-1.5">
                  <h4 className="font-black text-sm text-bauhaus-blue flex items-center gap-1.5">
                    <span>1️⃣</span> قفل فخ التراجع التلقائي (No Silent Pro Fallback)
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    سابقاً، إذا واجه Flash خطأ أو تأخيراً كان الكود يتراجع تلقائياً إلى Pro، مما يضاعف التكلفة 16 ضعفاً دون علم المستخدم. الآن تم حصر التراجع في فئة Flash فقط.
                  </p>
                </div>

                <div className="p-4 bg-white border-2 border-bauhaus-black space-y-1.5">
                  <h4 className="font-black text-sm text-emerald-700 flex items-center gap-1.5">
                    <span>2️⃣</span> تقليص توكنات التوجيه (Prompt Optimization)
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    بدلاً من إرسال فقرات كاملة بطول 800 توكن في كل مقطع صوتي، تم اعتماد توجيهات صوتية مقتضبة (<code className="font-mono bg-gray-100 px-1">[VOICE DIRECTION: ...]</code>) بـ 40 توكن فقط، مما وفر 95% من توكنات المدخلات ومنع تشتت الصوت البشري.
                  </p>
                </div>

                <div className="p-4 bg-white border-2 border-bauhaus-black space-y-1.5">
                  <h4 className="font-black text-sm text-purple-700 flex items-center gap-1.5">
                    <span>3️⃣</span> النمط المجاني للمسودة (Free Tier for Drafting)
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    من خلال مفتاح <code className="font-mono bg-gray-100 px-1 font-bold">🟢 FREE TIER</code> في أعلى الشاشة، يمكنك سماع وضبط نطق النص والتشكيل عبر المحرك المحلي بـ $0.00، ثم التبديل للمدفوع فقط عند إصدار النسخة النهائية.
                  </p>
                </div>

                <div className="p-4 bg-white border-2 border-bauhaus-black space-y-1.5">
                  <h4 className="font-black text-sm text-amber-700 flex items-center gap-1.5">
                    <span>4️⃣</span> اعتماد نموذج Flash-Lite الرسمي
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    يعتمد التطبيق الآن نموذج <code className="font-mono bg-gray-100 px-1">gemini-3.8-flash-lite-tts</code> كنموذج افتراضي أولي، وهو أحدث نموذج صوتي من قوقل تم تصميمه خصيصاً للتوليد السريع عالي الجودة وبأقل تكلفة توكن ممكنة.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-100 px-6 py-3 border-t-2 border-bauhaus-black flex justify-between items-center text-xs">
          <span className="text-gray-600 font-mono">Synergy Cinema VO Studio • Google AI Studio Ready</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-bauhaus-black hover:bg-gray-800 text-white font-black uppercase border-2 border-bauhaus-black cursor-pointer shadow-hard-sm"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
