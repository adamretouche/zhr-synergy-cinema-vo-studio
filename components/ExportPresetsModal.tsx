/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { IntroStyle } from '../types';
import { getIcon, getColorClass } from './BauhausComponents';

interface ExportPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customPresets: IntroStyle[];
  onExportSuccess?: (count: number, filename: string) => void;
}

export const ExportPresetsModal: React.FC<ExportPresetsModalProps> = ({
  isOpen,
  onClose,
  customPresets,
  onExportSuccess,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialize all selected by default when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(customPresets.map((p) => p.id)));
    }
  }, [isOpen, customPresets]);

  if (!isOpen) return null;

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(customPresets.map((p) => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const downloadJsonFile = (data: any, defaultFilename: string) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', defaultFilename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportSelected = () => {
    const selectedPresets = customPresets.filter((p) => selectedIds.has(p.id));
    if (selectedPresets.length === 0) {
      alert('يرجى تحديد بريسيت واحد على الأقل لتصديره.');
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    let filename = `synergy_custom_presets_${selectedPresets.length}_items_${dateStr}.json`;
    if (selectedPresets.length === 1) {
      const cleanName = selectedPresets[0].name.replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_').slice(0, 25);
      filename = `synergy_preset_${cleanName}_${dateStr}.json`;
    }

    // If single preset, export as object or single array
    downloadJsonFile(selectedPresets, filename);
    if (onExportSuccess) {
      onExportSuccess(selectedPresets.length, filename);
    }
    onClose();
  };

  const handleExportAll = () => {
    if (customPresets.length === 0) {
      alert('لا توجد بريسيتات مخصصة للتصدير.');
      return;
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `synergy_all_custom_presets_${customPresets.length}_items_${dateStr}.json`;
    downloadJsonFile(customPresets, filename);
    if (onExportSuccess) {
      onExportSuccess(customPresets.length, filename);
    }
    onClose();
  };

  const handleExportSingleDirect = (preset: IntroStyle, e: React.MouseEvent) => {
    e.stopPropagation();
    const dateStr = new Date().toISOString().slice(0, 10);
    const cleanName = preset.name.replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_').slice(0, 25);
    const filename = `synergy_preset_${cleanName}_${dateStr}.json`;
    downloadJsonFile([preset], filename);
    if (onExportSuccess) {
      onExportSuccess(1, filename);
    }
  };

  const isAllSelected = customPresets.length > 0 && selectedIds.size === customPresets.length;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs text-right animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-bauhaus-white border-4 border-bauhaus-black shadow-hard flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-bauhaus-black bg-bauhaus-yellow p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📤</span>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-bauhaus-black">
                تصدير البريسيتات المخصصة / EXPORT PRESETS
              </h2>
              <p className="text-xs font-bold text-bauhaus-black/80 mt-0.5">
                اختر بريسيت محدد، أو عدة بريسيتات معينة، أو تصدير الكل دفعة واحدة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center border-2 border-bauhaus-black bg-white hover:bg-bauhaus-red hover:text-white font-black text-lg transition-colors cursor-pointer"
            title="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Action Bar (Select All / Deselect All / Counter) */}
        <div className="p-3 bg-gray-100 border-b-2 border-bauhaus-black flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className={`px-3 py-1.5 text-xs font-bold border-2 border-bauhaus-black transition-all cursor-pointer ${
                isAllSelected ? 'bg-bauhaus-black text-white' : 'bg-white hover:bg-yellow-200 text-bauhaus-black'
              }`}
            >
              ✓ تحديد الكل ({customPresets.length})
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-3 py-1.5 text-xs font-bold border-2 border-bauhaus-black bg-white hover:bg-red-100 text-bauhaus-black transition-all cursor-pointer"
            >
              ✕ إلغاء التحديد
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-2.5 py-1 bg-bauhaus-black text-white rounded-xs">
              المحدد: {selectedIds.size} من {customPresets.length}
            </span>
          </div>
        </div>

        {/* Presets List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar bg-slate-50">
          {customPresets.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-bold border-2 border-dashed border-gray-300 bg-white">
              لا توجد بريسيتات مخصصة محفوظة حالياً لتصديرها.
            </div>
          ) : (
            customPresets.map((preset) => {
              const isSelected = selectedIds.has(preset.id);
              return (
                <div
                  key={preset.id}
                  onClick={() => handleToggleSelect(preset.id)}
                  className={`flex items-center justify-between p-3 border-2 border-bauhaus-black transition-all cursor-pointer ${
                    isSelected ? 'bg-amber-50 shadow-xs ring-2 ring-bauhaus-black' : 'bg-white hover:bg-gray-100 opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Custom Checkbox */}
                    <div
                      className={`w-6 h-6 flex items-center justify-center border-2 border-bauhaus-black font-black text-sm flex-shrink-0 transition-all ${
                        isSelected ? 'bg-bauhaus-black text-white' : 'bg-white'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </div>

                    {/* Icon / Color Preview */}
                    <div
                      className={`w-9 h-9 flex-shrink-0 flex items-center justify-center border-2 border-bauhaus-black ${getColorClass(
                        preset.color || 'yellow',
                        false
                      )}`}
                    >
                      {getIcon(preset.icon || 'circle', 'w-4 h-4')}
                    </div>

                    {/* Preset Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-bauhaus-black truncate">{preset.name}</span>
                        {preset.defaultVoice && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-900 border border-blue-800 rounded-xs uppercase">
                            🎙️ {preset.defaultVoice}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 truncate mt-0.5">
                        {preset.description || preset.templateText?.slice(0, 60) || 'بدون وصف'}
                      </p>
                    </div>
                  </div>

                  {/* Individual 1-Click Export Button */}
                  <div className="flex items-center gap-2 flex-shrink-0 mr-2">
                    <button
                      type="button"
                      onClick={(e) => handleExportSingleDirect(preset, e)}
                      title="تصدير هذا البريسيت بمفرده كملف JSON منفصل"
                      className="px-2.5 py-1 text-[11px] font-black bg-blue-600 hover:bg-blue-700 text-white border border-bauhaus-black shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>📤</span>
                      <span>تصدير هذا فقط</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t-4 border-bauhaus-black bg-bauhaus-white flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 border-2 border-bauhaus-black font-bold text-xs uppercase cursor-pointer"
          >
            إلغاء / CANCEL
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportAll}
              className="px-4 py-2 bg-white hover:bg-yellow-100 border-2 border-bauhaus-black font-black text-xs uppercase tracking-wide flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <span>📦</span>
              <span>تصدير كل البريسيتات ({customPresets.length})</span>
            </button>

            <button
              type="button"
              onClick={handleExportSelected}
              disabled={selectedIds.size === 0}
              className={`px-5 py-2 border-2 border-bauhaus-black font-black text-xs uppercase tracking-wide flex items-center gap-2 shadow-hard-sm transition-all cursor-pointer ${
                selectedIds.size > 0
                  ? 'bg-bauhaus-yellow hover:bg-yellow-400 text-bauhaus-black'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
              }`}
            >
              <span>📤</span>
              <span>تصدير المحدد ({selectedIds.size}) JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
