import React, { useState, useRef } from 'react';
import { ToolType, AppToolsState, StyleOption, VariantEdit, GenerationStyle, UserCredits } from '../types';
import ImageModal from './ImageModal';

interface ToolLogoDesignerProps {
  state: AppToolsState['logo'];
  credits: UserCredits;
  onUpdate: (newState: Partial<AppToolsState['logo']>) => void;
  onUpdateCredits: (credits: UserCredits) => void;
  onAction?: (tool: ToolType) => void;
}

const LOGO_STYLES: StyleOption[] = [
  { id: 'none', label: 'None', emoji: '✖️', promptSuffix: '' },
  { id: 'svg', label: 'SVG / Vector', emoji: '📐', promptSuffix: 'clean flat SVG vector style, geometric, minimalist, simple icon design' },
  { id: 'gamer', label: 'Gamer', emoji: '🎮', promptSuffix: 'mascot esport logo style, aggressive sharp edges, bold contrast, gaming aesthetic' },
  { id: 'minimalist', label: 'Minimalist', emoji: '☁️', promptSuffix: 'clean minimalist vector design, professional branding, extreme simplicity' },
  { id: 'retro', label: 'Retro', emoji: '📼', promptSuffix: 'vintage retro 80s branding, distressed texture, classic vector style' },
  { id: 'cartoon', label: 'Cartoon', emoji: '🎨', promptSuffix: 'playful modern cartoon illustration, thick outlines, flat colors' },
  { id: 'cyberpunk', label: 'Cyberpunk', emoji: '🤖', promptSuffix: 'cyberpunk aesthetic, neon glows, futuristic digital vector art' },
  { id: 'cinematic', label: 'Cinematic', emoji: '🎬', promptSuffix: 'cinematic lighting, dramatic depth, 3D high-end render, professional logo' },
];

const FONTS = [
  { label: 'System Sans', value: 'sans-serif' },
  { label: 'Bebas Neue', value: "'Bebas Neue', sans-serif" },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Inter Black', value: "'Inter', sans-serif" },
  { label: 'Oswald', value: "'Oswald', sans-serif" },
  { label: 'Montserrat', value: "'Montserrat', sans-serif" },
];

