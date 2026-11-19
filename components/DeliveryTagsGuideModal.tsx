/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';

interface DeliveryTagsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTag: (tag: string) => void;
  onInsertSnippet?: (text: string) => void;
}

interface TagItem {
  tag: string;
  label: string;
  icon: string;
  desc: string;
  example: string;
  category: 'pauses' | 'emotions' | 'tempo' | 'emphasis' | 'podcast';
}

const ALL_DELIVERY_TAGS: TagItem[] = [
  // 1. Pauses & Breathing
  {
    tag: '[وقفة: ثانية]',
    label: 'وقفة ثانية كاملة',
    icon: '⏱️',
    category: 'pauses',
    desc: 'صمت تام لمدة ثانية واحدة لبناء الترقب أو الفصل بين الأفكار الرئيسية.',
    example: 'واجهوا المستحيل... [وقفة: ثانية] وصنعوا الفارق.'
  },
  {
    tag: '[وقفة: نصف ثانية]',
    label: 'وقفة نصف ثانية',
    icon: '⏳',
    category: 'pauses',
    desc: 'سكتة إيقاعية قصيرة وطبيعية لإراحة الأذن قبل الكلمة المفتاحية.',
    example: 'القرار بيدك، [وقفة: نصف ثانية] والمستقبل ينتظرك.'
  },
  {
    tag: '[وقفة درامية]',
    label: 'وقفة درامية مشحونة',
    icon: '🎭',
    category: 'pauses',
    desc: 'صمت درامي مشحون بالتوتر لزيادة التشويق في اللحظات المصيرية.',
    example: 'كانت الحقيقة أمامهم... [وقفة درامية] لكنهم لم يروها.'
  },
  {
    tag: '[تنفس عميق]',
    label: 'تنفس عميق وتأمل',
    icon: '🫁',
    category: 'pauses',
    desc: 'صوت شهيق هادئ يُضفي لمسة بشرية حية وأصالة للإلقاء.',
    example: '[تنفس عميق] بعد كل تلك السنوات، ها نحن نعود.'
  },
  {
    tag: '[تنهيدة]',
    label: 'تنهيدة خفيفة',
    icon: '💨',
    category: 'pauses',
    desc: 'تعبير صوتي عن الارتياح بعد مشقة أو الحزن الهادئ.',
    example: '[تنهيدة] لقد انتهت الرحلة أخيراً.'
  },

  // 2. Emotions & Tone
  {
    tag: '[بحماس]',
    label: 'بحماس وطاقة عالية',
    icon: '🔥',
    category: 'emotions',
    desc: 'رفع نبرة الصوت وشحنها بالطاقة والحيوية (للإعلانات والافتتاحيات والريلز).',
    example: '[بحماس] لا تفوت العرض الأقوى هذا العام!'
  },
  {
    tag: '[بهدوء]',
    label: 'بهدوء واسترخاء',
    icon: '🌿',
    category: 'emotions',
    desc: 'خفض حدة الصوت والحديث بنعومة وأريحية (للتأمل والشروحات الراقية).',
    example: '[بهدوء] استمع لصوت الطبيعة، ودع العالم خلفك.'
  },
  {
    tag: '[بجدية ورصانة]',
    label: 'بجدية ورصانة',
    icon: '⚖️',
    category: 'emotions',
    desc: 'نبرة محكمة وموثوقة تعكس الهيبة والدقة (للأخبار والتقارير والوثائقيات).',
    example: '[بجدية ورصانة] تشير البيانات إلى تحول تاريخي في الاقتصاد العالمي.'
  },
  {
    tag: '[بغموض وتشويق]',
    label: 'بغموض وتشويق',
    icon: '🔮',
    category: 'emotions',
    desc: 'طبقة صوتية عميقة وجذابة تحبس الأنفاس (لتريلر الأفلام وألغاز التاريخ).',
    example: '[بغموض وتشويق] في ليلة اختفت فيها كل المعالم...'
  },
  {
    tag: '[بهمس]',
    label: 'بهمس وأسرار',
    icon: '🤫',
    category: 'emotions',
    desc: 'أداء صوتي خافت جداً وكأنه سر يلقى في أذن المستمع مباشرة.',
    example: '[بهمس] لا تخبر أحداً بما سمعته هنا.'
  },
  {
    tag: '[بابتسامة وترحاب]',
    label: 'بابتسامة وترحاب',
    icon: '😊',
    category: 'emotions',
    desc: 'نبرة يظهر فيها انشراح الوجه والابتسامة الدافئة (للبودكاست وخدمة العملاء).',
    example: '[بابتسامة وترحاب] مرحباً بكم جميعاً، نسعد بمتابعتكم معنا اليوم.'
  },
  {
    tag: '[بثقة واعتزاز]',
    label: 'بثقة واعتزاز',
    icon: '🦁',
    category: 'emotions',
    desc: 'نبرة شموخ وفخر وقوة (للهوية الوطنية والشركات الكبرى).',
    example: '[بثقة واعتزاز] نصنع المستقبل بعقول وسواعد وطنية.'
  },

  // 3. Tempo & Pacing
  {
    tag: '[بسرعة]',
    label: 'بسرعة وإيقاع خاطف',
    icon: '⚡',
    category: 'tempo',
    desc: 'تسريع نطق الكلمات لخلق شعور بالعجلة أو ضيق الوقت (لشروط المسابقات أو الأكشن).',
    example: '[بسرعة] العرض سارٍ حتى نفاد الكمية!'
  },
  {
    tag: '[ببطء وتأنٍ]',
    label: 'ببطء وتأنٍ شديد',
    icon: '⏳',
    category: 'tempo',
    desc: 'إبطاء سرعة الإلقاء لإعطاء كل مفردة وزناً فلسفياً أو درامياً خاصاً.',
    example: '[ببطء وتأنٍ] كل... ثانية... لها ثمن.'
  },
  {
    tag: '[تسارع تدريجي]',
    label: 'تسارع تدريجي',
    icon: '📈',
    category: 'tempo',
    desc: 'الانتقال من وتيرة هادئة إلى سريعة تصاعدية ترفع الأدرينالين.',
    example: '[تسارع تدريجي] بدأت الفكرة صغيرة، ثم كبرت، حتى اجتاحت كل التوقعات!'
  },
  {
    tag: '[تباطؤ]',
    label: 'تباطؤ هادئ',
    icon: '📉',
    category: 'tempo',
    desc: 'تهدئة تدريجية للإيقاع قبل نهاية الجملة أو المشهد.',
    example: 'وتلاشى كل شيء... [تباطؤ] في هدوء الليل.'
  },

  // 4. Emphasis & Pitch
  {
    tag: '[توكيد قوي]',
    label: 'توكيد وضغط نغمي',
    icon: '🎯',
    category: 'emphasis',
    desc: 'التركيز والضغط الصوتي على الكلمة التالية باعتبارها جوهر المعنى.',
    example: 'ليس مجرد اختيار، بل [توكيد قوي] القرار الأهم في حياتك.'
  },
  {
    tag: '[نبرة ختامية]',
    label: 'نبرة ختامية محكمة',
    icon: '🔚',
    category: 'emphasis',
    desc: 'نزول نغمي هادئ ومحكم في آخر الجملة لإنهاء الإعلان أو الفيديو باحترافية.',
    example: '[نبرة ختامية] سينيرجي للإنتاج السينمائي... قريباً.'
  },
  {
    tag: '[صوت جهوري]',
    label: 'صوت جهوري عميق',
    icon: '📢',
    category: 'emphasis',
    desc: 'تفعيل طبقة القرار العميقة وإبراز رخامة الصوت.',
    example: '[صوت جهوري] حكاية لم تنتهِ فصولها بعد.'
  },

  // 5. Podcast & Multi-Speaker
  {
    tag: '[المقدم: سعد]',
    label: 'مقدم البودكاست',
    icon: '🎙️',
    category: 'podcast',
    desc: 'تعيين خط الحوار للمقدم الرئيسي أو المحاور في البودكاست.',
    example: '[المقدم: سعد] أهلاً بكم في حلقة جديدة من بودكاست حديث الأفكار.'
  },
  {
    tag: '[الضيف: منى]',
    label: 'الضيف في البودكاست',
    icon: '👩‍💼',
    category: 'podcast',
    desc: 'تعيين خط الحوار للضيف المتحدث للتبادل الحواري السلس.',
    example: '[الضيف: منى] سعيدة جداً بتواجدي معكم اليوم!'
  },
  {
    tag: '[ضحكة خفيفة]',
    label: 'ضحكة خفيفة عفوية',
    icon: '😄',
    category: 'podcast',
    desc: 'تفاعل بشري عفوي وطبيعي يكسر الجمود في الحوار.',
    example: '[ضحكة خفيفة] لم أكن أتوقع هذا السؤال صراحة!'
  },
  {
    tag: '[تفاعل عفوي]',
    label: 'تفاعل وموافقة (همم / بالضبط)',
    icon: '💡',
    category: 'podcast',
    desc: 'تفاعل سريع بين المتحدثين لتعزيز واقعية المقابلة.',
    example: '[تفاعل عفوي] نعم بالضبط، هذه هي النقطة الجوهرية.'
  },
];

