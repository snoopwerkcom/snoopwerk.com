import React, { useState, useRef } from 'react';
import { generateAIImage, generateTextContent, analyzeMultimodalContent, editAIImage } from '../services/api';
import { AppToolsState, CarouselSlide, ToolType, STYLES, DEFAULT_VARIANT_EDIT, VariantEdit, UserCredits } from '../types';

const JSZip = (window as any).JSZip;

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

  const currentSlide = state.slides[state.activeIndex];
  const currentEdit = currentSlide?.edit || DEFAULT_VARIANT_EDIT;

  const CAROUSEL_SPECIFIC_STYLES = STYLES.filter(s => 
    ['minimalist', 'bold', 'vibrant', 'dark', 'photo_led'].includes(s.id)
  );

  const checkCreditsGuard = () => true;

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
      
      const systemInstruction = "Analyze input and create a 5-10 slide blueprint. Headlines and concepts only.";
      const { summary, credits: newCredits } = await analyzeMultimodalContent(source.type, source.value, systemInstruction);
      if (stopGenerationRef.current) return;
      onUpdateCredits(newCredits);
      onUpdate({ summary, view: 'ANALYSIS', isLoading: false });
    } catch (error: any) {
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
      const instruction = `Generate exactly ${state.numSlides} captions. Numbered list only.`;
      const { text: textResponse, credits: c1 } = await generateTextContent(state.summary, instruction);
      onUpdateCredits(c1);

      let captions = textResponse.split(/\n/).map(line => line.replace(/^\d+\.\s*/, '').trim()).filter(l => l.length > 2);
      const slides: CarouselSlide[] = [];
      for (let i = 0; i < captions.length; i++) {
        if (stopGenerationRef.current) break;
        setGenerationProgress(i + 1);
        const { imageUrl, credits: c2 } = (await generateAIImage(`${captions[i]}. ${styleSuffix}`, state.aspectRatio as any)) || {};
        onUpdateCredits(c2);
        slides.push({
          id: `slide-${i}-${Date.now()}`,
          imageUrl,
          caption: captions[i],
          edit: { ...DEFAULT_VARIANT_EDIT, overlayText: captions[i] }
        });
      }
      onUpdate({ slides, view: 'EDITOR', activeIndex: 0, isLoading: false });
    } catch (error: any) {
      onUpdate({ isLoading: false });
    }
  };

  const handleApplyMagicEdit = async () => {
    if (!currentSlide || !checkCreditsGuard()) return;
    const promptToUse = currentEdit.magicPrompt.trim() || "Transform into a viral masterpiece.";
    setMagicLoading(true);
    try {
      const instruction = `MAGIC EDIT: ${promptToUse}`;
      const result = await editAIImage(currentSlide.imageUrl, instruction);
      if (result?.imageUrl) {
        onUpdateCredits(result.credits);
        const newSlides = [...state.slides];
        newSlides[state.activeIndex] = { 
          ...currentSlide, 
          imageUrl: result.imageUrl,
          edit: { ...currentSlide.edit, magicPrompt: '' }
        };
        onUpdate({ slides: newSlides });
      }
    } catch (error: any) {
      alert("Magic Edit Error");
    } finally {
      setMagicLoading(false);
    }
  };

  const handleDownload = () => {
    if (!currentSlide) return;
    const link = document.createElement('a');
    link.href = currentSlide.imageUrl;
    link.download = `slide-${state.activeIndex + 1}.png`;
    link.click();
  };

  const handleDownloadAllZip = async () => {
    if (state.slides.length === 0) return;
    setZipLoading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("snoopwerk-carousel");
      state.slides.forEach((s: any, i: number) => {
        const base64Data = s.imageUrl.split(',')[1];
        folder.file(`slide-${i + 1}.png`, base64Data, { base64: true });
      });
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = "carousel.zip";
      link.click();
    } catch (e) {
      alert("ZIP failed");
    } finally {
      setZipLoading(false);
    }
  };

  const LoadingOverlay = () => {
    if (!state.isLoading) return null;
    return (
      <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-12">
        <div className="text-white animate-pulse font-black uppercase tracking-widest">
          Processing Slide {generationProgress} of {state.numSlides}
        </div>
        <button onClick={handleStop} className="mt-8 px-8 py-4 bg-red-600 text-white rounded-xl">STOP</button>
      </div>
    );
  };

  const renderSlidePreview = (slide: CarouselSlide) => {
    if (!slide) return null;
    return (
      <div className="relative w-full h-full bg-[#0a0a0a] rounded-[48px] overflow-hidden border-[10px] border-[#1a1a1a]">
        <img src={slide.imageUrl} className="w-full h-full object-cover" alt="Preview" />
        {slide.edit.overlayText && (
          <div 
            className="absolute pointer-events-none z-10 font-black text-center px-6"
            style={{
              left: `50%`, top: `50%`, transform: `translate(-50%, -50%)`,
              color: slide.edit.textColor, fontSize: `${slide.edit.textSize}px`,
              fontFamily: slide.edit.fontFamily, textShadow: '0 4px 12px rgba(0,0,0,0.5)'
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
      <div className="h-full bg-[#050B18] flex flex-col items-center justify-center text-center">
        <h1 className="text-6xl font-black text-white mb-8 uppercase">SnoopWerk</h1>
        <button onClick={() => onUpdate({ view: 'SETUP' })} className="px-12 py-6 bg-indigo-600 text-white font-black rounded-2xl uppercase">New Project</button>
      </div>
    );
  }

  if (state.view === 'SETUP') {
    return (
      <div className="h-full bg-[#050B18] text-white p-12 overflow-y-auto">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase text-slate-500">Creative Brief</label>
            <textarea value={state.prompt} onChange={(e) => onUpdate({ prompt: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 h-40 outline-none" placeholder="What is this carousel about?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <select value={state.aspectRatio} onChange={(e) => onUpdate({ aspectRatio: e.target.value as any })} className="bg-black/40 p-4 rounded-xl border border-white/10">
              <option value="1:1">Square (1:1)</option>
              <option value="9:16">Vertical (9:16)</option>
            </select>
            <select value={state.style} onChange={(e) => onUpdate({ style: e.target.value as any })} className="bg-black/40 p-4 rounded-xl border border-white/10">
              {CAROUSEL_SPECIFIC_STYLES.map(s => <option key={s.id} value={s.id}>{s?.emoji} {s?.label?.toUpperCase()}</option>)}
            </select>
          </div>
          <button onClick={() => handleAnalyse()} className="w-full py-6 bg-indigo-600 rounded-2xl font-black uppercase tracking-widest">Generate Design</button>
        </div>
      </div>
    );
  }

  if (state.view === 'ANALYSIS') {
    return (
        <div className="h-full bg-[#050B18] text-white p-12 flex flex-col items-center justify-center">
            <div className="max-w-2xl w-full bg-black/40 p-8 rounded-3xl border border-white/10 space-y-6">
                <h2 className="text-2xl font-black uppercase">Blueprint Ready</h2>
                <div className="text-slate-400 text-sm leading-relaxed">{state.summary}</div>
                <button onClick={handleGenerate} className="w-full py-6 bg-indigo-600 rounded-2xl font-black uppercase">Start Forging Slides</button>
            </div>
        </div>
    );
  }

  if (state.view === 'EDITOR') {
    return (
      <div className="h-full flex bg-[#050505] text-white overflow-hidden">
        <LoadingOverlay />
        <div className="flex-1 flex flex-col relative">
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="w-full h-[60vh] max-w-xl">{renderSlidePreview(state.slides[state.activeIndex])}</div>
          </div>
          <div className="h-32 bg-black/40 border-t border-white/5 flex gap-4 items-center px-8 overflow-x-auto">
            {state.slides.map((s, idx) => (
              <button key={s.id} onClick={() => onUpdate({ activeIndex: idx })} className={`w-20 h-20 shrink-0 rounded-lg overflow-hidden border-2 ${state.activeIndex === idx ? 'border-indigo-500' : 'border-transparent opacity-40'}`}>
                <img src={s.imageUrl} className="w-full h-full object-cover" alt="" />
              </button>
            ))}
          </div>
        </div>
        <aside className="w-80 border-l border-white/5 bg-[#0a0a0a] flex flex-col">
          <div className="p-4 border-b border-white/5 flex gap-2">
            {['text', 'magic'].map(t => (
              <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase ${activeTab === t ? 'bg-indigo-600' : 'text-slate-500'}`}>{t}</button>
            ))}
          </div>
          <div className="p-6 flex-1 space-y-6">
            {activeTab === 'text' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
  <label className="text-[9px] font-black text-slate-500 uppercase">Caption</label>
  <button 
    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
      navigator.clipboard.writeText(currentEdit.overlayText);
      const btn = e.currentTarget;
      btn.innerText = "COPIED! ✅";
      setTimeout(() => {
        btn.innerText = "Copy 📋";
      }, 2000);
    }} 
    className="text-[8px] text-indigo-400 font-black uppercase tracking-tighter"
  >
    Copy 📋
  </button>
</div>
                <textarea value={currentEdit.overlayText} onChange={(e) => updateSlideEdit({ overlayText: e.target.value })} className="w-full bg-black border border-white/5 rounded-xl p-4 text-xs h-32 outline-none" />
              </div>
            )}
            {activeTab === 'magic' && (
              <div className="space-y-4">
                <textarea value={currentEdit.magicPrompt} onChange={(e) => updateSlideEdit({ magicPrompt: e.target.value })} className="w-full bg-black border border-white/5 rounded-xl p-4 text-xs h-32 outline-none" placeholder="Describe changes..." />
                <button onClick={handleApplyMagicEdit} disabled={magicLoading} className="w-full py-4 bg-indigo-600 rounded-xl font-black uppercase text-[10px]">{magicLoading ? 'Wait...' : 'Apply Magic'}</button>
              </div>
            )}
          </div>
          <div className="p-6 border-t border-white/5 space-y-2">
            <button onClick={handleDownload} className="w-full py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase">Download PNG</button>
            <button onClick={handleDownloadAllZip} className="w-full py-3 bg-indigo-600 rounded-xl text-[10px] font-black uppercase">Export ZIP</button>
          </div>
        </aside>
      </div>
    );
  }
  return null;
};

export default ToolCarousel;