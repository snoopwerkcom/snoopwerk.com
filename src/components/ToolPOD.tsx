import React, { useState, useRef, useEffect } from 'react';
import { generateAIImage, editAIImage, removeBackground, upscaleImage } from '../services/api';
import { ToolType, AppToolsState, StyleOption, VariantEdit, GenerationStyle, UserCredits, DEFAULT_VARIANT_EDIT } from '../types';
import ImageModal from './ImageModal';

interface ToolPODProps {
  state: AppToolsState['pod'];
  credits: UserCredits;
  onUpdate: (newState: Partial<AppToolsState['pod']>) => void;
  onUpdateCredits: (credits: UserCredits) => void;
  onAction: (tool: ToolType, image?: string) => void;
}

const POD_STYLES: StyleOption[] = [
  { id: 'none', label: 'None', emoji: '✖️', promptSuffix: '' },
  { id: 'anime', label: 'Anime', emoji: '🎎', promptSuffix: 'vibrant anime art style, cel shaded, clean lineart' },
  { id: 'cartoon', label: 'Cartoon', emoji: '🎨', promptSuffix: 'modern flat vector cartoon illustration, bold outlines' },
  { id: 'cyberpunk', label: 'Cyberpunk', emoji: '🤖', promptSuffix: 'cyberpunk aesthetic, neon lighting, futuristic tech details, synthwave colors' },
  { id: 'looney_toon', label: 'Looney Toon', emoji: '🐰', promptSuffix: 'vintage 1940s animation style, rubber hose limbs, hand-drawn texture' },
  { id: 'minimalist', label: 'Minimalist', emoji: '☁️', promptSuffix: 'clean minimalist vector design, professional branding' },
  { id: 'retro', label: 'Retro', emoji: '📼', promptSuffix: 'vintage 80s aesthetic, distressed texture, retro colors' },
  { id: 'svg', label: 'SVG / Vector', emoji: '📐', promptSuffix: 'flat vector graphic, scalable clean edges, high contrast' },
];

const FONTS = [
  { label: 'System Sans', value: 'sans-serif' },
  { label: 'Bebas Neue', value: "'Bebas Neue', sans-serif" },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Inter Black', value: "'Inter', sans-serif" },
  { label: 'Oswald', value: "'Oswald', sans-serif" },
  { label: 'Montserrat', value: "'Montserrat', sans-serif" },
];

