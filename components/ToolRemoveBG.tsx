
import React, { useState, useRef } from 'react';
import { removeBackground } from '../services/api';
import { AppToolsState, ToolType, UserCredits } from '../types';
import ImageModal from './ImageModal';

interface ToolRemoveBGProps {
  state: AppToolsState['removeBg'];
  credits: UserCredits;
  onUpdate: (newState: Partial<AppToolsState['removeBg']>) => void;
  onUpdateCredits: (credits: UserCredits) => void;
  onAction: (tool: ToolType, image?: string) => void;
}

const ToolRemoveBG: React.FC<ToolRemoveBGProps> = ({ state, credits, onUpdate, onUpdateCredits, onAction }) => {
  const [loading, setLoading] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkCredits = () => {
    if (credits.remaining <= 0) {
      onAction(ToolType.PRICING);
      return false;
    }
    return true;
  };

  const handleRemoveBg = async () => {
    if (!state.source || !checkCredits()) return;
    setLoading(true);
    try {
      const { imageUrl, credits: newCredits } = await removeBackground(state.source);
      onUpdateCredits(newCredits);
      onUpdate({ result: imageUrl });
    } catch (error: any) {
      alert(`Removal failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!state.result) return;
    const link = document.createElement('a');
    link.download = 'snoopwerk-alpha-transparent.png';
    link.href = state.result;
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onUpdate({ source: ev.target?.result as string, result: null });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full flex bg-[#050505] overflow-hidden relative">
      <div className="flex-1 flex flex-col p-8 overflow-hidden relative z-10">
        <header className="flex items-center justify-between mb-8 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">BG Remover <span className="text-indigo-500">Surgical</span></h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">True Alpha-Channel PNG Engine</p>
          </div>
          <div className="flex items-center gap-4">
             {state.result && (
               <button 
                onClick={handleDownload}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
               >
                 Export Alpha PNG
               </button>
             )}
          </div>
        </header>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 min-h-0">
          <div className="flex flex-col gap-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 relative rounded-[40px] border-2 border-dashed transition-all overflow-hidden flex items-center justify-center cursor-pointer ${
                state.source ? 'border-transparent bg-black/40' : 'border-white/5 hover:border-indigo-500/30 bg-black/20'
              }`}
            >
              {state.source ? (
                <img src={state.source} className="max-h-full max-w-full object-contain p-8 animate-in fade-in duration-500" />
              ) : (
                <div className="text-center group">
                  <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-indigo-600/20 transition-all">
                    <svg className="w-10 h-10 text-slate-500 group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Drop Source Image</p>
                </div>
              )}
            </div>
            <button 
              onClick={handleRemoveBg}
              disabled={loading || !state.source}
              className="w-full py-5 bg-white text-black font-black rounded-[24px] hover:bg-slate-200 transition-all uppercase tracking-[0.2em] text-[10px] shadow-2xl active:scale-95 disabled:opacity-30"
            >
              {loading ? 'Synthesizing Alpha Channel...' : 'Activate Surgical Removal'}
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex-1 relative rounded-[40px] border border-white/5 bg-[#0a0a0a] overflow-hidden flex items-center justify-center">
              {/* Checkerboard background is critical to prove transparency */}
              <div 
                className="absolute inset-0 z-0" 
                style={{ 
                  backgroundImage: `linear-gradient(45deg, #111 25%, transparent 25%), 
                                  linear-gradient(-45deg, #111 25%, transparent 25%), 
                                  linear-gradient(45deg, transparent 75%, #111 75%), 
                                  linear-gradient(-45deg, transparent 75%, #111 75%)`,
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0',
                  backgroundColor: '#050505'
                }} 
              />
              
              {loading && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                  <p className="text-white text-[10px] font-black uppercase tracking-widest animate-pulse">Forging Transparency Matrix...</p>
                </div>
              )}

              {state.result ? (
                <div className="relative z-10 w-full h-full flex items-center justify-center group">
                  <img src={state.result} className="max-h-full max-w-full object-contain p-8 animate-in zoom-in duration-500" alt="Alpha Result" />
                  <button 
                    onClick={() => setFullscreenImg(state.result!)}
                    className="absolute top-8 right-8 p-4 bg-black/60 hover:bg-black/80 text-white rounded-2xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 3h6m0 0v6m0-6L14 10M9 21H3m0 0v-6m0 6l7-7" /></svg>
                  </button>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/80 border border-indigo-500/30 rounded-full text-[8px] font-black text-indigo-400 uppercase tracking-widest backdrop-blur-md">
                    True Alpha Channel Active
                  </div>
                </div>
              ) : (
                <div className="text-center opacity-10">
                   <p className="text-white font-black uppercase tracking-[0.5em] text-sm">Transparency Preview</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => onUpdate({ source: null, result: null })}
              className="w-full py-5 border border-white/5 text-slate-500 font-black rounded-[24px] hover:text-white hover:bg-white/5 transition-all uppercase tracking-[0.2em] text-[10px] active:scale-95"
            >
              Reset Session
            </button>
          </div>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileUpload} 
      />

      <ImageModal 
        isOpen={!!fullscreenImg} 
        image={fullscreenImg} 
        onClose={() => setFullscreenImg(null)} 
      />
    </div>
  );
};

export default ToolRemoveBG;
