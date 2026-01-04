import React, { useState, useRef } from 'react';
import { generateAIImage, editAIImage, removeBackground, upscaleImage } from '../services/api';
import { ToolType, AppToolsState, STYLES, VariantEdit, DEFAULT_VARIANT_EDIT, GenerationStyle } from '../types';
import ImageModal from './ImageModal';

interface ToolLogoDesignerProps {
  state: AppToolsState['logo'];
  onUpdate: (newState: Partial<AppToolsState['logo']>) => void;
}

const ToolLogoDesigner: React.FC<ToolLogoDesignerProps> = ({ state, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateEdit = (updates: Partial<VariantEdit>) => {
    onUpdate({ edit: { ...state.edit, ...updates } });
  };

  const handleGenerate = async () => {
    if (!state.prompt) return;
    setLoading(true);
    try {
      const styleConfig = STYLES.find(s => s.id === state.style);
      const styleSuffix = styleConfig?.promptSuffix || '';
      const basePrompt = `Professional minimalist vector logo, ${state.prompt}, high-end branding asset, white background`;
      const finalPrompt = styleSuffix ? `${basePrompt}, ${styleSuffix}` : basePrompt;
      const { imageUrl } = await generateAIImage(finalPrompt, "1:1");
      onUpdate({ image: imageUrl });
    } catch (error) {
      alert("Logo generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpscale = async () => {
    if (!state.image) return;
    setMagicLoading(true);
    try {
      const { imageUrl } = await upscaleImage(state.image);
      onUpdate({ image: imageUrl });
    } catch (error: any) {
      alert(`Upscale failed: ${error.message}`);
    } finally {
      setMagicLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onUpdate({ image: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBackground = async () => {
    if (!state.image) return;
    setMagicLoading(true);
    try {
      const { imageUrl } = await removeBackground(state.image);
      onUpdate({ image: imageUrl });
    } catch (error: any) {
      alert(`Background removal failed: ${error.message}`);
    } finally {
      setMagicLoading(false);
    }
  };

  const handleApplyMagicEdit = async () => {
    if (!state.image) return;
    setMagicLoading(true);
    try {
      let instruction = "Refine this brand logo professionally: ";
      if (state.edit.overlayText) {
        instruction += `Integrate the text "${state.edit.overlayText}" into the logo layout. Color ${state.edit.textColor}, approximate size ${state.edit.textSize}px. `;
      }
      if (state.edit.magicPrompt) {
        instruction += `Branding refinements: ${state.edit.magicPrompt}. `;
      }
      if (state.edit.isUpscale) instruction += "Upscale to vector-like crisp 4K resolution. ";

      const { imageUrl } = await editAIImage(state.image, instruction);
      onUpdate({ image: imageUrl });
    } catch (error) {
      alert("Refinement failed.");
    } finally {
      setMagicLoading(false);
    }
  };

  const handleDownloadPNG = () => {
    if (!state.image) return;
    const link = document.createElement('a');
    link.href = state.image;
    link.download = 'snoopwerk-logo-export.png';
    link.click();
  };

  const renderTextOverlay = () => {
    if (!state.edit.overlayText || !state.image) return null;
    return (
      <div 
        className="absolute pointer-events-none select-none drop-shadow-2xl z-10 font-black tracking-tighter leading-none text-center"
        style={{
          left: `${state.edit.textX}%`,
          top: `${state.edit.textY}%`,
          transform: `translate(-50%, -50%) rotate(${state.edit.textRotation}deg)`,
          color: state.edit.textColor,
          fontSize: `${state.edit.textSize}px`,
          whiteSpace: 'nowrap'
        }}
      >
        {state.edit.overlayText}
      </div>
    );
  };

  return (
    <div className="h-full flex bg-[#050505] overflow-hidden">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileUpload} 
      />

      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <header className="flex items-center justify-between mb-6 h-14 shrink-0 px-4 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Logo Lab Identity Engine</h2>
          <div className="flex gap-2">
            {state.image && (
              <button 
                onClick={handleDownloadPNG}
                className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-lg"
              >
                Export Assets
              </button>
            )}
            <button 
              onClick={handleUpscale}
              disabled={magicLoading || !state.image}
              className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all hover:bg-white/10 disabled:opacity-30"
            >
              UPSCALE
            </button>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center relative min-h-0 p-4">
          {(loading || magicLoading) && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center rounded-[40px] border border-white/5">
              <div className="w-10 h-10 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p className="text-white font-black uppercase tracking-widest text-[10px]">{loading ? 'Synthesizing Identity...' : 'Processing AI...'}</p>
            </div>
          )}

          <div className="relative w-full h-full max-w-2xl bg-[#0a0a0a] rounded-[40px] border border-white/5 shadow-2xl overflow-hidden flex items-center justify-center group">
            {/* Transparent checkerboard background restored */}
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none z-0" 
              style={{ 
                backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%), 
                                  linear-gradient(-45deg, #fff 25%, transparent 25%), 
                                  linear-gradient(45deg, transparent 75%, #fff 75%), 
                                  linear-gradient(-45deg, transparent 75%, #fff 75%)`,
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0'
              }} 
            />
            
            {state.image ? (
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                <img 
                  src={state.image} 
                  className="max-h-[85%] max-w-[85%] object-contain drop-shadow-2xl animate-in zoom-in duration-500" 
                  style={{ transform: `scale(${state.edit.imageScale / 100})` }}
                  alt="Logo Design" 
                />
                {renderTextOverlay()}
                <button 
                  onClick={() => setFullscreenImg(state.image!)}
                  className="absolute top-8 right-8 z-20 p-3 bg-black/40 hover:bg-black/60 text-white rounded-2xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="text-center opacity-20 cursor-pointer hover:opacity-40 transition-opacity z-10"
              >
                <span className="text-8xl mb-4 block grayscale">✒️</span>
                <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Identity Laboratory</p>
                <p className="text-[10px] mt-2 font-black uppercase tracking-widest text-slate-600">Click to Upload Asset</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="w-80 border-l border-white/5 bg-[#0a0a0a] flex flex-col shrink-0 shadow-2xl relative z-20 overflow-y-auto custom-scrollbar">
        <div className="p-8 border-b border-white/5 bg-[#0d0d0d]">
          <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Brand Studio</h4>
          <p className="text-blue-400 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
            Interface Active
          </p>
        </div>

        <div className="p-8 space-y-10">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Brand Narrative</label>
              <textarea 
                value={state.prompt}
                onChange={(e) => onUpdate({ prompt: e.target.value })}
                className="w-full bg-[#161616] border border-white/5 rounded-2xl p-4 text-xs text-white h-28 focus:ring-1 focus:ring-blue-500 outline-none resize-none placeholder:text-slate-800 transition-all shadow-inner"
                placeholder="Describe brand values / symbols..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Choose Style</label>
              <select
                value={state.style}
                // FIXED: Replace undefined 'onSelect' with 'onUpdate' to update style state correctly
                onChange={(e) => onUpdate({ style: e.target.value as GenerationStyle })}
                className="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs font-black text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {STYLES.map((style) => (
                  <option key={style.id} value={style.id}>{style.emoji} {style.label.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={handleGenerate}
                disabled={loading || !state.prompt}
                className="w-full py-5 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-all text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-30"
              >
                SYNTHESIZE LOGO
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border border-white/10 text-slate-400 hover:text-white font-black rounded-2xl hover:bg-white/5 transition-all text-[10px] uppercase tracking-widest"
              >
                UPLOAD ASSET
              </button>
            </div>
          </div>

          {state.image && (
            <div className="animate-in slide-in-from-right duration-500 space-y-8 pt-8 border-t border-white/5">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Scale</label>
                  <span className="text-blue-400 text-[10px] font-black">{state.edit.imageScale}%</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="200" 
                  value={state.edit.imageScale} 
                  onChange={(e) => updateEdit({ imageScale: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-black rounded-full accent-blue-500 cursor-pointer appearance-none"
                />
              </div>

              <button 
                onClick={handleRemoveBackground}
                disabled={magicLoading}
                className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white font-black rounded-2xl transition-all text-[10px] uppercase tracking-[0.1em] shadow-xl"
              >
                ✂️ REMOVE BACKGROUND (ALPHA PNG)
              </button>

              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Brandmark Text</label>
                <input 
                  type="text" 
                  value={state.edit.overlayText}
                  onChange={(e) => updateEdit({ overlayText: e.target.value })}
                  className="w-full bg-[#161616] border border-white/5 rounded-xl p-4 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="Enter brand name..."
                />
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  ✨ REFINEMENT LAB
                </label>
                <textarea 
                  value={state.edit.magicPrompt}
                  onChange={(e) => updateEdit({ magicPrompt: e.target.value })}
                  className="w-full bg-[#161616] border border-white/5 rounded-2xl p-4 text-xs text-white h-24 resize-none outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-800"
                  placeholder="Custom refinement instructions..."
                />
                <button 
                  onClick={handleApplyMagicEdit}
                  disabled={magicLoading}
                  className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all text-[10px] uppercase tracking-widest shadow-2xl disabled:opacity-50"
                >
                  APPLY REFINEMENTS
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <ImageModal isOpen={!!fullscreenImg} image={fullscreenImg} onClose={() => setFullscreenImg(null)} />
    </div>
  );
};

export default ToolLogoDesigner;
