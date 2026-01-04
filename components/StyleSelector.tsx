
import React from 'react';
import { STYLES, GenerationStyle } from '../types';

interface StyleSelectorProps {
  selectedStyle: GenerationStyle;
  onSelect: (style: GenerationStyle) => void;
}

const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onSelect }) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-300">Choose Visual Style</label>
      <div className="relative">
        <select
          value={selectedStyle}
          onChange={(e) => onSelect(e.target.value as GenerationStyle)}
          className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
        >
          {STYLES.map((style) => (
            <option key={style.id} value={style.id} className="bg-slate-900 text-white">
              {style.emoji} {style.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default StyleSelector;
