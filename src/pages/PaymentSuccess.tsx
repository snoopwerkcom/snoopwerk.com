import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/api';
import { ToolType } from '../types';
import { getPaymentState, clearPaymentState } from '../utils/paymentStateDB';

interface PaymentSuccessProps {
  onComplete: (returnToTool?: ToolType, savedState?: any) => void;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ onComplete }) => {
  const [status, setStatus] = useState('Processing payment...');
  const [error, setError] = useState('');
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (isProcessingRef.current) {
      console.log('⚠️ Payment already being processed, skipping...');
      return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (!sessionId) {
      setStatus('Invalid payment session');
      setError('No session ID found');
      return;
    }

    const processPayment = async () => {
      isProcessingRef.current = true;
      console.log('🔒 Payment processing started (locked)');
      
      try {
        const savedState = await getPaymentState();
        console.log('🔍 Saved state from IndexedDB:', savedState);
        
        const workStateString = localStorage.getItem('snoopwerk_work_state');
        let workState = null;
        
        if (workStateString) {
          try {
            workState = JSON.parse(workStateString);
            console.log('🔍 Found work state in localStorage:', workState);
          } catch (e) {
            console.error('Failed to parse work state:', e);
          }
        }
        
        const oldCustomerId = localStorage.getItem('stripe_customer_id');
const oldEmail = localStorage.getItem('user_email');
if (oldCustomerId) {
  console.log('🧹 Clearing old customer data before verification');
  console.log('   Old customer ID:', oldCustomerId);
  console.log('   Old email:', oldEmail);
  localStorage.removeItem('stripe_customer_id');
}

// ✅ FIXED: Don't pass existingCredits - let Edge Function handle it
// The Edge Function will check the database for existing customer credits
console.log('💰 Previous email:', oldEmail);

const { data, error } = await supabase.functions.invoke('verify-stripe-session', {
  body: { 
    sessionId,
    // ✅ Removed existingCredits - Edge Function doesn't need it
  },
});

        if (error) throw error;
        
        console.log('📥 Edge function response:', data);
        
        if (data.success) {
          localStorage.setItem('stripe_customer_id', data.customerId);
          console.log('🆔 New customer ID saved:', data.customerId);
          
          if (data.credits !== undefined && data.credits !== null) {
            localStorage.setItem('user_credits', data.credits.toString());
            console.log('✅ Credits updated to:', data.credits);
          } else {
            console.warn('⚠️ No credits in response');
          }
          
          if (data.email) {
            localStorage.setItem('user_email', data.email);
            console.log('📧 New email saved:', data.email);
            
            // ✅ DEVICE TRACKING: Mark this device as paid
            const deviceId = localStorage.getItem('device_id') || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            if (!localStorage.getItem('device_id')) {
              localStorage.setItem('device_id', deviceId);
            }
            
            const paidDevices = localStorage.getItem('paid_devices');
            let deviceList: string[] = [];
            if (paidDevices) {
              deviceList = JSON.parse(paidDevices);
            }
            
            if (!deviceList.includes(deviceId)) {
              deviceList.push(deviceId);
              localStorage.setItem('paid_devices', JSON.stringify(deviceList));
              console.log('💳 Device marked as paid user:', deviceId);
            }
            
            localStorage.setItem('device_email', data.email);
            
            if (oldEmail && oldEmail !== data.email) {
              console.log('🔄 Email changed from', oldEmail, 'to', data.email);
            }
          }
          
          setStatus('✅ Payment successful! Returning to your work...');
          
          setTimeout(() => {
            window.history.replaceState({}, '', '/');
            
            if (workState && workState.tool) {
              console.log('🎯 Restoring from localStorage work state:', workState.tool);
              
              const toolMap: { [key: string]: ToolType } = {
                'CAROUSEL': ToolType.THUMBNAILS,
                'ABTESTING': ToolType.AB_TESTING,
                'POD': ToolType.POD_MERCH,
                'LOGO': ToolType.LOGO_DESIGNER
              };
              
              const targetTool = toolMap[workState.tool];
              
              if (targetTool) {
                console.log('✅ Returning to tool:', targetTool);
                onComplete(targetTool);
                clearPaymentState();
                return;
              }
            }
            
            if (savedState && 
                savedState.currentTool && 
                savedState.currentTool !== ToolType.LANDING && 
                savedState.currentTool !== ToolType.PRICING &&
                savedState.currentTool !== ToolType.PAYMENT_SUCCESS) {
              
              console.log('🎯 Returning to tool from IndexedDB:', savedState.currentTool);
              console.log('📦 State being restored:', savedState.toolsState);
              
              onComplete(savedState.currentTool);
              clearPaymentState();
              return;
            }
            
            console.log('🏠 No saved state, going to landing');
            onComplete();
            clearPaymentState();
          }, 2000);
        } else {
          throw new Error(data.error || 'Payment verification failed');
        }
      } catch (err: any) {
        console.error('❌ Payment verification error:', err);
        setStatus('❌ Payment verification failed');
        setError(err.message);
        isProcessingRef.current = false;
      }
    };

    processPayment();
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-12 max-w-md text-center space-y-6">
        <div className="text-6xl">{error ? '❌' : '✨'}</div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">
          {status}
        </h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!error && (
          <div className="w-12 h-12 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin mx-auto" />
        )}
        {error && (
          <button
            onClick={() => onComplete()}
            className="mt-6 px-8 py-3 bg-indigo-600 text-white font-black rounded-xl text-sm uppercase tracking-widest hover:bg-indigo-500"
          >
            Back to Home
          </button>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;