
import React from 'react';
import { PRICING_PLANS, PricingPlan } from '../types';

interface PricingPageProps {
  onBack: () => void;
  onSelectPlan: (plan: PricingPlan) => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onBack, onSelectPlan }) => {
  return (
    <div className="relative overflow-hidden bg-slate-950 min-h-screen flex flex-col">
      {/* Immersive background elements */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none"></div>
      <div className="absolute top-1/4 -right-20 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -left-20 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full shrink-0">
        <div className="text-xl font-black tracking-tight flex items-center gap-2 cursor-pointer" onClick={onBack}>
          <span className="text-white pb-1">SnoopWerk<span className="text-blue-400">.com</span></span>
        </div>
        <button 
          onClick={onBack}
          className="text-slate-400 hover:text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Return Home
        </button>
      </nav>

      <section className="relative z-10 max-w-7xl mx-auto px-6 flex-1 flex flex-col justify-center py-4 w-full">
        <div className="text-center mb-12">
          <div className="inline-block px-3 py-1 mb-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md">
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">SaaS Studio Access</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight">
            Plans for <span className="gradient-text">Every Creative.</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-xl mx-auto font-medium">
            Scalable solutions for solo creators and high-output professionals.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {PRICING_PLANS.map((plan, i) => (
            <div 
              key={i} 
              className={`relative p-6 rounded-[32px] flex flex-col transition-all duration-300 hover:translate-y-[-4px] ${
                plan.popular 
                ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-[0_20px_40px_rgba(79,70,229,0.2)] scale-105 z-20 border border-white/20' 
                : 'glass-effect border border-white/5 text-slate-300 hover:border-white/10'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-indigo-600 text-[8px] font-black px-4 py-1 rounded-full uppercase tracking-[0.1em] shadow-lg">
                  Popular
                </div>
              )}

              <div className="mb-4 text-left">
                <h3 className="text-lg font-black mb-0.5">{plan.name}</h3>
                <p className={`text-[10px] font-medium leading-tight ${plan.popular ? 'text-indigo-100' : 'text-slate-500'}`}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-4 text-left">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">{plan.price}</span>
                  <span className={`text-[10px] uppercase font-bold opacity-60`}>/ mo</span>
                </div>
                <div className={`mt-2 px-3 py-1 inline-block rounded-full text-[8px] font-black uppercase tracking-widest ${
                  plan.popular ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {plan.credits}
                </div>
              </div>

              <ul className="space-y-2 mb-6 flex-1 text-left">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2 text-[11px] font-semibold leading-snug">
                    <div className={`mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                      plan.popular ? 'bg-white/20' : 'bg-indigo-500/10'
                    }`}>
                      <svg className={`w-2 h-2 ${plan.popular ? 'text-white' : 'text-indigo-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className={plan.popular ? 'text-indigo-50' : 'text-slate-400'}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => onSelectPlan(plan)}
                className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg ${
                  plan.popular 
                  ? 'bg-white text-indigo-600 hover:bg-slate-100 active:scale-95' 
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/10 active:scale-95'
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8 text-center shrink-0">
        <p className="text-slate-600 text-[8px] font-black uppercase tracking-[0.3em]">Powered by SnoopWerk AI Intelligence</p>
      </footer>
    </div>
  );
};

export default PricingPage;
