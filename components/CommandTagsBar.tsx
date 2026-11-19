import React from 'react';

interface CommandTagsBarProps {
  onInsertTag: (tag: string) => void;
  disabled?: boolean;
  onOpenGuide?: () => void;
}

const QUICK_COMMANDS = [
  { label: 'وقفة ثانية', tag: '[وقفة: ثانية]', icon: '⏱️', color: 'bg-bauhaus-yellow text-bauhaus-black hover:bg-yellow-400' },
  { label: 'نصف ثانية', tag: '[وقفة: نصف ثانية]', icon: '⏳', color: 'bg-amber-100 text-amber-900 border-amber-500 hover:bg-amber-200' },
  { label: 'بحماس', tag: '[بحماس]', icon: '🔥', color: 'bg-bauhaus-red text-white hover:bg-red-600' },
  { label: 'بهدوء', tag: '[بهدوء]', icon: '🌿', color: 'bg-emerald-600 text-white hover:bg-emerald-700' },
  { label: 'بغموض', tag: '[بغموض وتشويق]', icon: '🔮', color: 'bg-purple-900 text-white hover:bg-purple-800' },
  { label: 'بجدية', tag: '[بجدية ورصانة]', icon: '⚖️', color: 'bg-bauhaus-blue text-white hover:bg-blue-700' },
  { label: 'بهمس', tag: '[بهمس]', icon: '🤫', color: 'bg-purple-600 text-white hover:bg-purple-700' },
  { label: 'توكيد قوي', tag: '[توكيد قوي]', icon: '🎯', color: 'bg-rose-700 text-white hover:bg-rose-800' },
  { label: 'نبرة ختامية', tag: '[نبرة ختامية]', icon: '🔚', color: 'bg-bauhaus-black text-white hover:bg-gray-800' },
  { label: 'المقدم', tag: '[المقدم: سعد]', icon: '🎙️', color: 'bg-indigo-600 text-white hover:bg-indigo-700' },
  { label: 'الضيف', tag: '[الضيف: منى]', icon: '👩‍💼', color: 'bg-teal-600 text-white hover:bg-teal-700' },
  { label: 'ضحكة خفيفة', tag: '[ضحكة خفيفة]', icon: '😄', color: 'bg-orange-500 text-white hover:bg-orange-600' },
];

export const CommandTagsBar: React.FC<CommandTagsBarProps> = ({ 
  onInsertTag, 
  disabled = false,
  onOpenGuide,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 py-1.5 px-2.5 bg-gray-100 border-2 border-bauhaus-black mb-2 shadow-xs" dir="rtl">
      
      {/* Title & Quick Tags List */}
      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-1 text-[11px] font-black uppercase text-bauhaus-black ml-1 flex-shrink-0">
          <span>⚡ وسوم الإلقاء السريع:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1 flex-1">
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd.tag}
              type="button"
              disabled={disabled}
              onClick={() => onInsertTag(cmd.tag)}
              className={`
                flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase border border-bauhaus-black transition-all shadow-xs
                active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer rounded-xs
                ${cmd.color}
              `}
              title={`إدراج وسم ${cmd.tag} لتوجيه النبرة دون أن يُنطق بصوت عالٍ`}
            >
              <span className="text-[10px]">{cmd.icon}</span>
              <span>{cmd.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Guide Button */}
      {onOpenGuide && (
        <button
          type="button"
          onClick={onOpenGuide}
          className="px-2.5 py-1 bg-bauhaus-yellow hover:bg-yellow-400 text-bauhaus-black border border-bauhaus-black font-black text-[10px] uppercase shadow-xs cursor-pointer transition-all flex items-center gap-1 flex-shrink-0 mr-1"
          title="فتح الدليل والمرجع الشامل لكافة وسوم الإلقاء مع أمثلة سكريبتات جاهزة"
        >
          <span>📖</span>
          <span>دليل ومرجع الوسوم (Guide)</span>
        </button>
      )}

    </div>
  );
};
