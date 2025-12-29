
import React, { useState, useEffect } from 'react';
import { ToolType, AppToolsState, DEFAULT_TEXT_SETTINGS, DEFAULT_VARIANT_EDIT, UserCredits } from './types';
import Dashboard from './components/Dashboard';
import PricingPage from './components/PricingPage';
import LandingPage from './components/LandingPage';
import { fetchCredits } from './services/api';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ToolType>(ToolType.LANDING);
  
  const [toolsState, setToolsState] = useState<AppToolsState>({
    credits: {
      remaining: 0, // Start with zero, let backend update immediately
      total: 0,
      is_low_credit: false,
      subscription_required: false,
      is_paid_subscriber: false
    },
    abTesting: { 
      prompt: '', 
      style: 'none', 
      variations: [], 
      stage: 'IDLE',
      selectedVarIndex: null,
      editedImage: null,
      variantEdits: [JSON.parse(JSON.stringify(DEFAULT_VARIANT_EDIT)), JSON.parse(JSON.stringify(DEFAULT_VARIANT_EDIT))],
      shortlist: []
    },
    pod: { prompt: '', style: 'none', image: null, edit: JSON.parse(JSON.stringify(DEFAULT_VARIANT_EDIT)) },
    logo: { prompt: '', style: 'none', image: null, edit: JSON.parse(JSON.stringify(DEFAULT_VARIANT_EDIT)) },
    removeBg: { source: null, result: null },
    upscale: { image: null },
    textEdit: { source: null, result: null, text: '', settings: DEFAULT_TEXT_SETTINGS },
    magic: { source: null, result: null, instruction: '' },
    carousel: {
      prompt: '',
      style: 'none',
      slides: [],
      activeIndex: 0,
      view: 'HOME',
      aspectRatio: '1:1',
      isLoading: false,
      numSlides: 5,
      summary: '',
      musicStyle: 'Lo-Fi Chill',
      contentSource: {
        type: 'prompt',
        value: ''
      }
    }
  });

  // Authority Sync: Fetch user credits and status from Railway backend on mount
  useEffect(() => {
    const syncCredits = async () => {
      try {
        const credits = await fetchCredits();
        setToolsState(prev => ({ ...prev, credits }));
      } catch (e) {
        console.warn('Backend authority sync pending. System operating in default state.');
      }
    };
    syncCredits();
  }, []);

  /**
   * App-Wide Credit Lock Logic:
   * Switches to Pricing Plan when the balance hits 10% of the total credit.
   */
  useEffect(() => {
    const { remaining, total } = toolsState.credits;
    const isToolView = currentView !== ToolType.LANDING && currentView !== ToolType.PRICING;
    if (total > 0 && remaining <= (total * 0.1) && isToolView) {
      setCurrentView(ToolType.PRICING);
      window.location.hash = 'pricing';
    }
  }, [toolsState.credits, currentView]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'pricing') {
        setCurrentView(ToolType.PRICING);
      } else if (hash === 'studio') {
        setCurrentView(ToolType.THUMBNAILS);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const updateToolState = <K extends keyof AppToolsState>(key: K, newState: Partial<AppToolsState[K]>) => {
    setToolsState(prev => ({
      ...prev,
      [key]: { ...prev[key], ...newState }
    }));
  };

  const navigateToTool = (tool: ToolType, image?: string) => {
    if (image) {
      if (tool === ToolType.TEXT_EDIT) {
        updateToolState('textEdit', { source: image, result: null });
      } else if (tool === ToolType.MAGIC_EDIT) {
        updateToolState('magic', { source: image, result: null });
      } else if (tool === ToolType.REMOVE_BG) {
        updateToolState('removeBg', { source: image, result: null });
      } else if (tool === ToolType.UPSCALE) {
        updateToolState('upscale', { image: image });
      }
    }
    setCurrentView(tool);
    if (tool === ToolType.PRICING) window.location.hash = 'pricing';
    else if (tool !== ToolType.LANDING) window.location.hash = 'studio';
    else window.location.hash = '';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetAll = () => {
    setToolsState(prev => ({
      ...prev,
      carousel: { ...prev.carousel, view: 'HOME' },
      abTesting: { ...prev.abTesting, stage: 'IDLE' }
    }));
    window.location.hash = '';
    setCurrentView(ToolType.LANDING);
  };

  const renderView = () => {
    switch(currentView) {
      case ToolType.LANDING:
        return <LandingPage onStart={(tool) => navigateToTool(tool)} />;
      case ToolType.PRICING:
        return <PricingPage onBack={() => navigateToTool(ToolType.LANDING)} onSelectPlan={(plan) => navigateToTool(ToolType.THUMBNAILS)} />;
      default:
        return (
          <Dashboard 
            activeTool={currentView} 
            toolsState={toolsState}
            onUpdateState={updateToolState}
            onNavigate={navigateToTool} 
            onExit={resetAll}
          />
        );
    }
  };

  return (
    <div className="min-h-screen font-sans antialiased text-slate-200 bg-[#020617]">
      {renderView()}
    </div>
  );
};

export default App;
