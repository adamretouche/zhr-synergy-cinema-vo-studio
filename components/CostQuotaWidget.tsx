/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { UsageStats } from '../types';

interface CostQuotaWidgetProps {
  stats: UsageStats;
  onSwitchMode: (newMode: 'FREE' | 'PAID') => void;
  onUpdateBudget: (newBudget: number) => void;
  isPlatformKeyActive: boolean;
  apiConnected?: boolean;
  isSpendCap?: boolean;
  onOpenApiConfig?: () => void;
  onOpenHistory?: () => void;
  onResetStats?: () => void;
}

const AI_STUDIO_SPEND_URL = "https://aistudio.google.com/spend?project=gen-lang-client-0434725851";

export const CostQuotaWidget: React.FC<CostQuotaWidgetProps> = ({
  stats,
  onSwitchMode,
  onUpdateBudget,
  isPlatformKeyActive,
  apiConnected = false,
  isSpendCap = false,
  onOpenApiConfig,
  onOpenHistory,
  onResetStats,
}) => {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(String(stats.budgetUSD || 4.0));

  const budget = stats.budgetUSD || 4.0;
  const percentUsed = Math.min(100, Math.round((stats.totalCostUSD / budget) * 100));

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#0f141d] text-white border-b-2 border-bauhaus-black text-xs font-mono select-none">
      
      {/* Left: Tier Indicator & Mode Switch & Direct AI Studio Spend Link */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Tier Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-white/10">
          <span className={`w-2 h-2 rounded-full ${stats.mode === 'FREE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-bold text-[10px] tracking-wide">
            {stats.mode === 'FREE' ? '🟢 FREE TIER' : '🟡 PAID TIER'}
          </span>
        </div>

        {/* Mode Switch Button */}
        <button
          onClick={() => {
            const nextMode = stats.mode === 'FREE' ? 'PAID' : 'FREE';
            if (nextMode === 'PAID') {
              if (window.confirm("⚠️ تنبيه: هل ترغب في تفعيل وضع الاحتساب المدفوع؟\n\nيتم احتساب التكلفة بأقل تسعيرة رسمية عبر نموذج Gemini 2.5 Flash TTS.")) {
                onSwitchMode('PAID');
              }
            } else {
              onSwitchMode('FREE');
            }
          }}
          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors bg-white/10 hover:bg-white/20 text-gray-200 cursor-pointer"
          title="التبديل بين المسار المجاني والمدفوع"
        >
          {stats.mode === 'FREE' ? 'تبديل للمدفوع ⇄' : 'تبديل للمجاني ⇄'}
        </button>

        {/* AI Studio Spend Link */}
        <a
          href={AI_STUDIO_SPEND_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-500/40 flex items-center gap-1 cursor-pointer transition-all"
          title="فتح صفحة سقف المصروفات والصرف الفعلي في Google AI Studio (LULITA PROJECT)"
        >
          <span>🔗 Google AI Studio Spend</span>
          <span>↗</span>
        </a>

        {isSpendCap ? (
          <div className="flex items-center gap-1.5">
            <a
              href={AI_STUDIO_SPEND_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-600 hover:bg-red-500 text-white flex items-center gap-1 shadow-sm transition-all border border-red-400 animate-pulse cursor-pointer"
              title="اضغط لفتح صفحة سقف المصروفات في Google AI Studio ورفعه فورياً"
            >
              <span>⚠️</span>
              <span>سقف الصرف مكتمل ($) — ارفعه من هنا ↗</span>
            </a>
          </div>
        ) : apiConnected ? (
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ✓ متصل بـ Gemini Cloud API
          </span>
        ) : (
          <span className="text-[10px] text-amber-300 font-bold bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            ⚡ نمط الاستوديو الاحتياطي (24kHz مجاني)
          </span>
        )}
      </div>

      {/* Right: Metrics & Budget Meter */}
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        {/* Requests Count */}
        <div className="flex items-center gap-1 text-gray-300">
          <span className="text-gray-500 font-semibold">طلبات:</span>
          <span className="font-bold text-white">{stats.requestCount}</span>
        </div>

        {/* Audio Duration */}
        <div className="flex items-center gap-1 text-gray-300">
          <span className="text-gray-500 font-semibold">صوت:</span>
          <span className="font-bold text-white">{stats.totalSeconds.toFixed(1)} ث</span>
        </div>

        {/* Tokens Count */}
        <div className="flex items-center gap-1 text-gray-300">
          <span className="text-gray-500 font-semibold">توكنات:</span>
          <span className="font-bold text-white">{stats.totalTokens.toLocaleString()}</span>
        </div>

        {/* Estimated Cost & Budget Meter */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-black/60 border border-amber-500/40">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 font-bold text-[10px]">Monthly spend cap:</span>
              <span className="font-bold text-amber-300 text-xs">
                ${stats.totalCostUSD >= 1 ? stats.totalCostUSD.toFixed(2) : stats.totalCostUSD.toFixed(4)}
              </span>
              <span className="text-gray-500 text-[10px]">/ ${budget.toFixed(2)}</span>
              
              {isEditingBudget ? (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const val = parseFloat(tempBudget);
                    if (!isNaN(val) && val > 0) {
                      onUpdateBudget(val);
                    }
                    setIsEditingBudget(false);
                  }}
                  className="flex items-center gap-1 mr-1"
                >
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={tempBudget}
                    onChange={(e) => setTempBudget(e.target.value)}
                    className="w-12 px-1 py-0.5 bg-black text-amber-300 border border-amber-500 text-[10px] rounded"
                    autoFocus
                  />
                  <button type="submit" className="text-[10px] text-emerald-400 font-bold">✓</button>
                  <button type="button" onClick={() => setIsEditingBudget(false)} className="text-[10px] text-gray-400">✕</button>
                </form>
              ) : (
                <button
                  onClick={() => setIsEditingBudget(true)}
                  className="text-[9px] text-gray-400 hover:text-amber-300 underline cursor-pointer mr-0.5"
                  title="تعديل سقف الميزانية التقديرية"
                >
                  ✏️ السقف
                </button>
              )}
            </div>

            {/* Micro Progress Bar */}
            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-0.5">
              <div 
                className={`h-full transition-all duration-300 ${percentUsed > 85 ? 'bg-red-500' : percentUsed > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
          </div>
        </div>

        {/* History & Reset Controls */}
        <div className="flex items-center gap-1">
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] cursor-pointer transition-all flex items-center gap-1 shadow-xs"
              title="عرض سجل الطلبات والمتابعة وتصدير CSV أو JSON وتعديل المصروف"
            >
              <span>📜</span>
              <span>السجل والتصدير</span>
            </button>
          )}

          {onResetStats && (
            <button
              type="button"
              onClick={onResetStats}
              className="px-1.5 py-1 rounded bg-red-900/60 hover:bg-red-700 text-red-200 border border-red-700 font-bold text-[10px] cursor-pointer transition-all"
              title="تصفير العداد إلى 0.00$ لبدء دورة جديدة"
            >
              🔄 تصفير
            </button>
          )}
        </div>

      </div>

    </div>
  );
};
