
import React, { useState, useRef, useEffect } from 'react';
import { editAIImage } from '../services/gemini';
import { AppToolsState, DEFAULT_TEXT_SETTINGS, TextSettings } from '../types';
import ImageModal from './ImageModal';

interface ToolTextEditProps {
  state: AppToolsState['textEdit'];
  onUpdate: (newState: Partial<AppToolsState['textEdit']>) => void;
}

const ToolTextEdit: React.FC<ToolTextEditProps> = ({ state, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const updateSetting = <K extends keyof TextSettings>(key: K, value: TextSettings[K]) => {
    onUpdate({ settings: { ...state.settings, [key]: value } });
  };

  const fonts = [
    { label: 'Modern Sans', value: 'sans-serif' },
    { label: 'Elegant Serif', value: 'serif' },
    { label: 'Tech Mono', value: 'monospace' },
    { label: 'Creative Script', value: 'cursive' },
    { label: 'Impact Display', value: 'Impact, sans-serif' },
  ];

  useEffect(() => {
    if (!state.source) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = state.source;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      if (state.text) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(state.settings.flipH ? -1 : 1, state.settings.flipV ? -1 : 1);
        ctx.rotate((state.settings.rotation * Math.PI) / 180);
        
        ctx.fillStyle = state.settings.color;
        ctx.font = `bold ${state.settings.size * (canvas.width / 500)}px ${state.settings.font}`;
        ctx.textAlign = 'center';
        ctx.direction = state.settings.direction;
        ctx.fillText(state.text, 0, 0);
        ctx.restore();
      }
    };
  }, [state.source, state.text, state.settings]);

  const handleApplyAI = async () => {
    if (!state.source || !state.text) return;
    setLoading(true);
    try {
      const prompt = `Add text "${state.text}" to this image. Color: ${state.settings.color}, Font: ${state.settings.font}, Direction: ${state.settings.direction}. High quality integration.`;
      const edited = await editAIImage(state.source, prompt);
      onUpdate({ result: edited });
    } catch (error) {
      alert("AI text integration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'snoopwerk-edited.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Advanced Text Studio</h2>
        <p className="text-slate-400">Add and style text with surgical precision. Progress is saved across tools.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-effect p-6 rounded-2xl border border-white/10 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Text Content</label>
              <textarea 
                value={state.text}
                onChange={(e) => onUpdate({ text: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                placeholder="Enter text here..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Color</label>
                <input 
                  type="color"
                  value={state.settings.color}
                  onChange={(e) => updateSetting('color', e.target.value)}
                  className="w-full h-10 bg-transparent cursor-pointer rounded overflow-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Size</label>
                <input 
                  type="range" min="10" max="200"
                  value={state.settings.size}
                  onChange={(e) => updateSetting('size', parseInt(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Font Family</label>
              <select 
                value={state.settings.font}
                onChange={(e) => updateSetting('font', e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white"
              >
                {fonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => updateSetting('flipH', !state.settings.flipH)}
                className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-colors ${state.settings.flipH ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
              >
                Flip H
              </button>
              <button 
                onClick={() => updateSetting('flipV', !state.settings.flipV)}
                className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-colors ${state.settings.flipV ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
              >
                Flip V
              </button>
              <button 
                onClick={() => updateSetting('direction', state.settings.direction === 'ltr' ? 'rtl' : 'ltr')}
                className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-colors ${state.settings.direction === 'rtl' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
              >
                {state.settings.direction === 'ltr' ? 'L→R' : 'R→L'}
              </button>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-3">
              <button 
                onClick={handleApplyAI}
                disabled={loading || !state.source || !state.text}
                className="w-full py-4 bg-white text-slate-900 font-extrabold rounded-xl transition-all shadow-lg hover:bg-slate-100 disabled:opacity-50"
              >
                {loading ? 'AI Processing...' : 'AI Merge Text'}
              </button>
              <button 
                onClick={handleDownload}
                disabled={!state.source}
                className="w-full py-4 glass-effect text-white font-bold rounded-xl border border-white/10 hover:bg-white/5 transition-all"
              >
                Download Edit
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="relative group">
            <div 
              onClick={() => !state.source && fileInputRef.current?.click()}
              className={`relative aspect-square rounded-3xl border-2 border-dashed transition-all overflow-hidden flex items-center justify-center bg-slate-900/50 ${
                state.source ? 'border-transparent' : 'border-white/10 hover:border-white/20 cursor-pointer'
              }`}
            >
              {state.source ? (
                <canvas ref={canvasRef} className="w-full h-full object-contain p-2" />
              ) : (
                <div className="text-center p-12">
                   <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                     <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <p className="text-xl font-bold text-white mb-2">Upload or Import Image</p>
                </div>
              )}
              
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
          </div>

          {state.result && (
             <div className="animate-in fade-in zoom-in duration-500 space-y-4">
               <div className="flex items-center justify-between">
                 <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest">AI Result Preview</label>
                 <button 
                  onMouseDown={() => setShowOriginal(true)}
                  onMouseUp={() => setShowOriginal(false)}
                  onMouseLeave={() => setShowOriginal(false)}
                  className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-full border border-white/10 transition-all select-none"
                 >
                   HOLD TO COMPARE
                 </button>
               </div>
               <div className="relative rounded-3xl border border-indigo-500/30 overflow-hidden bg-slate-900 group">
                 <img src={showOriginal ? state.source! : state.result} alt="AI Result" className="w-full h-auto transition-opacity" />
                 <button 
                    onClick={() => setFullscreenImg(state.result!)}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                  {showOriginal && <div className="absolute top-4 left-4 px-2 py-1 bg-black/60 text-white text-[10px] font-bold rounded uppercase">Original</div>}
               </div>
             </div>
          )}
        </div>
      </div>
      <ImageModal 
        isOpen={!!fullscreenImg} 
        image={fullscreenImg} 
        onClose={() => setFullscreenImg(null)} 
      />
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => onUpdate({ source: ev.target?.result as string, result: null });
          reader.readAsDataURL(file);
        }
      }} />
    </div>
  );
};

export default ToolTextEdit;