const ToolPOD: React.FC<ToolPODProps> = ({ state, credits, onUpdate, onUpdateCredits, onAction }) => {
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'design' | 'text' | 'refine' | 'upscale'>('design');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateEdit = (updates: Partial<VariantEdit>) => {
    onUpdate({ edit: { ...state.edit, ...updates } });
  };

  const handleGenerate = async () => {
    if (!state.prompt) return;
    setLoading(true);
    try {
      const styleConfig = POD_STYLES.find(s => s.id === state.style);
      const styleSuffix = styleConfig?.promptSuffix || '';
      // Removed "isolated on plain white background" to allow full 1x1 bleed
      const basePrompt = `Professional 1:1 design asset, full-bleed high-impact composition, ${state.prompt}`;
      const finalPrompt = styleSuffix ? `${basePrompt}, ${styleSuffix}` : basePrompt;
      
      const { imageUrl, credits: newCredits } = await generateAIImage(finalPrompt, "1:1");
      onUpdateCredits(newCredits);
      onUpdate({ image: imageUrl });
    } catch (error) {
      alert("Design synthesis failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicEdit = async () => {
    if (!state.image) return;
    setMagicLoading(true);
    try {
      const { imageUrl, credits: newCredits } = await editAIImage(state.image, state.edit.magicPrompt || "Refine visual quality and details.");
      onUpdateCredits(newCredits);
      if (imageUrl) {
        onUpdate({ image: imageUrl });
      }
    } catch (error) {
      alert("Magic edit failed.");
    } finally {
      setMagicLoading(false);
    }
  };

  const handleRemoveBG = async () => {
    if (!state.image) return;
    setMagicLoading(true);
    try {
      const res = await removeBackground(state.image);
      const resultImage = res.maskUrl || res.imageUrl;
      if (resultImage) {
        onUpdateCredits(res.credits);
        onUpdate({ image: resultImage });
      } else {
        alert("Removal engine returned no data.");
      }
    } catch (error) {
      alert("Background removal failed.");
    } finally {
      setMagicLoading(false);
    }
  };

  const handleUpscale = async () => {
    if (!state.image) return;
    setMagicLoading(true);
    try {
      const { imageUrl, credits: newCredits } = await upscaleImage(state.image);
      onUpdateCredits(newCredits);
      onUpdate({ image: imageUrl });
    } catch (error) {
      alert("Upscale failed.");
    } finally {
      setMagicLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === 'string') {
          onUpdate({ image: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClose = () => {
    onUpdate({ view: 'LANDING', image: null, prompt: '' });
    onAction(ToolType.LANDING);
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
          fontFamily: state.edit.fontFamily,
          whiteSpace: 'nowrap',
          textShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}
      >
        {state.edit.overlayText}
      </div>
    );
  };

  if (state.view === 'LANDING') {
    return (
      <div className="h-full relative overflow-hidden bg-[#020202] flex flex-col font-inter">
        <div className="absolute inset-0 z-0 flex group/bg">
          <div className="relative w-1/2 h-full overflow-hidden border-r border-white/5">
             <div 
               className="absolute inset-0 bg-cover bg-center scale-105 transition-transform duration-[20s] group-hover/bg:scale-110 opacity-70 saturate-150 brightness-[0.4]"
               style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1496317556649-f930d733629a?q=80&w=2070&auto=format&fit=crop")' }}
             />
             <div 
               className="absolute inset-0 bg-cover bg-center mix-blend-screen opacity-50 scale-110 transition-transform duration-[25s] group-hover/bg:scale-125"
               style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=2080&auto=format&fit=crop")' }}
             />
             <div className="absolute inset-0 bg-gradient-to-r from-amber-950/60 via-amber-900/30 to-transparent" />
          </div>
          <div className="relative w-1/2 h-full overflow-hidden">
             <div 
               className="absolute inset-0 bg-cover bg-center scale-105 transition-transform duration-[20s] group-hover/bg:scale-110 opacity-70 saturate-125 brightness-[0.5]"
               style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1974&auto=format&fit=crop")' }}
             />
             <div className="absolute inset-0 bg-gradient-to-l from-black/50 to-transparent" />
             <div className="absolute inset-0 flex items-center justify-center p-6 md:p-12">
                <div className="relative w-full max-w-[340px] aspect-[1/1.2] rounded-3xl overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.9)] border border-white/10 group/item transition-all duration-700 hover:scale-105 hover:-rotate-1">
                  <img src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1974&auto=format&fit=crop" className="w-full h-full object-cover" alt="White Tee Back Base" />
                  <div className="absolute inset-0 flex items-center justify-center px-16 pt-12">
                    <img 
                      src="https://images.unsplash.com/photo-1518608823361-2a67b2c2864c?q=80&w=1974&auto=format&fit=crop" 
                      className="w-48 h-48 object-contain mix-blend-multiply opacity-85" 
                      alt="Skater Art" 
                    />
                  </div>
                  <div className="absolute top-4 right-4 bg-black/80 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 border border-white/10 backdrop-blur-md">Realism_Series.V2</div>
                </div>
             </div>
          </div>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6 pointer-events-none">
          <div className="max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 pointer-events-auto">
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-2xl mb-2">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-500">Neural Merch Forge Active</span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-[8rem] font-[1000] text-white tracking-tighter leading-none uppercase drop-shadow-[0_20px_60px_rgba(0,0,0,1)]">
              Snoop<span className="text-indigo-500">Werk.</span>
            </h1>
            <div className="space-y-4 max-w-2xl mx-auto">
              <p className="text-slate-400 font-bold text-xs md:text-base uppercase tracking-[0.4em] leading-relaxed opacity-80">
                Transform vision into retail-ready apparel. High-precision mockups for Street Culture, Botanical Aesthetics, and infinite creative sequences.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-10">
              <button 
                onClick={() => onUpdate({ view: 'PRODUCTION' })}
                className="group relative w-full sm:w-auto px-16 py-7 bg-white text-black font-[1000] rounded-3xl text-[11px] uppercase tracking-[0.4em] transition-all hover:scale-[1.02] active:scale-95 shadow-[0_30px_60px_rgba(255,255,255,0.1)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-indigo-600/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                <span className="relative z-10">Initialize Production</span>
              </button>
              <button 
                onClick={handleClose}
                className="w-full sm:w-auto px-16 py-7 bg-white/5 border border-white/10 text-white font-[1000] rounded-3xl text-[11px] uppercase tracking-[0.4em] backdrop-blur-xl hover:bg-white/10 transition-all active:scale-95"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[120%] h-[40%] bg-amber-600/10 blur-[120px] z-[5]" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row bg-[#050505] overflow-hidden relative font-inter">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
      <div className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden relative">
        <header className="h-16 bg-black/60 rounded-[28px] border border-white/10 flex items-center justify-between px-8 mb-6 backdrop-blur-3xl shrink-0 shadow-2xl z-20">
           <div className="flex items-center gap-4">
             <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(20,184,166,1)]" />
             <h1 className="text-sm font-black text-white uppercase tracking-widest leading-none">Merch Forge Production</h1>
           </div>
           <div className="flex items-center gap-3">
             {state.image && (
               <button 
                 onClick={() => {
                   const link = document.createElement('a');
                   link.href = state.image!;
                   link.download = 'snoopwerk-merch-alpha.png';
                   link.click();
                 }}
                 className="px-6 py-2.5 bg-white text-black text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
               >
                 Export Asset
               </button>
             )}
             <button onClick={handleClose} className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all border border-white/10">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
           </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 relative min-h-0">
          {(loading || magicLoading) && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-2xl flex flex-col items-center justify-center rounded-[48px] animate-in fade-in duration-300">
               <div className="w-full max-w-lg space-y-8 text-center flex flex-col items-center justify-center">
                  <h2 className="text-3xl font-[1000] text-white tracking-[0.4em] animate-pulse uppercase">FORGING...</h2>
                  <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 animate-[loading_2s_infinite]" />
                  </div>
               </div>
            </div>
          )}

          {/* Forced 1:1 Aspect Ratio Workspace - Padding removed to allow full edge-to-edge 1x1 asset */}
          <div className="relative aspect-square h-full max-h-full bg-[#0a0a0a] rounded-[56px] border border-white/5 shadow-[0_48px_96px_-12px_rgba(0,0,0,0.9)] flex items-center justify-center group overflow-hidden">
            <div className="absolute inset-0 z-0 opacity-[0.12] pointer-events-none" 
                 style={{ backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(-45deg, #fff 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #fff 75%), linear-gradient(-45deg, transparent 75%, #fff 75%)`, backgroundSize: '40px 40px', backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0' }} />
            
            {state.image ? (
              <div className="relative z-10 w-full h-full flex items-center justify-center p-0">
                <div className="relative h-full w-full flex items-center justify-center">
                  <img 
                    src={state.image} 
                    className="w-full h-full object-cover drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in zoom-in duration-700" 
                    alt="Production Preview" 
                  />
                  {renderTextOverlay()}
                </div>
                <button 
                  onClick={() => setFullscreenImg(state.image)}
                  className="absolute top-8 right-8 z-20 p-3 bg-black/40 hover:bg-black/60 text-white rounded-2xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </button>
              </div>
            ) : (
              <div onClick={() => fileInputRef.current?.click()} className="text-center opacity-20 cursor-pointer hover:opacity-40 transition-all flex flex-col items-center gap-6">
                <span className="text-8xl">👕</span>
                <div className="space-y-2">
                  <p className="text-sm font-black uppercase tracking-[0.4em] text-white">FORGE_EMPTY</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Click to import reference image or generate new</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="w-full lg:w-96 border-l border-white/5 bg-[#080808] flex flex-col shrink-0 shadow-2xl relative z-30 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex gap-1.5 shrink-0 bg-[#080808]/85 backdrop-blur-xl">
          {(['design', 'text', 'refine', 'upscale'] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-12 pb-24">
          {activeTab === 'design' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-400">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Design Vision</label>
                <textarea 
                  value={state.prompt}
                  onChange={(e) => onUpdate({ prompt: e.target.value })}
                  className="w-full bg-[#121212] border border-white/10 rounded-[24px] p-6 text-sm text-white h-40 focus:ring-1 focus:ring-indigo-600 outline-none resize-none placeholder:text-slate-800 transition-all shadow-inner font-medium"
                  placeholder="e.g., A minimalist geometric skull design for a streetwear brand..."
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Visual Engine</label>
                <div className="relative group">
                  <select 
                    value={state.style}
                    onChange={(e) => onUpdate({ style: e.target.value as GenerationStyle })}
                    className="w-full bg-black border border-white/10 rounded-2xl p-5 text-xs font-black text-white appearance-none outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-inner"
                  >
                    {POD_STYLES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <button 
                onClick={handleGenerate}
                disabled={loading || !state.prompt}
                className="w-full py-6 bg-white text-black font-black rounded-3xl text-[11px] uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all disabled:opacity-20"
              >
                {loading ? 'Synthesizing...' : 'GENERATE 1X1 ASSET'}
              </button>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-400">
               <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Overlay Typography</label>
                  <textarea 
                    value={state.edit.overlayText}
                    onChange={(e) => updateEdit({ overlayText: e.target.value })}
                    className="w-full bg-[#121212] border border-white/10 rounded-2xl p-4 text-[11px] text-white h-24 focus:ring-1 focus:ring-indigo-600 outline-none resize-none uppercase font-black shadow-inner"
                    placeholder="Enter brand name or slogan..."
                  />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Color</label>
                    <input type="color" value={state.edit.textColor} onChange={(e) => updateEdit({ textColor: e.target.value })} className="w-full h-10 bg-transparent rounded-xl border border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Font</label>
                    <select value={state.edit.fontFamily} onChange={(e) => updateEdit({ fontFamily: e.target.value })} className="w-full h-10 bg-[#121212] border border-white/10 rounded-xl p-2 text-[10px] text-white font-black">
                      {FONTS.map(f => <option key={f.value} value={f.value}>{f.label.toUpperCase()}</option>)}
                    </select>
                  </div>
               </div>

               <div className="space-y-6 bg-black/40 p-6 rounded-3xl border border-white/5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Size</label>
                    <span className="text-indigo-400 text-[10px] font-black">{state.edit.textSize}</span>
                  </div>
                  <input type="range" min="10" max="250" value={state.edit.textSize} onChange={(e) => updateEdit({ textSize: parseInt(e.target.value) })} className="w-full h-1.5 bg-white/10 rounded-full accent-indigo-500 appearance-none" />
                  
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Rotation</label>
                    <span className="text-indigo-400 text-[10px] font-black">{state.edit.textRotation}°</span>
                  </div>
                  <input type="range" min="-180" max="180" value={state.edit.textRotation} onChange={(e) => updateEdit({ textRotation: parseInt(e.target.value) })} className="w-full h-1.5 bg-white/10 rounded-full accent-indigo-500 appearance-none" />

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">X-Pos</label>
                      </div>
                      <input type="range" min="0" max="100" value={state.edit.textX} onChange={(e) => updateEdit({ textX: parseInt(e.target.value) })} className="w-full h-1.5 bg-white/10 rounded-full accent-indigo-500 appearance-none" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Y-Pos</label>
                      </div>
                      <input type="range" min="0" max="100" value={state.edit.textY} onChange={(e) => updateEdit({ textY: parseInt(e.target.value) })} className="w-full h-1.5 bg-white/10 rounded-full accent-indigo-500 appearance-none" />
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'refine' && (
             <div className="space-y-8 animate-in slide-in-from-right duration-400">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Surgical Refinement</label>
                  <textarea 
                    value={state.edit.magicPrompt}
                    onChange={(e) => updateEdit({ magicPrompt: e.target.value })}
                    className="w-full bg-[#121212] border border-white/10 rounded-[28px] p-6 text-sm text-white h-40 focus:ring-1 focus:ring-indigo-600 outline-none shadow-inner"
                    placeholder="Describe specific changes..."
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={handleMagicEdit} disabled={magicLoading || !state.image} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all disabled:opacity-30">MAGIC EDIT</button>
                  <button onClick={handleRemoveBG} disabled={magicLoading || !state.image} className="w-full py-5 bg-teal-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-teal-500 transition-all disabled:opacity-30">REMOVE BG</button>
                </div>
             </div>
          )}

          {activeTab === 'upscale' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-400">
              <div className="p-8 bg-indigo-600/10 border border-indigo-500/20 rounded-[32px] text-center space-y-4">
                <span className="text-4xl block">✨</span>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Master Upscaling Engine</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">Restore micro-details, eliminate artifacts, and prepare your design for large-format professional printing.</p>
              </div>
              <button onClick={handleUpscale} disabled={magicLoading || !state.image} className="w-full py-6 bg-white text-black font-[1000] rounded-3xl text-[11px] uppercase tracking-[0.4em] shadow-2xl active:scale-[0.98] transition-all disabled:opacity-20">
                {magicLoading ? 'Upscaling...' : 'UPSCALE TO 4K RESOLUTION'}
              </button>
            </div>
          )}
        </div>
      </aside>

      <ImageModal isOpen={!!fullscreenImg} image={fullscreenImg} onClose={() => setFullscreenImg(null)} />
    </div>
  );
};

export default ToolPOD;