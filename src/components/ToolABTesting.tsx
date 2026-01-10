import React, { useState } from 'react';
import { generateAIImage, editAIImage, removeBackground, upscaleImage } from '../services/api';
import { ToolType, AppToolsState, StyleOption, VariantEdit, DEFAULT_VARIANT_EDIT, GenerationStyle, UserCredits } from '../types';

interface ToolABTestingProps {
  state: AppToolsState['abTesting'];
  credits: UserCredits;
  onUpdate: (newState: Partial<AppToolsState['abTesting']>) => void;
  onUpdateCredits: (credits: UserCredits) => void;
  onAction: (tool: ToolType, image?: string) => void;
}

const AB_STYLES: StyleOption[] = [
  { id: 'none', label: 'None', emoji: '✖️', promptSuffix: '' },
  { id: 'anime', label: 'Anime', emoji: '🎎', promptSuffix: 'vibrant anime art style, expressive characters' },
  { id: 'black_and_white', label: 'Black and White', emoji: '🏁', promptSuffix: 'high contrast black and white photography, noir aesthetic' },
  { id: 'calligraphy', label: 'Calligraphy', emoji: '🖋️', promptSuffix: 'elegant calligraphic brush strokes, ink style' },
  { id: 'cartoon', label: 'Cartoon', emoji: '🎨', promptSuffix: 'modern 2d cartoon illustration style' },
  { id: 'cinematic', label: 'Cinematic', emoji: '🎬', promptSuffix: 'cinematic lighting, dramatic depth, anamorphic lens flares' },
  { id: 'gamer', label: 'Gamer', emoji: '🎮', promptSuffix: 'e-sports mascot style, aggressive edges, neon accents' },
  { id: 'looneytoon', label: 'Looneytoon', emoji: '🐰', promptSuffix: 'vintage 1940s animation style, rubber hose limbs' },
  { id: 'manga', label: 'Manga', emoji: '🇯🇵', promptSuffix: 'classic manga ink lines and screentones' },
  { id: 'oil_painting', label: 'Oil Painting', emoji: '🖼️', promptSuffix: 'thick oil painting textures, visible brushstrokes' },
  { id: 'photography', label: 'Photography', emoji: '📷', promptSuffix: 'professional commercial photography, sharp focus' },
  { id: 'pixar', label: 'Pixar', emoji: '🐭', promptSuffix: '3d animated movie style, soft subsurface scattering' },
  { id: 'realism', label: 'Realism', emoji: '📸', promptSuffix: 'photorealistic detail, ultra-high fidelity' },
  { id: 'retro', label: 'Retro', emoji: '📼', promptSuffix: 'vintage 80s aesthetic, vhs grain' },
];

