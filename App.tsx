import React, { useState, useEffect } from 'react';
// FIX 1: Ensure this path and filename (lowercase t) match your file exactly
import { ToolType, AppToolsState, DEFAULT_TEXT_SETTINGS, DEFAULT_VARIANT_EDIT } from './types'; 
import Dashboard from './components/Dashboard';
import PricingPage from './components/PricingPage';
import LandingPage from './components/LandingPage';
import { createClient } from '@supabase/supabase-js';

// FIX 2: Added a safety check to prevent the "500 Internal Error" crash
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables are missing! Check Vercel Settings.");
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ToolType>(ToolType.LANDING);
  
  // Credit Fetching Logic - Fixed to handle potential nulls
  useEffect(() => {
    const fetchUserCredits = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('credits_remaining, credits_total')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setToolsState(prev => ({
            ...prev,
            credits: {
              ...prev.credits,
              remaining: data.credits_remaining || 0,
              total: data.credits_total || 0
            }
          }));
        }
      } catch (err) {
        console.error("Error fetching credits:", err);
      }
    };
    fetchUserCredits();
  }, []);

  // ... rest of your state and logic remains the same

  // Fetch Credits directly from Supabase 'profiles' table
  useEffect(() => {
    const fetchUserCredits = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles') // Ensure you have a 'profiles' table in Supabase
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

  // Credit Lock Logic
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
    if (image) {
        // Logic for passing images between tools
    }
    setCurrentView(tool);
    window.location.hash = tool === ToolType.PRICING ? 'pricing' : (tool !== ToolType.LANDING ? 'studio' : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderView = () => {
    switch(currentView) {
      case ToolType.LANDING: return <LandingPage onStart={navigateToTool} />;
      case ToolType.PRICING: return <PricingPage onBack={() => navigateToTool(ToolType.LANDING)} onSelectPlan={() => navigateToTool(ToolType.THUMBNAILS)} />;
      default: return <Dashboard activeTool={currentView} toolsState={toolsState} onUpdateState={updateToolState} onNavigate={navigateToTool} onExit={() => setCurrentView(ToolType.LANDING)} />;
    }
  };

  return (
    <div className="min-h-screen font-sans antialiased text-slate-200 bg-[#020617]">
      {renderView()}
    </div>
  );
};

export default App;