const ToolLogoDesigner: React.FC<ToolLogoDesignerProps> = ({ state, credits, onUpdate, onUpdateCredits, onAction }) => {
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'text' | 'refine'>('create');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateEdit = (updates: Partial<VariantEdit>) => {
    onUpdate({ edit: { ...state.edit, ...updates } });
  };

  // AI Image Generation Function
  const generateAIImage = async (promptText: string): Promise<string> => {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `Generate a professional logo image: ${promptText}`
            }
          ],
        })
      });

      const data = await response.json();
      
      // Extract image from response
      for (const block of data.content) {
        if (block.type === 'image') {
          return `data:${block.source.media_type};base64,${block.source.data}`;
        }
      }
      
      throw new Error('No image generated in response');
    } catch (error) {
      console.error('Image generation error:', error);
      throw error;
    }
  };

  const handleGenerate = async () => {
    if (!state.prompt) return;
    setLoading(true);
    try {
      const styleConfig = LOGO_STYLES.find(s => s.id === state.style);
      const styleSuffix = styleConfig?.promptSuffix || '';
      const basePrompt = `Professional vector logo, ${state.prompt}, high-end branding, isolated on a pure transparent background style, minimalist concept`;
      const finalPrompt = styleSuffix ? `${basePrompt}, ${styleSuffix}` : basePrompt;
      
      const imageUrl = await generateAIImage(finalPrompt);
      
      // Simulate credit usage
      const newCredits = { ...credits, used: credits.used + 1 };
      onUpdateCredits(newCredits);
      onUpdate({ image: imageUrl });
    } catch (error) {
      console.error('Generation failed:', error);
      alert("Logo generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpscale = async () => {
    if (!state.image) return;
    setMagicLoading(true);
    try {
      const imageUrl = await generateAIImage(`Upscale this logo to 4K resolution, enhance details and clarity while maintaining the original design`);
      const newCredits = { ...credits, used: credits.used + 1 };
      onUpdateCredits(newCredits);
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
        const result = ev.target?.result;
        if (typeof result === 'string') {
          onUpdate({ image: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBackground = async () => {
    if (!state.image) return;
    setMagicLoading(true);
    try {
      const imageUrl = await generateAIImage(`Remove the background from this logo, create a clean transparent PNG with alpha channel`);
      const newCredits = { ...credits, used: credits.used + 1 };
      onUpdateCredits(newCredits);
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
      let instruction = state.edit.magicPrompt || "Refine this brand logo professionally, sharpen edges, and optimize visual balance.";
      const imageUrl = await generateAIImage(instruction);
      const newCredits = { ...credits, used: credits.used + 1 };
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
    link.download = 'snoopwerk-logo-alpha.png';
    link.click();
  };

  const handleClose = () => {
    onUpdate({ view: 'LANDING', image: null, prompt: '' });
    if (onAction) onAction(ToolType.LANDING);
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
        <div className="absolute inset-0 z-0 group/bg overflow-hidden">
          <div className="absolute inset-0 grid grid-cols-2 md:grid-cols-4 gap-6 p-10 opacity-60 scale-100 transition-transform duration-[40s] group-hover/bg:scale-105">
             <div className="relative rounded-[32px] overflow-hidden border border-white/5 bg-white/5 backdrop-blur-sm group/logo transition-all hover:scale-105 hover:bg-white/10">
               <img src="https://images.unsplash.com/photo-1599305090598-fe179d501227?q=80&w=1000" className="w-full h-full object-contain p-6 mix-blend-lighten" alt="Logo 1" />
             </div>
             <div className="relative rounded-[32px] overflow-hidden border border-white/5 bg-white/5 backdrop-blur-sm group/logo transition-all hover:scale-105 hover:bg-white/10">
               <img src="https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1000" className="w-full h-full object-contain p-6 mix-blend-screen" alt="Logo 2" />
             </div>
             <div className="relative rounded-[32px] overflow-hidden border border-white/5 bg-white/5 backdrop-blur-sm group/logo transition-all hover:scale-105 hover:bg-white/10">
               <img src="https://images.unsplash.com/photo-1621609764180-2ca554a9d6f2?q=80&w=1000" className="w-full h-full object-contain p-6 mix-blend-overlay" alt="Logo 3" />
             </div>
             <div className="relative rounded-[32px] overflow-hidden border border-white/5 bg-white/5 backdrop-blur-sm group/logo transition-all hover:scale-105 hover:bg-white/10">
               <img src="https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=1000" className="w-full h-full object-contain p-6 mix-blend-lighten" alt="Logo 4" />
             </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/40 to-black/95 backdrop-blur-[1px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6 pointer-events-none">
          <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 pointer-events-auto">
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl mb-2">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400">Identity Laboratory Active</span>
            </div>
            <h1 className="text-6xl md:text-8xl lg:text-[8rem] font-[1000] text-white tracking-tighter leading-none uppercase drop-shadow-[0_20px_60px_rgba(0,0,0,1)]">
              Logo<span className="text-blue-500">Lab.</span>
            </h1>
            <p className="text-slate-400 font-bold text-xs md:text-base uppercase tracking-[0.4em] leading-relaxed opacity-80 max-w-2xl mx-auto">
              Forge elite identities with neural precision. Optimized for transparency, scalability, and modern brand standards.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-10">
              <button onClick={() => onUpdate({ view: 'PRODUCTION' })} className="group relative w-full sm:w-auto px-16 py-7 bg-white text-black font-[1000] rounded-3xl text-[11px] uppercase tracking-[0.4em] transition-all hover:scale-[1.05] active:scale-95 shadow-[0_30px_60px_rgba(255,255,255,0.1)] overflow-hidden">
                <div className="absolute inset-0 bg-blue-600/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                <span className="relative z-10">Initialize Studio</span>
              </button>
              <button onClick={handleClose} className="w-full sm:w-auto px-16 py-7 bg-white/5 border border-white/10 text-white font-[1000] rounded-3xl text-[11px] uppercase tracking-[0.4em] backdrop-blur-xl hover:bg-white/10 transition-all active:scale-95">
                Return Home
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[120%] h-[40%] bg-blue-600/10 blur-[120px] z-[5]" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row bg-[#050505] overflow-hidden relative font-inter">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden min-h-0">
        <header className="h-14 bg-black/60 rounded-[24px] border border-white/10 flex items-center justify-between px-6 mb-4 backdrop-blur-3xl shrink-0 shadow-2xl z-20">
          <div className="flex items-center gap-4">
             <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,1)]" />
             <h2 className="text-xs font-black text-white uppercase tracking-widest leading-none">Logo Lab Workspace</h2>
          </div>
          <div className="flex gap-2">
            {state.image && (
              <button onClick={handleDownloadPNG} className="px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white text-black hover:bg-slate-200 transition-all shadow-lg active:scale-95">
                Download
              </button>
            )}
            <button onClick={handleClose} className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all border border-white/10">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center relative min-h-0">
          {(loading || magicLoading) && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-2xl flex flex-col items-center justify-center rounded-[40px] border border-white/5 animate-in fade-in duration-300">
              <div className="w-full max-w-sm space-y-6 text-center flex flex-col items-center justify-center">
                  <h2 className="text-2xl font-[1000] text-white tracking-[0.4em] animate-pulse uppercase">PROCESSING...</h2>
                  <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-[loading_2s_infinite]" />
                  </div>
               </div>
            </div>
          )}

          <div className="relative w-full h-full max-w-2xl aspect-square bg-[#0a0a0a] rounded-[48px] border border-white/5 shadow-3xl overflow-hidden flex items-center justify-center group">
            <div className="absolute inset-0 z-0 opacity-[0.1] pointer-events-none" 
                 style={{ backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(-45deg, #fff 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #fff 75%), linear-gradient(-45deg, transparent 75%, #fff 75%)`, backgroundSize: '40px 40px', backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0' }} />
            
            {state.image ? (
              <div className="relative z-10 w-full h-full flex items-center justify-center p-8">
                <img src={state.image} className="max-h-full max-w-full object-contain animate-in zoom-in duration-700" 
                     style={{ transform: `scale(${state.edit.imageScale / 100})` }} alt="Logo Preview" />
                {renderTextOverlay()}
                <button onClick={() => setFullscreenImg(state.image!)} className="absolute top-6 right-6 z-20 p-2 bg-black/40 hover:bg-black/60 text-white rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-white/10">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </button>
              </div>
            ) : (
              <div onClick={() => fileInputRef.current?.click()} className="text-center opacity-20 cursor-pointer hover:opacity-40 transition-all z-10 flex flex-col items-center gap-4">
                <span className="text-7xl block">✒️</span>
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white">WORKSPACE_EMPTY</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Import image or start generation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="w-full lg:w-[400px] border-l border-white/5 bg-[#080808] flex flex-col shrink-0 relative z-30 overflow-hidden">
        <div className="flex gap-1 p-2 border-b border-white/5 bg-[#080808]/85 backdrop-blur-xl shrink-0">
          {(['create', 'text', 'refine'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 min-h-0 pb-12">
          {activeTab === 'create' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-400">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">Brand Vision</label>
                <textarea value={state.prompt} onChange={(e) => onUpdate({ prompt: e.target.value })}
                          className="w-full bg-[#121212] border border-white/10 rounded-2xl p-5 text-sm text-white h-24 focus:ring-1 focus:ring-blue-600 outline-none resize-none placeholder:text-slate-800 transition-all font-medium"
                          placeholder="e.g., A minimalist swan for a luxury hotel..." />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Logo Engine</label>
                <select value={state.style} onChange={(e) => onUpdate({ style: e.target.value as GenerationStyle })}
                        className="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs font-black text-white appearance-none outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-inner">
                  {LOGO_STYLES.map((style) => <option key={style.id} value={style.id}>{style.emoji} {style.label.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={handleGenerate} disabled={loading || !state.prompt}
                        className="w-full py-5 bg-white text-black font-black rounded-2xl text-[10px] uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all disabled:opacity-20">
                  {loading ? 'Synthesizing...' : 'GENERATE BRANDMARK'}
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                        className="w-full py-4 bg-white/5 border border-white/10 text-white font-black rounded-2xl text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95">
                  UPLOAD IMAGE
                </button>
              </div>
              {state.image && (
                <div className="pt-4 border-t border-white/5 space-y-2">
                   <button onClick={handleRemoveBackground} disabled={magicLoading}
                           className="w-full py-4 bg-teal-600/10 border border-teal-500/20 text-teal-400 font-black rounded-2xl text-[9px] uppercase tracking-widest hover:bg-teal-600 hover:text-white transition-all">
                     ✂️ EXTRACT ALPHA PNG
                   </button>
                   <button onClick={handleUpscale} disabled={magicLoading}
                           className="w-full py-4 bg-white/5 border border-white/10 text-slate-400 font-black rounded-2xl text-[9px] uppercase tracking-widest hover:text-white transition-all">
                     ✨ 4K UPSCALE
                   </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-400">
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Overlay Text</label>
                  <input type="text" value={state.edit.overlayText} onChange={(e) => updateEdit({ overlayText: e.target.value })}
                         className="w-full bg-[#121212] border border-white/10 rounded-xl p-4 text-xs text-white focus:ring-1 focus:ring-blue-600 outline-none shadow-inner"
                         placeholder="Enter brand name..." />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Color</label>
                    <input type="color" value={state.edit.textColor} onChange={(e) => updateEdit({ textColor: e.target.value })} className="w-full h-10 bg-transparent rounded-xl border border-white/10 cursor-pointer" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Font</label>
                    <select value={state.edit.fontFamily} onChange={(e) => updateEdit({ fontFamily: e.target.value })} className="w-full h-10 bg-[#121212] border border-white/10 rounded-xl p-2 text-[10px] text-white font-black">
                      {FONTS.map(f => <option key={f.value} value={f.value}>{f.label.toUpperCase()}</option>)}
                    </select>
                  </div>
               </div>

               <div className="space-y-5 bg-black/40 p-5 rounded-2xl border border-white/5">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center"><label className="text-[9px] font-black uppercase text-slate-500">Size</label><span className="text-blue-400 text-[9px] font-black">{state.edit.textSize}</span></div>
                    <input type="range" min="10" max="250" value={state.edit.textSize} onChange={(e) => updateEdit({ textSize: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full accent-blue-500 cursor-pointer" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center"><label className="text-[9px] font-black uppercase text-slate-500">Rotation</label><span className="text-blue-400 text-[9px] font-black">{state.edit.textRotation}°</span></div>
                    <input type="range" min="-180" max="180" value={state.edit.textRotation} onChange={(e) => updateEdit({ textRotation: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full accent-blue-500 cursor-pointer" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center"><label className="text-[9px] font-black uppercase text-slate-500">Scale Asset</label><span className="text-blue-400 text-[9px] font-black">{state.edit.imageScale}%</span></div>
                    <input type="range" min="10" max="200" value={state.edit.imageScale} onChange={(e) => updateEdit({ imageScale: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full accent-blue-500 cursor-pointer" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-500">X-Pos</label>
                      <input type="range" min="0" max="100" value={state.edit.textX} onChange={(e) => updateEdit({ textX: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full accent-blue-500 cursor-pointer" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-500">Y-Pos</label>
                      <input type="range" min="0" max="100" value={state.edit.textY} onChange={(e) => updateEdit({ textY: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full accent-blue-500 cursor-pointer" />
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'refine' && (
             <div className="space-y-6 animate-in slide-in-from-right duration-400">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Magic Edit Directive</label>
                  <textarea value={state.edit.magicPrompt} onChange={(e) => updateEdit({ magicPrompt: e.target.value })}
                            className="w-full bg-[#121212] border border-white/10 rounded-2xl p-5 text-sm text-white h-32 focus:ring-1 focus:ring-blue-600 outline-none resize-none placeholder:text-slate-800 shadow-inner font-medium"
                            placeholder="Describe specific refinements..." />
                </div>
                <button onClick={handleApplyMagicEdit} disabled={magicLoading || !state.image}
                        className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.4em] hover:bg-blue-700 transition-all shadow-2xl active:scale-95 disabled:opacity-50">
                  {magicLoading ? 'Refining...' : 'RUN MAGIC EDIT'}
                </button>
                <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">PRO TIP</p>
                   <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Describe changes like "make the logo more metallic" or "add geometric details to the background" to direct the neural engine.</p>
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
