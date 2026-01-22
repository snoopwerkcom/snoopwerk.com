import { useEffect, useState } from 'react';

interface CreditDisplayProps {
  onBuyCredits?: () => void;
  userEmail?: string; // NEW: Added for username display
}

export default function CreditDisplay({ onBuyCredits, userEmail }: CreditDisplayProps) {
  const [credits, setCredits] = useState<number>(0);
  const [isLow, setIsLow] = useState(false);

  useEffect(() => {
    const updateCredits = () => {
      const stored = localStorage.getItem('user_credits');
      const creditValue = stored ? parseInt(stored) : 0;
      setCredits(creditValue);
      setIsLow(creditValue > 0 && creditValue < 20); // Low credit warning at 20
    };

    updateCredits();
    
    // Update every 2 seconds
    const interval = setInterval(updateCredits, 2000);
    return () => clearInterval(interval);
  }, []);

  if (credits === 0) return null;

  // NEW: Extract username from email (part before @)
  const username = userEmail ? userEmail.split('@')[0] : '';

  return (
    <div 
      className={`fixed top-6 right-6 z-50 backdrop-blur-xl rounded-2xl px-6 py-4 flex items-center gap-4 shadow-2xl border transition-all ${
        isLow 
          ? 'bg-red-900/40 border-red-500/50 animate-pulse' 
          : 'bg-black/60 border-white/10'
      }`}
    >
      {/* NEW: Username Display */}
      {username && (
        <div className="flex items-center gap-2 pr-4 border-r border-white/10">
          <span className="text-xl">👤</span>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">User</p>
            <p className="text-sm font-bold text-white truncate max-w-[120px]">
              {username}
            </p>
          </div>
        </div>
      )}
      
      {/* UNCHANGED: Original Credits Display */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">⚡</span>
        <div>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Credits</p>
          <p className={`text-2xl font-black ${isLow ? 'text-red-400' : 'text-white'}`}>
            {credits.toLocaleString()}
          </p>
        </div>
      </div>
      
      {isLow && onBuyCredits && (
        <button
          onClick={onBuyCredits}
          className="ml-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-[9px] font-black rounded-xl uppercase tracking-widest transition-all active:scale-95"
        >
          Buy More
        </button>
      )}
    </div>
  );
}