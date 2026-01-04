import React, { useState } from 'react';

import {
  generateAIImage,
  editAIImage,
  removeBackground,
  upscaleImage,
} from '../services/api';

import {
  ToolType,
  AppToolsState,
  STYLES,
  VariantEdit,
  DEFAULT_VARIANT_EDIT,
  GenerationStyle,
  UserCredits,
} from '../types/index';

import ImageModal from './ImageModal';

interface ToolABTestingState {
  prompt: string;
  style: GenerationStyle;
  images: string[];
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
  
  const currentEditIndex = state.selectedVarIndex ?? 0;
  const currentEdit = state.variantEdits[currentEditIndex] || DEFAULT_VARIANT_EDIT;

  /**
   * Credit Guard
   * App.tsx handles the global redirect logic; this is a safety check.
   */
  const checkCredits = () => {
    return credits.remaining > 0;
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
      const res1 = await generateImage(`${basePrompt}, focal point center`, state.style);
      setGenerationProgress(60);
      const res2 = await generateImage(`${basePrompt}, cinematic perspective`, state.style);
      setGenerationProgress(100);
      
      onUpdate({ variations: [res1, res2], stage: 'EDITING', selectedVarIndex: 0 });
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
      let instruction = editSettings.magicPrompt || "Apply high-impact visual refinement.";
      
      if (editSettings.overlayText) {
        instruction += ` Integrate text: "${editSettings.overlayText}".`;
      }
      
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

  const handleRemoveBg = async () => {
    if (state.selectedVarIndex === null || !state.variations[state.selectedVarIndex] || !checkCredits()) return;
    setEditingLoading(true);
    try {
      const imageUrl = await removeBackground(state.variations[state.selectedVarIndex]);
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
    if (state.selectedVarIndex === null || !state.variations[state.selectedVarIndex] || !checkCredits()) return;
    setEditingLoading(true);
    try {
      const imageUrl = await upscaleImage(state.variations[state.selectedVarIndex]);
      const newVariations = [...state.variations];
      newVariations[state.selectedVarIndex] = imageUrl;
      onUpdate({ variations: newVariations });
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setEditingLoading(false);
    }
  };

  const handleDownload = (image: string, label: string) => {
    const link = document.createElement('a');
    link.href = image;
    link.download = `snoopwerk-${label.toLowerCase()}.png`;
    link.click();
  };

  const resetWorkstation = () => {
    onUpdate({
      stage: 'IDLE',
      variations: [],
      prompt: '',
      style: 'minimalist',
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

  if (state.stage === 'IDLE' || state.stage === 'GENERATING') {
    return (
      <div className="relative h-full flex flex-col items-center justify-center p-6 bg-[#0a0a0a] overflow-hidden">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-30 transition-opacity duration-1000"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=2071")' }}
        />
        
        <div className="relative z-10 w-full max-w-xl space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="text-center space-y-2">
            <h1 className="text-6xl font-black text-white tracking-tighter uppercase leading-none drop-shadow-2xl">
              THUMBNAIL <span className="text-indigo-500">MAKER</span>
            </h1>
            <p className="text-lg font-black text-slate-400 uppercase tracking-[0.4em]">SNOOP STUDIO</p>
          </div>

          <div className="bg-[#0d0d0d] p-10 rounded-[48px] border border-white/10 space-y-8 shadow-[0_32px_64px_rgba(0,0,0,0.8)]">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Describe Viral Hook</label>
              <textarea
                value={state.prompt}
                onChange={(e) => onUpdate({ prompt: e.target.value })}
                className="w-full bg-transparent border-none text-2xl text-white focus:ring-0 resize-none h-24 placeholder:text-slate-800 font-bold"
                placeholder={"Be specific for better results.\n“AI tools that help creators make better videos.”"}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Choose Style</label>
              <div className="relative">
                <select
                  value={state.style}
                  onChange={(e) => onUpdate({ style: e.target.value as GenerationStyle })}
                  className="w-full bg-[#161616] border border-white/5 rounded-2xl p-4 text-xs font-black text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  {STYLES.map((style) => (
                    <option key={style.id} value={style.id} className="bg-slate-900">
                      {style.emoji} {style.label.toUpperCase()}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center pt-6 gap-6">
              {state.stage === 'GENERATING' && (
                <div className="w-full space-y-3 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Forging A/B Variations</span>
                    <span className="text-[10px] font-black text-white">{generationProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden shadow-[inset_0_1px_4px_rgba(0,0,0,0.3)]">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-700 ease-in-out shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>
                </div>
              )}
              <button
                onClick={handleGenerate}
                disabled={state.stage === 'GENERATING' || !state.prompt}
                className="w-full px-10 py-5 bg-white text-black font-black rounded-[24px] hover:bg-slate-200 transition-all disabled:opacity-30 text-xs uppercase tracking-[0.2em] shadow-xl active:scale-[0.98]"
              >
                {state.stage === 'GENERATING' ? 'FORGING VARIATIONS...' : 'GENERATE A/B VARIATIONS'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.stage === 'EDITING' || state.stage === 'REFINING') {
    return (
      <div className="h-full flex bg-[#050505] overflow-hidden">
        <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
          <header className="flex items-center justify-between mb-4 px-4 h-14 shrink-0 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 z-20">
            <h3 className="text-xs font-black text-white uppercase tracking-widest">THUMBNAIL MAKER PRO</h3>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setCompareMode(!compareMode)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${compareMode ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}
              >
                {compareMode ? 'Compare View On' : 'Single View'}
              </button>
              <button 
                onClick={() => onUpdate({ stage: 'COMPARE' })}
                className="px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg"
              >
                PREVIEW FINAL
              </button>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center relative px-4 pb-4 overflow-hidden">
            {editingLoading && (
              <div className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-[40px]">
                <div className="w-12 h-12 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                <p className="text-white text-[10px] font-black uppercase tracking-widest animate-pulse">Processing AI Task...</p>
              </div>
            )}
            <div className={`grid h-full w-full gap-8 transition-all duration-500 ease-in-out ${compareMode ? 'grid-cols-2' : 'grid-cols-1 max-w-[90%] max-h-[90%]'}`}>
              {state.variations.map((v, i) => {
                if (!compareMode && state.selectedVarIndex !== i) return null;
                return (
                  <div 
                    key={i} 
                    onClick={() => onUpdate({ selectedVarIndex: i })}
                    className={`relative rounded-[48px] overflow-hidden border-2 transition-all cursor-pointer bg-[#0a0a0a] group h-full flex items-center justify-center ${state.selectedVarIndex === i ? 'border-indigo-500 ring-[6px] ring-indigo-500/10 shadow-[0_40px_80px_rgba(0,0,0,0.8)] z-10' : 'border-white/5 opacity-50'}`}
                  >
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                    <img src={v} className="w-full h-full object-contain relative z-0 transition-transform duration-500" alt={`Variant ${i}`} />
                    {renderTextOverlay(state.variantEdits[i], compareMode)}
                    <div className="absolute top-8 left-8 bg-black/60 px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest backdrop-blur-md border border-white/10 group-hover:bg-indigo-600 transition-colors">
                      Variant {i === 0 ? 'A' : 'B'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="w-80 border-l border-white/5 bg-[#0a0a0a] flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-4 border-b border-white/5 flex gap-1 sticky top-0 bg-[#0a0a0a] z-30">
            {['text', 'enhance', 'magic'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6 flex-1 space-y-8">
            <div className="px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-center">
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Currently Editing Variant {state.selectedVarIndex === 0 ? 'A' : 'B'}</p>
            </div>

            {activeTab === 'text' && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Headline Hook</label>
                  <textarea 
                    value={currentEdit.overlayText}
                    onChange={(e) => updateCurrentEdit({ overlayText: e.target.value })}
                    className="w-full bg-[#161616] border border-white/5 rounded-xl p-4 text-xs text-white h-24 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all"
                    placeholder="Ex: I BUILT THIS IN 24H!"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-slate-600 uppercase">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={currentEdit.textColor} onChange={(e) => updateCurrentEdit({ textColor: e.target.value })} className="w-10 h-10 bg-transparent rounded cursor-pointer border border-white/5" />
                      <span className="text-[9px] font-mono text-slate-400 uppercase">{currentEdit.textColor}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-slate-600 uppercase">Typography</label>
                    <select value={currentEdit.fontFamily} onChange={(e) => updateCurrentEdit({ fontFamily: e.target.value })} className="w-full bg-[#161616] border border-white/5 rounded-xl h-10 text-[9px] font-bold px-2 text-white outline-none">
                      <option value="sans-serif">Modern Sans</option>
                      <option value="serif">Classic Serif</option>
                      <option value="Impact, sans-serif">Bold Impact</option>
                      <option value="'Courier New', Courier, monospace">Technical Mono</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[8px] font-black text-slate-600 uppercase">
                    <span>Text Scale</span>
                    <span className="text-indigo-400">{currentEdit.textSize}px</span>
                  </div>
                  <input type="range" min="10" max="200" value={currentEdit.textSize} onChange={(e) => updateCurrentEdit({ textSize: parseInt(e.target.value) })} className="w-full accent-indigo-500 bg-black h-1 rounded-full appearance-none cursor-pointer" />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[8px] font-black text-slate-600 uppercase">
                    <span>Rotation</span>
                    <span className="text-indigo-400">{currentEdit.textRotation}°</span>
                  </div>
                  <input type="range" min="-180" max="180" value={currentEdit.textRotation} onChange={(e) => updateCurrentEdit({ textRotation: parseInt(e.target.value) })} className="w-full accent-indigo-500 bg-black h-1 rounded-full appearance-none cursor-pointer" />
                </div>

                <div className="space-y-4">
                  <label className="text-[8px] font-black text-slate-600 uppercase block mb-2 tracking-widest text-center">Position</label>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[7px] text-slate-700 font-black"><span>Horizontal</span><span>{currentEdit.textX}%</span></div>
                      <input type="range" min="0" max="100" value={currentEdit.textX} onChange={(e) => updateCurrentEdit({ textX: parseInt(e.target.value) })} className="w-full accent-teal-500 bg-black h-1 rounded-full appearance-none cursor-pointer" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[7px] text-slate-700 font-black"><span>Vertical</span><span>{currentEdit.textY}%</span></div>
                      <input type="range" min="0" max="100" value={currentEdit.textY} onChange={(e) => updateCurrentEdit({ textY: parseInt(e.target.value) })} className="w-full accent-teal-500 bg-black h-1 rounded-full appearance-none cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'enhance' && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Pixel-Level Adjustments</p>
                <button 
                  onClick={handleRemoveBg}
                  disabled={editingLoading}
                  className="w-full py-5 bg-teal-600/10 border border-teal-500/30 text-teal-400 font-black rounded-2xl hover:bg-teal-600 hover:text-white transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 shadow-lg"
                >
                  ✂️ Remove Background
                </button>
                <button 
                  onClick={handleUpscaleAction}
                  disabled={editingLoading}
                  className="w-full py-5 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 font-black rounded-2xl hover:bg-indigo-600 hover:text-white transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 shadow-lg"
                >
                  💎 AI Upscale (4K)
                </button>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[8px] text-slate-500 leading-relaxed text-center italic">
                    Enhancements are applied directly to the active variant selection.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'magic' && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">AI Command</label>
                  <textarea 
                    value={currentEdit.magicPrompt}
                    onChange={(e) => updateCurrentEdit({ magicPrompt: e.target.value })}
                    className="w-full bg-[#161616] border border-white/5 rounded-xl p-4 text-xs text-white h-32 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all"
                    placeholder="Ex: Change the sky to a purple sunset with lightning..."
                  />
                </div>
                <button 
                  onClick={handleApplyMagicEdit}
                  disabled={editingLoading || !currentEdit.magicPrompt}
                  className="w-full py-5 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-all text-[10px] uppercase tracking-widest shadow-2xl active:scale-95 disabled:opacity-30"
                >
                  {editingLoading ? 'Synthesizing...' : 'Run Magic Forge'}
                </button>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-white/5 space-y-3 bg-black/20 sticky bottom-0">
            <button 
              onClick={() => handleDownload(state.variations[currentEditIndex], `Thumbnail-${currentEditIndex === 0 ? 'A' : 'B'}`)}
              className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-500 transition-all text-[10px] uppercase tracking-widest"
            >
              Export Selection
            </button>
            <button 
              onClick={resetWorkstation}
              className="w-full py-3 text-slate-600 hover:text-white text-[9px] font-black uppercase tracking-widest border border-white/5 rounded-xl hover:bg-white/5 transition-all"
            >
              Start New Project
            </button>
          </div>
        </aside>
      </div>
    );
  }

  if (state.stage === 'COMPARE') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-black/98 backdrop-blur-3xl animate-in fade-in duration-300 overflow-hidden">
        <div className="flex-1 w-full max-w-[98vw] mx-auto flex flex-col p-4 md:p-8 space-y-6 overflow-hidden">
          <header className="text-center space-y-2 shrink-0">
            <div className="space-y-1">
              <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">Final A/B Comparison</h2>
              <p className="text-[10px] md:text-xs font-black text-indigo-400 uppercase tracking-[0.4em] animate-pulse">Select the winning variation to export</p>
            </div>
          </header>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 min-h-0">
            {[0, 1].map((idx) => {
              const image = state.variations[idx];
              const edit = state.variantEdits[idx];
              return (
                <div key={idx} className="flex flex-col gap-4 group h-full overflow-hidden">
                  <div className="relative flex-1 rounded-[40px] md:rounded-[56px] overflow-hidden border-4 border-white/10 bg-[#0d0d0d] flex items-center justify-center shadow-[0_0_80px_rgba(0,0,0,0.8)] transition-transform duration-700 group-hover:scale-[1.01] group-hover:border-indigo-500/40">
                    <img src={image} className="w-full h-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]" alt={`Variant ${idx}`} />
                    {renderTextOverlay(edit)}
                    <div className="absolute top-6 left-6 bg-indigo-600 px-5 py-1.5 rounded-full text-[10px] md:text-[12px] font-black text-white uppercase tracking-widest shadow-2xl z-20">
                      Variation {idx === 0 ? 'A' : 'B'}
                    </div>
                  </div>
                  <div className="shrink-0 grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => handleDownload(image, `Variant-${idx === 0 ? 'A' : 'B'}`)}
                      className="w-full py-5 md:py-6 bg-white text-black font-black rounded-[24px] md:rounded-[32px] uppercase tracking-widest text-xs shadow-2xl hover:bg-indigo-600 hover:text-white active:scale-95 transition-all duration-300"
                    >
                      Download Winner {idx === 0 ? 'A' : 'B'}
                    </button>
                    <button 
                      onClick={() => onUpdate({ selectedVarIndex: idx, stage: 'EDITING' })}
                      className="w-full py-3 bg-white/5 text-slate-500 font-black rounded-xl uppercase tracking-widest text-[9px] hover:text-white hover:bg-white/10 transition-all"
                    >
                      Return to Editor
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-center pt-2 shrink-0">
            <button 
              onClick={() => onUpdate({ stage: 'EDITING' })}
              className="flex items-center gap-3 px-10 py-4 bg-white/5 border border-white/10 rounded-full text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
              Workspace View
            </button>
          </div>
        </div>
        
        <button 
          onClick={() => onUpdate({ stage: 'EDITING' })}
          className="absolute top-6 right-6 p-4 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full backdrop-blur-md border border-white/10 z-[110]"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    );
  }

  return null;
};

export default ToolABTesting;