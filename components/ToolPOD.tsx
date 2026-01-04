
import React, { useState, useRef } from 'react';
import { generateImage, editAIImage, removeBackground, upscaleImage } from '../services/api';
import { ToolType, AppToolsState, STYLES, VariantEdit, DEFAULT_VARIANT_EDIT, GenerationStyle, UserCredits } from '../types';
import ImageModal from './ImageModal';

interface ToolPODProps {
  state: AppToolsState['pod'];
  credits: UserCredits;
  onUpdate: (newState: Partial<AppToolsState['pod']>) => void;
  onUpdateCredits: (credits: UserCredits) => void;
  onAction: (tool: ToolType, image: string) => void;
}

const ToolPOD: React.FC<ToolPODProps> = ({ state, credits, onUpdate, onUpdateCredits, onAction }) => {
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Credit Guard updated as per request.
   * Manual redirect on click is removed; App.tsx now handles the 10% threshold globally.
   */
  const checkCredits = () => {
    // Relying on App-wide redirect logic for the 10% threshold.
    return true;
  };

  const updateEdit = (updates: Partial<VariantEdit>) => {
    onUpdate({ edit: { ...state.edit, ...updates } });
  };

  const handleGenerate = async () => {
    if (!state.prompt || !checkCredits()) return;
    setLoading(true);
    try {
      const styleConfig = STYLES.find(s => s.id === state.style);
      const styleSuffix = styleConfig?.promptSuffix || '';
      const basePrompt = `${state.prompt}, professional merch design, subject isolated on pure solid white background, high contrast, clean vector edges`;
      const finalPrompt = styleSuffix ? `${basePrompt}, ${styleSuffix}` : basePrompt;
      
      const { imageUrl, credits: newCredits } = await generateAIImage(finalPrompt);
      onUpdateCredits(newCredits);
      onUpdate({ image: imageUrl });
    } catch (error) {
      alert("POD generation failed.");
    } finally {
      setLoading(false);
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
    if (!state.image || !checkCredits()) return;
    setMagicLoading(true);
    try {
      const { imageUrl, credits: newCredits } = await removeBackground(state.image);
      onUpdateCredits(newCredits);
      onUpdate({ image: imageUrl });
    } catch (error: any) {
      alert(`Background removal failed: ${error.message}`);
    } finally {
      setMagicLoading(false);
    }
  };

  const handleUpscale = async () => {
    if (!state.image || !checkCredits()) return;
    setMagicLoading(true);
    try {
      const { imageUrl, credits: newCredits } = await upscaleImage(state.image);
      onUpdateCredits(newCredits);
      onUpdate({ image: imageUrl });
    } catch (error: any) {
      alert(`Upscale failed: ${error.message}`);
    } finally {
      setMagicLoading(false);
    }
  };

  const handleApplyMagicEdit = async () => {
    if (!state.image || !checkCredits()) return;
    setMagicLoading(true);
    try {
      let instruction = "Apply high-impact merch design edits: ";
      if (state.edit.overlayText) {
        instruction += `Permanently bake the text "${state.edit.overlayText}" into the design. Color ${state.edit.textColor}, approximate size ${state.edit.textSize}px. `;
      }
      if (state.edit.magicPrompt) {
        instruction += `Refine artwork: ${state.edit.magicPrompt}. `;
      }
      if (state.edit.isUpscale) instruction += "Upscale to high-resolution print quality. ";

      const { imageUrl, credits: newCredits } = await editAIImage(state.image, instruction);
      onUpdateCredits(newCredits);
      onUpdate({ image: imageUrl });
    } catch (error) {
      alert("Magic Edit failed.");
    } finally {
      setMagicLoading(false);
    }
  };

  const handleDownloadPNG = () => {
    if (!state.image) return;
    const link = document.createElement('a');
    link.href = state.image;
    link.download = 'snoopwerk-merch-design.png';
    link.click();
  };

  const renderTextOverlay = () => {
    if (!state.edit.overlayText || !state.image) return null;
    return (
      <div 
        className="absolute pointer-events-none select-none drop-shadow-2xl z-10 font-black tracking-tighter leading-none text-center px-4"
        style={{
          left: `${state.edit.textX}%`,
          top: `${state.edit.textY}%`,
          transform: `translate(-50%, -50%) rotate(${state.edit.textRotation}deg)`,
          color: state.edit.textColor,
          fontSize: `${state.edit.textSize}px`,
          whiteSpace: 'normal',
          maxWidth: '80%'
        }}
      >
        {state.edit.overlayText}
      </div>
    );
  };

  return (
    <div className="h-full flex bg-[#050505] overflow-hidden relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileUpload} 
      />

      <div className="flex-1 flex flex-col p-4 overflow-hidden relative z-10">
        <header className="flex items-center justify-between mb-4 px-4 h-14 shrink-0 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">POD Merch Designer</h2>
            <p className="text-[8px] text-indigo-500 font-bold uppercase tracking-widest">Alpha Channel Studio</p>
          </div>
          <div className="flex gap-2">
            {state.image && (
              <button 
                onClick={handleDownloadPNG}
                className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg"
              >
                Download PNG
              </button>
            )}
            <button 
              onClick={handleUpscale}
              disabled={magicLoading || !state.image}
              className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all hover:bg-white/10 disabled:opacity-30"
            >
              UPSCALE
            </button>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center relative min-h-0 p-4">
          <div 
            className="absolute inset-4 rounded-[40px] opacity-20 pointer-events-none" 
            style={{ 
              backgroundImage: `linear-gradient(45deg, #222 25%, transparent 25%), 
                                linear-gradient(-45deg, #222 25%, transparent 25%), 
                                linear-gradient(45deg, transparent 75%, #222 75%), 
                                linear-gradient(-45deg, transparent 75%, #222 75%)`,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0'
            }} 
          />

          {(loading || magicLoading) && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-[40px] border border-white/5">
              <div className="w-12 h-12 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
              <p className="text-white font-black tracking-[0.3em] uppercase text-xs">{loading ? 'Forging Design...' : 'Synthesizing...'}</p>
            </div>
          )}

          {state.image ? (
            <div className="relative w-full h-full max-w-2xl rounded-[40px] border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center group">
               <img src={state.image} className="max-h-full max-w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]" alt="POD Design" />
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
              className="w-full h-full max-w-2xl border-2 border-dashed border-white/10 bg-black/40 backdrop-blur-sm rounded-[40px] flex flex-col items-center justify-center text-slate-800 transition-all hover:border-indigo-500/30 cursor-pointer group"
            >
               <span className="text-6xl mb-6 opacity-20 filter drop-shadow-[0_0_20px_rgba(99,102,241,0.5)] group-hover:scale-110 transition-transform">👕</span>
               <p className="text-sm font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-400 transition-colors">Forge or Upload Merch</p>
            </div>
          )}
        </div>
      </div>

      <div className="w-72 border-l border-white/5 bg-[#0a0a0a]/90 backdrop-blur-xl flex flex-col shrink-0 shadow-2xl relative z-20 overflow-y-auto custom-scrollbar">
        <div className="p-6 border-b border-white/5 bg-[#0d0d0d]/80">
          <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">POD Tools</h4>
          <p className="text-indigo-500 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse"></span>
            Interface Active
          </p>
        </div>

        <div className="p-6 space-y-8">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Product Vision</label>
              <textarea 
                value={state.prompt}
                onChange={(e) => onUpdate({ prompt: e.target.value })}
                className="w-full bg-[#161616] border border-white/5 rounded-xl p-3.5 text-xs text-white h-24 focus:ring-1 focus:ring-indigo-500 outline-none resize-none placeholder:text-slate-800 transition-all"
                placeholder="Describe your design concept..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Choose Style</label>
              <select
                value={state.style}
                onChange={(e) => onUpdate({ style: e.target.value as GenerationStyle })}
                className="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs font-black text-white outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {STYLES.map((style) => (
                  <option key={style.id} value={style.id}>{style.emoji} {style.label.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleGenerate}
                disabled={loading || !state.prompt}
                className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-slate-200 transition-all text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-30"
              >
                FORGE DESIGN
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 bg-white/5 border border-white/10 text-white font-black rounded-xl hover:bg-white/10 transition-all text-[10px] uppercase tracking-widest"
              >
                UPLOAD ASSET
              </button>
            </div>
          </div>

          {state.image && (
            <div className="animate-in slide-in-from-right duration-500 space-y-6">
              <div className="p-1 border-t border-white/5 pt-6">
                <button 
                  onClick={handleRemoveBackground}
                  disabled={magicLoading}
                  className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white font-black rounded-2xl transition-all text-[10px] uppercase tracking-[0.1em] shadow-xl flex items-center justify-center gap-2"
                >
                  ✂️ REMOVE BG (ALPHA PNG)
                </button>
              </div>

              <div className="space-y-4 pt-4">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Text Integration</label>
                <input 
                  type="text" 
                  value={state.edit.overlayText}
                  onChange={(e) => updateEdit({ overlayText: e.target.value })}
                  className="w-full bg-[#161616] border border-white/5 rounded-xl p-3.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Design text..."
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-slate-600 uppercase">Color</label>
                    <input type="color" value={state.edit.textColor} onChange={(e) => updateEdit({ textColor: e.target.value })} className="w-full h-10 bg-transparent rounded cursor-pointer border border-white/5" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-slate-600 uppercase flex justify-between">
                      <span>Scale</span>
                      <span className="text-indigo-500">{state.edit.textSize}</span>
                    </label>
                    <input type="range" min="10" max="300" value={state.edit.textSize} onChange={(e) => updateEdit({ textSize: parseInt(e.target.value) })} className="w-full h-1 accent-indigo-500 bg-white/5 rounded-full mt-3" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  ✨ REFINEMENT
                </label>
                <textarea 
                  value={state.edit.magicPrompt}
                  onChange={(e) => updateEdit({ magicPrompt: e.target.value })}
                  className="w-full bg-[#161616] border border-white/5 rounded-xl p-3.5 text-xs text-white h-24 resize-none outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-800"
                  placeholder="Custom refinement instructions..."
                />
                <button 
                  onClick={handleApplyMagicEdit}
                  disabled={magicLoading}
                  className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all text-[10px] uppercase tracking-widest shadow-2xl disabled:opacity-50"
                >
                  APPLY MAGIC EDITS
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ImageModal isOpen={!!fullscreenImg} image={fullscreenImg} onClose={() => setFullscreenImg(null)} />
    </div>
  );
};

export default ToolPOD;
