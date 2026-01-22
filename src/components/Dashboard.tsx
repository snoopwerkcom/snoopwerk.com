import React, { useEffect } from 'react';
import { ToolType, AppToolsState, UserCredits } from '../types';
import ToolABTesting from './ToolABTesting';
import ToolPOD from './ToolPOD';
import ToolLogoDesigner from './ToolLogoDesigner';
import ToolCarousel from './ToolCarousel';

interface DashboardProps {
  activeTool: ToolType;
  toolsState: AppToolsState;
  onUpdateState: <K extends keyof AppToolsState>(key: K, newState: Partial<AppToolsState[K]>) => void;
  onNavigate: (tool: ToolType, image?: string) => void;
  onExit: () => void;
  userEmail?: string;
}

// ✅ WORK STATE PERSISTENCE (Built-in, no separate file needed!)
const WORK_STATE_KEY = 'snoopwerk_work_state';

const saveWorkState = (tool: string, data: any) => {
  try {
    const state = { tool, data, timestamp: Date.now() };
    localStorage.setItem(WORK_STATE_KEY, JSON.stringify(state));
    console.log('💾 Work state saved for tool:', tool);
  } catch (error) {
    console.error('❌ Failed to save work state:', error);
  }
};

const restoreWorkState = () => {
  try {
    const saved = localStorage.getItem(WORK_STATE_KEY);
    if (!saved) return null;
    
    const state = JSON.parse(saved);
    const ageMinutes = (Date.now() - state.timestamp) / 1000 / 60;
    
    if (ageMinutes > 30) {
      console.log('⏰ Saved work state expired');
      localStorage.removeItem(WORK_STATE_KEY);
      return null;
    }
    
    console.log('✅ Work state restored for tool:', state.tool);
    return state;
  } catch (error) {
    console.error('❌ Failed to restore work state:', error);
    return null;
  }
};

const checkIfReturningFromPurchase = () => {
  if (typeof window === 'undefined') return false;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('session_id') || urlParams.has('success');
};

