
import React, { useState, useRef } from 'react';
import { generateAIImage, generateTextContent, analyzeMultimodalContent, editAIImage } from '../services/api';
import { AppToolsState, CarouselSlide, ToolType, STYLES, DEFAULT_VARIANT_EDIT, VariantEdit, UserCredits } from '../types';

// Declare JSZip from the window object (added in index.html)
declare const JSZip: any;

interface ToolCarouselProps {
  state: AppToolsState['carousel'];
  credits: UserCredits;
  onUpdate: (newState: Partial<AppToolsState['carousel']>) => void;
  onUpdateCredits: (credits: UserCredits) => void;
  onAction: (tool: ToolType, image?: string) => void;
}

const ToolCarousel: React.FC<ToolCarouselProps> = ({ state, credits, onUpdate, onUpdateCredits, onAction }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'magic' | 'music'>('text');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [magicLoading, setMagicLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const stopGenerationRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const currentSlide = state.slides[state.activeIndex];
  const currentEdit = currentSlide?.edit || DEFAULT_VARIANT_EDIT;

  const CAROUSEL_SPECIFIC_STYLES = STYLES.filter(s => 
    ['minimalist', 'bold', 'vibrant', 'dark', 'photo_led'].includes(s.id)
  );

  /**
   * Credit Guard updated as per request.
   * Manual redirect on click is removed; App.tsx now handles the 10% threshold globally.
   */
  const checkCreditsGuard = () => {
    // Relying on App-wide redirect logic for the 10% threshold.
    return true;
  };

  const handleStop = () => {
    stopGenerationRef.current = true;
    onUpdate({ isLoading: false });
  };

  const updateSlideEdit = (updates: Partial<VariantEdit>) => {
    if (!currentSlide) return;
    const newSlides = [...state.slides];
    newSlides[state.activeIndex] = {
      ...currentSlide,
      edit: { ...currentSlide.edit, ...updates }
    };
    onUpdate({ slides: newSlides });
  };

  const handleAnalyse = async (specificUrl?: string) => {
    if (!checkCreditsGuard()) return;

    stopGenerationRef.current = false;
    onUpdate({ isLoading: true });
    try {
      const source = specificUrl 
        ? { type: 'url' as const, value: specificUrl } 
        : (state.contentSource.value ? state.contentSource : { type: 'prompt' as const, value: state.prompt });
      
      const systemInstruction = "You are a professional social media architect. Analyze the input and create a high-impact structured 5-10 slide Instagram carousel blueprint. Output ONLY the slide headlines and visual concepts. STRICTLY NO CONVERSATIONAL TEXT, NO INTROS, NO GREETINGS. Pure data only.";
      const { summary, credits: newCredits } = await analyzeMultimodalContent(source.type, source.value, systemInstruction);
      
      if (stopGenerationRef.current) return;
      
      onUpdateCredits(newCredits);
      onUpdate({ summary, view: 'ANALYSIS', isLoading: false });
    } catch (error: any) {
      if (!stopGenerationRef.current) alert(`Analysis failed: ${error.message}`);
      onUpdate({ isLoading: false });
    }
  };

  const handleGenerate = async () => {
    if (!checkCreditsGuard()) return;

    stopGenerationRef.current = false;
    onUpdate({ isLoading: true });
    setGenerationProgress(0);
    try {
      const styleConfig = STYLES.find(s => s.id === state.style) || STYLES[0];
      const styleSuffix = styleConfig.promptSuffix || '';
      
      // Strict instruction to prevent chatty output
      const instruction = `You are a viral content factory. Based on the summary, generate exactly ${state.numSlides} short, high-conversion captions for an Instagram carousel. Output ONLY a numbered list. NO intro, NO conversational text, NO "here are your captions". Example: 1. Headline content here. 2. Next slide headline.`;
      const { text: textResponse, credits: c1 } = await generateTextContent(state.summary, instruction);
      onUpdateCredits(c1);

      if (stopGenerationRef.current) return;

      let captions = textResponse.split(/\n/)
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 5)
        .slice(0, state.numSlides);
      
      if (captions.length === 0) captions = Array(state.numSlides).fill(state.summary.substring(0, 60));

      const slides: CarouselSlide[] = [];
      for (let i = 0; i < captions.length; i++) {
        if (stopGenerationRef.current) break;
        setGenerationProgress(i + 1);
        try {
          const { imageUrl, credits: c2 } = await generateAIImage(`${captions[i]}. ${styleSuffix}`, state.aspectRatio as any);
          onUpdateCredits(c2);
          slides.push({
            id: `slide-${i}-${Date.now()}`,
            imageUrl,
            caption: captions[i],
            edit: { ...DEFAULT_VARIANT_EDIT, overlayText: captions[i] }
          });
        } catch (e: any) {
          console.error("Image generation fail:", e);
          slides.push({
            id: `slide-${i}-fallback`,
            imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1964',
            caption: captions[i],
            edit: { ...DEFAULT_VARIANT_EDIT, overlayText: captions[i] }
          });
        }
      }

      if (!stopGenerationRef.current) onUpdate({ slides, view: 'EDITOR', activeIndex: 0, isLoading: false });
    } catch (error: any) {
      alert(`Generation failed: ${error.message}`);
      onUpdate({ isLoading: false });
    }
  };

  /**
   * RECTIFIED: Magic Edit Activation Logic
   * Ensures forceful imperative commands to the AI and proper slide state replacement.
   */
  const handleApplyMagicEdit = async () => {
    if (!currentSlide || !checkCreditsGuard()) return;
    
    // Ensure we have a valid prompt even if user leaves it blank
    const promptToUse = currentEdit.magicPrompt.trim() || "Transform this into a viral Instagram masterpiece with cinematic lighting, premium textures, and professional depth.";
    
    setMagicLoading(true);
    try {
      // Direct, assertive instruction to the backend
      const instruction = `URGENT DESIGN MASTERPIECE: ${promptToUse}. Completely re-render the visual as a professional high-end Instagram asset. 8K resolution, stunning lighting. NO TEXT OUTPUT.`;
      const { imageUrl, credits: newCredits } = await editAIImage(currentSlide.imageUrl, instruction);
      onUpdateCredits(newCredits);
      
      // Correct immutable state update for the active slide
      const newSlides = [...state.slides];
      newSlides[state.activeIndex] = { 
        ...currentSlide, 
        imageUrl,
        // Reset the magic prompt field to avoid accidental double-applies of the same text
        edit: { ...currentSlide.edit, magicPrompt: '' }
      };
      
      onUpdate({ slides: newSlides });
    } catch (error: any) {
      alert(`Magic Edit System Error: ${error.message}`);
    } finally {
      setMagicLoading(false);
    }
  };

  const handleDownload = () => {
    if (!currentSlide) return;
    const link = document.createElement('a');
    link.href = currentSlide.imageUrl;
    link.download = `snoopwerk-slide-${state.activeIndex + 1}.png`;
    link.click();
  };

  const handleDownloadAllZip = async () => {
    if (state.slides.length === 0) return;
    setZipLoading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("snoopwerk-carousel");
      for (let i = 0; i < state.slides.length; i++) {
        const slide = state.slides[i];
        const base64Data = slide.imageUrl.split(',')[1];
        folder.file(`slide-${i + 1}.png`, base64Data, { base64: true });
      }
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = "snoopwerk-carousel.zip";
      link.click();
    } catch (error) {
      alert("ZIP export failed.");
    } finally {
      setZipLoading(false);
    }
  };

  const handleUrlInput = () => {
    const url = window.prompt("Enter source URL (Website, Article, or Link):", "https://");
    if (url && url !== "https://") {
      onUpdate({ contentSource: { type: 'url', value: url } });
    }
  };

  const LoadingOverlay = () => {
    if (!state.isLoading) return null;
    const progressPercent = state.numSlides > 0 ? (generationProgress / state.numSlides) * 100 : 0;
    return (
      <div className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center p-12 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[160px] animate-pulse" />
        <div className="relative z-10 w-full max-md text-center space-y-12 animate-in zoom-in duration-500">
          <div className="relative flex items-center justify-center">
            <div className="w-40 h-40 border-2 border-white/5 rounded-full" />
            <div className="absolute w-40 h-40 border-t-4 border-indigo-500 rounded-full animate-spin" />
            <div className="absolute text-5xl animate-bounce">⚡</div>
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-black text-white uppercase tracking-[0.4em]">
              {generationProgress > 0 ? 'Forging Sequence' : 'Constructing Studio'}
            </h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.6em] animate-pulse">
              {generationProgress > 0 ? `Baking Slide ${generationProgress} of ${state.numSlides}` : 'Analyzing architecture...'}
            </p>
          </div>
          {generationProgress > 0 && (
            <div className="w-full space-y-3">
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}
          <button onClick={handleStop} className="px-12 py-5 bg-red-600/10 border border-red-500/50 hover:bg-red-600 text-red-500 hover:text-white font-black rounded-3xl uppercase tracking-widest text-xs transition-all shadow-2xl active:scale-95">STOP PROCESS</button>
        </div>
      </div>
    );
  };

  const renderSlidePreview = (slide: CarouselSlide) => {
    if (!slide) return null;
    return (
      <div className="relative w-full h-full bg-[#0a0a0a] rounded-[48px] overflow-hidden shadow-2xl border-[10px] border-[#1a1a1a]">
        <img src={slide.imageUrl} className="w-full h-full object-cover" alt="Slide Preview" />
        {slide.edit.overlayText && (
          <div 
            className="absolute pointer-events-none select-none drop-shadow-2xl z-10 font-black tracking-tighter leading-tight text-center px-6"
            style={{
              left: `${slide.edit.textX}%`,
              top: `${slide.edit.textY}%`,
              transform: `translate(-50%, -50%) rotate(${slide.edit.textRotation}deg)`,
              color: slide.edit.textColor,
              fontSize: `${slide.edit.textSize}px`,
              fontFamily: slide.edit.fontFamily,
              whiteSpace: 'normal',
              maxWidth: '90%',
              textShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}
          >
            {slide.edit.overlayText}
          </div>
        )}
      </div>
    );
  };

  if (state.view === 'HOME') {
    return (
      <div className="h-full bg-[#050B18] flex flex-col items-center justify-center text-slate-200 p-12 text-center relative overflow-hidden">
        <LoadingOverlay />
        <h1 className="text-8xl font-black uppercase tracking-tighter mb-8 drop-shadow-2xl">SnoopWerk<span className="text-indigo-500">.com</span></h1>
        <p className="text-slate-400 font-black tracking-[0.5em] uppercase text-xs mb-12">Carousel Studio Engine</p>
        <button onClick={() => onUpdate({ view: 'SETUP' })} className="px-16 py-8 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-3xl uppercase tracking-widest transition-all shadow-3xl shadow-indigo-600/20 active:scale-95">
          New Project
        </button>
      </div>
    );
  }

  if (state.view === 'SETUP') {
    return (
      <div className="h-full bg-[#050B18] text-slate-200 px-12 py-8 flex flex-col overflow-y-auto custom-scrollbar relative">
        <LoadingOverlay />
        <div className="absolute inset-0 z-0 bg-cover bg-center opacity-30 pointer-events-none" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?auto=format&fit=crop&q=80&w=2070")' }} />
        <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
          <header className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Project Config</h2>
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">SNOOPWERK STUDIO V3.0</p>
            </div>
            <button onClick={() => onUpdate({ view: 'HOME' })} className="text-slate-500 hover:text-white transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-black/60 p-10 rounded-[48px] border border-white/10 backdrop-blur-2xl shadow-[0_64px_128px_rgba(0,0,0,0.8)]">
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Aspect Ratio</label>
                <select value={state.aspectRatio} onChange={(e) => onUpdate({ aspectRatio: e.target.value as any })} className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-xs font-black text-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer">
                  <option value="1:1">Square (1:1)</option>
                  <option value="16:9">Landscape (16:9)</option>
                  <option value="9:16">Vertical (9:16)</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Visual Style</label>
                <select value={state.style} onChange={(e) => onUpdate({ style: e.target.value as any })} className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-xs font-black text-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer">
                  {CAROUSEL_SPECIFIC_STYLES.map((style) => (
                    <option key={style.id} value={style.id}>{style.emoji} {style?.label?.toUpperCase() || ''}</option>
                </select>
              </div>
              <div className="space-y-5">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                  <span>Number of Slides</span>
                  <span className="text-indigo-500 text-xl">{state.numSlides}</span>
                </div>
                <input type="range" min="1" max="15" value={state.numSlides} onChange={(e) => onUpdate({ numSlides: parseInt(e.target.value) })} className="w-full h-1.5 bg-black rounded-full accent-indigo-500 cursor-pointer" />
              </div>
            </div>
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Creative Brief</label>
                <textarea 
                  value={state.prompt} 
                  onChange={(e) => onUpdate({ prompt: e.target.value })} 
                  className="w-full bg-black/50 border border-white/5 rounded-2xl p-5 h-32 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-600 transition-all shadow-inner" 
                  placeholder={"Be specific for better results.\n“AI tools that help creators make better videos.”"} 
                />
              </div>
              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] ml-1">Source Importers</p>
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group h-20 active:scale-95">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🖼️</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">Image</span>
                  </button>
                  <button onClick={() => videoFileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group h-20 active:scale-95">
                    <span className="text-2xl group-hover:scale-110 transition-transform">📽️</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">Video</span>
                  </button>
                  <button onClick={handleUrlInput} className="flex flex-col items-center justify-center gap-2 p-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-2xl transition-all group h-20 active:scale-95">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🔗</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 group-hover:text-indigo-300">URL Input</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => handleAnalyse()} disabled={state.isLoading || (!state.prompt && !state.contentSource.value)} className="w-full py-8 bg-indigo-600 text-white font-black rounded-[32px] uppercase tracking-[0.4em] shadow-3xl shadow-indigo-600/20 active:scale-95 disabled:opacity-30 transition-all text-xs">
            Construct Studio Design
          </button>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => onUpdate({ contentSource: { type: 'image', value: ev.target?.result as string } });
            reader.readAsDataURL(file);
          }
        }} />
        <input type="file" ref={videoFileInputRef} className="hidden" accept="video/*" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpdate({ contentSource: { type: 'video', value: `Local: ${file.name}` } });
        }} />
      </div>
    );
  }

  if (state.view === 'ANALYSIS') {
    return (
      <div className="h-full bg-[#050B18] text-slate-200 p-8 flex flex-col relative overflow-hidden">
        <LoadingOverlay />
        <div className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
          
          <div className="lg:col-span-8 flex flex-col h-full bg-slate-900/50 border border-white/10 rounded-[48px] shadow-3xl overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none" />
            <div className="p-10 flex-1 overflow-y-auto custom-scrollbar relative">
               <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-6 sticky top-0">Strategic Content Blueprint</h2>
               <div className="prose prose-invert max-w-none">
                  <textarea 
                    value={state.summary} 
                    onChange={(e) => onUpdate({ summary: e.target.value })} 
                    className="w-full h-[60vh] bg-transparent text-slate-200 text-xl font-bold leading-relaxed resize-none outline-none focus:ring-0 border-none placeholder:text-slate-800"
                    placeholder="Your content strategy blueprint will appear here..."
                  />
               </div>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none" />
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6 justify-center">
             <div className="bg-black/40 border border-white/10 rounded-[32px] p-8 space-y-8 backdrop-blur-xl">
                <div className="space-y-2">
                   <h3 className="text-xl font-black uppercase tracking-tighter text-white">Production Config</h3>
                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Final refinement before slide forge</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Slide Volume</label>
                    <div className="flex justify-between items-center bg-black/50 border border-white/5 rounded-2xl p-4">
                       <input type="range" min="1" max="15" value={state.numSlides} onChange={(e) => onUpdate({ numSlides: parseInt(e.target.value) })} className="flex-1 accent-indigo-500" />
                       <span className="ml-4 text-indigo-400 font-black text-lg w-8 text-center">{state.numSlides}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Visual DNA</label>
                    <select value={state.style} onChange={(e) => onUpdate({ style: e.target.value as any })} className="w-full bg-black/50 border border-white/5 rounded-2xl p-4 text-xs font-black text-white outline-none cursor-pointer">
                      {CAROUSEL_SPECIFIC_STYLES.map((s) => (
                        <option key={s.id} value={s.id}>{s.emoji} {s.label.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-6 space-y-4">
                   <button 
                    onClick={handleGenerate} 
                    disabled={state.isLoading || !state.summary} 
                    className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl uppercase font-black text-xs tracking-[0.3em] shadow-3xl shadow-indigo-600/30 active:scale-95 transition-all"
                   >
                    Forge All Slides
                   </button>
                   <button 
                    onClick={() => onUpdate({ view: 'SETUP' })} 
                    className="w-full py-4 text-slate-500 hover:text-white uppercase font-black text-[9px] tracking-widest border border-white/5 rounded-2xl hover:bg-white/5 transition-all"
                   >
                    Modify Setup
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.view === 'EDITOR') {
    return (
      <div className="h-full flex bg-[#050505] text-slate-200 overflow-hidden">
        <LoadingOverlay />
        
        <div className="flex-1 flex flex-col bg-[radial-gradient(circle_at_center,_#111_0%,_#050505_100%)] relative overflow-hidden">
           <div className="absolute top-8 left-8 flex items-center gap-4 z-20">
              <div className="px-4 py-2 bg-black/40 border border-white/5 rounded-full backdrop-blur-md shadow-2xl">
                 <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Studio: {state.aspectRatio} Aspect</span>
              </div>
              <div className="px-4 py-2 bg-indigo-600/10 border border-indigo-500/20 rounded-full backdrop-blur-md">
                 <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{state.musicStyle} Vibe</span>
              </div>
           </div>

           <div className="flex-1 flex items-center justify-center p-8 mt-12 mb-24 animate-in zoom-in duration-700">
             <div className="relative w-full h-[60vh] max-w-2xl flex items-center justify-center">
               {renderSlidePreview(state.slides[state.activeIndex])}
             </div>
           </div>
           
           <div className="absolute bottom-0 inset-x-0 h-32 bg-black/40 backdrop-blur-xl border-t border-white/5 flex items-center px-8 z-20 overflow-x-auto custom-scrollbar">
             <div className="flex gap-4 min-w-full">
               {state.slides.map((slide, idx) => (
                 <button 
                    key={slide.id} 
                    onClick={() => onUpdate({ activeIndex: idx })} 
                    className={`relative shrink-0 transition-all duration-300 rounded-xl overflow-hidden ${state.activeIndex === idx ? 'w-24 h-24 border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-110 z-10' : 'w-20 h-20 border border-white/10 opacity-50 grayscale hover:opacity-100 hover:grayscale-0'}`}
                 >
                    <img src={slide.imageUrl} className="w-full h-full object-cover" alt={`Slide ${idx + 1}`} />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center">
                      <span className="text-[8px] font-black text-white">{idx + 1}</span>
                    </div>
                 </button>
               ))}
             </div>
           </div>

           <div className="absolute bottom-36 left-1/2 -translate-x-1/2 flex items-center gap-8 z-20">
             <button 
                onClick={() => onUpdate({ activeIndex: Math.max(0, state.activeIndex - 1) })} 
                disabled={state.activeIndex === 0} 
                className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center border border-white/10 hover:bg-indigo-600 disabled:opacity-20 transition-all active:scale-90"
             >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
             </button>
             <div className="px-6 py-2 bg-black/60 border border-white/10 rounded-full">
                <p className="text-[10px] font-black text-indigo-500 font-mono tracking-widest">{String(state.activeIndex + 1).padStart(2, '0')} / {String(state.slides.length).padStart(2, '0')}</p>
             </div>
             <button 
                onClick={() => onUpdate({ activeIndex: Math.min(state.slides.length - 1, state.activeIndex + 1) })} 
                disabled={state.activeIndex === state.slides.length - 1} 
                className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center border border-white/10 hover:bg-indigo-600 disabled:opacity-20 transition-all active:scale-90"
             >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
             </button>
           </div>
        </div>

        <aside className="w-80 border-l border-white/5 bg-[#0a0a0a] flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-6 border-b border-white/5 flex gap-1 bg-[#050505]/50 sticky top-0 z-30">
            {['text', 'magic', 'music'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-8 flex-1">
            {activeTab === 'text' && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Edit Caption Content</label>
                  <textarea 
                    value={currentEdit.overlayText}
                    onChange={(e) => updateSlideEdit({ overlayText: e.target.value })}
                    className="w-full bg-[#161616] border border-white/5 rounded-xl p-4 text-xs text-white h-24 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-slate-600 uppercase">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={currentEdit.textColor} onChange={(e) => updateSlideEdit({ textColor: e.target.value })} className="w-10 h-10 bg-transparent rounded cursor-pointer border border-white/5" />
                      <span className="text-[9px] font-mono text-slate-400 uppercase">{currentEdit.textColor}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-slate-600 uppercase">Typography</label>
                    <select value={currentEdit.fontFamily} onChange={(e) => updateSlideEdit({ fontFamily: e.target.value })} className="w-full bg-[#161616] border border-white/5 rounded-xl h-10 text-[9px] font-bold px-2 text-white outline-none focus:ring-1 focus:ring-indigo-500">
                      <option value="sans-serif">Modern Sans</option>
                      <option value="serif">Classic Serif</option>
                      <option value="Impact, sans-serif">Bold Impact</option>
                      <option value="'Courier New', Courier, monospace">Technical Mono</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[8px] font-black text-slate-600 uppercase tracking-widest">
                    <span>Text Scale</span>
                    <span className="text-indigo-400 font-mono">{currentEdit.textSize}px</span>
                  </div>
                  <input type="range" min="10" max="150" value={currentEdit.textSize} onChange={(e) => updateSlideEdit({ textSize: parseInt(e.target.value) })} className="w-full accent-indigo-500 bg-black h-1 rounded-full appearance-none cursor-pointer" />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[8px] font-black text-slate-600 uppercase tracking-widest">
                    <span>Rotation Axis</span>
                    <span className="text-indigo-400 font-mono">{currentEdit.textRotation}°</span>
                  </div>
                  <input type="range" min="-180" max="180" value={currentEdit.textRotation} onChange={(e) => updateSlideEdit({ textRotation: parseInt(e.target.value) })} className="w-full accent-indigo-500 bg-black h-1 rounded-full appearance-none cursor-pointer" />
                </div>

                <div className="space-y-4">
                  <label className="text-[8px] font-black text-slate-600 uppercase block mb-2 tracking-widest text-center">Position Matrix</label>
                  <div className="grid grid-cols-1 gap-6">
                     <div className="space-y-2">
                        <div className="flex justify-between text-[7px] text-slate-700 uppercase font-black">
                           <span>Horizontal</span>
                           <span>{currentEdit.textX}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={currentEdit.textX} onChange={(e) => updateSlideEdit({ textX: parseInt(e.target.value) })} className="w-full accent-teal-500 bg-black h-1 rounded-full appearance-none cursor-pointer" />
                     </div>
                     <div className="space-y-2">
                        <div className="flex justify-between text-[7px] text-slate-700 uppercase font-black">
                           <span>Vertical</span>
                           <span>{currentEdit.textY}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={currentEdit.textY} onChange={(e) => updateSlideEdit({ textY: parseInt(e.target.value) })} className="w-full accent-teal-500 bg-black h-1 rounded-full appearance-none cursor-pointer" />
                     </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'magic' && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Magic Refinement Brief</label>
                  <textarea 
                    value={currentEdit.magicPrompt}
                    onChange={(e) => updateSlideEdit({ magicPrompt: e.target.value })}
                    className="w-full bg-[#161616] border border-white/5 rounded-xl p-4 text-xs text-white h-32 focus:ring-1 focus:ring-indigo-500 outline-none resize-none placeholder:text-slate-800 transition-all"
                    placeholder="E.g. Add cinematic bloom, change background to mountains..."
                  />
                </div>
                {/* RECTIFIED: Always active with forceful imperative logic */}
                <button 
                  onClick={handleApplyMagicEdit}
                  disabled={magicLoading}
                  className="w-full py-5 bg-white text-black font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-slate-200 transition-all disabled:opacity-30 flex items-center justify-center gap-3 shadow-2xl active:scale-95"
                >
                  {magicLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Synthesizing...
                    </>
                  ) : 'Apply Magic Edit'}
                </button>
              </div>
            )}

            {activeTab === 'music' && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-center block">Vibe Selection</label>
                  <div className="grid grid-cols-1 gap-2">
                    {['Lo-Fi Chill', 'High-Energy Phonk', 'Cinematic Orchestral', 'Minimalist Tech', 'Synthwave Retro'].map((style) => (
                      <button 
                        key={style}
                        onClick={() => onUpdate({ musicStyle: style })}
                        className={`w-full p-5 rounded-2xl text-left border transition-all duration-300 ${state.musicStyle === style ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-[#111] border-white/5 text-slate-500 hover:text-slate-300 hover:bg-[#161616]'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-[0.1em]">{style}</span>
                          {state.musicStyle === style ? <span className="animate-bounce">🎵</span> : <span className="opacity-20">🔇</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto p-6 border-t border-white/5 space-y-3 bg-[#050505]/50 backdrop-blur-md sticky bottom-0">
             <button 
              onClick={handleDownloadAllZip} 
              disabled={zipLoading || state.slides.length === 0}
              className="w-full py-5 text-[10px] font-black text-white uppercase tracking-[0.2em] bg-indigo-600 rounded-2xl hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
             >
                {zipLoading ? 'Preparing ZIP...' : 'Download All (.ZIP)'}
             </button>
             <button onClick={handleDownload} className="w-full py-3 text-[9px] font-black text-white/60 uppercase tracking-widest bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all">Download Current Slide</button>
             <button onClick={() => onUpdate({ view: 'SETUP' })} className="w-full py-3 text-[9px] font-black text-slate-600 hover:text-white uppercase tracking-widest border border-white/5 rounded-xl hover:bg-white/5 transition-all">Project Setup</button>
          </div>
        </aside>
      </div>
    );
  }

  return null;
};

export default ToolCarousel;
