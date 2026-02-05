import React from 'react';
import { PRICING_PLANS, QUICK_BUY_PLAN, PricingPlan } from '../types';

interface PricingPageProps {
  onBack: () => void;
  onSelectPlan: (plan: PricingPlan) => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onBack, onSelectPlan }) => {
  return (
    <div className="relative bg-[#f9fafb] min-h-screen flex flex-col font-sans">
      {/* Header */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full shrink-0">
        <div className="text-xl font-black tracking-tight flex items-center gap-2 cursor-pointer" onClick={onBack}>
          <span className="text-slate-900 pb-1">SnoopWerk<span className="text-indigo-600">.com</span></span>
        </div>
        <button 
          onClick={onBack}
          className="text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </button>
      </nav>

      <section className="relative z-10 max-w-7xl mx-auto px-6 flex-1 flex flex-col justify-center py-12 w-full">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Simple, Transparent <span className="text-indigo-600">Pricing.</span>
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium uppercase tracking-widest text-sm">
            High performance credit bundles for elite content production.
          </p>
        </div>

        {/* Main Pricing Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 items-stretch">
          {PRICING_PLANS.map((plan, i) => {
            const isFree = plan.name === "FREE";
            
            return (
              <div 
                key={i} 
                className={`relative bg-white p-10 rounded-[24px] flex flex-col transition-all duration-300 shadow-sm border border-slate-200 hover:shadow-xl hover:translate-y-[-4px] ${plan.popular ? 'ring-2 ring-indigo-600 border-transparent shadow-indigo-600/10' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-widest">
                    Best Value
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-tighter">{plan.name}</h3>
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-6xl font-black text-slate-900 tracking-tighter">{plan.price}</span>
                      {plan.credits && (
                        <span className="text-lg font-bold text-slate-400">{plan.credits}</span>
                      )}
                    </div>
                  </div>
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3 text-[13px] font-bold text-slate-700 uppercase tracking-tight">
                      <svg className={`w-4 h-4 mt-0.5 shrink-0 ${isFree ? 'text-slate-400' : 'text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => onSelectPlan(plan)}
                  className={`w-full py-5 rounded-xl font-black uppercase tracking-[0.2em] text-[12px] transition-all text-center ${
                    isFree 
                    ? 'border-[2px] border-slate-200 text-slate-400 bg-white hover:bg-slate-50' 
                    : plan.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-950 text-white hover:bg-slate-800'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            );
          })}
        </div>

        {/* Quick Buy Section - Attractive Horizontal Card */}
        <div className="mb-12">
          <div className="max-w-5xl mx-auto">
            <div className="relative bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 px-10 py-7 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300 shadow-lg border-2 border-green-500/30 hover:shadow-xl hover:border-green-500/50 hover:scale-[1.02]">
              
              {/* First-Time Bonus Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 md:left-8 md:translate-x-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                <span>🎁</span>
                <span>First Purchase Bonus</span>
              </div>

              {/* Left Side: Icon + Main Info */}
              <div className="flex items-center gap-6 flex-1">
                <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shrink-0 shadow-xl">
                  <span className="text-4xl">⚡</span>
                </div>
                
                <div>
                  <div className="flex items-baseline gap-3 mb-2">
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">$10</h3>
                    <span className="text-xs font-black text-green-600 uppercase tracking-wider bg-green-100 px-3 py-1 rounded-full">Quick Buy</span>
                  </div>
                  
                  {/* Credits + Images Display */}
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">340</span>
                      <span className="text-xs font-bold text-slate-500 uppercase">Credits</span>
                    </div>
                    <span className="text-slate-300">•</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-green-600">~17</span>
                      <span className="text-xs font-bold text-slate-500 uppercase">Images</span>
                    </div>
                  </div>
                  
                  {/* Feature Breakdown */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🎨</span>
                      <span>12 Generate</span>
                    </div>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">✂️</span>
                      <span>34 Remove BG</span>
                    </div>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">💎</span>
                      <span>34 Upscale</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Bonus Details + Button */}
              <div className="flex flex-col items-end gap-3">
                <div className="text-right mb-1">
                  <div className="text-[11px] font-black text-green-700 uppercase tracking-wider mb-0.5">
                    240 Credits + 100 Bonus
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    No Subscription • Instant Top-Up
                  </div>
                </div>
                
                <button 
                  onClick={() => onSelectPlan(QUICK_BUY_PLAN)}
                  className="px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black rounded-xl text-sm uppercase tracking-widest transition-all hover:from-green-700 hover:to-emerald-700 active:scale-95 shadow-lg shadow-green-600/40 hover:shadow-xl hover:shadow-green-600/50"
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Note Section */}
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
               <span className="text-2xl">📝</span>
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Usage Note</h4>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                Credits are charged per image action: Image generation (20 credits), Remove background (10 credits), Upscale (10 credits), Magic edit (20 credits).
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 py-12 text-center shrink-0 border-t border-slate-200">
        <div className="flex flex-col items-center gap-2">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">© 2025 SNOOPWERK STUDIO AI</p>
          <div className="flex gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <a href="#" className="hover:text-slate-900">Privacy</a>
            <a href="#" className="hover:text-slate-900">Terms</a>
            <a href="#" className="hover:text-slate-900">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;