import React, { useState, useRef, useEffect } from 'react';
import { generateAIImage, generateTextContent, analyzeMultimodalContent, editAIImage, removeBackground, upscaleImage } from '../services/api';
import { AppToolsState, CarouselSlide, ToolType, StyleOption, DEFAULT_VARIANT_EDIT, VariantEdit, UserCredits, GenerationStyle } from '../types';

interface ToolCarouselProps {
  state: AppToolsState['carousel'];
  credits: UserCredits;
  onUpdate: (newState: Partial<AppToolsState['carousel']>) => void;
  onUpdateCredits: (credits: UserCredits) => void;
  onAction: (tool: ToolType, image?: string) => void;
}

const CAROUSEL_STYLES: StyleOption[] = [
  { id: 'minimalist', label: 'Minimalist', emoji: '☁️', promptSuffix: 'clean minimalist high-end design, ample white space, elegant' },
  { id: 'bold_typography', label: 'Bold Typography', emoji: '🅰️', promptSuffix: 'bold massive high-impact typography, Swiss design aesthetic' },
  { id: 'carousel_storytelling', label: 'Storytelling Carousel', emoji: '📖', promptSuffix: 'narrative visual storytelling, continuous flow, consistent cinematic characters' },
  { id: 'soft', label: 'Soft', emoji: '🌸', promptSuffix: 'soft pastel colors, dreamlike atmosphere, gentle lighting, ethereal' },
  { id: 'dark', label: 'Dark', emoji: '🌑', promptSuffix: 'dark moody aesthetic, deep shadows, high contrast noir, cinematic low-key lighting' },
  { id: 'none', label: 'None', emoji: '✖️', promptSuffix: '' },
];

const FONTS = [
  { label: 'System Sans', value: 'sans-serif' },
  { label: 'Bebas Neue', value: "'Bebas Neue', sans-serif" },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Inter Black', value: "'Inter', sans-serif" },
  { label: 'Oswald', value: "'Oswald', sans-serif" },
  { label: 'Montserrat', value: "'Montserrat', sans-serif" },
];