const ToolABTesting: React.FC<ToolABTestingProps> = ({ state, credits, onUpdate, onUpdateCredits, onAction }) => {
  const [compareMode, setCompareMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'text' | 'enhance' | 'magic'>('text');
  const [editingLoading, setEditingLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  const currentEditIndex = state.selectedVarIndex ?? 0;
  const currentEdit = state.variantEdits[currentEditIndex] || DEFAULT_VARIANT_EDIT;

  const updateCurrentEdit = (updates: Partial<VariantEdit>) => {
    const newEdits = [...state.variantEdits];
    newEdits[currentEditIndex] = { ...currentEdit, ...updates };
    onUpdate({ variantEdits: newEdits });
  };

  const handleGenerate = async () => {
    if (!state.prompt) return;
    onUpdate({ stage: 'GENERATING' });
    setGenerationProgress(5);
    try {
      const styleConfig = AB_STYLES.find(s => s.id === state.style);
      const styleSuffix = styleConfig?.promptSuffix || '';
      const basePrompt = styleSuffix ? `${state.prompt}, ${styleSuffix}` : state.prompt;
      
      setGenerationProgress(20);
      const res1 = await generateAIImage(`${basePrompt}, focal point center, high resolution`);
      setGenerationProgress(60);
      const res2 = await generateAIImage(`${basePrompt}, cinematic perspective, wide composition, rich textures`);
      setGenerationProgress(100);
      
      onUpdateCredits(res2.credits);
      onUpdate({ variations: [res1.imageUrl, res2.imageUrl], stage: 'EDITING', selectedVarIndex: 0 });
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      onUpdate({ stage: 'IDLE' });
    } finally {
      setTimeout(() => setGenerationProgress(0), 800);
    }
  };

  const handleApplyMagicEdit = async () => {
    if (state.selectedVarIndex === null || !state.variations[state.selectedVarIndex]) return;
    setEditingLoading(true);
    try {
      let instruction = currentEdit.magicPrompt || "Apply high-impact visual refinement.";
      if (currentEdit.overlayText) {
        instruction += ` Integrate text: "${currentEdit.overlayText}".`;
      }
      const { imageUrl, credits: newCredits } = await editAIImage(state.variations[state.selectedVarIndex], instruction);
      onUpdateCredits(newCredits);
      const newVariations = [...state.variations];
      newVariations[state.selectedVarIndex] = imageUrl;
      onUpdate({ variations: newVariations });
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setEditingLoading(false);
    }
  };

  const handleRemoveBg = async () => {
    if (state.selectedVarIndex === null || !state.variations[state.selectedVarIndex]) return;
    setEditingLoading(true);
    try {
      const { imageUrl, credits: newCredits } = await removeBackground(state.variations[state.selectedVarIndex]);
      onUpdateCredits(newCredits);
      const newVariations = [...state.variations];
      newVariations[state.selectedVarIndex] = imageUrl;
      onUpdate({ variations: newVariations });
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setEditingLoading(false);
    }
  };

  const handleUpscaleAction = async () => {
    if (state.selectedVarIndex === null || !state.variations[state.selectedVarIndex]) return;
    setEditingLoading(true);
    try {
      const { imageUrl, credits: newCredits } = await upscaleImage(state.variations[state.selectedVarIndex]);
      onUpdateCredits(newCredits);
      const newVariations = [...state.variations];
      newVariations[state.selectedVarIndex] = imageUrl;
      onUpdate({ variations: newVariations });
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setEditingLoading(false);
    }
  };

  const resetWorkstation = () => {
    onUpdate({
      stage: 'IDLE',
      variations: [],
      prompt: '',
      style: 'none',
      selectedVarIndex: null,
      editedImage: null,
      variantEdits: [JSON.parse(JSON.stringify(DEFAULT_VARIANT_EDIT)), JSON.parse(JSON.stringify(DEFAULT_VARIANT_EDIT))],
    });
  };

  const renderTextOverlay = (edit: VariantEdit, isSmall: boolean = false) => {
    if (!edit.overlayText) return null;
    const scaleFactor = isSmall ? 0.6 : 1;
    return (
      <div 
        className="absolute pointer-events-none select-none drop-shadow-2xl z-10 font-black tracking-tighter leading-none text-center px-4"
        style={{
          left: `${edit.textX}%`,
          top: `${edit.textY}%`,
          transform: `translate(-50%, -50%) rotate(${edit.textRotation}deg)`,
          color: edit.textColor,
          fontSize: `${edit.textSize * scaleFactor}px`,
          fontFamily: edit.fontFamily,
          whiteSpace: 'normal',
          maxWidth: '90%',
          textShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}
      >
        {edit.overlayText}
      </div>
    );
  };

  // Internal Landing Page View
  if (state.view === 'LANDING') {
    return (
      <div className="h-screen relative overflow-hidden bg-[#020202] flex flex-col font-inter">
        {/* Scattered UHD YouTube Thumbnail Realism Images */}
        <div className="absolute inset-0 z-0 group/bg overflow-hidden">
          <div className="absolute inset-0 scale-100 transition-transform duration-[60s] group-hover/bg:scale-105">
             {/* UHD Photography Collection */}
             <div 
               className="absolute top-[8%] left-[-2%] w-[35%] aspect-video rounded-[48px] border-4 border-white/10 shadow-[0_60px_100px_rgba(0,0,0,0.8)] bg-cover bg-center rotate-[-3deg] opacity-90 animate-in fade-in slide-in-from-left-12 duration-1000" 
               style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1492724441997-5dc865305da7?q=100&w=3840")' }} 
             />
             <div 
               className="absolute top-[22%] right-[-5%] w-[42%] aspect-video rounded-[48px] border-4 border-white/10 shadow-[0_60px_100px_rgba(0,0,0,0.8)] bg-cover bg-center rotate-[2deg] opacity-95 animate-in fade-in slide-in-from-right-12 duration-1000 delay-200" 
               style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=100&w=3840")' }} 
             />
             <div 
               className="absolute bottom-[28%] left-[4%] w-[32%] aspect-video rounded-[48px] border-4 border-white/10 shadow-[0_60px_100px_rgba(0,0,0,0.8)] bg-cover bg-center rotate-[5deg] opacity-100 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-400" 
               style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=100&w=3840")' }} 
             />
             <div 
               className="absolute bottom-[-5%] right-[8%] w-[38%] aspect-video rounded-[48px] border-4 border-white/10 shadow-[0_60px_100px_rgba(0,0,0,0.8)] bg-cover bg-center rotate-[-4deg] opacity-90 animate-in fade-in slide-in-from-bottom-24 duration-1000 delay-500" 
               style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1574717024453-354056badf90?q=100&w=3840")' }} 
             />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/95 backdrop-blur-[1.5px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#020202_85%)] opacity-70" />
        </div>

        {/* Hero Content Overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6 pointer-events-none">
          <div className="max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 pointer-events-auto">
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-red-400">Render Engine Active</span>
            </div>

            <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-[1000] text-white tracking-tighter leading-none uppercase drop-shadow-[0_20px_60px_rgba(0,0,0,1)] whitespace-nowrap">
              Snoop<span className="text-red-500">@</span>Werk.
            </h1>

            <div className="space-y-8 max-w-2xl mx-auto">
              <p className="text-slate-100 font-black text-xs md:text-2xl uppercase tracking-[0.3em] leading-relaxed drop-shadow-xl">
                Precision Aesthetics. <span className="text-white">Pixel Perfection.</span>
                <br />
                <span className="text-slate-400 text-sm md:text-lg font-bold">The definitive A/B laboratory for viral thumbnail production.</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-12">
              <button 
                onClick={() => onUpdate({ view: 'PRODUCTION' })}
                className="group relative w-full sm:w-auto px-20 py-8 bg-red-600 text-white font-[1000] rounded-[32px] text-[12px] uppercase tracking-[0.4em] transition-all hover:scale-[1.08] active:scale-95 shadow-[0_40px_80px_rgba(220,38,38,0.5)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                <span className="relative z-10">Deploy Studio</span>
              </button>
              <button 
                onClick={() => onAction && onAction(ToolType.LANDING)}
                className="w-full sm:w-auto px-20 py-8 bg-white/5 border border-white/10 text-white font-[1000] rounded-[32px] text-[12px] uppercase tracking-[0.4em] backdrop-blur-xl hover:bg-white/10 transition-all active:scale-95"
              >
                Return Base
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-[-15%] left-[-15%] w-[130%] h-[50%] bg-red-600/15 blur-[140px] z-[5]" />
      </div>
    );
  }

  // Workstation View (Setup View)
  if (state.stage === 'IDLE' || state.stage === 'GENERATING') {
    const isGenerating = state.stage === 'GENERATING';
    return (
      <div className="relative h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0a] overflow-hidden font-inter">
        {/* Photoreal Cafe Scene background - UPDATED TO 100% OPACITY */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-100 transition-opacity duration-1000 saturate-[1.1]"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=100&w=3840")' }}
        />
        {/* Adjusted Radial Gradient to be less aggressive to let the 100% opacity image shine */}
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_center,_transparent_0%,_#0a0a0a_100%)] opacity-70" />
        
        <div className="relative z-10 w-full max-w-xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-700">
          <header className="flex flex-col items-center justify-center gap-2 mb-2 w-full">
            <div className="w-full flex justify-between items-center px-4">
              <button onClick={() => onUpdate({ view: 'LANDING' })} className="p-1.5 text-slate-500 hover:text-white transition-colors bg-white/10 rounded-full border border-white/10 backdrop-blur-2xl">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="text-right">
                <p className="text-[8px] font-black text-red-500 uppercase tracking-[0.5em] drop-shadow-lg">SYSTEM: ACTIVE</p>
              </div>
            </div>

            <div className="text-center w-full mt-2">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-[1000] text-white tracking-tighter uppercase leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] whitespace-nowrap">
                SNOOP<span className={`text-red-500 inline-block transition-all duration-500 ${isGenerating ? 'animate-pulsate-fast' : ''}`}>@</span>WERK
              </h1>
              <p className="text-[9px] font-black text-slate-100 uppercase tracking-[0.4em] mt-2 drop-shadow-md">Creator Production Lab</p>
            </div>
          </header>

          <div className="bg-black/80 backdrop-blur-3xl p-8 rounded-[40px] border border-white/20 space-y-6 shadow-[0_48px_96px_-12px_rgba(0,0,0,0.8)] w-full max-h-[70vh] flex flex-col overflow-hidden">
            <div className="space-y-3">
              <label className="text-[9px] font-[1000] uppercase tracking-[0.4em] text-slate-400 ml-1">Viral Hook</label>
              <textarea
                value={state.prompt}
                onChange={(e) => onUpdate({ prompt: e.target.value })}
                className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-xl text-white focus:ring-1 focus:ring-red-500 resize-none h-24 placeholder:text-slate-600 font-bold leading-tight"
                placeholder={"e.g. 'I built a startup in a cafe for 24 hours straight.'"}
              />
            </div>
            <div className="space-y-3 pt-4 border-t border-white/10">
              <label className="text-[9px] font-[1000] uppercase tracking-[0.4em] text-slate-400 ml-1">Aesthetic Engine</label>
              <div className="relative">
                <select
                  value={state.style}
                  onChange={(e) => onUpdate({ style: e.target.value as GenerationStyle })}
                  className="w-full bg-[#161616] border border-white/10 rounded-2xl p-4 text-[11px] font-black text-white appearance-none outline-none focus:ring-1 focus:ring-red-500 cursor-pointer shadow-inner"
                >
                  {AB_STYLES.map((style) => (
                    <option key={style.id} value={style.id}>{style.emoji} {style.label.toUpperCase()}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center pt-4 gap-4">
              {isGenerating && (
                <div className="w-full space-y-2 animate-in fade-in duration-300">
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <div className="h-full bg-red-600 transition-all duration-700 shadow-[0_0_15px_rgba(220,38,38,1)]" style={{ width: `${generationProgress}%` }} />
                  </div>
                  <p className="text-[8px] font-black text-red-500 uppercase tracking-[0.4em] animate-pulse text-center">Synthesizing Alpha Matrix...</p>
                </div>
              )}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !state.prompt}
                className="w-full px-10 py-5 bg-white text-black font-[1000] rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-30 text-[10px] uppercase tracking-[0.4em] shadow-2xl active:scale-[0.98]"
              >
                {isGenerating ? 'SYNTHESIZING...' : 'FORGE A/B VARIATIONS'}
              </button>
            </div>
          </div>
        </div>
        
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes pulsate-fast {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(220, 38, 38, 0.4)); }
            50% { transform: scale(1.2); filter: drop-shadow(0 0 20px rgba(220, 38, 38, 1)); }
          }
          .animate-pulsate-fast {
            animation: pulsate-fast 0.5s ease-in-out infinite;
          }
        `}} />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#050505] overflow-hidden font-inter">
      <div className="flex-1 flex flex-col p-4 overflow-hidden relative min-h-0">
        <header className="flex items-center justify-between mb-4 px-4 h-14 shrink-0 bg-black/40 backdrop-blur-3xl rounded-2xl border border-white/5 z-20 shadow-2xl">
          <div className="flex items-center gap-4">
            <button onClick={() => onUpdate({ view: 'LANDING' })} className="p-1.5 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full border border-white/5">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex flex-col">
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] leading-none">A/B PRODUCTION HUB</h3>
              <p className="text-[7px] font-black text-red-500 uppercase tracking-widest mt-0.5">SESSION_ACTIVE</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCompareMode(!compareMode)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${compareMode ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/20' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}
            >
              {compareMode ? 'Split View' : 'Focus'}
            </button>
            <button 
              onClick={() => onUpdate({ stage: 'COMPARE' })}
              className="px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] bg-red-600 text-white hover:bg-red-500 shadow-2xl active:scale-95"
            >
              EXPORT
            </button>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center relative px-2 pb-2 overflow-hidden min-h-0">
          {editingLoading && (
            <div className="absolute inset-0 z-[100] bg-black/85 backdrop-blur-2xl flex flex-col items-center justify-center rounded-[40px] border border-white/10">
              <div className="w-12 h-12 border-2 border-white/10 border-t-red-500 rounded-full animate-spin mb-4"></div>
              <p className="text-white text-[9px] font-black uppercase tracking-[0.5em] animate-pulse">Neural Optimization In Progress...</p>
            </div>
          )}
          <div className={`grid h-full w-full gap-4 transition-all duration-700 ease-in-out ${compareMode ? 'grid-cols-2' : 'grid-cols-1 max-w-[85%] max-h-[85%]'}`}>
            {state.variations.map((v, i) => {
              if (!compareMode && state.selectedVarIndex !== i) return null;
              return (
                <div 
                  key={i} 
                  onClick={() => onUpdate({ selectedVarIndex: i })}
                  className={`relative rounded-[32px] overflow-hidden border transition-all duration-500 cursor-pointer bg-[#0a0a0a] group h-full flex items-center justify-center ${state.selectedVarIndex === i ? 'border-red-500 ring-4 ring-red-500/10 shadow-2xl z-10' : 'border-white/5 opacity-40 hover:opacity-60'}`}
                >
                  <img src={v} className="w-full h-full object-contain relative z-0" alt={`Variant ${i}`} />
                  {renderTextOverlay(state.variantEdits[i], compareMode)}
                  <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-400 border border-white/10 backdrop-blur-xl">V0{i+1}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="w-80 border-l border-white/10 bg-[#080808] flex flex-col shrink-0 overflow-hidden relative z-30 shadow-3xl">
        <div className="p-4 border-b border-white/10 flex gap-1.5 shrink-0 bg-[#080808]/95 backdrop-blur-2xl">
          {(['text', 'enhance', 'magic'] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-8 bg-gradient-to-b from-[#080808] to-black">
          {activeTab === 'text' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-400">
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Narrative</label>
                <textarea 
                  value={currentEdit.overlayText}
                  onChange={(e) => updateCurrentEdit({ overlayText: e.target.value })}
                  className="w-full bg-[#121212] border border-white/10 rounded-2xl p-4 text-[11px] text-white h-24 focus:ring-1 focus:ring-red-600 outline-none resize-none uppercase font-black leading-tight shadow-inner"
                  placeholder="EX: I SURVIVED..."
                />
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Scale</label>
                  <span className="text-red-500 text-[10px] font-black">{currentEdit.textSize}</span>
                </div>
                <input type="range" min="10" max="250" value={currentEdit.textSize} onChange={(e) => updateCurrentEdit({ textSize: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full accent-red-600 cursor-pointer appearance-none" />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                     <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">X-Anchor</label>
                     <input type="range" min="0" max="100" value={currentEdit.textX} onChange={(e) => updateCurrentEdit({ textX: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full accent-red-600 appearance-none" />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Y-Anchor</label>
                     <input type="range" min="0" max="100" value={currentEdit.textY} onChange={(e) => updateCurrentEdit({ textY: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full accent-red-600 appearance-none" />
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'enhance' && (
            <div className="space-y-3 animate-in slide-in-from-right duration-400">
              <button onClick={handleRemoveBg} className="w-full py-4 bg-teal-600 text-white font-black rounded-xl text-[9px] uppercase tracking-widest hover:bg-teal-700 transition-all active:scale-95">Subject Extraction</button>
              <button onClick={handleUpscaleAction} className="w-full py-4 bg-red-600 text-white font-black rounded-xl text-[9px] uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95">4K Synthesis</button>
            </div>
          )}
          {activeTab === 'magic' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-400">
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Neural Refinement</label>
                <textarea 
                  value={currentEdit.magicPrompt}
                  onChange={(e) => updateCurrentEdit({ magicPrompt: e.target.value })}
                  className="w-full bg-[#121212] border border-white/10 rounded-2xl p-4 text-[11px] text-white h-32 focus:ring-1 focus:ring-red-600 outline-none shadow-inner leading-relaxed"
                  placeholder="Describe adjustments..."
                />
              </div>
              <button onClick={handleApplyMagicEdit} className="w-full py-5 bg-white text-black font-[1000] rounded-2xl text-[10px] uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all hover:bg-slate-200">RUN MAGIC FORGE</button>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-white/5 bg-[#080808] shrink-0">
          <button onClick={resetWorkstation} className="w-full py-3 text-slate-600 hover:text-red-500 text-[9px] font-black uppercase tracking-[0.2em] transition-colors border border-white/5 rounded-xl">Terminate Session</button>
        </div>
      </aside>
    </div>
  );
};

export default ToolABTesting;