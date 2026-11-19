/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { ALL_VOICES } from '../voices';

export const DocumentationView: React.FC = () => {
  return (
    <div dir="rtl" className="w-full text-right font-sans p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-900 to-indigo-950 text-white p-6 border-4 border-bauhaus-black shadow-hard">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <span className="bg-bauhaus-yellow text-bauhaus-black px-3 py-1 text-xs font-black uppercase tracking-wider">
            دليل ومرجع Gemini Text-to-Speech الرسمي
          </span>
          <a
            href="https://aistudio.google.com/docs/speech-generation"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-white text-bauhaus-black hover:bg-yellow-300 font-bold px-3 py-1 border-2 border-bauhaus-black transition-all"
          >
            ↗ وثائق Google AI Studio الرسمية
          </a>
        </div>
        <h2 className="text-2xl md:text-3xl font-black mt-1">
          دليل التوليد الصوتي العصبي عبر نماذج Google Gemini
        </h2>
        <p className="text-sm text-blue-200 mt-2 max-w-3xl leading-relaxed">
          مرجع شامل مبني على شروحات فيديو <span className="text-yellow-300 font-bold">Prompt Engineering</span> والكراسة الرسمية لشركة Google لتوليد تعليق صوتي سينمائي وبودكاست متعدد الأصوات بأعلى دقة ممكنة.
        </p>
      </div>

      {/* Core Workflow Steps Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Step 1 */}
        <div className="bg-white border-3 border-bauhaus-black p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-full bg-bauhaus-yellow border-2 border-bauhaus-black flex items-center justify-center font-black text-sm mb-2">
              1
            </div>
            <h3 className="font-black text-sm text-bauhaus-black mb-1">إعداد العميل والمفتاح</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              تحتاج إلى مفتاح <code className="font-bold text-blue-700">Gemini API</code> (يُفضل المدفوع لتجنب حدود الاستخدام اليومية) ومكتبة <code className="font-bold">@google/genai &gt;= 1.16</code>.
            </p>
          </div>
          <span className="text-[10px] text-gray-500 font-bold mt-2 pt-2 border-t border-gray-100">فيديو: [2:48 - 3:10]</span>
        </div>

        {/* Step 2 */}
        <div className="bg-white border-3 border-bauhaus-black p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-full bg-bauhaus-red text-white border-2 border-bauhaus-black flex items-center justify-center font-black text-sm mb-2">
              2
            </div>
            <h3 className="font-black text-sm text-bauhaus-black mb-1">اختيار النموذج الذكي</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              <strong>Gemini 3.8 Flash-Lite (الافتراضي ⚡):</strong> الأوفر في التكلفة والأسرع استجابة.<br />
              <strong>Gemini 3.8 Flash 🎙️:</strong> استوديو الجيل الأحدث عالي الدقة.<br />
              <strong>Gemini 2.5 Flash / Pro 🎬:</strong> نماذج الجيل السابق للشروحات والمشاهد الدرامية.
            </p>
          </div>
          <span className="text-[10px] text-gray-500 font-bold mt-2 pt-2 border-t border-gray-100">فيديو: [3:13 - 3:22]</span>
        </div>

        {/* Step 3 */}
        <div className="bg-white border-3 border-bauhaus-black p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-full bg-bauhaus-blue text-white border-2 border-bauhaus-black flex items-center justify-center font-black text-sm mb-2">
              3
            </div>
            <h3 className="font-black text-sm text-bauhaus-black mb-1">فصل التعليمات عن المحتوى</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              <strong>التعليمات:</strong> تصف التأثيرات (النبرة، السرعة، العواطف، الوقفات).<br />
              <strong>المحتوى:</strong> النص الصافي المراد قراءته حرفياً دون تحريف.
            </p>
          </div>
          <span className="text-[10px] text-gray-500 font-bold mt-2 pt-2 border-t border-gray-100">فيديو: [4:28 - 4:46]</span>
        </div>

        {/* Step 4 */}
        <div className="bg-white border-3 border-bauhaus-black p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white border-2 border-bauhaus-black flex items-center justify-center font-black text-sm mb-2">
              4
            </div>
            <h3 className="font-black text-sm text-bauhaus-black mb-1">Audio Modality & PCM</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              يُرسل الطلب بـ <code className="font-bold text-purple-700">response_modalities: ['AUDIO']</code> ويُرجع صوتاً خاماً 24kHz Linear PCM يتحول تلقائياً إلى WAV و MP3.
            </p>
          </div>
          <span className="text-[10px] text-gray-500 font-bold mt-2 pt-2 border-t border-gray-100">فيديو: [4:11 - 4:15]</span>
        </div>
      </div>

      {/* Audio Profile & Scene Architecture Section */}
      <div className="bg-white border-4 border-bauhaus-black p-6 shadow-hard">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-bauhaus-black">
          <span className="text-xl">🎬</span>
          <h3 className="text-lg font-black text-bauhaus-black">
            معمارية بروفايل المخرج والمشهد (Audio Profile, Scene Description & Director's Notes)
          </h3>
          <span className="text-xs bg-yellow-100 text-yellow-900 border border-yellow-400 px-2 py-0.5 font-bold mr-auto">
            توصية الفيديو [11:00 - 11:23]
          </span>
        </div>
        <p className="text-xs text-gray-700 leading-relaxed mb-4">
          للحصول على جودة سينمائية استثنائية ونطق واقعي، ينصح مهندسو جوجل بعدم الاكتفاء بنص خام، بل تأطير الطلب في سياق درامي ومكاني متكامل:
        </p>

        <div className="bg-gray-900 text-yellow-400 font-mono text-xs p-4 rounded-sm border-2 border-bauhaus-black overflow-x-auto space-y-1">
          <p className="text-cyan-400 font-bold"># AUDIO PROFILE: [اسم المعلق / الشخصية]</p>
          <p className="text-emerald-400 font-bold">## THE SCENE: [وصف المكان والبيئة والإضاءة والحالة المزاجية للاستوديو]</p>
          <p className="text-purple-400 font-bold">### DIRECTOR'S NOTES</p>
          <p className="text-gray-300 mr-4">* Style: [الأسلوب ونبرة الصوت + الابتسامة الصوتية The Vocal Smile]</p>
          <p className="text-gray-300 mr-4">* Dynamics: [إسقاط الصوت وحروف العلة، رنين الصدر التريلري Sub-Bass]</p>
          <p className="text-gray-300 mr-4">* Pace: [سرعة الإلقاء وتدفق الكلام وإيقاع الوقفات]</p>
          <p className="text-gray-300 mr-4">* Accent: [اللهجة، الفصحى السينمائية ومخارج الحروف]</p>
          <p className="text-pink-400 font-bold mt-2">#### TRANSCRIPT:</p>
          <p className="text-white mr-4">[النص الفعلي المراد قراءته بدقة واحتراف]</p>
        </div>
      </div>

      {/* The 30 Voices Catalog */}
      <div className="bg-white border-4 border-bauhaus-black p-6 shadow-hard">
        <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-bauhaus-black">
          <div>
            <h3 className="text-lg font-black text-bauhaus-black flex items-center gap-2">
              <span>🎙️</span>
              دليل أصوات Gemini الـ 30 الرسمية
            </h3>
            <p className="text-xs text-gray-600">
              قائمة الأصوات المدعومة رسمياً في Google Gemini API مع تصنيف النبرة والنوع
            </p>
          </div>
          <span className="text-xs font-bold bg-bauhaus-black text-white px-2.5 py-1">
            30 صوتاً متاحاً
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
          {ALL_VOICES.map((v) => (
            <div
              key={v.name}
              className={`p-2.5 border-2 border-bauhaus-black text-xs font-bold transition-all hover:-translate-y-0.5 ${
                v.ssmlGender === 'FEMALE' ? 'bg-pink-50 hover:bg-pink-100' : 'bg-blue-50 hover:bg-blue-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-bauhaus-black">{v.name}</span>
                <span className={`text-[9px] px-1 py-0.2 rounded font-extrabold ${
                  v.ssmlGender === 'FEMALE' ? 'bg-pink-200 text-pink-900' : 'bg-blue-200 text-blue-900'
                }`}>
                  {v.ssmlGender === 'FEMALE' ? 'أنثى' : 'ذكر'}
                </span>
              </div>
              <span className="text-[11px] text-gray-600 font-mono block">
                {v.style}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Speaker Best Practices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border-3 border-bauhaus-black p-5 shadow-sm space-y-2">
          <h4 className="font-black text-sm text-bauhaus-black flex items-center gap-1.5">
            <span>👥</span>
            قواعد الحوار المتعدد (Multi-Speaker)
          </h4>
          <ul className="text-xs text-gray-700 space-y-2 list-disc list-inside leading-relaxed">
            <li>يجب مطابقة اسم كل متحدث في <code className="bg-gray-100 px-1 font-bold">speaker_voice_configs</code> مع الاسم الذي يبدأ به السطر في النص.</li>
            <li>ابدأ كل جملة باسم الشخصية متبوعاً بنقطتين: <code className="bg-gray-100 px-1 font-bold">سارة: مرحباً</code> و <code className="bg-gray-100 px-1 font-bold">خالد: أهلاً</code>.</li>
            <li>لا تضع توجيهات إخراجية بين أقواس داخل أسطر الحوار حتى لا يقرأها النموذج صوتياً.</li>
            <li>وجه مشاعر كل شخصية في البرومبت التمهيدي: (Make سارة enthusiastic, and خالد calm).</li>
          </ul>
        </div>

        <div className="bg-white border-3 border-bauhaus-black p-5 shadow-sm space-y-2">
          <h4 className="font-black text-sm text-bauhaus-black flex items-center gap-1.5">
            <span>🌐</span>
            دعم اللغات والتشكيل العربي
          </h4>
          <ul className="text-xs text-gray-700 space-y-2 list-disc list-inside leading-relaxed">
            <li>يدعم النظام حتى <strong>24 لغة مختلفة</strong> بما فيها اللغة العربية الفصحى.</li>
            <li><strong>التشكيل العربي (Tashkeel):</strong> استخدم زر التشكيل الفوري لضبط الحركات الإعرابية (الفتحة، الضمة، الكسرة، التنوين) لضمان نطق فصيح ومخارج حروف صحيحة بنسبة 100%.</li>
            <li>إذا أردت الانتقال إلى لغة أخرى (كالفرنسية أو الإنجليزية)، يكفي كتابة: <code className="bg-gray-100 px-1 font-bold">Read this in French:</code> متبوعاً بالنص.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
