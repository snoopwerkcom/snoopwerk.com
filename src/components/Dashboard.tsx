import React, { useEffect, useState } from 'react';
import { ToolType, AppToolsState, UserCredits } from '../types';
import ToolABTesting from './ToolABTesting';
import ToolPOD from './ToolPOD';
import ToolLogoDesigner from './ToolLogoDesigner';
import ToolCarousel from './ToolCarousel';
import EmailSignupModal from './EmailSignupModal';

interface DashboardProps {
  activeTool: ToolType;
  toolsState: AppToolsState;
  onUpdateState: <K extends keyof AppToolsState>(key: K, newState: Partial<AppToolsState[K]>) => void;
  onNavigate: (tool: ToolType, image?: string) => void;
  onExit: () => void;
  userEmail?: string;
}

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

const Dashboard: React.FC<DashboardProps> = ({ activeTool, toolsState, onUpdateState, onNavigate, onExit, userEmail }) => {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [pendingTool, setPendingTool] = useState<ToolType | null>(null);
  
  const updateCredits = (credits: UserCredits) => onUpdateState('credits', credits);

  useEffect(() => {
    console.log('🔍 Dashboard mounted, checking for work to restore...');
    
    const hasUrlParams = checkIfReturningFromPurchase();
    const hasSavedWork = localStorage.getItem(WORK_STATE_KEY);
    
    console.log('Has URL params?', hasUrlParams);
    console.log('Has saved work in localStorage?', hasSavedWork ? 'YES' : 'NO');
    
    if (hasUrlParams || hasSavedWork) {
      console.log('🎉 Found work to restore!');
      
      const savedState = restoreWorkState();
      
      if (savedState) {
        console.log('📦 Restoring work for tool:', savedState.tool);
        
        setTimeout(() => {
          switch (savedState.tool) {
            case 'CAROUSEL':
              onUpdateState('carousel', savedState.data);
              onNavigate(ToolType.THUMBNAILS);
              break;
            case 'ABTESTING':
              onUpdateState('abTesting', savedState.data);
              onNavigate(ToolType.AB_TESTING);
              break;
            case 'POD':
              onUpdateState('pod', savedState.data);
              onNavigate(ToolType.POD_MERCH);
              break;
            case 'LOGO':
              onUpdateState('logo', savedState.data);
              onNavigate(ToolType.LOGO_DESIGNER);
              break;
          }
          
          localStorage.removeItem(WORK_STATE_KEY);
        }, 100);
      }
      
      if (hasUrlParams) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleToolNavigation = (tool: ToolType) => {
    console.log('🎯 Tool navigation requested:', tool);
    
    if (tool === ToolType.PRICING) {
      handleNavigateToPricing();
      return;
    }
    
    const currentCredits = toolsState.credits.remaining;
    console.log('   Current credits:', currentCredits);
    console.log('   User email:', userEmail);
    
    if (currentCredits > 0) {
      console.log('✅ User has credits - navigating');
      onNavigate(tool);
      return;
    }
    
    const claimedEmail = localStorage.getItem('user_email');
    
    if (claimedEmail || userEmail) {
      console.log('⚠️ User out of credits - redirecting to pricing');
      onNavigate(ToolType.PRICING);
      return;
    }
    
    console.log('📧 New user - showing email popup');
    setPendingTool(tool);
    setShowEmailModal(true);
  };

  const handleEmailSuccess = (email: string, credits: number) => {
    console.log('✅ Credits claimed:', email, credits);
    setShowEmailModal(false);
    
    updateCredits({
      ...toolsState.credits,
      remaining: credits,
      total: credits
    });
    
    if (pendingTool) {
      setTimeout(() => {
        onNavigate(pendingTool);
        setPendingTool(null);
      }, 500);
    }
  };

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
          stateSaved = true;
        }
        break;
    }
    
    if (stateSaved) {
      await new Promise(resolve => setTimeout(resolve, 100));
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
  const isLowCredit = credits > 0 && credits < 50;

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
                onClick={() => handleToolNavigation(item.type)}
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

          {/* Credit Display with $10 Quick Buy */}
          {credits > 0 && (
            <div className="mt-4 space-y-2">
              {isFreeUser && (
                <div className={`w-full px-5 py-4 rounded-2xl border transition-all ${
                  isLowCredit 
                    ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/50 shadow-lg shadow-orange-500/30' 
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
                    <>
                      <p className="mt-2 text-xs text-orange-300/90 leading-relaxed">
                        ⚠️ Low credits! Less than 3 images left.
                      </p>
                      <button
                        onClick={() => handleToolNavigation(ToolType.PRICING)}
                        className="mt-3 w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xs font-black rounded-xl uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-green-600/30"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span>⚡</span>
                          <span>$10 Quick Buy</span>
                        </div>
                        <div className="text-[9px] font-bold mt-0.5 opacity-90">
                          340 Credits • ~17 Images
                        </div>
                      </button>
                    </>
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
                    ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/50 shadow-lg shadow-orange-500/30' 
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
                    <>
                      <p className="mt-2 text-xs text-orange-300/90 leading-relaxed">
                        ⚠️ Low credits! Less than 3 images left.
                      </p>
                      <button
                        onClick={() => handleToolNavigation(ToolType.PRICING)}
                        className="mt-3 w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xs font-black rounded-xl uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-green-600/30"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span>⚡</span>
                          <span>$10 Quick Buy</span>
                        </div>
                        <div className="text-[9px] font-bold mt-0.5 opacity-90">
                          340 Credits • ~17 Images
                        </div>
                      </button>
                    </>
                  )}
                </div>
              )}
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

      {showEmailModal && (
        <EmailSignupModal
          onClose={() => {
            setShowEmailModal(false);
            setPendingTool(null);
          }}
          onSuccess={handleEmailSuccess}
        />
      )}
    </div>
  );
};

export default Dashboard;