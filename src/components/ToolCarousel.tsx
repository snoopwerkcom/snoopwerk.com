
import React, { useState, useRef, useEffect } from 'react';
import { generateAIImage, generateTextContent, analyzeMultimodalContent } from '../services/api';
import { AppToolsState, CarouselSlide, ToolType, StyleOption, DEFAULT_VARIANT_EDIT, VariantEdit, UserCredits, GenerationStyle } from '../types';

interface ToolCarouselProps {
  state: AppToolsState['carousel'];
  credits: UserCredits;
  onUpdate: (newState: Partial<AppToolsState['carousel']>) => void;
  onUpdateCredits: (credits: UserCredits) => void;
  onAction: (tool: ToolType, image?: string) => void;
}

const CAROUSEL_STYLES: StyleOption[] = [
  { id: 'none', label: 'None', emoji: '✖️', promptSuffix: '' },
  { id: 'anime', label: 'Anime', emoji: '🎎', promptSuffix: 'vibrant anime art style, expressive characters' },
  { id: 'bold_typography', label: 'Bold Typography', emoji: '🅰️', promptSuffix: 'bold massive typography, Swiss design aesthetic' },
  { id: 'brutalist', label: 'Brutalist', emoji: '🧱', promptSuffix: 'neo-brutalist raw aesthetic, chunky borders' },
  { id: 'calligraphy', label: 'Calligraphy', emoji: '🖋️', promptSuffix: 'elegant calligraphic brush strokes' },
  { id: 'cartoon', label: 'Cartoon', emoji: '🎨', promptSuffix: 'modern 2d cartoon illustration' },
  { id: 'cinematic', label: 'Cinematic', emoji: '🎬', promptSuffix: 'cinematic lighting, dramatic depth' },
  { id: 'gamer', label: 'Gamer', emoji: '🎮', promptSuffix: 'esports mascot style, neon accents' },
  { id: 'looneytoon', label: 'Looneytoon', emoji: '🐰', promptSuffix: 'vintage 1940s animation style' },
  { id: 'manga', label: 'Manga', emoji: '🇯🇵', promptSuffix: 'classic manga ink lines and screentones' },
  { id: 'minimalist', label: 'Minimalist', emoji: '☁️', promptSuffix: 'clean minimalist high-end design' },
  { id: 'oil_painting', label: 'Oil Painting', emoji: '🖼️', promptSuffix: 'thick oil painting textures' },
  { id: 'photography', label: 'Photography', emoji: '📷', promptSuffix: 'professional commercial photography' },
  { id: 'pixar', label: 'Pixar', emoji: '🐭', promptSuffix: '3d animated movie style' },
  { id: 'realism', label: 'Realism', emoji: '📸', promptSuffix: 'photorealistic detail, 8k resolution' },
  { id: 'retro', label: 'Retro', emoji: '📼', promptSuffix: 'vintage 80s aesthetic, vhs textures' },
];