// ✅ MAIN DASHBOARD COMPONENT
const Dashboard: React.FC<DashboardProps> = ({ activeTool, toolsState, onUpdateState, onNavigate, onExit, userEmail }) => {
  const updateCredits = (credits: UserCredits) => onUpdateState('credits', credits);

  // ✅ RESTORE WORK AFTER PURCHASE (IMPROVED)
  useEffect(() => {
    console.log('🔍 Dashboard mounted, checking for work to restore...');
    
    // Check if returning from purchase (has URL params) OR if we have saved work
    const hasUrlParams = checkIfReturningFromPurchase();
    const hasSavedWork = localStorage.getItem(WORK_STATE_KEY);
    
    console.log('Has URL params?', hasUrlParams);
    console.log('Has saved work in localStorage?', hasSavedWork ? 'YES' : 'NO');
    
    if (hasUrlParams || hasSavedWork) {
      console.log('🎉 Found work to restore!');
      
      const savedState = restoreWorkState();
      
      if (savedState) {
        console.log('📦 Restoring work for tool:', savedState.tool);
        console.log('📦 Work data:', savedState.data);
        
        // Small delay to ensure state is ready
        setTimeout(() => {
          switch (savedState.tool) {
            case 'CAROUSEL':
              console.log('🎨 Restoring CAROUSEL state');
              onUpdateState('carousel', savedState.data);
              onNavigate(ToolType.THUMBNAILS);
              break;
            case 'ABTESTING':
              console.log('🎨 Restoring ABTESTING state');
              onUpdateState('abTesting', savedState.data);
              onNavigate(ToolType.AB_TESTING);
              break;
            case 'POD':
              console.log('🎨 Restoring POD state');
              onUpdateState('pod', savedState.data);
              onNavigate(ToolType.POD_MERCH);
              break;
            case 'LOGO':
              console.log('🎨 Restoring LOGO state');
              onUpdateState('logo', savedState.data);
              onNavigate(ToolType.LOGO_DESIGNER);
              break;
          }
          
          console.log('✅ Work restored successfully! Cleaning up...');
          localStorage.removeItem(WORK_STATE_KEY);
          console.log('🗑️ Work state cleaned from localStorage');
        }, 100);
      } else {
        console.log('⚠️ No valid saved state found');
      }
      
      // Clean up URL if it has params
      if (hasUrlParams) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else {
      console.log('ℹ️ No work to restore');
    }
  }, []);

  // ✅ SAVE WORK BEFORE GOING TO PRICING (with delay to ensure save completes)
  const handleNavigateToPricing = async () => {
    console.log('💾 Saving work before going to pricing...');
    
    let stateSaved = false;
    
    switch (activeTool) {
      case ToolType.THUMBNAILS:
        if (toolsState.carousel.view !== 'LANDING') {
          saveWorkState('CAROUSEL', {
            view: toolsState.carousel.view,
            prompt: toolsState.carousel.prompt,
            summary: toolsState.carousel.summary,
            slides: toolsState.carousel.slides,
            activeIndex: toolsState.carousel.activeIndex,
            numSlides: toolsState.carousel.numSlides,
            style: toolsState.carousel.style,
            aspectRatio: toolsState.carousel.aspectRatio,
          });
          console.log('✅ Carousel state saved');
          stateSaved = true;
        }
        break;
      case ToolType.AB_TESTING:
        if (toolsState.abTesting.view !== 'HOME') {
          saveWorkState('ABTESTING', {
            view: toolsState.abTesting.view,
            prompt: toolsState.abTesting.prompt,
            imageUrlA: toolsState.abTesting.imageUrlA,
            imageUrlB: toolsState.abTesting.imageUrlB,
          });
          console.log('✅ AB Testing state saved');
          stateSaved = true;
        }
        break;
      case ToolType.POD_MERCH:
        if (toolsState.pod.view !== 'HOME') {
          saveWorkState('POD', {
            view: toolsState.pod.view,
            prompt: toolsState.pod.prompt,
            thumbnails: toolsState.pod.thumbnails,
            selectedDesign: toolsState.pod.selectedDesign,
          });
          console.log('✅ POD state saved');
          stateSaved = true;
        }
        break;
      case ToolType.LOGO_DESIGNER:
        if (toolsState.logo.view !== 'HOME') {
          saveWorkState('LOGO', {
            view: toolsState.logo.view,
            prompt: toolsState.logo.prompt,
            thumbnails: toolsState.logo.thumbnails,
            selectedDesign: toolsState.logo.selectedDesign,
          });
          console.log('✅ Logo state saved');
          stateSaved = true;
        }
        break;
    }
    
    // ✅ Small delay to ensure localStorage write completes
    if (stateSaved) {
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('💾 State saved to localStorage, navigating to pricing...');
    }
    
    onNavigate(ToolType.PRICING);
  };

  const renderTool = () => {
    switch (activeTool) {
      case ToolType.THUMBNAILS:
        return <ToolCarousel state={toolsState.carousel} credits={toolsState.credits} onUpdate={(s) => onUpdateState('carousel', s)} onUpdateCredits={updateCredits} onAction={onNavigate} />;
      case ToolType.AB_TESTING:
        return <ToolABTesting state={toolsState.abTesting} credits={toolsState.credits} onUpdate={(s) => onUpdateState('abTesting', s)} onUpdateCredits={updateCredits} onAction={onNavigate} />;
      case ToolType.POD_MERCH: 
        return <ToolPOD state={toolsState.pod} credits={toolsState.credits} onUpdate={(s) => onUpdateState('pod', s)} onUpdateCredits={updateCredits} onAction={onNavigate} />;
      case ToolType.LOGO_DESIGNER:
        return <ToolLogoDesigner state={toolsState.logo} credits={toolsState.credits} onUpdate={(s) => onUpdateState('logo', s)} onUpdateCredits={updateCredits} onAction={onNavigate} />;
      default: 
        return <ToolCarousel state={toolsState.carousel} credits={toolsState.credits} onUpdate={(s) => onUpdateState('carousel', s)} onUpdateCredits={updateCredits} onAction={onNavigate} />;
    }
  };

  const navItems = [
    { type: ToolType.THUMBNAILS, label: 'Carousel Studio', icon: '🎞️' },
    { type: ToolType.AB_TESTING, label: 'Thumbnail Maker', icon: '📊' },
    { type: ToolType.POD_MERCH, label: 'Merch Designer', icon: '👕' },
    { type: ToolType.LOGO_DESIGNER, label: 'Logo Lab', icon: '✒️' },
    { type: ToolType.PRICING, label: 'Pricing', icon: '💳' },
  ];

  const credits = localStorage.getItem('user_credits') ? parseInt(localStorage.getItem('user_credits')!) : 0;
  const username = userEmail ? userEmail.split('@')[0] : '';
  const isFreeUser = credits > 0 && !userEmail;
  const isLowCredit = credits > 0 && credits < 5;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="w-72 bg-[#111] border-r border-white/5 flex flex-col z-50 shadow-2xl">
        <div className="p-8 flex flex-col items-center justify-center border-b border-white/5">
          <button 
            onClick={() => onNavigate(ToolType.LANDING)}
            className="group flex flex-col items-center gap-1 transition-transform hover:scale-105"
          >
            <span className="text-white text-xl font-extrabold tracking-tight pb-1">
              SnoopWerk<span className="text-blue-400">.com</span>
            </span>
          </button>
        </div>

        <div className="px-6 py-6 overflow-y-auto custom-scrollbar flex-1">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2">Creative Stack</p>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.type}
                onClick={() => {
                  if (item.type === ToolType.PRICING) {
                    handleNavigateToPricing();
                  } else {
                    onNavigate(item.type);
                  }
                }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all duration-300 relative group ${
                  activeTool === item.type 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className={`text-xl transition-transform group-hover:scale-110 ${activeTool === item.type ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className="tracking-wide text-sm">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Credit Display */}
          {credits > 0 && (
            <div className="mt-4 space-y-2">
              {isFreeUser && (
                <div className={`w-full px-5 py-4 rounded-2xl border transition-all ${
                  isLowCredit 
                    ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/50 animate-pulse shadow-lg shadow-orange-500/30' 
                    : 'bg-white/5 border-white/10'
                }`}>
                  <div className="flex items-center gap-4">
                    <span className="text-xl">{isLowCredit ? '⚠️' : '🎁'}</span>
                    <div className="flex-1">
                      <span className={`tracking-wide text-sm font-bold ${isLowCredit ? 'text-orange-400' : 'text-white'}`}>
                        Free Credit {credits}
                      </span>
                    </div>
                  </div>
                  {isLowCredit && (
                    <p className="mt-2 text-xs text-orange-300/90 leading-relaxed">
                      You're running low on credits. Please add more to continue creating and downloading your work.
                    </p>
                  )}
                </div>
              )}

              {!isFreeUser && username && (
                <div className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-xl">👤</span>
                  <div className="flex-1 min-w-0">
                    <span className="tracking-wide text-sm font-bold text-white truncate block">
                      {username}
                    </span>
                  </div>
                </div>
              )}
              
              {!isFreeUser && (
                <div className={`w-full px-5 py-4 rounded-2xl border transition-all ${
                  isLowCredit 
                    ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/50 animate-pulse shadow-lg shadow-orange-500/30' 
                    : 'bg-white/5 border-white/10'
                }`}>
                  <div className="flex items-center gap-4">
                    <span className="text-xl">{isLowCredit ? '⚠️' : '⚡'}</span>
                    <div className="flex-1">
                      <span className={`tracking-wide text-sm font-bold ${isLowCredit ? 'text-orange-400' : 'text-white'}`}>
                        {credits.toLocaleString()} Credits
                      </span>
                    </div>
                  </div>
                  {isLowCredit && (
                    <p className="mt-2 text-xs text-orange-300/90 leading-relaxed">
                      You're running low on credits. Please add more to continue creating and downloading your work.
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleNavigateToPricing}
                className={`w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-bold transition-all duration-300 shadow-lg ${
                  isLowCredit
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 shadow-orange-500/40 animate-pulse'
                    : 'bg-green-600 text-white hover:bg-green-500 hover:shadow-green-500/30'
                }`}
              >
                <span className="text-xl">💳</span>
                <span className="tracking-wide text-sm">{isLowCredit ? 'Add Credits Now' : 'Buy More'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="mt-auto p-8 border-t border-white/5">
          <button 
            onClick={onExit}
            className="w-full flex items-center gap-4 px-5 py-3 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest border border-white/5 rounded-xl hover:bg-white/5"
          >
            <span>🏠</span>
            Home Base
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#050505] relative">
        <div className="h-full">{renderTool()}</div>
      </main>
    </div>
  );
};

export default Dashboard;