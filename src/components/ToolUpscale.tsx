import React, { useState, useRef } from 'react';
import { upscaleImage } from '../services/gemini';
import { AppToolsState } from '../types';

interface ToolUpscaleProps {
  state: AppToolsState['upscale'];
  onUpdate: (newState: Partial<AppToolsState['upscale']>) => void;
}

const ToolUpscale: React.FC<ToolUpscaleProps> = ({ state, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpscale = async () => {
    if (!state.image) return;
    setLoading(true);
    try {
      console.log('🚀 Starting upscale...');
      console.log('📊 Image data length:', state.image.length);
      console.log('📝 Image prefix:', state.image.substring(0, 50));
      
      const upscaled = await upscaleImage(state.image);
      
      console.log('✅ Upscale successful!');
      onUpdate({ image: upscaled });
    } catch (error: any) {
      console.error('❌ Upscale error:', error);
      // ✅ SHOW THE ACTUAL ERROR MESSAGE
      alert(`Upscaling failed: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">AI Upscale & Enhance</h2>
        <p className="text-slate-400">Restore details to your existing image.</p>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="aspect-video rounded-3xl border-2 border-dashed border-white/10 bg-slate-900/50 flex items-center justify-center cursor-pointer min-h-[300px]"
        >
          {state.image ? <img src={state.image} alt="To Upscale" className="w-full h-full object-contain p-4" /> : <p className="text-slate-500">Select Image</p>}
          <input 
            type="file" ref={fileInputRef} className="hidden" accept="image/*" 
            onChange={(e) => {
               const file = e.target.files?.[0];
               if (file) {
                 const reader = new FileReader();
                 reader.onload = (ev) => onUpdate({ image: ev.target?.result as string });
                 reader.readAsDataURL(file);
               }
            }}
          />
        </div>

        {state.image && (
          <button 
            onClick={handleUpscale}
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Upscale to Professional 4K'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ToolUpscale;