const ToolCarousel: React.FC<ToolCarouselProps> = ({ state, credits, onUpdate, onUpdateCredits, onAction }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'magic' | 'settings'>('text');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [attachedAsset, setAttachedAsset] = useState<{ type: 'IMAGE' | 'VIDEO' | 'URL'; name: string; preview?: string } | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  
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
    if (state.isLoading && state.view === 'HOME') {
      setAnalysisProgress(0);
      interval = window.setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 98) return prev;
          const increment = Math.max(0.2, (100 - prev) / 30);
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

  const handleAnalyse = async (urlOverride?: string) => {
    stopGenerationRef.current = false;
    onUpdate({ isLoading: true });
    try {
      let sourceValue = urlOverride || (attachedAsset?.type === 'URL' ? attachedAsset.name : state.prompt);
      let sourceType = urlOverride ? 'url' : (attachedAsset ? attachedAsset.type.toLowerCase() as any : 'prompt');
      
      if (!urlOverride && !attachedAsset && state.prompt.trim().toLowerCase().startsWith('http')) {
        try {
          new URL(state.prompt.trim());
          sourceType = 'url';
          sourceValue = state.prompt.trim();
        } catch (e) {}
      }

      const systemInstruction = "Analyze the provided content. Extract core concepts, trending hooks, and structure a high-converting 5-10 slide Instagram carousel blueprint with specific text overlays for each slide and a clear call-to-action.";
      
      const { summary, credits: newCredits } = await analyzeMultimodalContent(sourceType, sourceValue, systemInstruction);
      
      if (stopGenerationRef.current) return;
      
      onUpdateCredits(newCredits);
      onUpdate({ summary, view: 'ANALYSIS', isLoading: false });
    } catch (error: any) {
      if (!stopGenerationRef.current) {
        alert("Analysis failed. Please check your connection or input.");
        onUpdate({ isLoading: false });
      }
    }
  };

  const handleGenerate = async () => {
    stopGenerationRef.current = false;
    onUpdate({ isLoading: true });
    setGenerationProgress(0);
    try {
      const styleConfig = CAROUSEL_STYLES.find(s => s.id === state.style) || CAROUSEL_STYLES[0];
      const styleSuffix = styleConfig.promptSuffix || '';
      
      const instruction = `Based on the following summary, generate exactly ${state.numSlides} short, punchy visual descriptions and corresponding text overlays for an Instagram carousel. Return the slides as a list where each line describes one slide. Format each line as "Slide X: [Description] | [Overlay Text]".`;
      
      const { text: textResponse, credits: c1 } = await generateTextContent(state.summary, instruction);
      
      if (stopGenerationRef.current) return;
      onUpdateCredits(c1);

      const lines = textResponse.split('\n').filter(l => l.trim().length > 0).slice(0, state.numSlides);
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
            overlayText: overlayText.toUpperCase()
          }
        });
      }
      
      if (!stopGenerationRef.current) {
        onUpdate({ slides, view: 'EDITOR', activeIndex: 0, isLoading: false });
      }
    } catch (error) {
      if (!stopGenerationRef.current) {
        alert("Visual asset synthesis failed.");
        onUpdate({ isLoading: false });
      }
    } finally {
      if (!stopGenerationRef.current) setGenerationProgress(0);
    }
  };

  const handleRegenerateSlide = async () => {
    if (!currentSlide) return;
    stopGenerationRef.current = false;
    onUpdate({ isLoading: true });
    try {
      const styleConfig = CAROUSEL_STYLES.find(s => s.id === state.style) || CAROUSEL_STYLES[0];
      const styleSuffix = styleConfig.promptSuffix || '';
      const refinePrompt = currentEdit.magicPrompt 
        ? `${currentSlide.caption}. Refinement instructions: ${currentEdit.magicPrompt}, ${styleSuffix}`
        : `${currentSlide.caption}, ${styleSuffix}`;
      
      const { imageUrl, credits: newCredits } = await generateAIImage(refinePrompt, state.aspectRatio);
      
      if (stopGenerationRef.current) return;
      onUpdateCredits(newCredits);
      
      const newSlides = [...state.slides];
      newSlides[state.activeIndex] = { ...currentSlide, imageUrl };
      
      onUpdate({ slides: newSlides, isLoading: false });
    } catch (error) {
      if (!stopGenerationRef.current) {
        alert("Regeneration failed.");
        onUpdate({ isLoading: false });
      }
    }
  };

  const handleDownload = () => {
    alert("Project bundle successfully prepared for platform delivery.");
  };

  const updateSlideEdit = (updates: Partial<VariantEdit>) => {
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
      setIsIngesting(true);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachedAsset({ type, name: file.name, preview: ev.target?.result as string });
        setIsIngesting(false);
        onUpdate({ prompt: `Synthesis using ${type.toLowerCase()} asset: ${file.name}` });
      };
      reader.readAsDataURL(file);
    }
  };

  if (state.view === 'LANDING') {
    return (
      <div className="h-full relative overflow-hidden flex flex-col items-center justify-center p-8 bg-[#020202] font-inter min-h-0">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-40 scale-105 animate-pulse duration-[15s] saturate-[0.8]"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1974&auto=format&fit=crop")' }}
        />
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/20 rounded-full blur-[160px] z-[1] animate-glow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-purple-600/10 rounded-full blur-[160px] z-[1] animate-glow [animation-delay:4s]" />
        <div className="absolute inset-0 z-[2] bg-gradient-to-t from-[#020202] via-transparent to-[#020202]/80" />
        
        <div className="relative z-10 text-center flex flex-col items-center justify-center w-full max-w-5xl mx-auto h-full space-y-12">
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-indigo-600/10 border border-indigo-500/20 backdrop-blur-xl mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Carousel Studio Active</span>
            </div>
            
            <h1 className="text-7xl md:text-8xl lg:text-[10rem] font-[1000] text-white tracking-tighter leading-[0.8] uppercase drop-shadow-[0_20px_60px_rgba(0,0,0,1)]">
              Snoop<span className="text-indigo-500">Werk</span>
            </h1>
            
            <div className="flex flex-col gap-4 max-w-2xl mx-auto">
              <p className="text-indigo-400/80 font-[900] text-sm md:text-lg uppercase tracking-[0.6em] drop-shadow-lg">
                The Narrative Sequence Engine
              </p>
              <p className="text-slate-400 font-bold text-xs md:text-sm uppercase tracking-[0.3em] leading-relaxed opacity-60">
                Transform scripts, URLs, and ideas into high-converting slide sequences designed to dominate the attention economy.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-10 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300 w-full">
            <button 
              onClick={() => onUpdate({ view: 'HOME' })}
              className="group relative w-full max-w-md py-6 bg-white text-black font-black rounded-3xl text-xs uppercase tracking-[0.5em] transition-all shadow-3xl shadow-indigo-600/10 hover:scale-[1.02] active:scale-95 border border-white/20 overflow-hidden"
            >
              <div className="absolute inset-0 bg-indigo-600/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
              <span className="relative z-10">Initiate New Sequence</span>
            </button>
            
            <div className="flex gap-16 items-center justify-center grayscale opacity-30">
               <div className="flex flex-col items-center gap-2">
                 <span className="text-2xl font-black text-white">100K+</span>
                 <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Assets Forged</span>
               </div>
               <div className="flex flex-col items-center gap-2">
                 <span className="text-2xl font-black text-white">60s</span>
                 <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Avg. Delivery</span>
               </div>
               <div className="flex flex-col items-center gap-2">
                 <span className="text-2xl font-black text-white">4.9/5</span>
                 <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Engine Rating</span>
               </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1 items-center opacity-20">
           <div className="w-8 h-1 bg-white/20 rounded-full" />
           <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
           <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
        </div>
      </div>
    );
  }

  if (state.view === 'HOME') {
    return (
      <div className="h-full bg-[#030712] relative overflow-hidden flex flex-col p-4 md:p-8 font-inter">
        <input type="file" ref={fileInputRef} className="hidden" onChange={onFileSelected} />

        <div 
          className={`absolute inset-0 z-0 bg-cover bg-center pointer-events-none scale-110 transition-opacity duration-1000 saturate-[1.3] ${state.isLoading ? 'animate-[bg-blink_1s_infinite]' : 'opacity-[0.4]'}`}
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1974&auto=format&fit=crop")' }}
        />
        <div className="absolute top-[-15%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col h-full gap-4 min-h-0">
          <header className="flex items-center justify-between gap-4 shrink-0 px-2">
            <div className="flex items-baseline gap-4">
              <h1 className="text-4xl font-[1000] text-white uppercase tracking-tighter leading-none drop-shadow-2xl">Carousel Studio</h1>
              <p className="text-indigo-400/80 text-[10px] font-black tracking-[0.4em] uppercase hidden sm:block">Narrative Synthesis v4.2</p>
            </div>
            <button 
              onClick={handleClose} 
              className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all border border-white/10 backdrop-blur-xl hover:bg-white/10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </header>

          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
            <div className="w-full lg:w-72 flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar pr-1">
              <div className="bg-[#0b1121]/95 backdrop-blur-3xl rounded-[32px] border border-white/10 p-6 flex flex-col gap-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500/80">Dimensions</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['1:1', '4:3', '3:4', '9:16', '16:9'].map((ratio) => (
                      <button 
                        key={ratio}
                        onClick={() => onUpdate({ aspectRatio: ratio as any })}
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${state.aspectRatio === ratio ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_8px_20px_rgba(79,70,229,0.4)]' : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-black/60'}`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500/80">Aesthetic Engine</label>
                  <div className="relative group">
                    <select 
                      value={state.style}
                      onChange={(e) => onUpdate({ style: e.target.value as GenerationStyle })}
                      className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white font-black text-[11px] appearance-none outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-inner"
                    >
                      {CAROUSEL_STYLES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label.toUpperCase()}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500/80">Slide Count</label>
                    <span className="text-indigo-400 font-black text-sm drop-shadow-[0_0_8px_rgba(129,140,248,0.4)]">{state.numSlides}</span>
                  </div>
                  <input 
                    type="range" min="3" max="10" value={state.numSlides} 
                    onChange={(e) => onUpdate({ numSlides: parseInt(e.target.value) })}
                    className="w-full h-1 bg-white/10 rounded-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button onClick={() => handleSourceAction('IMAGE')} className="flex items-center gap-3 px-6 py-4 bg-[#0b1121]/60 rounded-2xl border border-white/5 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all group backdrop-blur-xl">
                  <span className="text-xl group-hover:scale-110 transition-transform">🖼️</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-200">Upload Image Asset</span>
                </button>
                <button onClick={() => handleSourceAction('VIDEO')} className="flex items-center gap-3 px-6 py-4 bg-[#0b1121]/60 rounded-2xl border border-white/5 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all group backdrop-blur-xl">
                  <span className="text-xl group-hover:scale-110 transition-transform">📹</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-200">Upload Video Asset</span>
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 gap-4">
              <div className="flex-1 relative group bg-[#0b1121]/80 backdrop-blur-3xl rounded-[48px] border border-white/10 p-8 flex flex-col shadow-[0_48px_96px_-12px_rgba(0,0,0,0.8)] min-h-0 overflow-hidden text-center justify-center items-center">
                <div className="flex justify-between items-center mb-6 relative z-10 shrink-0 w-full">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(99,102,241,1)]" />
                      <label className="text-[10px] font-[1000] uppercase tracking-[0.4em] text-indigo-400/80">Intelligence Ingestion</label>
                   </div>
                   {attachedAsset && (
                     <button onClick={() => setAttachedAsset(null)} className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[9px] font-[1000] uppercase tracking-widest rounded-xl border border-red-500/20">
                       Discard Asset
                     </button>
                   )}
                </div>

                <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-0 overflow-hidden relative w-full">
                  {attachedAsset && (
                    <div className="w-full md:w-[45%] h-full shrink-0 rounded-[40px] overflow-hidden border border-white/10 bg-black/60 shadow-2xl relative animate-in zoom-in duration-500">
                      {attachedAsset.preview ? (
                        <img src={attachedAsset.preview} className="w-full h-full object-cover" alt="Source" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-indigo-900/40 to-black">
                          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                            <span className="text-6xl">{attachedAsset.type === 'URL' ? '🔗' : '📹'}</span>
                          </div>
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-8 truncate max-w-full text-center opacity-80">
                            {attachedAsset.name}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </div>
                  )}

                  <textarea 
                    value={state.prompt}
                    onChange={(e) => onUpdate({ prompt: e.target.value })}
                    className="flex-1 bg-transparent text-white font-[500] text-base md:text-lg lg:text-[1.2rem] focus:outline-none resize-none placeholder:text-slate-800 leading-relaxed tracking-tight custom-scrollbar overflow-y-auto min-h-0 py-2 text-left"
                    placeholder="Describe your vision or paste your URL, podcast link here for analysis..."
                  />
                </div>

                {state.isLoading && (
                  <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-2xl rounded-[48px] z-[100] flex flex-col items-center justify-center p-6 md:p-12 animate-in fade-in duration-500 animate-[bg-blink_1s_infinite]">
                    <div className="w-full max-w-5xl space-y-8 text-center flex flex-col items-center justify-center">
                       <h2 className="text-3xl md:text-4xl font-[1000] text-white tracking-[0.2em] animate-[blink_1s_infinite] uppercase drop-shadow-[0_0_40px_rgba(99,102,241,0.6)] leading-none select-none">
                         SNOOPWERK
                       </h2>
                       <div className="space-y-6 w-full max-w-md">
                         <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/10 shadow-inner">
                            <div className="h-full bg-indigo-500 transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,1)]" style={{ width: `${analysisProgress}%` }} />
                         </div>
                         <div className="flex flex-col gap-2">
                           <p className="text-indigo-400 text-[11px] font-[1000] uppercase tracking-[0.6em] animate-pulse">
                             Synthesizing Blueprint
                           </p>
                           <p className="text-white/30 text-[9px] font-black uppercase tracking-widest">Integrating Neural Pathways...</p>
                         </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => handleAnalyse()}
                disabled={state.isLoading || (!state.prompt && !attachedAsset)}
                className="w-full py-7 bg-indigo-600 hover:bg-indigo-500 text-white font-[1000] rounded-[40px] uppercase tracking-[0.6em] text-sm transition-all shadow-[0_32px_64px_-16px_rgba(79,70,229,0.6)] active:scale-[0.98] disabled:opacity-20 shrink-0 border border-white/10"
              >
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
      <div className="h-full flex flex-col bg-slate-950 p-6 md:p-10 relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-950/20 to-black pointer-events-none" />
        <div className="max-w-4xl mx-auto w-full flex flex-col h-full gap-6 min-h-0 relative z-10">
          <header className="flex items-center justify-between shrink-0 px-2">
            <div>
              <h2 className="text-4xl font-[1000] text-white uppercase tracking-tighter drop-shadow-2xl">Strategic Blueprint</h2>
              <p className="text-indigo-400 text-[10px] font-black tracking-[0.4em] uppercase opacity-80">Verified Execution Roadmap</p>
            </div>
            <button onClick={handleClose} className="p-3 bg-white/5 rounded-2xl text-slate-500 hover:text-white border border-white/10 backdrop-blur-xl transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </header>
          
          <div className="flex-1 bg-[#0f172a]/70 backdrop-blur-3xl p-10 rounded-[48px] border border-white/10 text-slate-200 font-medium leading-relaxed whitespace-pre-wrap shadow-2xl text-xl overflow-y-auto custom-scrollbar scroll-smooth">
            {state.summary}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 shrink-0 pb-4">
             <button onClick={() => onUpdate({ view: 'HOME' })} className="flex-1 py-6 bg-white/5 text-slate-400 font-[1000] rounded-[32px] uppercase tracking-widest border border-white/10 hover:text-white hover:bg-white/10 transition-all">
              Back
             </button>
             <button onClick={handleGenerate} className="flex-[2] py-6 bg-indigo-600 text-white font-[1000] rounded-[32px] uppercase tracking-[0.4em] hover:bg-indigo-500 transition-all shadow-[0_20px_40px_rgba(79,70,229,0.4)] active:scale-95 text-xs border border-white/10">
              {state.isLoading ? 'Synthesizing...' : 'GENERATE VISUAL ASSETS'}
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row bg-[#020202] overflow-hidden relative font-inter">
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden relative min-h-0">
        <header className="h-16 bg-black/60 rounded-[28px] border border-white/10 flex items-center justify-between px-8 mb-4 backdrop-blur-3xl shrink-0 shadow-2xl">
           <div className="flex items-center gap-4">
             <div className="flex flex-col">
               <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">FRAME SEQUENCE</span>
               <span className="text-indigo-400 text-[12px] font-[1000] uppercase tracking-widest leading-none">{state.activeIndex + 1} OF {state.slides.length}</span>
             </div>
           </div>
           <div className="flex items-center gap-3">
             <button onClick={handleDownload} className="px-7 py-3 bg-white text-black text-[10px] font-[1000] rounded-2xl uppercase tracking-[0.2em] hover:bg-slate-200 transition-all shadow-xl active:scale-95">EXPORT</button>
             <button onClick={handleClose} className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white active:scale-95 transition-all border border-white/5">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
           </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-2 md:p-6 overflow-hidden min-h-0 relative">
          {state.isLoading && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center z-[100] rounded-[48px] animate-in fade-in duration-300 p-8">
               <div className="w-full max-w-5xl space-y-8 text-center flex flex-col items-center justify-center">
                  <h2 className="text-3xl md:text-4xl font-[1000] text-white tracking-[0.3em] animate-[blink_1s_infinite] uppercase drop-shadow-[0_0_40px_rgba(99,102,241,0.6)] leading-none select-none">
                    SNOOPWERK
                  </h2>
                  <div className="w-full max-w-sm space-y-6">
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-indigo-500 transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,1)]" style={{ width: `${generationProgress}%` }} />
                    </div>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Forging Creative Matrix</p>
                  </div>
               </div>
            </div>
          )}
          <div 
            className="h-full max-h-[72vh] bg-[#050505] rounded-[56px] border border-white/20 shadow-[0_64px_128px_-32px_rgba(0,0,0,0.9)] relative overflow-hidden group transition-all flex items-center justify-center" 
            style={{ aspectRatio: state.aspectRatio.replace(':', '/') }}
          >
            {currentSlide ? (
              <div className="w-full h-full relative">
                <img src={currentSlide.imageUrl} className="w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-105" alt="Slide" />
                <div 
                  className="absolute pointer-events-none select-none z-10 font-[1000] tracking-tighter text-center px-12 leading-[0.85] uppercase"
                  style={{
                    left: `${currentEdit.textX}%`,
                    top: `${currentEdit.textY}%`,
                    transform: `translate(-50%, -50%) rotate(${currentEdit.textRotation}deg)`,
                    color: currentEdit.textColor,
                    fontSize: `${currentEdit.textSize * 0.8}px`,
                    textShadow: '0 10px 40px rgba(0,0,0,1), 0 5px 20px rgba(0,0,0,0.8)'
                  }}
                >
                  {currentEdit.overlayText}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-800 font-black uppercase tracking-[0.5em] opacity-40">SIGNAL LOST</div>
            )}
          </div>
        </div>

        <div className="h-28 flex items-center gap-4 px-8 overflow-x-auto custom-scrollbar shrink-0 bg-black/50 backdrop-blur-2xl rounded-[36px] mx-2 mb-2 border border-white/10 mt-6 shadow-inner">
           {state.slides.map((s, i) => (
             <button 
               key={s.id} 
               onClick={() => onUpdate({ activeIndex: i })}
               className={`w-20 h-20 shrink-0 rounded-2xl border-2 transition-all overflow-hidden relative ${state.activeIndex === i ? 'border-indigo-500 scale-110 shadow-[0_0_20px_rgba(99,102,241,0.6)]' : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/30 hover:scale-105'}`}
             >
               <img src={s.imageUrl} className="w-full h-full object-cover" alt={`F${i}`} />
               <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white font-[1000] text-[10px]">{i + 1}</div>
             </button>
           ))}
        </div>
      </div>

      <aside className="w-full lg:w-85 border-l border-white/10 bg-[#080808] flex flex-col shrink-0 shadow-[0_0_64px_rgba(0,0,0,0.6)] min-h-0 relative z-10">
        <div className="p-4 border-b border-white/10 flex gap-2 shrink-0 bg-[#080808]/85 backdrop-blur-xl sticky top-0 z-30 shadow-sm">
          {(['text', 'magic', 'settings'] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-10 min-h-0 bg-gradient-to-b from-[#080808] to-black">
          {activeTab === 'text' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-400">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500/80 ml-1">Overlay Narrative</label>
                <textarea 
                  value={currentEdit.overlayText}
                  onChange={(e) => updateSlideEdit({ overlayText: e.target.value })}
                  className="w-full bg-[#121212] border border-white/10 rounded-[24px] p-5 text-[12px] text-white h-32 focus:ring-1 focus:ring-indigo-600 outline-none resize-none uppercase font-black leading-tight shadow-inner"
                  placeholder="Frame text..."
                />
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500/80 ml-1">Font Scale</label>
                  <span className="text-indigo-400 text-[11px] font-[1000] tracking-widest">{currentEdit.textSize}PX</span>
                </div>
                <input type="range" min="10" max="250" value={currentEdit.textSize} onChange={(e) => updateSlideEdit({ textSize: parseInt(e.target.value) })} className="w-full h-1.5 bg-white/20 rounded-full accent-indigo-500 cursor-pointer" />
              </div>
            </div>
          )}
          {activeTab === 'magic' && (
             <div className="space-y-8 animate-in slide-in-from-right duration-400">
                <div className="p-6 bg-indigo-600/20 border border-indigo-500/30 rounded-[32px] shadow-inner">
                   <p className="text-[10px] font-[1000] text-indigo-400 uppercase tracking-[0.3em]">Neural Refine</p>
                   <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1">Surgical Visual Adjustment</p>
                </div>
                <textarea 
                  value={state.style}
                  onChange={(e) => onUpdate({ style: e.target.value as GenerationStyle })}
                  className="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs font-black text-white outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none mb-4"
                >
                  {CAROUSEL_STYLES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label.toUpperCase()}</option>)}
                </textarea>
                <textarea 
                  value={currentEdit.magicPrompt}
                  onChange={(e) => updateSlideEdit({ magicPrompt: e.target.value })}
                  className="w-full bg-[#121212] border border-white/10 rounded-[28px] p-6 text-[12px] text-white h-40 focus:ring-1 focus:ring-indigo-600 outline-none shadow-inner"
                  placeholder="Describe surgical refinements (e.g., Change lighting to neon purple, make subject sharper...)"
                />
                <button onClick={handleRegenerateSlide} disabled={state.isLoading} className="w-full py-5 bg-white text-black font-[1000] rounded-[28px] text-[11px] uppercase tracking-[0.4em] active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50 hover:bg-slate-200">
                  {state.isLoading ? 'Refining...' : 'RE-GENERATE'}
                </button>
             </div>
          )}
          {activeTab === 'settings' && (
            <div className="space-y-4 animate-in slide-in-from-right duration-400">
               <button onClick={() => onUpdate({ view: 'ANALYSIS' })} className="w-full py-5 bg-white/5 border border-white/10 text-slate-400 font-[1000] rounded-[24px] text-[10px] uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all">Review Blueprint</button>
               <button onClick={handleClose} className="w-full py-5 bg-red-500/15 text-red-500 font-[1000] rounded-[24px] text-[10px] uppercase tracking-widest border border-red-500/30 hover:bg-red-500 hover:text-white transition-all">Terminate Session</button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default ToolCarousel;
