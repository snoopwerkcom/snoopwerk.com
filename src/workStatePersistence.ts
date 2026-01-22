// src/services/workStatePersistence.ts
// This file handles saving and restoring work state when users go to Stripe checkout

export interface WorkState {
  tool: string;
  data: any;
  timestamp: number;
}

const WORK_STATE_KEY = 'snoopwerk_work_state';

/**
 * Save current work state before navigating to Stripe checkout
 * Call this RIGHT BEFORE redirecting to Stripe
 */
export const saveWorkState = (tool: string, data: any) => {
  const state: WorkState = {
    tool,
    data,
    timestamp: Date.now()
  };
  
  try {
    localStorage.setItem(WORK_STATE_KEY, JSON.stringify(state));
    console.log('💾 Work state saved for tool:', tool);
  } catch (error) {
    console.error('❌ Failed to save work state:', error);
  }
};

/**
 * Restore work state after returning from Stripe checkout
 * Returns null if no saved state or state is too old (>30 minutes)
 * Call this when app loads if user just came back from Stripe
 */
export const restoreWorkState = (): WorkState | null => {
  try {
    const saved = localStorage.getItem(WORK_STATE_KEY);
    
    if (!saved) {
      console.log('ℹ️ No saved work state found');
      return null;
    }
    
    const state: WorkState = JSON.parse(saved);
    
    // Check if state is too old (30 minutes)
    const ageMinutes = (Date.now() - state.timestamp) / 1000 / 60;
    if (ageMinutes > 30) {
      console.log('⏰ Saved work state expired (older than 30 minutes), ignoring');
      clearWorkState();
      return null;
    }
    
    console.log('✅ Work state restored for tool:', state.tool);
    return state;
    
  } catch (error) {
    console.error('❌ Failed to restore work state:', error);
    clearWorkState();
    return null;
  }
};

/**
 * Clear saved work state
 * Call this after successfully restoring, or if restore fails
 */
export const clearWorkState = () => {
  try {
    localStorage.removeItem(WORK_STATE_KEY);
    console.log('🗑️ Work state cleared');
  } catch (error) {
    console.error('❌ Failed to clear work state:', error);
  }
};

/**
 * Check if we just returned from a purchase
 * Returns true if URL contains Stripe success parameters
 */
export const checkIfReturningFromPurchase = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const urlParams = new URLSearchParams(window.location.search);
  const hasSessionId = urlParams.has('session_id');
  const hasSuccess = urlParams.has('success');
  
  if (hasSessionId || hasSuccess) {
    console.log('🎉 Detected return from Stripe checkout!');
    return true;
  }
  
  return false;
};