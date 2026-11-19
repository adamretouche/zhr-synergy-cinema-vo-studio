import React from 'react';

interface DramatizeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDramatize: () => void;
  onProceedDirect: () => void;
}

export const DramatizeConfirmModal: React.FC<DramatizeConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmDramatize,
  onProceedDirect,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      dir="rtl"
    >
      <div 
        className="w-full max-w-lg bg-bauhaus-white border-4 border-bauhaus-black shadow-hard p-6 md:p-8 relative"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Badge */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b-4 border-bauhaus-black">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-bauhaus-yellow text-bauhaus-black font-black text-xs uppercase border-2 border-bauhaus-black">
              ⚠️ تنبيه توفير الرصيد | Credit Saving
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-lg font-black hover:text-bauhaus-red cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <h3 className="text-lg md:text-xl font-black uppercase text-bauhaus-black mb-3">
          تشغيل الأداء الدرامي السينمائي (Dramatize)
        </h3>

        <div className="bg-amber-50 border-2 border-amber-300 p-4 text-xs font-bold text-amber-950 mb-5 leading-relaxed space-y-2">
          <p>
            تتضمن ميزة <strong>الدراماتايز (Dramatize)</strong> إجراء تحليل ذكاء اصطناعي إضافي معمق للنص لاستخراج مؤشرات التعبير الصوتي والنَفَس والوقفات، مما <strong>يستهلك كريديت وتوكنات إضافية</strong> من الـ API.
          </p>
          <p className="text-emerald-900 bg-emerald-100 p-2.5 border border-emerald-300 rounded-sm">
            💡 <strong>آلية التوفير القصوى (توفير 70% إلى 80%):</strong><br />
            إذا كان النص جاهزاً وتريد قراءته بنقاء سينمائي بالنمط والصوت المختار دون استهلاك توكنات تحليل درامي، يمكنك اختيار <strong>توليد مباشر وتوفير الرصيد</strong> فوراً.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onProceedDirect();
            }}
            className="flex-1 px-4 py-3 bg-bauhaus-green text-white font-black text-xs md:text-sm uppercase border-4 border-bauhaus-black shadow-hard-sm hover:brightness-105 active:translate-y-1 transition-all cursor-pointer text-center"
          >
            🛡️ توليد مباشر (توفير 80%)
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirmDramatize();
            }}
            className="flex-1 px-4 py-3 bg-bauhaus-red text-white font-black text-xs md:text-sm uppercase border-4 border-bauhaus-black shadow-hard-sm hover:brightness-105 active:translate-y-1 transition-all cursor-pointer text-center"
          >
            🎭 موافق، تابع الأداء الدرامي
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-3 py-2 text-[11px] font-bold text-gray-500 hover:text-bauhaus-black text-center uppercase cursor-pointer"
        >
          إلغاء الأمر والرجوع
        </button>
      </div>
    </div>
  );
};
