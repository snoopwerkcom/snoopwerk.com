import React, { useState, useRef, useEffect } from 'react';
import { generateAIImage, generateTextContent, analyzeMultimodalContent, editAIImage, removeBackground, upscaleImage } from '../services/api';
import { AppToolsState, CarouselSlide, ToolType, StyleOption, DEFAULT_VARIANT_EDIT, VariantEdit, UserCredits, GenerationStyle, TransitionStyle } from '../types';

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

const AUDIO_VIBES = [
  { id: 'lofi', label: 'Lo-Fi Chill', emoji: '☕' },
  { id: 'cinematic', label: 'Cinematic Epic', emoji: '🎻' },
  { id: 'modern', label: 'Modern Corporate', emoji: '📈' },
  { id: 'synthwave', label: 'Neon Synthwave', emoji: '🌆' },
  { id: 'hype', label: 'Hype Trap', emoji: '🔥' },
];

const TRANSITION_OPTIONS: { id: TransitionStyle; label: string; emoji: string }[] = [
  { id: 'none', label: 'None', emoji: '✖️' },
  { id: 'fade', label: 'Smooth Fade', emoji: '🌫️' },
  { id: 'slide', label: 'Motion Slide', emoji: '➡️' },
  { id: 'zoom', label: 'Dynamic Zoom', emoji: '🔍' },
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
  const [activeTab, setActiveTab] = useState<'text' | 'magic' | 'upload' | 'audio' | 'transition'>('text');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [attachedAsset, setAttachedAsset] = useState<{ type: 'IMAGE' | 'VIDEO' | 'URL' | 'PODCAST'; name: string; preview?: string } | null>(null);
  const [editingLoading, setEditingLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [animating, setAnimating] = useState(false);
  
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

  useEffect(() => {
    if (uploadStatus) {
      const timer = setTimeout(() => setUploadStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  // Handle animation trigger on activeIndex change
  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), 600);
    return () => clearTimeout(timer);
  }, [state.activeIndex]);

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
    
    // Safety check: ensure the state has content
    const userPrompt = state.prompt?.trim();
    if (!userPrompt && !attachedAsset) {
      alert("Please enter a vision or attach a file first.");
      return;
    }

    onUpdate({ isLoading: true });
    try {
      let sourceValue = userPrompt;
      let sourceType: 'prompt' | 'image' | 'url' | 'video' = 'prompt';

      if (attachedAsset) {
        sourceType = (attachedAsset.type.toLowerCase() === 'podcast' ? 'url' : attachedAsset.type.toLowerCase()) as any;
        sourceValue = attachedAsset.preview || attachedAsset.name;
      } else if (userPrompt.toLowerCase().startsWith('http')) {
        sourceType = 'url';
      }
      
      const systemInstruction = `
        STRICT ROLE: Content Architect.
        SOURCE MATERIAL: ${userPrompt}
        
        TASK: Create a ${state.numSlides}-slide Instagram blueprint.
        ALIGNMENT RULE: You MUST stay 100% faithful to the source material. 
        If the input is about "Finance", do not generate "Fitness". 
        If the input is specific, use the specific names and technical terms provided.

        OUTPUT FORMAT:
        Provide a list of slides. Each slide needs:
        1. Visual Description: Vivid, cinematic details based on the prompt.
        2. Text Overlay: A punchy, high-impact headline using the prompt's language.
      `;
      
      const { summary, credits: newCredits } = await analyzeMultimodalContent(sourceType, sourceValue, systemInstruction);
      
      if (stopGenerationRef.current) return;
      
      onUpdateCredits(newCredits);
      onUpdate({ 
        summary: summary.trim(), 
        view: 'ANALYSIS', 
        isLoading: false 
      });
    } catch (error: any) {
      if (!stopGenerationRef.current) {
        alert("Intelligence ingestion failed. Please check your connection.");
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
      
      const instruction = `
        ACT AS A DATA GENERATOR.
        Convert the analysis into exactly ${state.numSlides} slides.
        
        REQUIRED LINE FORMAT:
        Slide X: [Visual Description] | [Text Overlay]
        
        CRITICAL RULES:
        - Use the "|" symbol exactly once per line.
        - No conversational filler (No "Here are your slides").
        - The [Text Overlay] MUST be in all caps.
        - The [Visual Description] must include the core subject from the user's prompt: "${state.prompt.substring(0, 50)}".
      `;
      
      const { text: textResponse, credits: c1 } = await generateTextContent(state.summary, instruction);
      if (stopGenerationRef.current) return;
      onUpdateCredits(c1);

      // Robust Parsing Logic
      const lines = textResponse.split('\n')
        .filter(l => l.includes('|'))
        .slice(0, state.numSlides);

      if (lines.length === 0) {
        throw new Error("Alignment Error: AI failed to follow data format.");
      }

      const slides: CarouselSlide[] = [];
      
      for(let i = 0; i < lines.length; i++) {
  if (stopGenerationRef.current) break;
  setGenerationProgress(Math.floor(((i + 1) / lines.length) * 100));
  
  const [meta, textPart] = lines[i].split('|');
  const visualDesc = meta.includes(':') ? meta.split(':')[1].trim() : meta.trim();
  const overlayText = textPart ? textPart.trim() : "STAY FOCUSED";

  console.log(`🎨 Generating slide ${i+1}/${lines.length}...`);
  
  const { imageUrl, credits: imgCredits } = await generateAIImage(`${visualDesc}, ${styleSuffix}`, state.aspectRatio);
  
  console.log(`✅ Slide ${i+1} generated. Credits: ${imgCredits}`);
  
  if (stopGenerationRef.current) break;
  
  // ✅ Update credits immediately
  onUpdateCredits(imgCredits);
  
  // ✅ Add delay to prevent race conditions
  if (i < lines.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  slides.push({
    id: `slide-${Date.now()}-${i}`,
    imageUrl,
    caption: lines[i],
    edit: { 
      ...DEFAULT_VARIANT_EDIT, 
      overlayText: overlayText.toUpperCase(),
      fontFamily: FONTS[1].value,
      textSize: 80,
      textColor: '#FFFFFF'
    }
  });
}
      
      onUpdate({ slides, view: 'EDITOR', activeIndex: 0, isLoading: false });
    } catch (error) {
      if (!stopGenerationRef.current) {
        alert("Neural Mismatch: The AI lost focus. Try simplifying your prompt.");
        onUpdate({ isLoading: false });
      }
    } finally {
      setGenerationProgress(0);
    }
  };

  const handleDownloadAllZip = async () => {
    if (state.slides.length === 0) return;
    const JSZip = (window as any).JSZip;
    if (!JSZip) {
      alert("ZIP Engine not loaded yet.");
      return;
    }
    setEditingLoading(true);
    const zip = new JSZip();
    
    try {
      // Add animation metadata for future reference if needed
      zip.file('metadata.json', JSON.stringify({ 
        transition: state.transitionStyle,
        count: state.slides.length,
        aspectRatio: state.aspectRatio,
        generatedAt: new Date().toISOString()
      }, null, 2));

      for (let i = 0; i < state.slides.length; i++) {
        const slide = state.slides[i];
        const response = await fetch(slide.imageUrl);
        const blob = await response.blob();
        zip.file(`slide_${i + 1}.png`, blob);
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `snoopwerk_carousel_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed.");
    } finally {
      setEditingLoading(false);
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
      setUploadStatus("AI REFINEMENT COMPLETE");
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
      setUploadStatus("BACKGROUND REMOVED");
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
      setUploadStatus("ASSET UPSCALED TO 4K");
    } catch (error: any) {
      alert(`Upscale failed: ${error.message}`);
    } finally {
      setEditingLoading(false);
    }
  };

  const handleUrlImport = async (type: 'URL' | 'PODCAST') => {
    if (!externalUrl) return;
    setEditingLoading(true);
    try {
      const styleConfig = CAROUSEL_STYLES.find(s => s.id === state.style) || CAROUSEL_STYLES[0];
      const styleSuffix = styleConfig.promptSuffix || '';
      
      const instruction = type === 'PODCAST' 
        ? "Extract a visual mood from this podcast snippet URL and describe a cinematic scene for a social media slide."
        : "Extract the core visual subject from this URL and describe it for an AI image generator.";
      
      const { summary, credits: c1 } = await analyzeMultimodalContent('url', externalUrl, instruction);
      onUpdateCredits(c1);
      
      const { imageUrl, credits: c2 } = await generateAIImage(`${summary}, ${styleSuffix}`, state.aspectRatio);
      onUpdateCredits(c2);

      const newSlides = [...state.slides];
      newSlides[state.activeIndex] = { ...currentSlide, imageUrl };
      onUpdate({ slides: newSlides });
      setUploadStatus(`${type} CONTENT SYNCHRONIZED`);
      setExternalUrl('');
    } catch (error) {
      alert("External intelligence ingestion failed.");
    } finally {
      setEditingLoading(false);
    }
  };

  const handleHomeUrlImport = (type: 'URL' | 'PODCAST') => {
    if (!state.prompt.trim().toLowerCase().startsWith('http')) {
      alert("Please paste a valid URL in the prompt box first.");
      return;
    }
    setAttachedAsset({ type, name: state.prompt, preview: state.prompt });
    onUpdate({ prompt: `Project analysis from ${type.toLowerCase()}: ${state.prompt.substring(0, 30)}...` });
  };

  const handleUsePlaceholderGraph = () => {
    if (!currentSlide) return;
    const placeholderUrl = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop";
    const newSlides = [...state.slides];
    newSlides[state.activeIndex] = { ...currentSlide, imageUrl: placeholderUrl };
    onUpdate({ slides: newSlides });
    setUploadStatus("MINIMALIST GRAPH APPLIED");
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

  const handleSourceAction = (type: 'IMAGE' | 'VIDEO' | 'SWAP') => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.type = type;
      fileInputRef.current.accept = type === 'VIDEO' ? 'video/*' : 'image/*';
      fileInputRef.current.click();
    }
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const type = e.target.dataset.type as 'IMAGE' | 'VIDEO' | 'SWAP';
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const preview = ev.target?.result as string;
        if (type === 'SWAP' && currentSlide) {
          const newSlides = [...state.slides];
          newSlides[state.activeIndex] = { ...currentSlide, imageUrl: preview };
          onUpdate({ slides: newSlides });
          setUploadStatus("ASSET SWAPPED SUCCESSFULLY");
        } else {
          setAttachedAsset({ type: type === 'VIDEO' ? 'VIDEO' : 'IMAGE', name: file.name, preview });
          onUpdate({ prompt: `Project analysis from ${type.toLowerCase()} file: ${file.name}` });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const renderSlidePreview = (slide: CarouselSlide) => {
    if (!slide) return null;
    const edit = slide.edit;
    
    // Determine animation class based on transitionStyle
    let animClass = '';
    if (animating) {
      switch(state.transitionStyle) {
        case 'fade': animClass = 'animate-in fade-in duration-500'; break;
        case 'slide': animClass = 'animate-in slide-in-from-right duration-500'; break;
        case 'zoom': animClass = 'animate-in zoom-in duration-500'; break;
        default: animClass = '';
      }
    }

    return (
      <div className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden ${animClass}`}>
        <img src={slide.imageUrl} className="w-full h-full object-cover" alt="Slide" />
        
        {/* Status Feedback Overlay */}
        {uploadStatus && (
          <div className="absolute top-8 inset-x-0 flex justify-center z-50 animate-in slide-in-from-top-4 duration-500">
             <div className="bg-indigo-600/90 text-white font-black text-[10px] uppercase tracking-[0.4em] px-8 py-3 rounded-full border border-indigo-400/30 shadow-2xl backdrop-blur-xl">
               {uploadStatus}
             </div>
          </div>
        )}

        <div 
          className="absolute pointer-events-none select-none z-10 font-[1000] tracking-tighter text-center leading-[0.85] uppercase transition-all duration-300"
          style={{
            left: `${edit.textX}%`,
            top: `${edit.textY}%`,
            transform: `translate(-50%, -50%) rotate(${edit.textRotation}deg)`,
            color: edit.textColor,
            fontSize: `${edit.textSize * 0.8}px`,
            fontFamily: edit.fontFamily,
            width: '85%',
            textShadow: '0 10px 40px rgba(0,0,0,1), 0 5px 20px rgba(0,0,0,0.8)'
          }}
        >
          {edit.overlayText}
          {edit.subText && (
            <div className="mt-4 opacity-70 tracking-tight lowercase font-bold" style={{ fontSize: `${edit.subTextSize * 0.8}px`, color: edit.subTextColor }}>
              {edit.subText}
            </div>
          )}
        </div>
      </div>
    );
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
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col h-full gap-4 min-h-0">
          <header className="flex items-center justify-between gap-4 shrink-0 px-2">
            <h1 className="text-4xl font-[1000] text-white uppercase tracking-tighter leading-none">Carousel Studio</h1>
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
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => handleSourceAction('IMAGE')} className="flex items-center gap-3 px-6 py-4 bg-indigo-600/10 border border-indigo-500/20 rounded-[24px] hover:bg-indigo-600/20 transition-all group">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🖼️</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Upload Image</span>
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleHomeUrlImport('URL')} className="flex flex-col items-center justify-center gap-2 py-4 bg-white/5 border border-white/5 rounded-[24px] hover:bg-white/10 transition-all group">
                    <span className="text-xl">🔗</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Attach URL</span>
                  </button>
                  <button onClick={() => handleHomeUrlImport('PODCAST')} className="flex flex-col items-center justify-center gap-2 py-4 bg-white/5 border border-white/5 rounded-[24px] hover:bg-white/10 transition-all group">
                    <span className="text-xl">🎙️</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Podcast</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col min-h-0 gap-4">
              <div className="flex-1 bg-[#0b1121]/80 backdrop-blur-3xl rounded-[48px] border border-white/10 p-8 flex flex-col shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-6 shrink-0">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/60">Neural Ingestion</span>
                   </div>
                   {attachedAsset && (
                     <div className="flex items-center gap-2">
                        <div className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-[9px] font-black rounded-lg border border-indigo-500/20 animate-in zoom-in">
                          {attachedAsset.type}: {attachedAsset.name.toUpperCase()}
                        </div>
                        <button onClick={() => setAttachedAsset(null)} className="text-red-500 hover:text-red-400 text-[10px] font-black uppercase">Remove</button>
                     </div>
                   )}
                </div>
                
                <div className="flex-1 relative flex flex-col">
                   <textarea value={state.prompt} onChange={(e) => onUpdate({ prompt: e.target.value })}
                            className="flex-1 bg-transparent text-white font-[500] text-lg lg:text-[1.3rem] focus:outline-none resize-none placeholder:text-slate-600 leading-relaxed custom-scrollbar pb-24"
                            placeholder="Describe your vision, paste a URL, or upload an image to initiate structural analysis..." />
                   
                   {/* Integrated Asset Preview within Prompt Area */}
                   {attachedAsset && (
                     <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5 bg-black/20 backdrop-blur-xl rounded-2xl flex items-center gap-4 animate-in slide-in-from-bottom-2 duration-300">
                        {attachedAsset.type === 'IMAGE' && attachedAsset.preview && (
                          <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 shadow-lg shrink-0">
                            <img src={attachedAsset.preview} className="w-full h-full object-cover" alt="Attached preview" />
                          </div>
                        )}
                        <div className="flex-1 overflow-hidden">
                           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest truncate">{attachedAsset.name}</p>
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Ready for creative synthesis</p>
                        </div>
                        <button onClick={() => setAttachedAsset(null)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                     </div>
                   )}
                </div>

                {state.isLoading && (
                  <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                    <h2 className="text-3xl font-[1000] text-white tracking-[0.3em] animate-pulse uppercase mb-8">SNOOPWERK</h2>
                    <div className="w-full max-w-sm space-y-4 text-center">
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${analysisProgress}%` }} />
                      </div>
                      <p className="text-indigo-400 text-[11px] font-[1000] uppercase tracking-[0.6em]">Analyzing Architecture</p>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={handleAnalyse} disabled={state.isLoading || (!state.prompt && !attachedAsset)}
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
        <div className="max-w-6xl mx-auto w-full flex flex-col h-full gap-8 min-h-0 relative z-10">
          <header className="flex items-center justify-between shrink-0 px-2">
            <h2 className="text-4xl font-[1000] text-white uppercase tracking-tighter drop-shadow-2xl">STRATEGIC BLUEPRINT</h2>
            <button onClick={handleClose} className="p-4 bg-white/5 rounded-3xl text-slate-500 hover:text-white border border-white/10 backdrop-blur-3xl transition-all hover:bg-white/10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </header>
          <div className="flex-1 bg-[#0b1121]/90 backdrop-blur-[40px] p-10 rounded-[56px] border border-white/10 text-slate-200 font-medium leading-relaxed shadow-3xl text-lg overflow-y-auto custom-scrollbar relative">
            {state.summary}
          </div>
          <div className="flex flex-col sm:flex-row gap-5 shrink-0 pb-8 px-2">
             <button onClick={() => onUpdate({ view: 'HOME' })} className="px-12 py-7 bg-white/5 text-slate-400 font-[1000] rounded-[36px] uppercase border border-white/10 hover:text-white hover:bg-white/10 transition-all text-[10px]">RE-ENTER CORE</button>
             <button onClick={handleGenerateSlides} disabled={state.isLoading} className="flex-1 py-7 bg-indigo-600 text-white font-[1000] rounded-[36px] uppercase tracking-[0.5em] hover:bg-indigo-500 transition-all shadow-xl text-xs relative overflow-hidden border border-white/20">
               {state.isLoading ? 'FORGING CREATIVE MATRIX...' : 'FORGE ALL SLIDES'}
             </button>
          </div>
        </div>
        {state.isLoading && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl z-[200] flex flex-col items-center justify-center p-8 animate-in fade-in">
             <div className="w-full max-w-sm space-y-8 text-center flex flex-col items-center justify-center">
                <h3 className="text-3xl font-[1000] text-white tracking-[0.4em] animate-pulse">SNOOPWERK</h3>
                <div className="w-full space-y-4 flex flex-col items-center">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${generationProgress}%` }} />
                  </div>
                  <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest text-center">Synthesizing Sequence</p>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  if (state.view === 'EDITOR') {
    return (
      <div className="h-full flex bg-[#030303] text-slate-200 overflow-hidden font-inter relative">
        <input type="file" ref={fileInputRef} className="hidden" onChange={onFileSelected} />
        
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <header className="absolute top-0 inset-x-0 h-16 bg-black/40 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-8 z-30">
            <div className="flex items-center gap-6">
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Live Editor Hub</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Asset_0{state.activeIndex + 1}</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={handleDownloadAllZip} className="px-6 py-2.5 bg-indigo-600/10 text-indigo-400 text-[10px] font-black rounded-xl uppercase tracking-widest border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all">Download All (ZIP)</button>
              <button onClick={handleClose} className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center p-8 mt-16 mb-32 relative">
            <div 
              className="relative bg-black rounded-[40px] border border-white/10 shadow-[0_60px_120px_-20px_rgba(0,0,0,1)] overflow-hidden animate-in zoom-in duration-700 flex items-center justify-center"
              style={{ 
                aspectRatio: state.aspectRatio.replace(':', '/'),
                height: '60vh',
                maxHeight: 'calc(100% - 40px)'
              }}
            >
              {renderSlidePreview(state.slides[state.activeIndex])}
            </div>
            
            <button onClick={() => onUpdate({ activeIndex: Math.max(0, state.activeIndex - 1) })} disabled={state.activeIndex === 0} 
                    className="absolute left-12 top-1/2 -translate-y-1/2 w-14 h-14 bg-black/40 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center backdrop-blur-2xl border border-white/10 transition-all disabled:opacity-0 active:scale-90">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button onClick={() => onUpdate({ activeIndex: Math.min(state.slides.length - 1, state.activeIndex + 1) })} disabled={state.activeIndex === state.slides.length - 1}
                    className="absolute right-12 top-1/2 -translate-y-1/2 w-14 h-14 bg-black/40 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center backdrop-blur-2xl border border-white/10 transition-all disabled:opacity-0 active:scale-90">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>

          <div className="absolute bottom-0 inset-x-0 h-32 bg-black/60 backdrop-blur-3xl border-t border-white/5 flex items-center px-8 z-30 overflow-x-auto custom-scrollbar">
            <div className="flex gap-4 px-4 min-w-full items-center">
               {state.slides.map((slide, idx) => (
                 <button key={slide.id} onClick={() => onUpdate({ activeIndex: idx })} 
                         className={`relative shrink-0 transition-all duration-300 rounded-2xl overflow-hidden border-2 ${state.activeIndex === idx ? 'w-24 h-24 border-indigo-500 scale-110 z-10 shadow-[0_0_30px_rgba(99,102,241,0.4)]' : 'w-20 h-20 border-white/5 opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}>
                    <img src={slide.imageUrl} className="w-full h-full object-cover" alt={`Thumb ${idx + 1}`} />
                 </button>
               ))}
            </div>
          </div>
          {(state.isLoading || editingLoading) && (
            <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-8 animate-in fade-in">
               <h2 className="text-3xl font-[1000] text-white tracking-[0.5em] uppercase animate-pulse">OPTIMIZING...</h2>
            </div>
          )}
        </div>

        <aside className="w-85 bg-[#080808] border-l border-white/5 flex flex-col shrink-0 overflow-hidden relative z-40 shadow-3xl">
          <div className="p-4 border-b border-white/5 flex flex-wrap gap-1.5 shrink-0 bg-black/20 backdrop-blur-xl">
             {(['text', 'magic', 'upload', 'audio', 'transition'] as const).map((tab) => (
               <button key={tab} onClick={() => setActiveTab(tab)}
                       className={`flex-1 min-w-[70px] py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                 {tab}
               </button>
             ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
             {activeTab === 'text' && (
               <div className="space-y-4 animate-in slide-in-from-right duration-400">
                 <div className="grid grid-cols-1 gap-3">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Title Overlay</label>
                      <textarea value={currentEdit.overlayText} onChange={(e) => updateSlideEdit({ overlayText: e.target.value })}
                                className="w-full bg-[#121212] border border-white/10 rounded-2xl p-3 text-[12px] text-white h-16 focus:ring-1 focus:ring-indigo-600 outline-none resize-none uppercase font-black" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Subtitle Overlay</label>
                      <textarea value={currentEdit.subText} onChange={(e) => updateSlideEdit({ subText: e.target.value })}
                                className="w-full bg-[#121212] border border-white/10 rounded-2xl p-3 text-[12px] text-white h-16 focus:ring-1 focus:ring-indigo-600 outline-none resize-none lowercase font-bold" />
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Color</label>
                       <input type="color" value={currentEdit.textColor} onChange={(e) => updateSlideEdit({ textColor: e.target.value })} className="w-full h-8 bg-transparent rounded-lg border border-white/10" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Font</label>
                       <select value={currentEdit.fontFamily} onChange={(e) => updateSlideEdit({ fontFamily: e.target.value })} className="w-full h-8 bg-[#121212] border border-white/10 rounded-lg px-2 text-[9px] text-white font-black">
                         {FONTS.map(f => <option key={f.value} value={f.value}>{f.label.toUpperCase()}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="bg-black/40 rounded-2xl p-4 border border-white/5 space-y-4 shadow-inner">
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Size</label>
                          <input type="range" min="10" max="250" value={currentEdit.textSize} onChange={(e) => updateSlideEdit({ textSize: parseInt(e.target.value) })} className="w-full accent-indigo-500 h-1.5" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Rotate</label>
                          <input type="range" min="-180" max="180" value={currentEdit.textRotation} onChange={(e) => updateSlideEdit({ textRotation: parseInt(e.target.value) })} className="w-full accent-indigo-500 h-1.5" />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">X-Pos</label>
                          <input type="range" min="0" max="100" value={currentEdit.textX} onChange={(e) => updateSlideEdit({ textX: parseInt(e.target.value) })} className="w-full accent-indigo-500 h-1.5" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Y-Pos</label>
                          <input type="range" min="0" max="100" value={currentEdit.textY} onChange={(e) => updateSlideEdit({ textY: parseInt(e.target.value) })} className="w-full accent-indigo-500 h-1.5" />
                       </div>
                    </div>
                 </div>
               </div>
             )}

             {activeTab === 'magic' && (
               <div className="space-y-6 animate-in slide-in-from-right duration-400">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500/80 ml-1">Refinement Intent</label>
                    <textarea value={currentEdit.magicPrompt} onChange={(e) => updateSlideEdit({ magicPrompt: e.target.value })}
                              className="w-full bg-[#121212] border border-white/10 rounded-[28px] p-6 text-[12px] text-white h-40 focus:ring-1 focus:ring-indigo-600 outline-none"
                              placeholder="Describe visual changes..." />
                  </div>
                  <button onClick={handleApplyMagicEdit} disabled={editingLoading} className="w-full py-5 bg-indigo-600 text-white font-[1000] rounded-[32px] text-[11px] uppercase tracking-[0.3em] hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-30">RUN MAGIC FORGE</button>
               </div>
             )}

             {activeTab === 'upload' && (
               <div className="space-y-6 animate-in slide-in-from-right duration-400">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Import via URL / Podcast</label>
                    <input 
                      type="text" 
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="Paste link here..."
                      className="w-full bg-[#121212] border border-white/10 rounded-xl p-3 text-[11px] text-white focus:ring-1 focus:ring-indigo-600 outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2 mt-2">
                       <button onClick={() => handleUrlImport('URL')} disabled={!externalUrl || editingLoading} className="py-3 bg-white/5 border border-white/10 text-white font-black rounded-xl text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-30">Import URL</button>
                       <button onClick={() => handleUrlImport('PODCAST')} disabled={!externalUrl || editingLoading} className="py-3 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-black rounded-xl text-[9px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-30">Import Pod</button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 space-y-3">
                    <button onClick={handleUsePlaceholderGraph} className="w-full py-5 bg-white/5 border border-white/10 text-white font-black rounded-3xl text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                      <span className="text-sm">📊</span> Minimalist Graph
                    </button>
                    <button onClick={() => handleSourceAction('SWAP')} className="w-full py-5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-black rounded-3xl text-[9px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Swap File Asset</button>
                    <button onClick={handleRemoveBg} disabled={editingLoading} className="w-full py-5 bg-teal-600/10 border border-teal-500/20 text-teal-500 font-black rounded-3xl text-[9px] uppercase tracking-widest hover:bg-teal-600 hover:text-white transition-all">Remove BG</button>
                    <button onClick={handleUpscaleAction} disabled={editingLoading} className="w-full py-5 bg-white/5 border border-white/10 text-white font-black rounded-3xl text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all">4K Upscale</button>
                  </div>
               </div>
             )}

             {activeTab === 'audio' && (
               <div className="space-y-4 animate-in slide-in-from-right duration-400">
                  <div className="grid grid-cols-1 gap-2">
                       {AUDIO_VIBES.map((vibe) => (
                         <button key={vibe.id} onClick={() => onUpdate({ musicStyle: vibe.label })}
                                 className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all ${state.musicStyle === vibe.label ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>
                            <span className="text-[10px] font-black uppercase tracking-widest">{vibe.label}</span>
                            <span className="text-xl">{vibe.emoji}</span>
                         </button>
                       ))}
                  </div>
               </div>
             )}

             {activeTab === 'transition' && (
               <div className="space-y-4 animate-in slide-in-from-right duration-400">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Slide Transitions</p>
                  <div className="grid grid-cols-1 gap-2">
                       {TRANSITION_OPTIONS.map((opt) => (
                         <button key={opt.id} onClick={() => onUpdate({ transitionStyle: opt.id })}
                                 className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all ${state.transitionStyle === opt.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>
                            <div className="flex flex-col items-start">
                              <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
                              <span className="text-[8px] font-bold text-white/40 uppercase mt-1">Applied between slides</span>
                            </div>
                            <span className="text-xl">{opt.emoji}</span>
                         </button>
                       ))}
                  </div>
               </div>
             )}
          </div>

          <div className="p-6 border-t border-white/5 bg-black/40 shrink-0 flex flex-col gap-2">
             <button onClick={() => onUpdate({ view: 'ANALYSIS' })} className="w-full py-3 text-[9px] font-black text-slate-600 hover:text-white uppercase tracking-[0.3em] transition-colors">Return to Analysis</button>
             <button onClick={handleClose} className="w-full py-3 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white font-black text-[9px] uppercase tracking-widest rounded-2xl transition-all">TERMINATE SESSION</button>
          </div>
        </aside>
      </div>
    );
  }

  return null;
};

export default ToolCarousel;