const DEMO_SCRIPTS = [
  {
    title: '🎬 سكريبت إعلاني وسينمائي (Movie Trailer & Ad)',
    category: 'سينمائي',
    text: `[بغموض وتشويق] في عالمٍ تلاشت فيه كل الآمال... [وقفة: ثانية]
حيث لم يعد هناك متسعٌ للتردد. [تنفس عميق]
[بهمس] هل تسمع هذا الصوت في الأفق؟ [وقفة: نصف ثانية]
[بحماس] إنه ليس مجرد صدى... [توكيد قوي] بل بداية فجر جديد!
[بجدية ورصانة] عندما تقرر خوض التحدي، فلا مجال للتراجع.
[نبرة ختامية] قريباً في دور العرض... سينيرجي للإنتاج السينمائي.`
  },
  {
    title: '🎙️ سكريبت حواري لبودكاست ثنائي (Two-Speaker Podcast)',
    category: 'بودكاست',
    text: `[المقدم: سعد] [بابتسامة وترحاب] مرحباً بكم جميعاً في حلقة جديدة من بودكاست "حديث الأفكار"... [وقفة: نصف ثانية] ضيفنا اليوم خبير في الذكاء الاصطناعي وصناعة المستقبل. أهلاً بك يا منى!

[الضيف: منى] [بفرح وعفوية] أهلاً بك يا سعد، وسعيدة جداً بوجودي معكم ومع المتابعين اليوم! [ضحكة خفيفة]

[المقدم: سعد] [بجدية واهتمام] السؤال الأبرز الذي يشغل الجميع مؤخراً: [وقفة: ثانية] هل سيغير الذكاء الاصطناعي قواعد اللعبة بالكامل؟

[الضيف: منى] [بثقة وتأنٍ] بلا أدنى شك، التغيير لم يعد قادماً... [توكيد قوي] بل نحن نعيش في قلبه الآن!

[المقدم: سعد] [نبرة ختامية] ترقبوا الحلقة كاملة عبر منصات البودكاست المفضلة لديكم.`
  },
  {
    title: '🌿 سكريبت وثائقي وتأملي هادئ (Documentary & Storytelling)',
    category: 'وثائقي',
    text: `[بهدوء] تمتد هذه الواحة الخضراء منذ آلاف السنين... [وقفة: ثانية]
تروي حكاية أجداد صانعوا الحياة وسط الصحراء. [تنفس عميق]
[ببطء وتأنٍ] كل حجر هنا يحمل سراً، [وقفة: نصف ثانية] وكل شجرة نخيل تروي سيرة أجيال.
[بثقة واعتزاز] تاريخ لا يموت، وهوية تتجدد مع كل شروق شمس.
[نبرة ختامية] استكشف روعة المكان... حيث يلتقي التراث بالمستقبل.`
  }
];

