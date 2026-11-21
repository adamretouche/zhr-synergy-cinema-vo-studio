/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { INTRO_STYLES } from '../constants';
import { getIcon, getColorClass } from './BauhausComponents';
import { IntroStyle } from '../types';

interface StyleSelectorProps {
  selectedStyle: IntroStyle;
  onSelect: (style: IntroStyle) => void;
  onCustomize: () => void;
  customPresets?: IntroStyle[];
  onDeletePreset?: (id: string) => void;
  onEditPreset?: (preset: IntroStyle) => void;
  onSaveCurrentAsPreset?: () => void;
  onExportPresets?: () => void;
  onImportPresets?: (file: File) => void;
  onExportSingle?: (preset: IntroStyle) => void;
  cloudSyncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  onSyncPresets?: () => void;
}

interface StyleButtonProps {
  style: IntroStyle;
  isSelected: boolean;
  onClick: () => void;
  effectiveAvatarSrc?: string;
  onDelete?: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
  onExportSingle?: (e: React.MouseEvent) => void;
}

const StyleButton: React.FC<StyleButtonProps> = ({ 
  style, 
  isSelected, 
  onClick, 
  effectiveAvatarSrc,
  onDelete,
  onEdit, 
  onExportSingle,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClick}
      className={`
        group relative flex items-center justify-between p-4 text-left border-b-4 border-bauhaus-black transition-all cursor-pointer
        ${isSelected ? 'bg-bauhaus-black text-white' : 'hover:bg-gray-100 text-bauhaus-black'}
      `}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className={`
          w-10 h-10 flex-shrink-0 flex items-center justify-center border-4 border-current overflow-hidden
          ${isSelected ? 'bg-white text-black' : getColorClass(style.color, false)}
        `}>
          {effectiveAvatarSrc && !imgError ? (
            <img 
              src={effectiveAvatarSrc} 
              alt={style.name} 
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            getIcon(style.icon, "w-5 h-5")
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold uppercase text-sm leading-tight mb-0.5 truncate">{style.name}</div>
          {style.isCustom && (
            <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 bg-bauhaus-yellow text-black rounded-sm uppercase">
              ⭐ مخصص (PRESET)
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {style.isCustom && onExportSingle && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExportSingle(e);
            }}
            title="تصدير هذا البريسيت بمفرده كملف منفصل (JSON)"
            className="w-6 h-6 flex items-center justify-center rounded-sm bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs border border-bauhaus-black shadow-xs transition-colors cursor-pointer"
          >
            📤
          </button>
        )}
        {style.isCustom && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(e);
            }}
            title="تعديل هذا البريسيت (العنوان، الوصف، أو نمط اللون)"
            className="w-6 h-6 flex items-center justify-center rounded-sm bg-bauhaus-yellow hover:bg-yellow-400 text-bauhaus-black font-bold text-xs border border-bauhaus-black shadow-xs transition-colors cursor-pointer"
          >
            ✏️
          </button>
        )}
        {style.isCustom && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            title="حذف هذا البريسيت"
            className="w-6 h-6 flex items-center justify-center rounded-sm bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        )}
        {isSelected && (
          <div className="w-3 h-3 bg-white rounded-full animate-pulse flex-shrink-0"></div>
        )}
      </div>
    </div>
  );
};

