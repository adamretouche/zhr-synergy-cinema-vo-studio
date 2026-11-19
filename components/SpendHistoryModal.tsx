/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { HistoryEntry, UsageStats } from '../types';

interface SpendHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UsageStats;
  history: HistoryEntry[];
  onUpdateSpend: (newSpend: number) => void;
  onUpdateBudget: (newBudget: number) => void;
  onResetStats: () => void;
  onClearHistory: () => void;
}

const AI_STUDIO_SPEND_URL = "https://aistudio.google.com/spend?project=gen-lang-client-0434725851";

export const SpendHistoryModal: React.FC<SpendHistoryModalProps> = ({
  isOpen,
  onClose,
  stats,
  history,
  onUpdateSpend,
  onUpdateBudget,
  onResetStats,
  onClearHistory,
}) => {
  const [spendInput, setSpendInput] = useState(String(stats.totalCostUSD >= 1 ? stats.totalCostUSD.toFixed(2) : stats.totalCostUSD.toFixed(4)));
  const [budgetInput, setBudgetInput] = useState(String(stats.budgetUSD || 4.0));
  const [searchFilter, setSearchFilter] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSpend = stats.totalCostUSD;
  const currentBudget = stats.budgetUSD || 4.0;
  const percentUsed = Math.min(100, Math.round((currentSpend / currentBudget) * 100));

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleApplySpendAndCap = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSpend = parseFloat(spendInput);
    const parsedBudget = parseFloat(budgetInput);

    if (!isNaN(parsedSpend) && parsedSpend >= 0) {
      onUpdateSpend(Number(parsedSpend.toFixed(5)));
    }
    if (!isNaN(parsedBudget) && parsedBudget > 0) {
      onUpdateBudget(Number(parsedBudget.toFixed(2)));
    }
    showFeedback('✓ تم حفظ وتحديث رقم المصروف وسقف الميزانية بنجاح!');
  };

  const handleAddQuickSpend = (amount: number) => {
    const nextVal = Number((stats.totalCostUSD + amount).toFixed(5));
    onUpdateSpend(nextVal);
    setSpendInput(String(nextVal >= 1 ? nextVal.toFixed(2) : nextVal.toFixed(4)));
    showFeedback(`✓ تمت إضافة $${amount.toFixed(2)} إلى المصروف الحالي.`);
  };

  const handleConfirmReset = () => {
    if (window.confirm("⚠️ هل أنت متأكد من تصفير عداد الاستهلاك إلى $0.00؟\n\nسيتم تصفير: المصروف، عدد الطلبات، التوكنز، وعدد الثواني لتبدأ دورة حسابية جديدة متزامنة مع الـ API.")) {
      onResetStats();
      setSpendInput('0.00');
      showFeedback('✓ تم تصفير كافة العدادات بنجاح لبدء دورة جديدة!');
    }
  };

  // Export to CSV with UTF-8 BOM for Arabic support in Excel
  const handleExportCSV = () => {
    if (history.length === 0) {
      alert("لا يوجد سجل طلبات لتصديره حالياً.");
      return;
    }

    const headers = [
      "المعرف (ID)",
      "التاريخ والوقت",
      "نمط الاستوديو",
      "الصوت",
      "مقتطف النص",
      "المدة (ث)",
      "التوكنز",
      "التكلفة بالدولار ($)",
      "النموذج (Model)"
    ];

    const rows = history.map((entry) => [
      `"${entry.id}"`,
      `"${new Date(entry.timestamp).toLocaleString('ar-SA')}"`,
      `"${entry.styleName.replace(/"/g, '""')}"`,
      `"${entry.voice}"`,
      `"${entry.textSnippet.replace(/"/g, '""')}"`,
      entry.durationSeconds,
      entry.tokensUsed,
      entry.costUSD.toFixed(6),
      `"${entry.model}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `synergy_generation_history_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showFeedback("✓ تم تحميل ملف السجل بصيغة CSV بنجاح!");
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (history.length === 0) {
      alert("لا يوجد سجل طلبات لتصديره حالياً.");
      return;
    }

    const exportData = {
      project: "LULITA PROJECT",
      generatedAt: new Date().toISOString(),
      summary: {
        totalRequests: stats.requestCount,
        totalTokens: stats.totalTokens,
        totalSeconds: stats.totalSeconds,
        totalCostUSD: stats.totalCostUSD,
        monthlySpendCap: stats.budgetUSD,
      },
      history: history,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `synergy_generation_history_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showFeedback("✓ تم تحميل ملف السجل بصيغة JSON بنجاح!");
  };

  const filteredHistory = history.filter((h) => {
    if (!searchFilter.trim()) return true;
    const query = searchFilter.toLowerCase();
    return (
      h.styleName.toLowerCase().includes(query) ||
      h.voice.toLowerCase().includes(query) ||
      h.textSnippet.toLowerCase().includes(query) ||
      h.model.toLowerCase().includes(query)
    );
  });

  return (
    <div 
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-6 font-sans select-none overflow-y-auto"
      dir="rtl"
      style={{ textAlign: 'right' }}
    >
      <div className="bg-white border-4 border-bauhaus-black w-full max-w-4xl shadow-2xl p-5 md:p-7 text-right max-h-[94vh] flex flex-col my-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-4 border-bauhaus-black pb-3 mb-4 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <h2 className="text-lg md:text-xl font-black text-bauhaus-black uppercase tracking-tight">
                إدارة المصروف الفعلي وسجل الاستهلاك (Spend & History)
              </h2>
            </div>
            <p className="text-xs text-gray-600 font-semibold mt-0.5">
              مزامنة المصروف مع Google AI Studio، التحكم بسقف الصرف الشهري، وتصدير سجل الطلبات (CSV / JSON)
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

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className="mb-3 px-3 py-2 bg-emerald-100 border-2 border-emerald-600 text-emerald-900 text-xs font-black rounded-sm flex items-center justify-between">
            <span>{feedbackMsg}</span>
            <span className="text-emerald-700">✓</span>
          </div>
        )}

        <div className="space-y-4 overflow-y-auto flex-1 px-1 custom-scrollbar">

          {/* SECTION 1: Google AI Studio Spend Cap Sync Card */}
          <div className="border-3 border-bauhaus-black bg-[#0f141d] text-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-lg">💰</span>
                <div>
                  <div className="text-xs font-black uppercase text-amber-300 tracking-wider">
                    Monthly spend cap (Experimental)
                  </div>
                  <div className="text-[11px] text-gray-400">
                    مطابقة ومزامنة الاستهلاك مع لوحة تحكم Gemini API الرسمية
                  </div>
                </div>
              </div>
              <a
                href={AI_STUDIO_SPEND_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-purple-700 hover:bg-purple-600 border border-purple-400 text-white text-[11px] font-black rounded cursor-pointer transition-all flex items-center gap-1 shadow-sm"
              >
                <span>🔗 فتح صفحة الصرف في Google AI Studio</span>
                <span className="text-xs">↗</span>
              </a>
            </div>

            {/* Live Progress Display */}
            <div className="bg-black/70 p-3 border border-white/10 mb-3">
              <div className="flex justify-between items-baseline mb-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono text-amber-300">
                    ${currentSpend.toFixed(2)}
                  </span>
                  <span className="text-sm font-bold font-mono text-gray-400">
                    / ${currentBudget.toFixed(2)} USD
                  </span>
                </div>
                <span className={`text-xs font-black font-mono px-2 py-0.5 rounded ${percentUsed > 85 ? 'bg-red-600 text-white' : percentUsed > 50 ? 'bg-amber-500 text-black' : 'bg-emerald-600 text-white'}`}>
                  {percentUsed}% مستهلك
                </span>
              </div>
              <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden border border-white/10">
                <div 
                  className={`h-full transition-all duration-300 ${percentUsed > 85 ? 'bg-red-500' : percentUsed > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
            </div>

            {/* Manual Controls Form */}
            <form onSubmit={handleApplySpendAndCap} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Input 1: Spend */}
                <div className="bg-black/50 p-2.5 border border-white/10">
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">
                    ✏️ رقم الاستهلاك الفعلي الحالي ($):
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-amber-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.00001"
                      min="0"
                      value={spendInput}
                      onChange={(e) => setSpendInput(e.target.value)}
                      placeholder="مثال: 3.18"
                      className="w-full px-2 py-1 bg-black text-amber-300 border border-amber-500/60 font-mono font-bold text-xs rounded outline-none"
                    />
                  </div>
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddQuickSpend(0.5)}
                      className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 text-[10px] font-bold text-gray-300 rounded cursor-pointer"
                    >
                      +$0.50
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuickSpend(1.0)}
                      className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 text-[10px] font-bold text-gray-300 rounded cursor-pointer"
                    >
                      +$1.00
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSpendInput('3.23');
                        onUpdateSpend(3.23);
                        showFeedback('✓ تمت مزامنة المصروف الفعلي إلى $3.23 بنجاح!');
                      }}
                      className="px-2 py-0.5 bg-purple-700 hover:bg-purple-600 text-[10px] font-black text-white rounded cursor-pointer border border-purple-400 shadow-xs"
                      title="مزامنة المصروف الحالي مع Google AI Studio ($3.23)"
                    >
                      مزامنة $3.23 (AI Studio) 🎯
                    </button>
                  </div>
                </div>

                {/* Input 2: Budget Cap */}
                <div className="bg-black/50 p-2.5 border border-white/10">
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">
                    🛡️ سقف المصروف الشهري Spend Cap ($):
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-amber-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      placeholder="مثال: 4.00"
                      className="w-full px-2 py-1 bg-black text-white border border-gray-600 font-mono font-bold text-xs rounded outline-none"
                    />
                  </div>
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => { setBudgetInput('4.00'); onUpdateBudget(4.0); showFeedback('✓ تم ضبط السقف على $4.00'); }}
                      className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 text-[10px] font-bold text-gray-300 rounded cursor-pointer"
                    >
                      $4.00 الافتراضي
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBudgetInput('10.00'); onUpdateBudget(10.0); showFeedback('✓ تم ضبط السقف على $10.00'); }}
                      className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 text-[10px] font-bold text-gray-300 rounded cursor-pointer"
                    >
                      $10.00
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Spend */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-bauhaus-yellow hover:bg-yellow-400 text-bauhaus-black font-black text-xs uppercase border-2 border-bauhaus-black shadow-hard-xs cursor-pointer transition-all"
                >
                  💾 حفظ وتطبيق التعديل على العداد
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase border-2 border-black shadow-hard-xs cursor-pointer transition-all flex items-center gap-1"
                  title="تصفير كافة العدادات لبدء دورة جديدة"
                >
                  <span>🔄</span>
                  <span>تصفير العداد إلى $0.00 (Reset Counter)</span>
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 2: Generation Audit History & Export */}
          <div className="border-2 border-bauhaus-black bg-white p-4">
            
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-bauhaus-black pb-3 mb-3">
              <div>
                <h3 className="text-sm font-black text-bauhaus-black uppercase tracking-tight flex items-center gap-1.5">
                  <span>📜</span>
                  <span>سجل التوليد الصوتي والمتابعة ({history.length} عملية مسجلة)</span>
                </h3>
                <p className="text-[11px] text-gray-500 font-bold">
                  يتتبع كل استدعاء بالوقت والصوت والتوكن والتكلفة لإمكانية مراجعته وتصديره
                </p>
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={history.length === 0}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs border border-black shadow-xs cursor-pointer transition-all flex items-center gap-1"
                  title="تصدير السجل كملف Excel / CSV متوافق مع اللغة العربية"
                >
                  <span>📥</span>
                  <span>تصدير CSV (Excel)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  disabled={history.length === 0}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs border border-black shadow-xs cursor-pointer transition-all flex items-center gap-1"
                  title="تصدير السجل كملف JSON للنسخ الاحتياطي"
                >
                  <span>📥</span>
                  <span>تصدير JSON</span>
                </button>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("هل أنت متأكد من مسح سجل العمليات الحالي بالكامل؟")) {
                        onClearHistory();
                        showFeedback("✓ تم مسح السجل بنجاح.");
                      }
                    }}
                    className="px-2.5 py-1.5 bg-gray-200 hover:bg-red-100 text-red-700 font-bold text-xs border border-gray-400 cursor-pointer transition-all"
                  >
                    مسح السجل 🗑️
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filter Search Input */}
            {history.length > 0 && (
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="🔍 بحث سريع في السجل (بالنمط، اسم الصوت، أو كلمات النص)..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full px-3 py-1.5 border-2 border-bauhaus-black text-xs font-semibold outline-none focus:bg-yellow-50"
                />
              </div>
            )}

            {/* History Table */}
            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-500 border border-dashed border-gray-400 bg-gray-50 font-bold text-xs">
                {history.length === 0 
                  ? "لا يوجد سجل عمليات توليد بعد. كل عملية توليد تقوم بها ستظهر هنا تلقائياً مع توقيتها وتكلفتها."
                  : "لا توجد نتائج تطابق بحثك في السجل."}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[300px] border border-bauhaus-black custom-scrollbar">
                <table className="w-full text-right text-xs font-sans border-collapse">
                  <thead className="bg-bauhaus-black text-white sticky top-0 font-black text-[11px] uppercase">
                    <tr>
                      <th className="p-2 border-b border-gray-700">الوقت</th>
                      <th className="p-2 border-b border-gray-700">النمط</th>
                      <th className="p-2 border-b border-gray-700">الصوت</th>
                      <th className="p-2 border-b border-gray-700">مقتطف النص</th>
                      <th className="p-2 border-b border-gray-700 text-center">المدة</th>
                      <th className="p-2 border-b border-gray-700 text-center">التوكنز</th>
                      <th className="p-2 border-b border-gray-700 text-center">التكلفة</th>
                      <th className="p-2 border-b border-gray-700">النموذج</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredHistory.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-yellow-50 transition-colors font-medium">
                        <td className="p-2 whitespace-nowrap text-[10px] text-gray-600 font-mono">
                          {new Date(item.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="p-2 whitespace-nowrap font-bold text-bauhaus-black">
                          {item.styleName}
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 text-[10px] font-bold rounded">
                            {item.voice}
                          </span>
                        </td>
                        <td className="p-2 max-w-[200px] truncate text-[11px] text-gray-700" title={item.textSnippet}>
                          {item.textSnippet}
                        </td>
                        <td className="p-2 whitespace-nowrap text-center font-mono text-[11px]">
                          {item.durationSeconds}ث
                        </td>
                        <td className="p-2 whitespace-nowrap text-center font-mono font-bold text-emerald-700 text-[11px]">
                          {item.tokensUsed.toLocaleString()}
                        </td>
                        <td className="p-2 whitespace-nowrap text-center font-mono font-bold text-amber-800 text-[11px]">
                          ${item.costUSD.toFixed(5)}
                        </td>
                        <td className="p-2 whitespace-nowrap text-[10px] text-gray-500 font-mono truncate max-w-[120px]">
                          {item.model}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="pt-3 mt-3 border-t-4 border-bauhaus-black flex justify-between items-center flex-shrink-0">
          <div className="text-[11px] text-gray-600 font-bold">
            مشروع: <span className="font-mono text-black">LULITA PROJECT (gen-lang-client-0434725851)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-bauhaus-black hover:bg-gray-800 text-white font-bold text-xs cursor-pointer transition-all"
          >
            إغلاق النافذة ✕
          </button>
        </div>

      </div>
    </div>
  );
};