export const DeliveryTagsGuideModal: React.FC<DeliveryTagsGuideModalProps> = ({
  isOpen,
  onClose,
  onInsertTag,
  onInsertSnippet,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pauses' | 'emotions' | 'tempo' | 'emphasis' | 'podcast' | 'examples'>('all');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const filteredTags = activeTab === 'all' 
    ? ALL_DELIVERY_TAGS 
    : ALL_DELIVERY_TAGS.filter(t => t.category === activeTab);

  return (
    <div 
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-6 font-sans select-none overflow-y-auto"
      dir="rtl"
      style={{ textAlign: 'right' }}
    >
      <div className="bg-white border-4 border-bauhaus-black w-full max-w-4xl shadow-2xl p-5 md:p-7 text-right max-h-[94vh] flex flex-col my-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-4 border-bauhaus-black pb-3 mb-4 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📖</span>
              <h2 className="text-lg md:text-xl font-black text-bauhaus-black uppercase tracking-tight">
                دليل ومرجع وسوم الإلقاء السريع (Speech Markup Guide)
              </h2>
            </div>
            <p className="text-xs text-gray-600 font-semibold mt-0.5">
              توجيهات أداء وإخراج صوتي متقدمة لتحويل النص العادي إلى أداء سينمائي وبودكاست حي دون أن تُنطق الوسوم بصوت عالٍ
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

        {/* Info Banner */}
        <div className="mb-3 p-3 bg-yellow-50 border-2 border-bauhaus-black flex items-center justify-between text-xs font-bold text-bauhaus-black">
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <span>
              <strong>القاعدة الذهبية:</strong> كافة هذه الوسوم معزولة برمجياً، يفهمها الذكاء الاصطناعي كتعليمات نبرة ووقفات <strong>ولن ينطقها إطلاقاً</strong> في الملف الصوتي!
            </span>
          </div>
          <span className="text-[10px] bg-black text-yellow-300 px-2 py-0.5 border border-black uppercase font-mono">
            Zero Audio Pollution
          </span>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b-2 border-bauhaus-black pb-2 mb-3 flex-shrink-0">
          {[
            { id: 'all', label: 'كافة الوسوم (All)', icon: '📚' },
            { id: 'pauses', label: 'الوقفات والتنفس', icon: '⏱️' },
            { id: 'emotions', label: 'النبرة والمشاعر', icon: '🔥' },
            { id: 'tempo', label: 'السرعة والإيقاع', icon: '⚡' },
            { id: 'emphasis', label: 'التوكيد والطبقات', icon: '🎯' },
            { id: 'podcast', label: 'البودكاست والحوار', icon: '🎙️' },
            { id: 'examples', label: 'نماذج سكريبتات جاهزة', icon: '📜' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-bold border-2 border-bauhaus-black transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === tab.id
                  ? 'bg-bauhaus-yellow text-bauhaus-black font-black shadow-hard-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="space-y-3 overflow-y-auto flex-1 px-1 custom-scrollbar">

          {activeTab === 'examples' ? (
            /* Examples View */
            <div className="space-y-4">
              {DEMO_SCRIPTS.map((demo, idx) => (
                <div key={idx} className="border-3 border-bauhaus-black bg-gray-50 p-4 shadow-sm">
                  <div className="flex justify-between items-center border-b-2 border-gray-300 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-bauhaus-black text-white text-[10px] font-black uppercase">
                        {demo.category}
                      </span>
                      <h4 className="font-black text-sm text-bauhaus-black">{demo.title}</h4>
                    </div>
                    {onInsertSnippet && (
                      <button
                        type="button"
                        onClick={() => {
                          onInsertSnippet(demo.text);
                          onClose();
                        }}
                        className="px-3 py-1 bg-bauhaus-yellow hover:bg-yellow-400 text-bauhaus-black font-black text-xs border border-black shadow-xs cursor-pointer transition-all flex items-center gap-1"
                      >
                        <span>📥 إدراج هذا النموذج في المحرر الآن</span>
                      </button>
                    )}
                  </div>
                  <pre className="p-3 bg-white border border-gray-300 font-sans text-xs leading-relaxed text-gray-800 whitespace-pre-wrap select-text">
                    {demo.text}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            /* Tags Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTags.map((item) => (
                <div 
                  key={item.tag}
                  className="border-2 border-bauhaus-black p-3 bg-white hover:bg-yellow-50/50 transition-colors flex flex-col justify-between shadow-xs"
                >
                  <div>
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{item.icon}</span>
                        <code className="px-1.5 py-0.5 bg-bauhaus-black text-bauhaus-yellow font-mono font-bold text-xs border border-black rounded-xs select-all">
                          {item.tag}
                        </code>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500">{item.label}</span>
                    </div>

                    <p className="text-[11px] text-gray-700 leading-tight mb-2 font-medium">
                      {item.desc}
                    </p>

                    <div className="p-2 bg-gray-50 border border-gray-200 rounded-xs mb-2">
                      <span className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">مثال عملي:</span>
                      <p className="text-[11px] font-semibold text-gray-800 italic" dir="rtl">
                        "{item.example}"
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => onInsertTag(item.tag)}
                      className="flex-1 py-1 bg-bauhaus-yellow hover:bg-yellow-400 text-bauhaus-black font-black text-[10px] border border-black cursor-pointer transition-all shadow-xs"
                      title="إدراج هذا الوسم مباشرة في مكان المؤشر في نص السكربت"
                    >
                      + إدراج في النص
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.tag)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-[10px] border border-gray-400 cursor-pointer transition-all"
                      title="نسخ الوسم للحافظة"
                    >
                      {copiedTag === item.tag ? 'تم النسخ ✓' : 'نسخ 📋'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t-4 border-bauhaus-black flex justify-between items-center flex-shrink-0">
          <span className="text-[11px] text-gray-500 font-bold">
            يمكنك دمج أكثر من وسم في نفس الفقرة للحصول على أداء درامي متصاعد.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-bauhaus-black hover:bg-gray-800 text-white font-bold text-xs cursor-pointer transition-all"
          >
            إغلاق الدليل ✕
          </button>
        </div>

      </div>
    </div>
  );
};