const ToolCarousel: React.FC<ToolCarouselProps> = ({ state, credits, onUpdate, onUpdateCredits, onAction }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'magic' | 'enhance' | 'settings'>('text');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [attachedAsset, setAttachedAsset] = useState<{ type: 'IMAGE' | 'VIDEO' | 'URL'; name: string; preview?: string } | null>(null);
  const [editingLoading, setEditingLoading] = useState(false);
  
  const stopGenerationRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSlide = state.slides[state.activeIndex];
  const currentEdit = currentSlide?.edit || DEFAULT_VARIANT_EDIT;

  useEffect(() => {
    return () => {
      stopGenerationRef.current = true;
    };
  }, []);

  useEffect(() => {
    let interval: number;
    if (state.isLoading && (state.view === 'HOME' || state.view === 'ANALYSIS')) {
      interval = window.setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 98) return prev;
          const increment = Math.max(0.1, (100 - prev) / 50);
          return prev + increment;
        });
      }, 100);
    } else {
      setAnalysisProgress(0);
    }
    return () => clearInterval(interval);
  }, [state.isLoading, state.view]);

  const handleClose = () => {
    stopGenerationRef.current = true;
    onUpdate({ 
      isLoading: false, 
      prompt: '', 
      summary: '', 
      slides: [], 
      view: 'LANDING',
      activeIndex: 0 
    });
    setAttachedAsset(null);
    onAction(ToolType.LANDING);
  };

  const handleAnalyse = async () => {
    stopGenerationRef.current = false;
    onUpdate({ isLoading: true });
    try {
      let sourceValue = state.prompt;
      let sourceType: 'prompt' | 'image' | 'url' | 'video' = 'prompt';

      if (attachedAsset) {
        sourceType = attachedAsset.type.toLowerCase() as any;
        sourceValue = attachedAsset.name;
      } else if (state.prompt.trim().toLowerCase().startsWith('http')) {
        sourceType = 'url';
      }
      
      const systemInstruction = "Analyze the provided content. Extract core concepts, trending hooks, and structure a high-converting 5-10 slide Instagram carousel blueprint with specific text overlays for each slide and a clear call-to-action.";
      
      const { summary, credits: newCredits } = await analyzeMultimodalContent(sourceType, sourceValue, systemInstruction);
      
      if (stopGenerationRef.current) return;
      
      onUpdateCredits(newCredits);
      onUpdate({ summary, view: 'ANALYSIS', isLoading: false });
    } catch (error: any) {
      if (!stopGenerationRef.current) {
        alert("Intelligence ingestion failed. Please verify your input or asset.");
        onUpdate({ isLoading: false });
      }
    }
  };

  const handleGenerateSlides = async () => {
    stopGenerationRef.current = false;
    onUpdate({ isLoading: true });
    setGenerationProgress(0);
    try {
      const styleConfig = CAROUSEL_STYLES.find(s => s.id === state.style) || CAROUSEL_STYLES[0];
      const styleSuffix = styleConfig.promptSuffix || '';
      
      const instruction = `Based on the following blueprint summary, generate exactly ${state.numSlides} short, punchy visual descriptions and corresponding high-impact text overlays for an Instagram carousel. Return as a clean list. Format: "Slide X: [Visual Description] | [Text Overlay]".`;
      
      const { text: textResponse, credits: c1 } = await generateTextContent(state.summary, instruction);
      
      if (stopGenerationRef.current) return;
      onUpdateCredits(c1);

      const lines = textResponse.split('\n').filter(l => l.trim().length > 10).slice(0, state.numSlides);
      const slides: CarouselSlide[] = [];
      
      for(let i = 0; i < lines.length; i++) {
        if (stopGenerationRef.current) break;
        setGenerationProgress(Math.floor(((i + 1) / lines.length) * 100));
        
        const [meta, textPart] = lines[i].split('|');
        const visualDesc = meta.includes(':') ? meta.split(':')[1].trim() : meta.trim();
        const overlayText = textPart ? textPart.trim() : (visualDesc.substring(0, 30).toUpperCase());

        const { imageUrl, credits: imgCredits } = await generateAIImage(`${visualDesc}, ${styleSuffix}`, state.aspectRatio);
        
        if (stopGenerationRef.current) break;
        onUpdateCredits(imgCredits);
        
        slides.push({
          id: `slide-${i}-${Date.now()}`,
          imageUrl,
          caption: lines[i],
          edit: { 
            ...DEFAULT_VARIANT_EDIT, 
            overlayText: overlayText.toUpperCase(),
            fontFamily: FONTS[1].value
          }
        });
      }
      
      if (!stopGenerationRef.current) {
        onUpdate({ slides, view: 'EDITOR', activeIndex: 0, isLoading: false });
      }
    } catch (error) {
      if (!stopGenerationRef.current) {
        alert("Visual effect synthesis encountered a neural mismatch. Retrying...");
        onUpdate({ isLoading: false });
      }
    } finally {
      if (!stopGenerationRef.current) setGenerationProgress(0);
    }
  };

  const handleApplyMagicEdit = async () => {
    if (!currentSlide) return;
    setEditingLoading(true);
    try {
      const instruction = currentEdit.magicPrompt || "Apply high-impact visual refinement and aesthetic consistency.";
      const { imageUrl, credits: newCredits } = await editAIImage(currentSlide.imageUrl, instruction);
      onUpdateCredits(newCredits);
      const newSlides = [...state.slides];
      newSlides[state.activeIndex] = { ...currentSlide, imageUrl };
      onUpdate({ slides: newSlides });
    } catch (error: any) {
      alert(`Magic edit failed: ${error.message}`);
    } finally {
      setEditingLoading(false);
    }
  };

  const handleRemoveBg = async () => {
    if (!currentSlide) return;
    setEditingLoading(true);
    try {
      const { imageUrl, credits: newCredits } = await removeBackground(currentSlide.imageUrl);
      onUpdateCredits(newCredits);
      const newSlides = [...state.slides];
      newSlides[state.activeIndex] = { ...currentSlide, imageUrl };
      onUpdate({ slides: newSlides });
    } catch (error: any) {
      alert(`Background extraction failed: ${error.message}`);
    } finally {
      setEditingLoading(false);
    }
  };

  const handleUpscaleAction = async () => {
    if (!currentSlide) return;
    setEditingLoading(true);
    try {
      const { imageUrl, credits: newCredits } = await upscaleImage(currentSlide.imageUrl);
      onUpdateCredits(newCredits);
      const newSlides = [...state.slides];
      newSlides[state.activeIndex] = { ...currentSlide, imageUrl };
      onUpdate({ slides: newSlides });
    } catch (error: any) {
      alert(`Upscale failed: ${error.message}`);
    } finally {
      setEditingLoading(false);
    }
  };

  const updateSlideEdit = (updates: Partial<VariantEdit>) => {
    if (!currentSlide) return;
    const newSlides = [...state.slides];
    newSlides[state.activeIndex] = {
      ...currentSlide,
      edit: { ...currentEdit, ...updates }
    };
    onUpdate({ slides: newSlides });
  };

  const handleSourceAction = (type: 'IMAGE' | 'VIDEO') => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.type = type;
      fileInputRef.current.accept = type === 'IMAGE' ? 'image/*' : 'video/*';
      fileInputRef.current.click();
    }
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const type = e.target.dataset.type as 'IMAGE' | 'VIDEO';
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachedAsset({ type, name: file.name, preview: ev.target?.result as string });
        onUpdate({ prompt: `Project analysis from ${type.toLowerCase()} file: ${file.name}` });
      };
      reader.readAsDataURL(file);
    }
  };

  if (state.view === 'LANDING') {
    return (
      <div className="h-full relative overflow-hidden flex flex-col items-center justify-center p-8 bg-[#020202] font-inter min-h-0">
        <div className="absolute inset-0 z-0 bg-cover bg-center opacity-40 scale-105 animate-pulse duration-[15s] saturate-[0.8]"
             style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1974&auto=format&fit=crop")' }} />
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/20 rounded-full blur-[160px] z-[1] animate-glow" />
        <div className="relative z-10 text-center flex flex-col items-center justify-center w-full max-w-5xl mx-auto h-full space-y-12">
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-indigo-600/10 border border-indigo-500/20 backdrop-blur-xl mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Carousel Studio Active</span>
            </div>
            <h1 className="text-7xl md:text-8xl lg:text-[10rem] font-[1000] text-white tracking-tighter leading-[0.8] uppercase drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
              Snoop<span className="text-indigo-500">Werk</span>
            </h1>
            <p className="text-slate-400 font-bold text-xs md:text-sm uppercase tracking-[0.3em] leading-relaxed max-w-2xl mx-auto opacity-60">
              Transform raw logic into high-converting slide sequences designed to dominate the attention economy.
            </p>
          </div>
          <button onClick={() => onUpdate({ view: 'HOME' })} className="w-full max-w-md py-6 bg-white text-black font-black rounded-3xl text-xs uppercase tracking-[0.5em] transition-all hover:scale-[1.02] active:scale-95 border border-white/20 shadow-2xl">
            Initiate New Sequence
          </button>
        </div>
      </div>
    );
  }

  if (state.view === 'HOME') {
    return (
      <div className="h-full bg-[#030712] relative overflow-hidden flex flex-col p-4 md:p-8 font-inter">
        <input type="file" ref={fileInputRef} className="hidden" onChange={onFileSelected} />
        <div className={`absolute inset-0 z-0 bg-cover bg-center pointer-events-none scale-110 transition-opacity duration-1000 saturate-[1.3] ${state.isLoading ? 'animate-[bg-blink_1s_infinite]' : 'opacity-[0.4]'}`}
             style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1974&auto=format&fit=crop")' }} />
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col h-full gap-4 min-h-0">
          <header className="flex items-center justify-between gap-4 shrink-0 px-2">
            <div className="flex items-baseline gap-4">
              <h1 className="text-4xl font-[1000] text-white uppercase tracking-tighter leading-none">Carousel Studio</h1>
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest opacity-60">Sequence_Core.v4</p>
            </div>
            <button onClick={handleClose} className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all border border-white/10 backdrop-blur-xl hover:bg-white/10">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </header>
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
            <div className="w-full lg:w-72 flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar pr-2">
              <div className="bg-[#0b1121]/95 backdrop-blur-3xl rounded-[32px] border border-white/10 p-6 flex flex-col gap-8 shadow-2xl">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500/80">Dimensions</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['1:1', '4:3', '3:4', '9:16', '16:9'].map((ratio) => (
                      <button key={ratio} onClick={() => onUpdate({ aspectRatio: ratio as any })}
                              className={`py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${state.aspectRatio === ratio ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300'}`}>{ratio}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500/80">Choose Style</label>
                  <select value={state.style} onChange={(e) => onUpdate({ style: e.target.value as GenerationStyle })}
                          className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white font-black text-[11px] appearance-none outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner">
                    {CAROUSEL_STYLES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500/80">Slide Count</label>
                    <span className="text-indigo-400 font-black text-sm">{state.numSlides}</span>
                  </div>
                  <input type="range" min="3" max="10" value={state.numSlides} onChange={(e) => onUpdate({ numSlides: parseInt(e.target.value) })} className="w-full accent-indigo-500 cursor-pointer" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <button onClick={() => handleSourceAction('IMAGE')} className="flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group">
                  <span className="text-xl group-hover:scale-110 transition-transform">🖼️</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Attach Reference</span>
                </button>
              </div>
            </div>
            <div className="flex-1 flex flex-col min-h-0 gap-4">
              <div className="flex-1 bg-[#0b1121]/80 backdrop-blur-3xl rounded-[48px] border border-white/10 p-8 flex flex-col shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-4 shrink-0">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/60">Neural Ingestion</span>
                   </div>
                   {attachedAsset && (
                     <div className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-[9px] font-black rounded-lg border border-indigo-500/20 animate-in zoom-in">
                       FILE: {attachedAsset.name.toUpperCase()}
                     </div>
                   )}
                </div>
                <textarea value={state.prompt} onChange={(e) => onUpdate({ prompt: e.target.value })}
                          className="flex-1 bg-transparent text-white font-[500] text-lg lg:text-[1.3rem] focus:outline-none resize-none placeholder:text-slate-800 leading-relaxed custom-scrollbar"
                          placeholder="Describe your vision, paste a URL, or attach an image for structural analysis..." />
                {state.isLoading && (
                  <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                    <h2 className="text-3xl font-[1000] text-white tracking-[0.3em] animate-pulse uppercase mb-8">SNOOPWERK</h2>
                    <div className="w-full max-w-sm space-y-4">
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${analysisProgress}%` }} />
                      </div>
                      <p className="text-indigo-400 text-[11px] font-[1000] uppercase tracking-[0.6em]">Analyzing Architecture</p>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => handleAnalyse()} disabled={state.isLoading || (!state.prompt && !attachedAsset)}
                      className="w-full py-7 bg-indigo-600 hover:bg-indigo-500 text-white font-[1000] rounded-[40px] uppercase tracking-[0.6em] text-sm transition-all shadow-xl active:scale-[0.98] disabled:opacity-30 border border-white/10">
                PROCESS INTELLIGENCE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.view === 'ANALYSIS') {
    return (
      <div className="h-full flex flex-col bg-[#050505] p-6 md:p-10 relative overflow-hidden font-inter">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-950/20 to-black pointer-events-none" />
        <div className="max-w-6xl mx-auto w-full flex flex-col h-full gap-8 min-h-0 relative z-10">
          <header className="flex items-center justify-between shrink-0 px-2">
            <div className="space-y-1">
              <h2 className="text-4xl font-[1000] text-white uppercase tracking-tighter drop-shadow-2xl">STRATEGIC BLUEPRINT</h2>
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em] opacity-80">Narrative framework ingestion complete</p>
            </div>
            <button onClick={handleClose} className="p-4 bg-white/5 rounded-3xl text-slate-500 hover:text-white border border-white/10 backdrop-blur-3xl transition-all hover:bg-white/10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </header>
          <div className="flex-1 bg-[#0b1121]/90 backdrop-blur-[40px] p-10 rounded-[56px] border border-white/10 text-slate-200 font-medium leading-relaxed whitespace-pre-wrap shadow-3xl text-lg overflow-y-auto custom-scrollbar relative">
            <div className="absolute top-8 right-8 text-[8px] font-black text-indigo-400/40 uppercase tracking-widest">Blueprint_01</div>
            {state.summary}
          </div>
          <div className="flex flex-col sm:flex-row gap-5 shrink-0 pb-8 px-2">
             <button onClick={() => onUpdate({ view: 'HOME' })} className="px-12 py-7 bg-white/5 text-slate-400 font-[1000] rounded-[36px] uppercase border border-white/10 hover:text-white hover:bg-white/10 transition-all text-[10px]">RE-ENTER CORE</button>
             <button onClick={handleGenerateSlides} disabled={state.isLoading} className="flex-1 py-7 bg-indigo-600 text-white font-[1000] rounded-[36px] uppercase tracking-[0.5em] hover:bg-indigo-500 transition-all shadow-xl text-xs group relative overflow-hidden border border-white/20">
               <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
               <span className="relative z-10">{state.isLoading ? 'FORGING CREATIVE MATRIX...' : 'VISUAL EFFECT: FORGE ASSETS'}</span>
             </button>
          </div>
        </div>
        {state.isLoading && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl z-[200] flex flex-col items-center justify-center p-8 animate-in fade-in">
             <div className="w-full max-w-sm space-y-8 text-center">
                <h3 className="text-3xl font-[1000] text-white tracking-[0.4em] animate-pulse">SNOOPWERK</h3>
                <div className="space-y-4">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-indigo-500 transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,1)]" style={{ width: `${generationProgress}%` }} />
                  </div>
                  <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Synthesizing Alpha Sequence</p>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row bg-[#020202] overflow-hidden relative font-inter">
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden relative min-h-0">
        <header className="h-16 bg-black/60 rounded-[28px] border border-white/10 flex items-center justify-between px-8 mb-4 backdrop-blur-3xl shrink-0 shadow-2xl">
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">FRAME SEQUENCE</span>
             <span className="text-indigo-400 text-[12px] font-[1000] uppercase tracking-widest leading-none">{state.activeIndex + 1} OF {state.slides.length}</span>
           </div>
           <div className="flex items-center gap-3">
             <button onClick={() => alert("Project exported to production queue.")} className="px-7 py-3 bg-white text-black text-[10px] font-[1000] rounded-2xl uppercase tracking-[0.2em] hover:bg-slate-200 transition-all shadow-xl">EXPORT</button>
             <button onClick={handleClose} className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all border border-white/5">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
           </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-2 md:p-6 overflow-hidden min-h-0 relative">
          {(state.isLoading || editingLoading) && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center z-[100] rounded-[48px] p-8 text-center animate-in fade-in">
              <div className="w-full max-w-sm space-y-4">
                <h2 className="text-2xl font-[1000] text-white tracking-[0.3em] uppercase">SNOOPWERK</h2>
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${generationProgress}%` }} />
                </div>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Neural Refinement Active</p>
              </div>
            </div>
          )}
          <div className="h-full max-h-[72vh] bg-[#050505] rounded-[56px] border border-white/20 shadow-3xl relative overflow-hidden flex items-center justify-center group" 
               style={{ aspectRatio: state.aspectRatio.replace(':', '/') }}>
            {currentSlide && (
              <div className="w-full h-full relative">
                <img src={currentSlide.imageUrl} className="w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-105" alt="Slide" />
                <div className="absolute pointer-events-none select-none z-10 font-[1000] tracking-tighter text-center px-12 leading-[0.85] uppercase"
                     style={{
                       left: `${currentEdit.textX}%`,
                       top: `${currentEdit.textY}%`,
                       transform: `translate(-50%, -50%) rotate(${currentEdit.textRotation}deg)`,
                       color: currentEdit.textColor,
                       fontSize: `${currentEdit.textSize * 0.8}px`,
                       fontFamily: currentEdit.fontFamily,
                       textShadow: '0 10px 40px rgba(0,0,0,1)'
                     }}>
                  {currentEdit.overlayText}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-28 flex items-center gap-4 px-8 overflow-x-auto custom-scrollbar shrink-0 bg-black/50 backdrop-blur-2xl rounded-[36px] mx-2 mb-2 border border-white/10 mt-6 shadow-inner">
           {state.slides.map((s, i) => (
             <button key={s.id} onClick={() => onUpdate({ activeIndex: i })}
               className={`w-20 h-20 shrink-0 rounded-2xl border-2 transition-all overflow-hidden relative ${state.activeIndex === i ? 'border-indigo-500 scale-110 shadow-lg' : 'border-white/10 opacity-60 hover:opacity-100 hover:scale-105'}`}>
               <img src={s.imageUrl} className="w-full h-full object-cover" alt={`F${i}`} />
               <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white font-black text-[10px]">{i + 1}</div>
             </button>
           ))}
        </div>
      </div>

      <aside className="w-full lg:w-85 border-l border-white/10 bg-[#080808] flex flex-col shrink-0 min-h-0 relative z-10 shadow-2xl">
        <div className="p-4 border-b border-white/10 flex gap-2 shrink-0 bg-[#080808]/85 backdrop-blur-xl">
          {(['text', 'magic', 'enhance', 'settings'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-10 min-h-0 bg-gradient-to-b from-[#080808] to-black">
          {activeTab === 'text' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-400">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500/80 ml-1">Narrative Content</label>
                <textarea value={currentEdit.overlayText} onChange={(e) => updateSlideEdit({ overlayText: e.target.value })}
                  className="w-full bg-[#121212] border border-white/10 rounded-[24px] p-5 text-[12px] text-white h-24 focus:ring-1 focus:ring-indigo-600 outline-none resize-none uppercase font-black leading-tight shadow-inner" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Color</label>
                  <input type="color" value={currentEdit.textColor} onChange={(e) => updateSlideEdit({ textColor: e.target.value })} className="w-full h-10 bg-transparent rounded-xl border border-white/10 cursor-pointer" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Typeface</label>
                  <select value={currentEdit.fontFamily} onChange={(e) => updateSlideEdit({ fontFamily: e.target.value })} className="w-full h-10 bg-[#121212] border border-white/10 rounded-xl p-2 text-[10px] text-white font-black outline-none">
                    {FONTS.map(f => <option key={f.value} value={f.value}>{f.label.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Scale</label>
                  <span className="text-indigo-400 text-[10px] font-black">{currentEdit.textSize}PX</span>
                </div>
                <input type="range" min="10" max="250" value={currentEdit.textSize} onChange={(e) => updateSlideEdit({ textSize: parseInt(e.target.value) })} className="w-full accent-indigo-500 cursor-pointer" />
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Rotation</label>
                  <span className="text-indigo-400 text-[10px] font-black">{currentEdit.textRotation}°</span>
                </div>
                <input type="range" min="-180" max="180" value={currentEdit.textRotation} onChange={(e) => updateSlideEdit({ textRotation: parseInt(e.target.value) })} className="w-full accent-indigo-500 cursor-pointer" />
              </div>
            </div>
          )}
          {activeTab === 'magic' && (
             <div className="space-y-8 animate-in slide-in-from-right duration-400">
                <div className="p-6 bg-indigo-600/10 border border-indigo-500/20 rounded-[28px] shadow-inner">
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Neural Refinement</p>
                   <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Surgical AI Asset Modification</p>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500/80 ml-1">Refinement Intent</label>
                  <textarea value={currentEdit.magicPrompt} onChange={(e) => updateSlideEdit({ magicPrompt: e.target.value })}
                    className="w-full bg-[#121212] border border-white/10 rounded-[28px] p-6 text-[12px] text-white h-40 focus:ring-1 focus:ring-indigo-600 outline-none shadow-inner"
                    placeholder="Describe specific changes (e.g. Change environment to neon Tokyo, add motion blur...)" />
                </div>
                <button onClick={handleApplyMagicEdit} disabled={state.isLoading || editingLoading} className="w-full py-5 bg-indigo-600 text-white font-black rounded-[28px] text-[11px] uppercase tracking-[0.4em] active:scale-[0.98] transition-all hover:bg-indigo-500 shadow-xl shadow-indigo-600/20">
                  RUN MAGIC EDIT
                </button>
             </div>
          )}
          {activeTab === 'enhance' && (
            <div className="space-y-4 animate-in slide-in-from-right duration-400">
              <div className="space-y-2 mb-4">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">Pixel Precision</p>
              </div>
              <button onClick={handleRemoveBg} disabled={editingLoading} className="w-full py-5 bg-teal-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-teal-700 transition-all active:scale-95 shadow-xl shadow-teal-600/10 border border-teal-500/20">REMOVE BG</button>
              <button onClick={handleUpscaleAction} disabled={editingLoading} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-600/10 border border-indigo-500/20">ENHANCE & UPSCALE</button>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="space-y-4 animate-in slide-in-from-right duration-400">
               <button onClick={() => onUpdate({ view: 'ANALYSIS' })} className="w-full py-5 bg-white/5 border border-white/10 text-slate-400 font-black rounded-[24px] text-[10px] uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all">Review Blueprint</button>
               <button onClick={handleClose} className="w-full py-5 bg-red-500/15 text-red-500 font-black rounded-[24px] text-[10px] uppercase tracking-widest border border-red-500/30 hover:bg-red-500 hover:text-white transition-all">Terminate Session</button>
            </div>
          )}
        </div>
      </aside>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bg-blink {
          0%, 100% { opacity: 0.3; filter: blur(0px); }
          50% { opacity: 0.1; filter: blur(4px); }
        }
      `}} />
    </div>
  );
};

export default ToolCarousel;