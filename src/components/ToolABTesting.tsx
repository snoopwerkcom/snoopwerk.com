
import React, { useState, useRef, useEffect } from 'react';
import { generateAIImage, editAIImage, removeBackground, upscaleImage, analyzeMultimodalContent } from '../services/api';
import { ToolType, AppToolsState, StyleOption, VariantEdit, DEFAULT_VARIANT_EDIT, GenerationStyle, UserCredits } from '../types';
import { GoogleGenerativeAI } from "@google/generative-ai"; // ← ADD THIS LINE
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

const FONTS = [
  { label: 'System Sans', value: 'sans-serif' },
  { label: 'Bebas Neue', value: "'Bebas Neue', sans-serif" },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Inter Black', value: "'Inter', sans-serif" },
  { label: 'Oswald', value: "'Oswald', sans-serif" },
  { label: 'Montserrat', value: "'Montserrat', sans-serif" },
];

const ToolABTesting: React.FC<ToolABTestingProps> = ({ state, credits, onUpdate, onUpdateCredits, onAction }) => {
  const [compareMode, setCompareMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'text' | 'enhance' | 'magic'>('text');
  const [editingLoading, setEditingLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [attachedAsset, setAttachedAsset] = useState<{ type: 'image' | 'video'; value: string; preview?: string } | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  // Viral Hook States
  const [hookSuggestions, setHookSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentEditIndex = state.selectedVarIndex ?? 0;
  const currentEdit = state.variantEdits[currentEditIndex] || DEFAULT_VARIANT_EDIT;

  const updateCurrentEdit = (updates: Partial<VariantEdit>) => {
    const newEdits = [...state.variantEdits];
    newEdits[currentEditIndex] = { ...currentEdit, ...updates };
    onUpdate({ variantEdits: newEdits });
  };
useEffect(() => {
  console.log('🔔 hookSuggestions changed:', hookSuggestions, 'Length:', hookSuggestions.length);
}, [hookSuggestions]);
 const handleGetSuggestions = async () => {
  console.log('🪄 Magic Wand clicked');
  if (!state.prompt) {
    alert('Please enter a thumbnail concept first!');
    return;
  }
  
  setIsSuggesting(true);
  
  try {
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Generate 3 viral YouTube titles for: "${state.prompt}". Return ONLY a JSON array: ["title1", "title2", "title3"]`;
    
    console.log('Calling Gemini...');
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log('AI response:', text);
    
    let suggestions: string[] = [];
    
    try {
      let cleaned = text.replace(/```json|```/gi, '').trim();
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) cleaned = match[0];
      suggestions = JSON.parse(cleaned);
    } catch {
      console.log('Using fallback titles');
      const s = state.prompt.toUpperCase();
      suggestions = [
        `I TRIED ${s} FOR 24 HOURS!`,
        `You WON'T BELIEVE What Happened With ${s}!`,
        `The TRUTH About ${s}`
      ];
    }
    
    console.log('Setting suggestions:', suggestions);
    setHookSuggestions(suggestions);
    
  } catch (error: any) {
    console.error('Error:', error);
    const s = state.prompt.toUpperCase();
    setHookSuggestions([
      `SHOCKING: ${s}!`,
      `I Can't Believe ${s}...`,
      `${s}: The Truth`
    ]);
  } finally {
    setIsSuggesting(false);
  }
};

  const handleGenerate = async () => {
    const userPrompt = state.prompt || (attachedAsset ? `the subject of this ${attachedAsset.type}` : '');
    if (!userPrompt) return;
    
    onUpdate({ stage: 'GENERATING', variations: [], selectedVarIndex: null });
    setErrorStatus(null);
    setGenerationProgress(5);
    
    try {
      setGenerationProgress(10);
      
      let analysisSource = state.prompt;
      let analysisType = 'prompt';

      if (attachedAsset) {
        analysisSource = attachedAsset.value;
        analysisType = attachedAsset.type;
      }

      const analysisInstruction = `
        ACT AS A MASTER CINEMATOGRAPHER AND CONTENT STRATEGIST.
        THE USER WANTS TO GENERATE AN IMAGE OF: "${userPrompt}".
        
        GOAL: Provide two distinct COMPOSITIONAL STYLES for this exact subject for A/B testing.
        STRICT RULES:
        1. Keep the CORE SUBJECT ("${userPrompt}") exactly as described.
        2. COMPOSITION A: Describe a wide-angle, cinematic, environmental setup.
        3. COMPOSITION B: Describe a tight, intense, extreme close-up or dynamic low-angle setup.
        
        FORMAT:
        VERSION A: [subject + wide cinematic environmental framing]
        VERSION B: [subject + tight intense dynamic alternative framing]
      `;
      
      const { summary: analysis, credits: c1 } = await analyzeMultimodalContent(analysisType, analysisSource, analysisInstruction);
      onUpdateCredits(c1);
      
      const versionAMatch = analysis.match(/VERSION A:\s*(.*)/i);
      const versionBMatch = analysis.match(/VERSION B:\s*(.*)/i);
      
      const visualPromptA = versionAMatch ? versionAMatch[1] : `${userPrompt}, wide cinematic composition`;
      const visualPromptB = versionBMatch ? versionBMatch[1] : `${userPrompt}, intense close up, alternative perspective`;

      const styleConfig = AB_STYLES.find(s => s.id === state.style);
      const styleSuffix = styleConfig?.promptSuffix || '';
      
      const finalPromptA = `${userPrompt}. ${visualPromptA}${styleSuffix ? ', ' + styleSuffix : ''}, masterpiece, 16:9 aspect ratio`;
      const finalPromptB = `${userPrompt}. ${visualPromptB}${styleSuffix ? ', ' + styleSuffix : ''}, professional photography, 16:9 aspect ratio`;
      
      setGenerationProgress(30);
      // ✅ Generate sequentially to avoid race conditions
const res1 = await generateAIImage(finalPromptA, "16:9");
onUpdateCredits(res1.credits);  // Update credits immediately
setGenerationProgress(65);

const res2 = await generateAIImage(finalPromptB, "16:9");
onUpdateCredits(res2.credits);  // Update credits again

      const newVariantEdits = [
        { ...DEFAULT_VARIANT_EDIT, overlayText: '', fontFamily: FONTS[1].value, textX: 50, textY: 50, textSize: 80 },
        { ...DEFAULT_VARIANT_EDIT, overlayText: '', fontFamily: FONTS[1].value, textX: 50, textY: 50, textSize: 80 }
      ];

      onUpdate({ 
        variations: [res1.imageUrl, res2.imageUrl], 
        stage: 'EDITING', 
        selectedVarIndex: 0,
        variantEdits: newVariantEdits
      });
    } catch (error: any) {
      console.error("Synthesis error:", error);
      setErrorStatus(error.message || "Synthesis engine encountered a logic mismatch.");
      onUpdate({ stage: 'IDLE' });
    } finally {
      setTimeout(() => setGenerationProgress(0), 800);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setAttachedAsset({ 
          type: 'image', 
          value: result, 
          preview: result 
        });
        if (!state.prompt) onUpdate({ prompt: `Project analysis of ${file.name}` });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyMagicEdit = async () => {
    if (state.selectedVarIndex === null || !state.variations[state.selectedVarIndex]) return;
    setEditingLoading(true);
    try {
      let instruction = currentEdit.magicPrompt || "Apply high-impact visual refinement.";
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
    setErrorStatus(null);
    setAttachedAsset(null);
    setHookSuggestions([]);
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
        className="absolute pointer-events-none select-none drop-shadow-2xl z-10 font-black tracking-tighter leading-none text-center px-4 w-full flex flex-col items-center justify-center"
        style={{
          left: `${edit.textX}%`,
          top: `${edit.textY}%`,
          transform: `translate(-50%, -50%) rotate(${edit.textRotation}deg)`,
          color: edit.textColor,
          fontSize: `${edit.textSize * scaleFactor}px`,
          fontFamily: edit.fontFamily,
          whiteSpace: 'normal',
          maxWidth: '95%',
          textShadow: '0 4px 12px rgba(0,0,0,0.7), 0 0 20px rgba(0,0,0,0.4)'
        }}
      >
        <span className="block w-full">{edit.overlayText}</span>
      </div>
    );
  };

  if (state.view === 'LANDING') {
    return (
      <div className="h-full relative overflow-hidden bg-[#020202] flex flex-col font-inter">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0 group/bg overflow-hidden pointer-events-none">
          <div className="absolute inset-0 scale-100 transition-transform duration-[60s] group-hover/bg:scale-105">
             <div 
               className="absolute top-[5%] left-[-2%] w-[25%] aspect-video rounded-[32px] border-2 border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.8)] bg-cover bg-center rotate-[-3deg] opacity-40 animate-in fade-in slide-in-from-left-24 duration-1000" 
               style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1974&auto=format&fit=crop")' }} 
             />
             <div 
               className="absolute top-[15%] right-[-5%] w-[30%] aspect-video rounded-[32px] border-2 border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.8)] bg-cover bg-center rotate-[2deg] opacity-40 animate-in fade-in slide-in-from-right-24 duration-1000 delay-200" 
               style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1492724441997-5dc865305da7?q=80&w=3840&auto=format&fit=crop")' }} 
             />
             <div 
               className="absolute bottom-[15%] left-[4%] w-[22%] aspect-video rounded-[32px] border-2 border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.8)] bg-cover bg-center rotate-[5deg] opacity-50 animate-in fade-in slide-in-from-bottom-24 duration-1000 delay-400" 
               style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1974&auto=format&fit=crop")' }} 
             />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black/60 to-black/95 backdrop-blur-[1px]" />
        </div>

        {/* Content Centered to fit Viewport */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6 pointer-events-none">
          <div className="w-full max-w-5xl flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 pointer-events-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl transition-transform hover:scale-105">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">A/B Intelligence Active</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-[1000] text-white tracking-tighter leading-tight uppercase drop-shadow-[0_20px_40px_rgba(220,38,38,0.3)]">
              SNOOP<span className="text-red-600 inline-block px-1">@</span>WERK: <br />
              <span className="gradient-text">The Viral Hook Factory.</span>
            </h1>
            
            <div className="space-y-3 max-w-3xl">
              <p className="text-lg md:text-2xl text-white font-black uppercase tracking-[0.1em] leading-tight drop-shadow-2xl">
                Precision Thumbnails. Lethal Hooks. <span className="text-red-500">Max Growth.</span>
              </p>
              <p className="text-slate-400 text-xs md:text-sm font-black uppercase tracking-[0.3em] opacity-80 max-w-xl mx-auto italic">
                Thumbnail A/B Testing on Steroids.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 w-full max-w-md">
              <button 
                onClick={() => onUpdate({ view: 'PRODUCTION' })}
                className="group relative w-full sm:flex-1 px-8 py-4 bg-red-600 text-white font-[1000] rounded-2xl text-[10px] uppercase tracking-[0.4em] transition-all hover:scale-[1.05] active:scale-95 shadow-[0_20px_40px_rgba(220,38,38,0.4)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                <span className="relative z-10">Deploy Laboratory</span>
              </button>
              <button 
                onClick={() => onAction && onAction(ToolType.LANDING)}
                className="w-full sm:flex-1 px-8 py-4 bg-white/5 border border-white/10 text-white font-[1000] rounded-2xl text-[10px] uppercase tracking-[0.4em] backdrop-blur-xl hover:bg-white/10 transition-all active:scale-95"
              >
                Return Base
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[120%] h-[30%] bg-red-600/5 blur-[100px] z-[5]" />
      </div>
    );
  }

  if (state.stage === 'IDLE' || state.stage === 'GENERATING') {
    const isGenerating = state.stage === 'GENERATING';
    return (
      <div className="relative h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0a] overflow-hidden font-inter">
        {/* Intense background image at 100% opacity as CSS limit is 1, visually impactful */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-100 transition-opacity duration-1000 saturate-[1.5]"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=3840&auto=format&fit=crop")' }} 
        />
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_center,_transparent_0%,_#0a0a0a_95%)] opacity-80" />
        
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
        
        <div className="relative z-10 w-full max-w-xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-700">
          <header className="flex flex-col items-center justify-center gap-2 mb-2 w-full text-center">
             <h1 className="text-5xl md:text-6xl lg:text-7xl font-[1000] text-white tracking-tighter uppercase leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] whitespace-nowrap">
                SNOOP<span className={`text-red-500 inline-block transition-all duration-500 ${isGenerating ? 'animate-pulsate-fast' : ''}`}>@</span>WERK
              </h1>
              <p className="text-[9px] font-black text-slate-100 uppercase tracking-[0.4em] mt-2 drop-shadow-md">A/B Thumbnail Generation</p>
          </header>

          <div className="bg-black/85 backdrop-blur-3xl p-8 rounded-[40px] border border-white/20 space-y-6 shadow-[0_48px_96px_-12px_rgba(0,0,0,0.8)] w-full max-h-[75vh] flex flex-col overflow-hidden relative">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-[9px] font-[1000] uppercase tracking-[0.4em] text-slate-400 ml-1">Thumbnail Concept (16:9)</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => fileInputRef.current?.click()} className="text-[8px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest mb-1 transition-colors">Attach Ref</button>
                </div>
              </div>
              <textarea
                value={state.prompt}
                onChange={(e) => onUpdate({ prompt: e.target.value })}
                className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-xl text-white focus:ring-1 focus:ring-red-500 resize-none h-32 placeholder:text-slate-600 font-bold placeholder:font-normal leading-tight"
                placeholder="What is your subject? (e.g., A minimalist futuristic apartment with large windows overlooking a rainy cyberpunk city)"
              />
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <label className="text-[9px] font-[1000] uppercase tracking-[0.4em] text-slate-400 ml-1">CHOOSE STYLE</label>
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
              </div>
            </div>

            <div className="flex flex-col items-center justify-center pt-4 gap-4">
              {isGenerating && (
                <div className="w-full space-y-2 animate-in fade-in duration-300">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/10">
                    <div className="h-full bg-red-600 transition-all duration-700" style={{ width: `${generationProgress}%` }} />
                  </div>
                  <p className="text-red-500 text-[11px] font-[1000] uppercase tracking-[0.6em] text-center animate-pulse">Forging Dual Versions</p>
                </div>
              )}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (!state.prompt && !attachedAsset)}
                className="w-full py-7 bg-red-600 hover:bg-red-500 text-white font-[1000] rounded-[40px] uppercase tracking-[0.6em] text-sm transition-all shadow-xl active:scale-[0.98] disabled:opacity-30 border border-white/10"
              >
                {isGenerating ? 'PROCESSING...' : 'INITIATE A/B GENERATION'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.stage === 'COMPARE') {
    return (
      <div className="h-screen flex flex-col bg-[#020202] font-inter overflow-hidden">
        <header className="h-20 bg-black/60 border-b border-white/10 flex items-center justify-between px-8 backdrop-blur-3xl shrink-0 z-30">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-[1000] text-white tracking-tighter uppercase leading-none">A/B FINAL PREVIEW</h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Review & Export Stage</p>
          </div>
          <button 
            onClick={() => onUpdate({ stage: 'EDITING' })}
            className="px-8 py-3 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all active:scale-95"
          >
            Back to Laboratory
          </button>
        </header>

        <div className="flex-1 overflow-hidden p-6 md:p-12 flex flex-col items-center justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-6xl items-center justify-center">
            {state.variations.map((v, i) => (
              <div key={i} className="flex flex-col gap-6 animate-in slide-in-from-bottom-8 duration-700 w-full" style={{ animationDelay: `${i * 200}ms` }}>
                <div className="relative aspect-video bg-[#0a0a0a] rounded-[32px] border border-white/10 shadow-[0_48px_96px_-12px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center group">
                  <img src={v} className="w-full h-full object-cover" alt={`Final Variation ${i}`} />
                  {renderTextOverlay(state.variantEdits[i], true)}
                </div>
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = v;
                    link.download = `snoopwerk-variation-${i+1}.png`;
                    link.click();
                  }}
                  className="w-full py-5 bg-red-600 hover:bg-red-500 text-white font-black rounded-3xl text-[11px] uppercase tracking-[0.4em] shadow-2xl transition-all active:scale-95"
                >
                  Export Version_0{i+1} (16:9)
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#050505] overflow-hidden font-inter">
      {/* Viral Hook Dropdown UI */}
      {hookSuggestions.length > 0 && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border-4 border-red-600 rounded-[48px] p-10 max-w-2xl w-full shadow-[0_60px_120px_-20px_rgba(220,38,38,0.5)] space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
              <button onClick={() => setHookSuggestions([])} className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-[1000] text-white tracking-tighter uppercase leading-none">VIRAL_HOOK_ENGINE</h3>
              <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.5em]">Selected Strategy Suggestions</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {hookSuggestions.map((hook, idx) => (
                <button 
                  key={idx}
                  onClick={() => {
                    updateCurrentEdit({ overlayText: hook.toUpperCase() });
                    setHookSuggestions([]);
                  }}
                  className="w-full p-6 bg-white/5 border border-white/10 rounded-3xl text-left text-white hover:bg-red-600 hover:border-red-400 transition-all group flex items-center justify-between"
                >
                  <span className="text-lg font-black uppercase tracking-tight pr-4">{hook}</span>
                  <span className="text-2xl group-hover:scale-125 transition-transform shrink-0">⚡</span>
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest text-center pt-4">SNOOPWERK OS // NEURAL SUGGESTIONS V1.0</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col p-4 overflow-hidden relative min-h-0">
        <header className="flex items-center justify-between mb-4 px-4 h-14 shrink-0 bg-black/40 backdrop-blur-3xl rounded-2xl border border-white/5 z-20 shadow-2xl">
          <div className="flex items-center gap-4">
            <button onClick={() => onUpdate({ view: 'LANDING' })} className="p-1.5 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full border border-white/5">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex flex-col">
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] leading-none">A/B PRODUCTION HUB</h3>
              <p className="text-[7px] font-black text-red-500 uppercase tracking-widest mt-0.5">DUAL_SESSION_ACTIVE</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCompareMode(!compareMode)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${compareMode ? 'bg-red-600 text-white border-red-500 shadow-lg' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}
            >
              {compareMode ? 'Split View' : 'Focus'}
            </button>
            <button 
              onClick={() => onUpdate({ stage: 'COMPARE' })}
              className="px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] bg-red-600 text-white hover:bg-red-500 shadow-2xl active:scale-95"
            >
              PREVIEW FINAL
            </button>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center relative px-2 pb-2 overflow-hidden min-h-0">
          {(editingLoading || isSuggesting) && (
            <div className="absolute inset-0 z-[100] bg-black/85 backdrop-blur-2xl flex flex-col items-center justify-center rounded-[40px] border border-white/10">
              <div className="w-12 h-12 border-2 border-white/10 border-t-red-500 rounded-full animate-spin mb-4"></div>
              <p className="text-white text-[9px] font-black uppercase tracking-[0.5em] animate-pulse">
                {isSuggesting ? 'CONSULTING VIRAL CORE...' : 'Neural Refinement Active...'}
              </p>
            </div>
          )}
          <div className={`grid h-full w-full gap-4 transition-all duration-700 ease-in-out ${compareMode ? 'grid-cols-2' : 'grid-cols-1 max-w-[90%] max-h-[90%]'}`}>
            {state.variations.map((v, i) => {
              if (!compareMode && state.selectedVarIndex !== i) return null;
              return (
                <div 
                  key={i} 
                  onClick={() => onUpdate({ selectedVarIndex: i })}
                  className={`relative rounded-[32px] overflow-hidden border transition-all duration-500 cursor-pointer bg-[#0a0a0a] group h-full flex items-center justify-center ${state.selectedVarIndex === i ? 'border-red-500 ring-4 ring-red-500/10 shadow-2xl z-10' : 'border-white/5 opacity-40 hover:opacity-60'}`}
                >
                  <div className="relative w-full h-full aspect-video">
                    <img src={v} className="w-full h-full object-cover relative z-0" alt={`Variant ${i}`} />
                    {renderTextOverlay(state.variantEdits[i], compareMode)}
                  </div>
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
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-8 bg-gradient-to-b from-[#080808] to-black pb-24">
          {activeTab === 'text' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-400">
              <div className="space-y-3 relative">
                <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Title Overlay</label>
                <div className="relative group/textarea">
                  <textarea 
                    value={currentEdit.overlayText}
                    onChange={(e) => updateCurrentEdit({ overlayText: e.target.value })}
                    className="w-full bg-[#121212] border border-white/10 rounded-2xl p-4 pr-12 text-[11px] text-white h-24 focus:ring-1 focus:ring-red-600 outline-none resize-none uppercase font-black shadow-inner"
                    placeholder="EX: I SURVIVED..."
                  />

                  {/* Feature Tooltip for Magic Wand */}
                  <div className="absolute -top-12 right-0 z-20 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500 pointer-events-none">
                    <div className="bg-red-600 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-2">
                      Magic Wand is here! Click for 3 viral hooks automatically.
                      <div className="absolute bottom-[-4px] right-4 w-2 h-2 bg-red-600 rotate-45"></div>
                    </div>
                  </div>

                  <button 
                    onClick={handleGetSuggestions}
                    disabled={isSuggesting || !state.prompt}
                    className="absolute bottom-3 right-3 p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-30 group/wand animate-pulsate-red"
                    title="Generate Viral Hooks"
                  >
                    <span className="text-lg leading-none group-hover/wand:rotate-12 transition-transform block">🪄</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Color</label>
                  <input type="color" value={currentEdit.textColor} onChange={(e) => updateCurrentEdit({ textColor: e.target.value })} className="w-full h-10 bg-transparent rounded-xl border border-white/10" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Font</label>
                  <select value={currentEdit.fontFamily} onChange={(e) => updateCurrentEdit({ fontFamily: e.target.value })} className="w-full h-10 bg-[#121212] border border-white/10 rounded-xl p-2 text-[10px] text-white font-black">
                    {FONTS.map(f => <option key={f.value} value={f.value}>{f.label.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Size</label>
                  <span className="text-red-500 text-[10px] font-black">{currentEdit.textSize}</span>
                </div>
                <input type="range" min="10" max="250" value={currentEdit.textSize} onChange={(e) => updateCurrentEdit({ textSize: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full accent-red-600 appearance-none" />
                
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Rotation</label>
                  <span className="text-red-500 text-[10px] font-black">{currentEdit.textRotation}°</span>
                </div>
                <input type="range" min="-180" max="180" value={currentEdit.textRotation} onChange={(e) => updateCurrentEdit({ textRotation: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full accent-red-600 appearance-none" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">X-Pos</label>
                      <span className="text-red-500 text-[10px] font-black">{currentEdit.textX}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={currentEdit.textX} onChange={(e) => updateCurrentEdit({ textX: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full accent-red-600 appearance-none" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Y-Pos</label>
                      <span className="text-red-500 text-[10px] font-black">{currentEdit.textY}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={currentEdit.textY} onChange={(e) => updateCurrentEdit({ textY: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full accent-red-600 appearance-none" />
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'enhance' && (
  <div className="space-y-3 animate-in slide-in-from-right duration-400">
    <button 
      onClick={handleRemoveBg} 
      disabled={state.selectedVarIndex === null || !state.variations[state.selectedVarIndex]}
      className="w-full py-4 bg-teal-600 text-white font-black rounded-xl text-[9px] uppercase tracking-widest hover:bg-teal-700 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      Remove BG
    </button>
    <button 
      onClick={handleUpscaleAction} 
      disabled={state.selectedVarIndex === null || !state.variations[state.selectedVarIndex]}
      className="w-full py-4 bg-red-600 text-white font-black rounded-xl text-[9px] uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      4K Synthesis
    </button>
  </div>
)}
          
          {activeTab === 'magic' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-400">
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Magic Refinement</label>
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
        <div className="p-6 border-t border-white/5 bg-[#080808] shrink-0 sticky bottom-0">
          <button onClick={resetWorkstation} className="w-full py-3 text-slate-600 hover:text-red-500 text-[9px] font-black uppercase tracking-[0.2em] transition-colors border border-white/5 rounded-xl">Terminate Session</button>
        </div>
      </aside>
    </div>
  );
};

export default ToolABTesting;
