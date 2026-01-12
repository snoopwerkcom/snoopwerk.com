import React, { useState, useEffect } from 'react';
import { ToolType, AppToolsState, DEFAULT_TEXT_SETTINGS, DEFAULT_VARIANT_EDIT } from './types';
import Dashboard from './components/Dashboard';
import PricingPage from './components/PricingPage';
import LandingPage from './components/LandingPage';
import { createClient } from '@supabase/supabase-js';
import { openStripePaymentLink } from './lib/stripe';

// Initialize Supabase correctly using Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ToolType>(ToolType.LANDING);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  
  const [toolsState, setToolsState] = useState<AppToolsState>({
    credits: { remaining: 0, total: 0, is_low_credit: false, subscription_required: false, is_paid_subscriber: false },
    
    // Integrated A/B Testing State
    abTesting: { 
      prompt: '', 
      style: 'none', 
      variations: [], 
      stage: 'IDLE', 
      view: 'LANDING', // Ensures A/B Testing opens with its landing page
      selectedVarIndex: null, 
      editedImage: null, 
      variantEdits: [JSON.parse(JSON.stringify(DEFAULT_VARIANT_EDIT)), JSON.parse(JSON.stringify(DEFAULT_VARIANT_EDIT))], 
      shortlist: [] 
    },
    
    // Integrated Merch Forge (POD) State
    pod: { 
      prompt: '', 
      style: 'none', 
      image: null, 
      view: 'LANDING', // Ensures Merch Forge opens with its landing page
      edit: JSON.parse(JSON.stringify(DEFAULT_VARIANT_EDIT)) 
    },
    
    // Integrated Logo Designer State
    logo: { 
      prompt: '', 
      style: 'none', 
      image: null, 
      view: 'LANDING', // Ensures Logo Designer opens with its landing page
      edit: JSON.parse(JSON.stringify(DEFAULT_VARIANT_EDIT)) 
    },
    
    removeBg: { source: null, result: null },
    upscale: { image: null },
    textEdit: { source: null, result: null, text: '', settings: DEFAULT_TEXT_SETTINGS },
    magic: { source: null, result: null, instruction: '' },
    
    // Integrated Carousel State
    carousel: { 
      prompt: '', 
      style: 'none', 
      slides: [], 
      activeIndex: 0, 
      view: 'LANDING', // Ensures Carousel opens with its landing page
      aspectRatio: '1:1', 
      isLoading: false, 
      numSlides: 5, 
      summary: '', 
      musicStyle: 'Lo-Fi Chill', 
      contentSource: { type: 'prompt', value: '' } 
    }
  });

  // Fetch Credits directly from Supabase 'profiles' table
  useEffect(() => {
    const fetchUserCredits = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email);

      const { data, error } = await supabase
        .from('profiles')
        .select('credits_remaining, credits_total')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setToolsState(prev => ({
          ...prev,
          credits: {
            ...prev.credits,
            remaining: data.credits_remaining,
            total: data.credits_total
          }
        }));
      }
    };
    fetchUserCredits();
  }, []);

  // Credit Lock Logic: Redirects to pricing if credits are critically low
  useEffect(() => {
    const { remaining, total } = toolsState.credits;
    if (total > 0 && remaining <= (total * 0.1) && currentView !== ToolType.LANDING && currentView !== ToolType.PRICING) {
      setCurrentView(ToolType.PRICING);
      window.location.hash = 'pricing';
    }
  }, [toolsState.credits, currentView]);

  const updateToolState = <K extends keyof AppToolsState>(key: K, newState: Partial<AppToolsState[K]>) => {
    setToolsState(prev => ({ ...prev, [key]: { ...prev[key], ...newState } }));
  };

  const navigateToTool = (tool: ToolType, image?: string) => {
    setCurrentView(tool);
    window.location.hash = tool === ToolType.PRICING ? 'pricing' : (tool !== ToolType.LANDING ? 'studio' : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderView = () => {
    switch(currentView) {
      case ToolType.LANDING: 
        return <LandingPage onStart={navigateToTool} />;
      
      case ToolType.PRICING: 
        return (
          <PricingPage 
            onBack={() => navigateToTool(ToolType.LANDING)} 
            onSelectPlan={(plan) => {
              if (plan.name === 'FREE') {
                navigateToTool(ToolType.LANDING);
                return;
              }
              try {
                openStripePaymentLink(plan.name);
              } catch (error) {
                console.error('Stripe error:', error);
              }
            }}
            userEmail={userEmail}
          />
        );
      
      default: 
        return (
          <Dashboard 
            activeTool={currentView} 
            toolsState={toolsState} 
            onUpdateState={updateToolState} 
            onNavigate={navigateToTool} 
            onExit={() => setCurrentView(ToolType.LANDING)} 
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