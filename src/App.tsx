import React, { useState, useEffect } from 'react';
import { savePaymentState } from './utils/paymentStateDB';
import { ToolType, AppToolsState, DEFAULT_TEXT_SETTINGS, DEFAULT_VARIANT_EDIT } from './types';
import Dashboard from './components/Dashboard';
import PricingPage from './components/PricingPage';
import LandingPage from './components/LandingPage';
import { createClient } from '@supabase/supabase-js';
import { openStripePaymentLink } from './lib/stripe';
import PaymentSuccess from './pages/PaymentSuccess';
import { injectCreditCheckerStyles } from './utils/creditChecker';

// Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const App: React.FC = () => {
  useEffect(() => {
    injectCreditCheckerStyles();
  }, []);

  const [currentView, setCurrentView] = useState<ToolType>(ToolType.LANDING);
  const [lastActiveTool, setLastActiveTool] = useState<ToolType | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  
  const initialCredits = localStorage.getItem('user_credits');
  const startingCredits = initialCredits ? parseInt(initialCredits) : 0;
  
  const [toolsState, setToolsState] = useState<AppToolsState>({
    credits: { remaining: startingCredits, total: startingCredits, is_low_credit: false, subscription_required: false, is_paid_subscriber: false },
    abTesting: { 
      prompt: '', 
      style: 'none', 
      variations: [], 
      stage: 'IDLE', 
      view: 'LANDING',
      selectedVarIndex: null, 
      editedImage: null, 
      variantEdits: [JSON.parse(JSON.stringify(DEFAULT_VARIANT_EDIT)), JSON.parse(JSON.stringify(DEFAULT_VARIANT_EDIT))], 
      shortlist: [] 
    },
    pod: { 
      prompt: '', 
      style: 'none', 
      image: null, 
      view: 'LANDING',
      edit: JSON.parse(JSON.stringify(DEFAULT_VARIANT_EDIT)) 
    },
    logo: { 
      prompt: '', 
      style: 'none', 
      image: null, 
      view: 'LANDING',
      edit: JSON.parse(JSON.stringify(DEFAULT_VARIANT_EDIT)) 
    },
    removeBg: { source: null, result: null },
    upscale: { image: null },
    textEdit: { source: null, result: null, text: '', settings: DEFAULT_TEXT_SETTINGS },
    magic: { source: null, result: null, instruction: '' },
    carousel: { 
      prompt: '', 
      style: 'none', 
      slides: [], 
      activeIndex: 0, 
      view: 'LANDING',
      aspectRatio: '1:1', 
      isLoading: false, 
      numSlides: 5, 
      summary: '', 
      musicStyle: 'Lo-Fi Chill', 
      contentSource: { type: 'prompt', value: '' },
      transitionStyle: 'fade',
    },
    intelligence: {
      source: null,
      type: 'IMAGE',
      result: null,
      isLoading: false,
      prompt: '',
    },
  });

  useEffect(() => {
    const savedCredits = localStorage.getItem('user_credits');
    
    if (savedCredits) {
      // Existing user - load their credits
      const credits = parseInt(savedCredits);
      console.log('🔄 Loading credits from localStorage on mount:', credits);
      setToolsState(prev => ({
        ...prev,
        credits: {
          ...prev.credits,
          remaining: credits,
          total: credits
        }
      }));
    } else {
      // ✅ NEW USER - Give 10 free credits automatically!
      console.log('🎁 New user detected! Giving 10 free credits');
      localStorage.setItem('user_credits', '10');
      setToolsState(prev => ({
        ...prev,
        credits: {
          ...prev.credits,
          remaining: 10,
          total: 10
        }
      }));
    }
  }, []);

  useEffect(() => {
    const loadUserEmail = () => {
      const email = localStorage.getItem('user_email');
      setUserEmail(email || undefined);
    };
    
    loadUserEmail();
    const interval = setInterval(loadUserEmail, 1000);
    return () => clearInterval(interval);
  }, []);

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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    if (sessionId) {
      setCurrentView(ToolType.PAYMENT_SUCCESS);
    }
  }, []);

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
    if (tool !== ToolType.LANDING && 
        tool !== ToolType.PRICING && 
        tool !== ToolType.PAYMENT_SUCCESS) {
      setLastActiveTool(tool);
    }
    setCurrentView(tool);
    window.location.hash = tool === ToolType.PRICING ? 'pricing' : (tool !== ToolType.LANDING ? 'studio' : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderView = () => {
    if (currentView === ToolType.LANDING) {
      return <LandingPage onStart={navigateToTool} />;
    }
    
    if (currentView === ToolType.PRICING) {
      return (
        <PricingPage 
          onBack={() => navigateToTool(ToolType.LANDING)} 
          onSelectPlan={(plan) => {
            // ✅ IMPORTANT: Clear old customer data before new purchase
            // This prevents Email B from using Email A's customer ID
            const storedCustomerId = localStorage.getItem('stripe_customer_id');
            const storedEmail = localStorage.getItem('user_email');
            
            if (storedCustomerId && storedEmail) {
              console.log('🧹 Clearing old customer data before new purchase');
              console.log('Previous email:', storedEmail);
              localStorage.removeItem('stripe_customer_id');
              // Keep credits for now - will be updated after purchase
            }
            
            if (plan.name === 'FREE') {
              localStorage.setItem('user_credits', '10');
              localStorage.removeItem('user_email');
              console.log('✅ Free tier activated: 10 credits');
              setToolsState(prev => ({
                ...prev,
                credits: {
                  ...prev.credits,
                  remaining: 10,
                  total: 10
                }
              }));
              navigateToTool(ToolType.THUMBNAILS);
              return;
            }
            
            const existingCredits = localStorage.getItem('user_credits');
            const currentBalance = existingCredits ? parseInt(existingCredits) : 0;

            const stateToSave = {
              currentTool: lastActiveTool || ToolType.LANDING,
              toolsState: toolsState,
              existingCredits: currentBalance,
              timestamp: Date.now()
            };

            console.log('💾 Saving state before payment:', stateToSave);
            
            savePaymentState(stateToSave)
              .then(() => {
                console.log('✅ State saved to IndexedDB');
                openStripePaymentLink(plan.name);
              })
              .catch((error) => {
                console.error('❌ Failed to save state:', error);
                try {
                  openStripePaymentLink(plan.name);
                } catch (stripeError) {
                  console.error('Stripe error:', stripeError);
                }
              });
          }}
          userEmail={userEmail}
        />
      );
    }
    
    if (currentView === ToolType.PAYMENT_SUCCESS) {
      return (
        <PaymentSuccess 
          onComplete={(returnToTool, savedState) => {
            // ✅ If we have a tool to return to, navigate there (Dashboard will restore state)
            if (returnToTool) {
              console.log('🎯 Returning to tool:', returnToTool);
              
              const updatedCredits = localStorage.getItem('user_credits');
              const newCreditBalance = updatedCredits ? parseInt(updatedCredits) : 0;
              console.log('💰 Credits after payment:', newCreditBalance);
              
              setToolsState(prev => ({
                ...prev,
                credits: {
                  ...prev.credits,
                  remaining: newCreditBalance,
                  total: newCreditBalance
                }
              }));
              
              setCurrentView(returnToTool);
              return;
            }
            
            // ✅ Fallback: Check for savedState (IndexedDB method)
            if (savedState) {
              console.log('🔄 Restoring from IndexedDB savedState');
              
              const updatedCredits = localStorage.getItem('user_credits');
              const newCreditBalance = updatedCredits ? parseInt(updatedCredits) : 0;
              
              setToolsState({
                ...savedState,
                credits: {
                  ...savedState.credits,
                  remaining: newCreditBalance,
                  total: newCreditBalance
                }
              });
              
              setCurrentView(savedState.currentTool || ToolType.LANDING);
              return;
            }
            
            // ✅ No restoration info - go to landing
            console.log('🏠 No restoration info, going to landing');
            navigateToTool(ToolType.LANDING);
          }} 
        />
      );
    }
    
    return (
      <Dashboard 
        activeTool={currentView} 
        toolsState={toolsState} 
        onUpdateState={updateToolState} 
        onNavigate={navigateToTool} 
        onExit={() => setCurrentView(ToolType.LANDING)} 
        userEmail={userEmail}
      />
    );
  };

  return (
    <div className="min-h-screen font-sans antialiased text-slate-200 bg-[#020617]">
      {renderView()}
    </div>
  );
};

export default App;