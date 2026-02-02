import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface EmailSignupModalProps {
  onClose: () => void;
  onSuccess: (email: string, credits: number) => void;
}

// Device Fingerprinting
const generateDeviceFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
  }
  
  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvas: canvas.toDataURL(),
  };
  
  const fingerprintString = JSON.stringify(fingerprint);
  let hash = 0;
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
};

const getSupabaseClient = () => {
  const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase not configured');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
};

const EmailSignupModal: React.FC<EmailSignupModalProps> = ({ onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

 // EmailSignupModal.tsx - SIMPLE ERROR VERSION
// Replace the handleSubmit function error handling section

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!email || !email.includes('@')) {
    setError('Please enter a valid email address');
    return;
  }

  setLoading(true);
  setError('');

  const supabase = getSupabaseClient();
  if (!supabase) {
    setError('System error. Please contact support.');
    setLoading(false);
    return;
  }

  try {
    const deviceFingerprint = generateDeviceFingerprint();
    
    console.log('🎁 Claiming free credits...');
    console.log('   Email:', email);
    console.log('   Device:', deviceFingerprint);

    // Call Edge Function
    const { data, error: functionError } = await supabase.functions.invoke('claim-free-trial', {
      body: {
        userId: email,
        deviceId: deviceFingerprint,
        userAgent: navigator.userAgent
      }
    });

    // ✅ SIMPLE: Just check if we got data
    if (!data || functionError) {
      console.error('❌ Error:', functionError);
      setError('Unable to connect. Please try again.');
      setLoading(false);
      return;
    }

    // Check success
    if (data.success) {
      console.log('✅ Credits claimed!');
      
      // Save to localStorage
      localStorage.setItem('user_email', email);
      localStorage.setItem('user_credits', data.credits.toString());
      
      // Success!
      onSuccess(email, data.credits);
      
    } else {
      // ✅ SIMPLE: Show the error message directly from backend
      console.warn('⚠️ Claim denied:', data.error);
      setError(data.error || 'Unable to claim free credits');
      setLoading(false);
    }

  } catch (err: any) {
    console.error('❌ Exception:', err);
    setError('Something went wrong. Please try again.');
    setLoading(false);
  }
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:bg-gray-200 transition-all shadow-xl"
        >
          ✕
        </button>

        {/* Modal */}
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-8 shadow-2xl border border-white/10">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🎁</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Start Free Trial</h2>
            <p className="text-indigo-200">Get 100 credits free - no credit card required!</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-white text-indigo-900 rounded-xl font-black uppercase tracking-wider hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Claiming...
                </span>
              ) : (
                'Get 100 Free Credits'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-indigo-300 mt-4">
            One-time offer per device • No credit card required
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailSignupModal;