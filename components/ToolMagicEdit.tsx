
import React, { useState, useRef } from 'react';
import { editAIImage } from '../services/gemini';
import { AppToolsState } from '../types';
import ImageModal from './ImageModal';

interface ToolMagicEditProps {
  state: AppToolsState['magic'];
  onUpdate: (newState: Partial<AppToolsState['magic']>) => void;
}

const ToolMagicEdit: React.FC<ToolMagicEditProps> = ({ state, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = async (customInstruction?: string) => {
    if (!state.source) return;
    const inst = customInstruction || state.instruction;
    setLoading(true);
    try {
      const edited = await editAIImage(state.source, inst);
      onUpdate({ result: edited });
    } catch (error) {
      alert("Magic editing failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Magic AI Edit</h2>
        <p className="text-slate-400">Describe what you want to change. Your work stays here when you navigate.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="relative group">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer bg-slate-900/50 overflow-hidden"
            >
              {state.source ? (
                <img src={state.source} alt="Source" className="w-full h-full object-contain p-4" />
              ) : (
                <p className="text-slate-500">Upload Photo</p>
              )}
            </div>
            {state.source && (
              <button 
                onClick={() => setFullscreenImg(state.source!)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            )}
          </div>
          
          <input 
            type="file" ref={fileInputRef} className="hidden" accept="image/*" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => onUpdate({ source: ev.target?.result as string, result: null });
                reader.readAsDataURL(file);
              }
            }}
          />

          <div className="glass-effect p-6 rounded-2xl space-y-4">
            <textarea 
              value={state.instruction}
              onChange={(e) => onUpdate({ instruction: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white h-20 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Remove the background and put it on a beach"
            />
            <button 
              onClick={() => handleEdit()}
              disabled={loading || !state.source}
              className="w-full py-4 bg-white text-slate-900 font-bold rounded-xl transition-all shadow-lg hover:bg-slate-100 disabled:opacity-50"
            >
              {loading ? 'Processing Magic...' : 'Run Magic Edit'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative group aspect-square rounded-2xl border-2 border-slate-900 bg-slate-900/50 flex items-center justify-center overflow-hidden">
            {state.result ? (
              <>
                <img src={showOriginal ? state.source! : state.result} alt="Result" className="w-full h-full object-contain p-4" />
                <button 
                  onClick={() => setFullscreenImg(state.result!)}
                  className="absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
                {showOriginal && <div className="absolute top-8 left-8 px-2 py-1 bg-black/60 text-white text-[10px] font-bold rounded uppercase">Original</div>}
              </>
            ) : (
              <p className="text-slate-700 font-medium">Result will appear here</p>
            )}
          </div>

          {state.result && (
            <button 
              onMouseDown={() => setShowOriginal(true)}
              onMouseUp={() => setShowOriginal(false)}
              onMouseLeave={() => setShowOriginal(false)}
              className="w-full py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl transition-all hover:bg-white/10 select-none"
            >
              HOLD TO COMPARE ORIGINAL
            </button>
          )}
        </div>
      </div>

      <ImageModal 
        isOpen={!!fullscreenImg} 
        image={fullscreenImg} 
        onClose={() => setFullscreenImg(null)} 
      />
    </div>
  );
};

export default ToolMagicEdit;