export const StyleSelector: React.FC<StyleSelectorProps> = ({ 
  selectedStyle, 
  onSelect, 
  onCustomize,
  customPresets = [],
  onDeletePreset,
  onEditPreset,
  onSaveCurrentAsPreset,
  onExportPresets,
  onImportPresets,
  onExportSingle,
  cloudSyncStatus = 'idle',
  onSyncPresets,
}) => {
  return (
    <div className="flex flex-col h-full bg-bauhaus-white">
      
      {/* Top Action: Save Current As Preset & Export/Import */}
      {onSaveCurrentAsPreset && (
        <div className="p-2.5 border-b-4 border-bauhaus-black bg-yellow-50">
          <button
            onClick={onSaveCurrentAsPreset}
            className="w-full py-2 px-3 bg-bauhaus-yellow hover:bg-yellow-400 border-2 border-bauhaus-black font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-hard-sm cursor-pointer transition-all"
          >
            <span>💾</span>
            <span>+ حفظ كـ بريسيت مخصص</span>
          </button>

          {/* Quick Edit Current Preset Button if currently selected style is a custom preset */}
          {selectedStyle.isCustom && onEditPreset && (
            <button
              type="button"
              onClick={() => onEditPreset(selectedStyle)}
              className="w-full mt-1.5 py-1.5 px-3 bg-white hover:bg-yellow-100 border-2 border-bauhaus-black font-black text-[11px] uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all text-bauhaus-black"
              title="تعديل بيانات البريسيت المختار حالياً"
            >
              <span>✏️</span>
              <span className="truncate">تعديل البريسيت المختار ({selectedStyle.name})</span>
            </button>
          )}

          {/* Export / Import Presets Actions */}
          <div className="flex gap-1.5 mt-2">
            <button
              type="button"
              onClick={onExportPresets}
              className="flex-1 py-1 px-2 bg-white hover:bg-yellow-100 border border-bauhaus-black text-[10px] font-bold uppercase tracking-tight flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
              title="تصدير بريسيت محدد، أو عدة بريسيتات معينة، أو الكل كـ JSON"
            >
              <span>📤</span>
              <span>تصدير JSON</span>
            </button>
            <label
              className="flex-1 py-1 px-2 bg-white hover:bg-gray-100 border border-bauhaus-black text-[10px] font-bold uppercase tracking-tight flex items-center justify-center gap-1 cursor-pointer transition-all text-center shadow-sm"
              title="استيراد بريسيتات من ملف JSON"
            >
              <span>📥</span>
              <span>استيراد JSON</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && onImportPresets) {
                    onImportPresets(file);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>
        </div>
      )}

      {/* Styles List */}
      <div className="flex-1 overflow-y-auto bg-bauhaus-white custom-scrollbar">
        
        {/* Custom Presets Section */}
        {customPresets.length > 0 && (
          <div className="border-b-4 border-bauhaus-black bg-gray-50">
            <div className="px-3 py-1.5 bg-bauhaus-black text-white text-[10px] font-black uppercase tracking-wider flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span>بريسيتاتي المحفوظة ({customPresets.length})</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-xs font-bold flex items-center gap-0.5 ${
                    cloudSyncStatus === 'synced'
                      ? 'bg-green-700 text-white'
                      : cloudSyncStatus === 'syncing'
                      ? 'bg-amber-600 text-white animate-pulse'
                      : 'bg-gray-600 text-white'
                  }`}
                  title={
                    cloudSyncStatus === 'synced'
                      ? 'محفوظ أونلاين ومتزامن سحابياً'
                      : cloudSyncStatus === 'syncing'
                      ? 'جاري المزامنة مع السحابة...'
                      : 'وضع العمل المحلي'
                  }
                >
                  {cloudSyncStatus === 'syncing' ? '⏳ جاري المزامنة' : '☁️ سحابي'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {onSyncPresets && (
                  <button
                    onClick={onSyncPresets}
                    title="تحديث ومزامنة البريسيتات مع السحابة أونلاين"
                    className="hover:scale-110 active:rotate-180 transition-transform cursor-pointer text-xs"
                  >
                    🔄
                  </button>
                )}
                <span className="text-bauhaus-yellow">⭐ CUSTOM</span>
              </div>
            </div>
            {customPresets.map((preset) => (
              <StyleButton
                key={preset.id}
                style={preset}
                isSelected={selectedStyle.id === preset.id}
                onClick={() => onSelect(preset)}
                onEdit={() => onEditPreset && onEditPreset(preset)}
                onDelete={() => onDeletePreset && onDeletePreset(preset.id)}
                onExportSingle={() => onExportSingle && onExportSingle(preset)}
              />
            ))}
          </div>
        )}

        {/* Standard Preset Styles */}
        {INTRO_STYLES.map((style) => (
          <StyleButton
            key={style.id}
            style={style}
            isSelected={selectedStyle.id === style.id}
            onClick={() => onSelect(style)}
          />
        ))}

        {/* Custom Blank Style Button */}
        <div 
          onClick={onCustomize}
          className={`
            group relative flex items-center justify-between p-4 text-left border-b-4 border-bauhaus-black transition-all cursor-pointer
            ${selectedStyle.id === 'custom' ? 'bg-bauhaus-black text-white' : 'hover:bg-gray-100 text-bauhaus-black'}
          `}
        >
          <div className="flex items-center gap-3.5">
            <div className={`
              w-10 h-10 flex-shrink-0 flex items-center justify-center border-4 border-current
              ${selectedStyle.id === 'custom' ? 'bg-white text-black' : getColorClass('white', false)}
            `}>
              {getIcon('plus', "w-5 h-5")}
            </div>
            <div>
              <div className="font-bold uppercase text-sm leading-tight mb-0.5">Custom / مخصص</div>
              <div className="text-[10px] opacity-70">إنشاء نمط صوت جديد</div>
            </div>
          </div>
          {selectedStyle.id === 'custom' && (
            <div className="w-3 h-3 bg-white rounded-full animate-pulse flex-shrink-0"></div>
          )}
        </div>

      </div>
    </div>
  );
};
