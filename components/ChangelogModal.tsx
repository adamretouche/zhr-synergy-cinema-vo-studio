/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-6 font-sans select-none overflow-y-auto"
      dir="rtl"
      style={{ textAlign: 'right' }}
    >
      <div className="bg-white border-4 border-bauhaus-black w-full max-w-3xl shadow-2xl p-5 md:p-7 text-right max-h-[94vh] flex flex-col my-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-4 border-bauhaus-black pb-3 mb-4 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📜</span>
              <h2 className="text-lg md:text-xl font-black text-bauhaus-black uppercase tracking-tight">
                سجل التحديثات والإصدارات (Changelog & Release Notes)
              </h2>
            </div>
            <p className="text-xs text-gray-600 font-semibold mt-0.5">
              توثيق رسمي لكافة التغييرات والمميزات المعتمدة للإصدار الحالي والمستقبلي
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center border-2 border-bauhaus-black bg-gray-100 hover:bg-bauhaus-red hover:text-white font-black text-lg cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-4 overflow-y-auto flex-1 px-1 custom-scrollbar text-xs">

          {/* Release Protocol Card */}
          <div className="border-2 border-bauhaus-black bg-yellow-50 p-3 shadow-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">🔒</span>
              <h3 className="font-black text-xs text-bauhaus-black uppercase">
                ميثاق وسياسة التحديثات الإلزامية (Release Protocol):
              </h3>
            </div>
            <ul className="list-disc list-inside space-y-1 text-gray-800 font-bold leading-relaxed text-[11px]">
              <li><strong>الاستئذان والمشاورة المسبقة:</strong> يُمنع تسجيل أي تعديلات أو رفع رقم إصدار جديد دون استئذان ومشاورة المستخدم والحصول على موافقته أولاً.</li>
              <li><strong>النسخ الاحتياطي اليومي:</strong> بعد انتهاء كل تحديث، يتم سؤال المستخدم أولاً عن رغبته في المزامنة مع Google Drive.</li>
              <li><strong>مزامنة GitHub:</strong> يتم استئذان المستخدم دائماً قبل دفع أي تحديثات (`git push`) إلى مستودع GitHub.</li>
            </ul>
          </div>

          {/* Version 1.0.1-beta Entry */}
          <div className="border-3 border-bauhaus-black bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-bauhaus-black pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-bauhaus-blue text-white font-mono font-black text-xs border border-black rounded-xs">
                  v1.0.1-beta
                </span>
                <span className="font-black text-sm text-bauhaus-black">
                  إصدار المعالجة الصوتية النقية ومنع الروبوتية والتزامن (Natural Voice & Anti-Glitch Release)
                </span>
              </div>
              <span className="text-[10px] font-bold text-gray-500 font-mono">2026-11-21</span>
            </div>

            <div className="space-y-3 leading-relaxed">
              <div>
                <h4 className="font-black text-xs text-bauhaus-red uppercase mb-1 flex items-center gap-1">
                  <span>🛠️</span>
                  <span>الإصلاحات والتحسينات الجذرية:</span>
                </h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700 font-semibold pr-1">
                  <li><strong>إلغاء تشوهات الروبوتية:</strong> إلغاء معالجة Pitch Shifting في FFmpeg وضبط الأساس على <code>pitch: 0</code> لمنع تشويه رنين الحنجرة البشري.</li>
                  <li><strong>تمرير صوتي مباشر 100% (Direct Pass-through):</strong> إرسال الصوت العصبي النقي 24kHz مباشرة من Gemini API دون أي معالجات مشوّهة عند استخدام الإعدادات القياسية.</li>
                  <li><strong>تنقية الأوامر التوجيهية:</strong> استبدال التوجيهات الحادة والمبالغ فيها بتوجيهات نبرة إنسانية رخيمة وطبيعية وسينمائية متوازنة.</li>
                  <li><strong>منع طقطقة الفواصل (De-Clicking):</strong> دمج مقاطع الصوت والوقفات بمايكرو-تلاشي انسيابي وصمت تنفسي طبيعي (65ms Organic Gap).</li>
                  <li><strong>التناغم الصوتي التكيفي:</strong> حماية الأصوات النسائية والخفيفة من فرض نبرات الباريتون العميقة تلقائياً.</li>
                  <li><strong>تطهير التخزين المؤقت للمتصفح:</strong> فحص تلقائي لـ localStorage وتصحيح قيم الـ pitch القديمة لمنع عودة الصوت الآلي.</li>
                  <li><strong>حفظ النسخة السابقة v1.0.0:</strong> توثيق وتثبيت الإصدار v1.0.0 بشكل مستقل ودائم في كل من GitHub وGoogle Drive.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Version 1.0.0 Entry */}
          <div className="border-3 border-bauhaus-black bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-bauhaus-black pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-bauhaus-black text-bauhaus-yellow font-mono font-black text-xs border border-black rounded-xs">
                  v1.0.0
                </span>
                <span className="font-black text-sm text-bauhaus-black">
                  الإصدار الأساسي المعتمد (Base Release v1.0)
                </span>
              </div>
              <span className="text-[10px] font-bold text-gray-500 font-mono">2026-11-19</span>
            </div>

            <div className="space-y-3 leading-relaxed">
              <div>
                <h4 className="font-black text-xs text-bauhaus-blue uppercase mb-1 flex items-center gap-1">
                  <span>🚀</span>
                  <span>أبرز المميزات المعتمدة في هذا الإصدار:</span>
                </h4>
                <ul className="list-disc list-inside space-y-1 text-gray-800 font-medium text-[11px]">
                  <li><strong>محرك صوتي متطور:</strong> اعتماد Gemini 2.5 Flash للتحليل الدرامي و Gemini 3.8 Flash Lite TTS للصوت عالي السرعة بأقل استهلاك.</li>
                  <li><strong>وسوم الإلقاء السريع:</strong> شريط وسوم تفاعلي + نافذة الدليل الشامل لكافة وسوم الوقفات والمشاعر والتنفس والبودكاست مع عزل إخراجي تام.</li>
                  <li><strong>نماذج تجريبية دائمة:</strong> نموذج وسوم الإلقاء السريع السينمائي + نموذج بودكاست ثنائي تفاعلي جاهزين للتجربة والمحاكاة.</li>
                  <li><strong>إدارة البريسيتات:</strong> تخصيص العناوين والوصف والألوان الستة والأيقونات الهندسية مع خيارات التحديث المباشر أو الحفظ كنسخة جديدة.</li>
                  <li><strong>مزامنة Google AI Studio:</strong> مطابقة شاشة الصرف `Monthly spend cap: $3.23 / $4.00`، زر ضبط يدوي، وزر تصفير العداد لبدء دورة جديدة.</li>
                  <li><strong>سجل هيستوري مع التصدير:</strong> تتبع كافة الطلبات التوليدية وتصديرها بنقرة واحدة إلى ملف CSV (Excel مع دعم العربية) و JSON.</li>
                  <li><strong>حفظ كـ Plugin ورفع GitHub:</strong> تم تغليف المشروع كـ Plugin رسمي ورفعه على مستودع GitHub: <a href="https://github.com/adamretouche/zhr-synergy-cinema-vo-studio" target="_blank" rel="noopener noreferrer" className="underline font-bold text-blue-700">adamretouche/zhr-synergy-cinema-vo-studio</a>.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-black text-xs text-emerald-800 uppercase mb-1 flex items-center gap-1">
                  <span>🔧</span>
                  <span>المعالجات الهندسية والصوتية:</span>
                </h4>
                <ul className="list-disc list-inside space-y-1 text-gray-800 font-medium text-[11px]">
                  <li><strong>القضاء على الـ Vocoder Glitch:</strong> إزالة طفرات التقطيع الرقمية في نهاية الصوت وتطبيق خفوت تدريجي (Cosine Fade-Out) وبطانة صمت رقمي.</li>
                  <li><strong>تصحيح احتساب التكلفة:</strong> مطابقة المعادلة مع تسعيرة Audio Output Tokens الرسمية ($20.00 / 1M توكن) ليتطابق العداد مع الفاتورة الحقيقية.</li>
                  <li><strong>توازن الواجهة (Bauhaus):</strong> تنظيم كامل لعناصر الترويسة وشريط الوسوم والمحرر باتجاه RTL محكم.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Roadmap Card */}
          <div className="border-2 border-gray-300 bg-gray-50 p-3">
            <h4 className="font-black text-xs text-gray-700 uppercase mb-1 flex items-center gap-1">
              <span>📅</span>
              <span>خطة الإصدارات والتطويرات القادمة (Roadmap):</span>
            </h4>
            <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
              الإصدارات القادمة (v1.1.0+) ستتضمن دعم قوالب البودكاست لأكثر من متحدثين، وتوليد الفيديو المباشر 9:16 مع كابشن عربي تلقائي، وسيتم استئذانك ومشاورتك دائماً قبل اعتماد أي تعديل!
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t-4 border-bauhaus-black flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
            <span>النسخة الحالية:</span>
            <span className="px-2 py-0.5 bg-bauhaus-black text-bauhaus-yellow font-mono font-black">v1.0.0</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-bauhaus-black hover:bg-gray-800 text-white font-bold text-xs cursor-pointer transition-all"
          >
            إغلاق السجل ✕
          </button>
        </div>

      </div>
    </div>
  );
};
