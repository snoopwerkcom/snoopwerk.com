import React, { useState } from 'react';

import {
  generateAIImage as generateImage,
  editAIImage,
  removeBackground,
  upscaleImage,
} from '../services/api';

import {
  ToolType,
  VariantEdit,
  DEFAULT_VARIANT_EDIT,
  GenerationStyle,
  UserCredits,
  STYLES,
} from '../types/index';

// Essential for the ZIP export
declare const JSZip: any;

interface ToolABTestingState {
  prompt: string;
  style: GenerationStyle;
  variations: string[];
  stage: 'IDLE' | 'GENERATING' | 'EDITING' | 'REFINING' | 'COMPARE';
  selectedVarIndex: number | null;
  variantEdits: VariantEdit[];
}

interface ToolABTestingProps {
  state: ToolABTestingState;
  credits: UserCredits;
  onUpdate: (newState: Partial<ToolABTestingState>) => void;
  onUpdateCredits: (credits: UserCredits) => void;
  onAction: (tool: ToolType, image?: string) => void;
}

const ToolABTesting: React.FC<ToolABTestingProps> = ({ state, credits, onUpdate, onUpdateCredits, onAction }) => {
  const [compareMode, setCompareMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'text' | 'enhance' | 'magic'>('text');
  const [editingLoading, setEditingLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [zipLoading, setZipLoading] = useState(false);

  const currentEditIndex = state.selectedVarIndex ?? 0;
  const currentEdit = state.variantEdits[currentEditIndex] || DEFAULT_VARIANT_EDIT;

 const checkCredits = () => {
  // If credits is an object, look for .remaining. 
  // If it's just a number or string, use it directly or default to 1.
  if (typeof credits === 'object' && credits !== null) {
    return (credits as any).remaining > 0;
  }
  return Number(credits) > 0;
};

  const updateCurrentEdit = (updates: Partial<VariantEdit>) => {
    const newEdits = [...state.variantEdits];
    newEdits[currentEditIndex] = { ...currentEdit, ...updates };
    onUpdate({ variantEdits: newEdits });
  };

  const handleGenerate = async () => {
    if (!state.prompt || !checkCredits()) return;
    onUpdate({ stage: 'GENERATING' });
    setGenerationProgress(5);
    try {
      const styleConfig = STYLES.find(s => s.id === state.style);
      const styleSuffix = styleConfig?.promptSuffix || '';
      const basePrompt = styleSuffix ? `${state.prompt}, ${styleSuffix}` : state.prompt;
      
      setGenerationProgress(20);
      const res1 = await generateImage(`${basePrompt}, style: ${state.style}`); 
      setGenerationProgress(60);
      const res2 = await generateImage(`${basePrompt}, cinematic perspective`);
      
      onUpdate({ 
        variations: [res1, res2], 
        stage: 'EDITING', 
        selectedVarIndex: 0,
        variantEdits: [JSON.parse(JSON.stringify(DEFAULT_VARIANT_EDIT)), JSON.parse(JSON.stringify(DEFAULT_VARIANT_EDIT))]
      });
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      onUpdate({ stage: 'IDLE' });
    } finally {
      setTimeout(() => setGenerationProgress(0), 800);
    }
  };

  const handleApplyMagicEdit = async () => {
  if (state.selectedVarIndex === null || !state.variations[state.selectedVarIndex] || !checkCredits()) return;
  
  setEditingLoading(true);
  try {
    const editSettings = state.variantEdits[state.selectedVarIndex] || DEFAULT_VARIANT_EDIT;
    const instruction = editSettings.magicPrompt || "Apply high-impact visual refinement.";
    
    // FIX: Pass the Image FIRST, then the Instruction (2 arguments)
    const imageUrl = await editAIImage(state.variations[state.selectedVarIndex], instruction);
    
    const newVariations = [...state.variations];
    newVariations[state.selectedVarIndex] = imageUrl;
    
    onUpdate({ variations: newVariations });
  } catch (error: any) {
    alert(`Error: ${error.message}`);
  } finally {
    setEditingLoading(false);
  }
};

 // Update Remove Background
const handleRemoveBg = async () => {
  if (state.selectedVarIndex === null) return;
  setEditingLoading(true);
  try {
    // Only pass ONE argument: the image URL
    const imageUrl = await removeBackground(state.variations[state.selectedVarIndex]);
    const newVariations = [...state.variations];
    newVariations[state.selectedVarIndex] = imageUrl;
    onUpdate({ variations: newVariations });
  } catch (error: any) { alert(error.message); } finally { setEditingLoading(false); }
};

// Update Upscale
const handleUpscaleAction = async () => {
  if (state.selectedVarIndex === null) return;
  setEditingLoading(true);
  try {
    // Only pass ONE argument: the image URL
    const imageUrl = await upscaleImage(state.variations[state.selectedVarIndex]);
    const newVariations = [...state.variations];
    newVariations[state.selectedVarIndex] = imageUrl;
    onUpdate({ variations: newVariations });
  } catch (error: any) { alert(error.message); } finally { setEditingLoading(false); }
};

  const handleDownload = () => {
    if (state.selectedVarIndex === null) return;
    const link = document.createElement('a');
    link.href = state.variations[state.selectedVarIndex];
    link.download = `instagram-slide-${state.selectedVarIndex + 1}.png`;
    link.click();
  };

  const handleDownloadAllZip = async () => {
    if (state.variations.length === 0) return;
    setZipLoading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("instagram_carousel");
      for (let i = 0; i < state.variations.length; i++) {
        const response = await fetch(state.variations[i]);
        const blob = await response.blob();
        folder.file(`slide-${i + 1}.png`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = "carousel_pack.zip";
      link.click();
    } catch (e) { 
        alert("Failed to generate ZIP. Ensure JSZip is loaded."); 
    } finally { 
        setZipLoading(false); 
    }
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

  if (state.stage === 'IDLE' || state.stage === 'GENERATING') {
    return (
      <div className="relative h-full flex flex-col items-center justify-center p-6 bg-[#0a0a0a] overflow-hidden">
        <div className="relative z-10 w-full max-w-xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-6xl font-black text-white tracking-tighter uppercase leading-none">
              INSTA <span className="text-indigo-500">CAROUSEL</span>
            </h1>
            <p className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase">A/B Variation Engine</p>
          </div>
          <div className="bg-[#0d0d0d] p-10 rounded-[48px] border border-white/10 space-y-8 shadow-2xl">
            <textarea
              value={state.prompt}
              onChange={(e) => onUpdate({ prompt: e.target.value })}
              className="w-full bg-transparent border-none text-2xl text-white focus:ring-0 resize-none h-24 placeholder:text-slate-800 font-bold"
              placeholder="Describe your hook..."
            />
            <select
              value={state.style}
              onChange={(e) => onUpdate({ style: e.target.value as GenerationStyle })}
              className="w-full bg-[#161616] border border-white/5 rounded-2xl p-4 text-xs font-black text-white appearance-none"
            >
              {STYLES.map((style: any) => (
  <option key={style.id} value={style.id}>
    {style.emoji} {style.label ? style.label.toUpperCase() : ''}
  </option>
))}
              
            </select>
            <button
              onClick={handleGenerate}
              disabled={state.stage === 'GENERATING' || !state.prompt}
              className="w-full px-10 py-5 bg-white text-black font-black rounded-[24px] uppercase tracking-[0.2em] hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-30"
            >
              {state.stage === 'GENERATING' ? 'FORGING...' : 'GENERATE VARIATIONS'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-[#050505] overflow-hidden">
      <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
        <header className="flex items-center justify-between mb-4 px-4 h-14 bg-black/40 rounded-2xl border border-white/5 backdrop-blur-md">
          <h3 className="text-xs font-black text-white uppercase tracking-widest">DESIGN WORKSPACE</h3>
          <button 
            onClick={() => setCompareMode(!compareMode)} 
            className={`px-4 py-2 rounded-xl text-[9px] font-black transition-all ${compareMode ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-500'}`}
          >
            {compareMode ? 'COMPARE ON' : 'SINGLE VIEW'}
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center relative">
          {editingLoading && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-[40px]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
            </div>
          )}
          <div className={`grid h-full w-full gap-8 p-4 ${compareMode ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {state.variations.map((v, i) => (
              (!compareMode && state.selectedVarIndex !== i) ? null : (
                <div 
                    key={i} 
                    onClick={() => onUpdate({ selectedVarIndex: i })} 
                    className={`relative rounded-[40px] overflow-hidden border-2 transition-all cursor-pointer ${state.selectedVarIndex === i ? 'border-indigo-500 shadow-2xl ring-4 ring-indigo-500/20' : 'border-white/5 opacity-40'}`}
                >
                  <img src={v} className="w-full h-full object-contain" alt="Variant" />
                  {renderTextOverlay(state.variantEdits[i], compareMode)}
                </div>
              )
            ))}
          </div>
        </div>
      </div>

      <aside className="w-80 border-l border-white/5 bg-[#0a0a0a] flex flex-col">
        <div className="p-4 flex gap-1 border-b border-white/5">
          {['text', 'enhance', 'magic'].map((tab) => (
            <button 
                key={tab} 
                onClick={() => setActiveTab(tab as any)} 
                className={`flex-1 py-3 rounded-xl text-[10px] uppercase font-black tracking-tighter transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6 flex-1 space-y-6 overflow-y-auto">
          {activeTab === 'text' && (
            <div className="space-y-4 animate-in slide-in-from-right duration-200">
              <label className="text-[9px] font-black text-slate-500 uppercase">Slide Headline</label>
              <textarea 
                value={currentEdit.overlayText} 
                onChange={(e) => updateCurrentEdit({ overlayText: e.target.value })} 
                className="w-full bg-[#161616] border border-white/5 rounded-xl p-4 text-white text-xs h-24 focus:ring-1 focus:ring-indigo-500 outline-none" 
              />
              <div className="space-y-2">
                <div className="flex justify-between text-[8px] font-black text-slate-500"><span>SIZE</span><span>{currentEdit.textSize}px</span></div>
                <input type="range" min="10" max="200" value={currentEdit.textSize} onChange={(e) => updateCurrentEdit({ textSize: parseInt(e.target.value) })} className="w-full accent-indigo-500" />
              </div>
            </div>
          )}
          
          {activeTab === 'enhance' && (
            <div className="space-y-3 animate-in slide-in-from-right duration-200">
              <button onClick={handleRemoveBg} className="w-full py-4 bg-teal-600/10 border border-teal-500/20 text-teal-400 rounded-xl font-black text-[10px] hover:bg-teal-600 hover:text-white transition-all">REMOVE BG</button>
              <button onClick={handleUpscaleAction} className="w-full py-4 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl font-black text-[10px] hover:bg-indigo-600 hover:text-white transition-all">AI UPSCALE (4K)</button>
            </div>
          )}

          {activeTab === 'magic' && (
            <div className="space-y-4 animate-in slide-in-from-right duration-200">
              <label className="text-[9px] font-black text-slate-500 uppercase">Visual Re-Imagination</label>
              <textarea 
                value={currentEdit.magicPrompt} 
                onChange={(e) => updateCurrentEdit({ magicPrompt: e.target.value })} 
                className="w-full bg-[#161616] border border-white/5 rounded-xl p-4 text-white text-xs h-24 focus:ring-1 focus:ring-indigo-500 outline-none" 
              />
              <button onClick={handleApplyMagicEdit} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-black text-[10px] shadow-xl">APPLY MAGIC EDIT</button>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 space-y-2 bg-[#050505]">
          <button onClick={handleDownload} className="w-full py-4 bg-white/5 border border-white/5 text-white rounded-xl text-[10px] font-black hover:bg-white/10 transition-all">DOWNLOAD SLIDE</button>
          <button 
            onClick={handleDownloadAllZip} 
            disabled={zipLoading || state.variations.length === 0} 
            className="w-full py-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {zipLoading ? 'ARCHIVING...' : 'EXPORT FULL CAROUSEL'}
          </button>
        </div>
      </aside>
    </div>
  );
};

export default ToolABTesting;