import React, { useState } from 'react';
import { ToolType, PRICING_PLANS } from '../types';

interface LandingPageProps {
  onStart: (tool: ToolType) => void;
}

// ✅ DEVICE TRACKING HELPERS (ADD THESE AT THE TOP)
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('device_id');
  
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device_id', deviceId);
    console.log('🆔 New device ID created:', deviceId);
  }
  
  return deviceId;
};

const hasEverBeenPaidUser = (): boolean => {
  const deviceId = getDeviceId();
  const paidDevices = localStorage.getItem('paid_devices');
  
  if (paidDevices) {
    const deviceList = JSON.parse(paidDevices);
    return deviceList.includes(deviceId);
  }
  
  return false;
};

const markDeviceAsPaid = (email: string): void => {
  const deviceId = getDeviceId();
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
  
  localStorage.setItem('device_email', email);
};

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // ✅ UPDATED: Smart handler with device tracking
  const handleStartCreatingFree = () => {
    const existingEmail = localStorage.getItem('user_email');
    const deviceEmail = localStorage.getItem('device_email');
    const existingCredits = localStorage.getItem('user_credits');
    const isPaidDevice = hasEverBeenPaidUser();
    
    // CASE 1: Existing paid user with email
    if (existingEmail) {
      console.log('✅ Existing subscriber detected');
      console.log('   Email:', existingEmail);
      console.log('   Credits:', existingCredits);
      
      markDeviceAsPaid(existingEmail);
      onStart(ToolType.AB_TESTING);
      return;
    }
    
    // CASE 2: Device was previously paid, restore email
    if (isPaidDevice && deviceEmail) {
      console.log('🔒 This device was previously a paid user');
      console.log('   Restoring email:', deviceEmail);
      
      localStorage.setItem('user_email', deviceEmail);
      
      alert(`This device is registered to ${deviceEmail}. Please use your paid account or contact support to switch accounts.`);
      onStart(ToolType.PRICING);
      return;
    }
    
    // CASE 3: Device previously paid but email removed
    if (isPaidDevice && !deviceEmail) {
      console.log('🔒 This device has been used by a paid user');
      alert('This device has been used with a paid account. Please purchase credits to continue.');
      onStart(ToolType.PRICING);
      return;
    }
    
    // CASE 4: Brand new user - give 10 free credits
    console.log('✨ New user - giving 10 free credits');
    localStorage.setItem('user_credits', '10');
    console.log('🔍 Verification - localStorage now has:', localStorage.getItem('user_credits'));
    localStorage.removeItem('user_email');
    
    onStart(ToolType.AB_TESTING);
  };

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-200 selection:bg-indigo-500/30 overflow-x-hidden font-inter">
      {/* Immersive Background Canvas */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[50%] bg-indigo-600/15 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[5%] right-[-10%] w-[45%] h-[45%] bg-teal-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[30%] left-[40%] w-[35%] h-[35%] bg-purple-600/10 rounded-full blur-[140px] opacity-60" />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        {/* Animated Orbs */}
        <div className="absolute top-[20%] right-[20%] w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
        <div className="absolute bottom-[30%] left-[15%] w-1.5 h-1.5 bg-teal-400 rounded-full animate-ping [animation-delay:1s]" />
      </div>

      {/* Modern Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-slate-950/70 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onStart(ToolType.LANDING)}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-110 transition-transform">
              <span className="text-white font-black text-xl">S</span>
            </div>
            <span className="text-xl font-black text-white tracking-tighter uppercase">
              SnoopWerk<span className="text-indigo-400">.com</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-10">
            {['Engines', 'Workflow', 'Pricing', 'FAQ'].map((item) => (
<button 
  key={item} 
  onClick={() => item === 'Pricing' ? onStart(ToolType.PRICING) : scrollToSection(item.toLowerCase())} 
  className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-all hover:translate-y-[-1px]"
>
  {item}
</button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleStartCreatingFree} className="px-6 py-2.5 bg-white text-black text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all shadow-xl active:scale-95">
              Launch Studio
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 pt-48 pb-32 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md mb-10 animate-in fade-in slide-in-from-top-4 duration-1000">
          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">The Future of Content Conversion</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter leading-[0.85] uppercase mb-12 drop-shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
          Stop Guessing. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-teal-400 to-purple-400">Start Dominating.</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 font-medium mb-12 leading-relaxed animate-in fade-in duration-1000 delay-300">
          SnoopWerk is the world's first AI Creative Engine designed for performance. 
          Forge viral thumbnails, high-converting carousels, and print-ready designs that are mathematically optimized for engagement.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in duration-1000 delay-500">
          <button onClick={handleStartCreatingFree} className="w-full sm:w-auto px-16 py-8 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/30 uppercase tracking-[0.2em] text-xs active:scale-95">
            Start Creating Free
          </button>
          <button onClick={() => scrollToSection('engines')} className="w-full sm:w-auto px-16 py-8 glass-effect text-white font-black rounded-3xl border border-white/10 hover:bg-white/5 transition-all uppercase tracking-[0.2em] text-xs active:scale-95">
            Explore Features
          </button>
        </div>
      </header>

      {/* Brand Trust */}
      <section className="relative z-10 py-16 border-y border-white/5 bg-slate-950/30">
        <div className="max-w-7xl mx-auto px-6 overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 text-center mb-10">Trusted by modern creators & agencies worldwide</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
             <div className="text-2xl font-black italic tracking-tighter">VISIONARY</div>
             <div className="text-2xl font-black italic tracking-tighter">GROWTH_HACK</div>
             <div className="text-2xl font-black italic tracking-tighter">STUDIO.X</div>
             <div className="text-2xl font-black italic tracking-tighter">PIXEL_LAB</div>
             <div className="text-2xl font-black italic tracking-tighter">CREATOR.OS</div>
          </div>
        </div>
      </section>

      {/* Engines Section */}
      <section id="engines" className="relative z-10 max-w-7xl mx-auto px-6 py-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-24">
          <div className="max-w-xl">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-6">AI Infrastructure</h2>
            <h3 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight uppercase">
              The Engine Room of <span className="gradient-text">Virality.</span>
            </h3>
          </div>
          <p className="max-w-sm text-slate-500 font-medium text-sm leading-relaxed">
            Every tool in SnoopWerk is specialized to tackle a specific conversion point. From first-glance thumbnails to multi-slide storytelling.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { 
              title: 'A/B Thumbnail Maker', 
              desc: 'Generate multiple variations with real-time A/B visual comparison to find the highest-CTR hook.', 
              icon: '📊', 
              type: ToolType.AB_TESTING, 
              color: 'from-indigo-600/20 to-indigo-600/5' 
            },
            { 
              title: 'Carousel Architect', 
              desc: 'Convert podcasts, videos, or scripts into stunning 10-slide Instagram carousels in seconds.', 
              icon: '🎞️', 
              type: ToolType.THUMBNAILS, 
              color: 'from-teal-600/20 to-teal-600/5' 
            },
            { 
              title: 'Merch Designer', 
              desc: 'Surgical subject isolation for professional POD-ready designs with perfect alpha transparency.', 
              icon: '👕', 
              type: ToolType.POD_MERCH, 
              color: 'from-purple-600/20 to-purple-600/5' 
            },
            { 
              title: 'Identity Lab', 
              desc: 'Minimalist, high-end branding and vector-like logos for modern startups and personal brands.', 
              icon: '✒️', 
              type: ToolType.LOGO_DESIGNER, 
              color: 'from-pink-600/20 to-pink-600/5' 
            }
          ].map((feature, i) => (
            <div key={i} onClick={() => onStart(feature.type)} className="group relative h-[450px] bg-slate-900/40 rounded-[48px] border border-white/5 p-10 flex flex-col justify-between hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden backdrop-blur-xl">
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
              <div className="relative z-10 w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:bg-indigo-600 transition-all duration-500">
                {feature.icon}
              </div>
              <div className="relative z-10">
                <h4 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter leading-none">{feature.title}</h4>
                <p className="text-slate-500 text-sm font-medium leading-relaxed mb-10">{feature.desc}</p>
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow Path */}
      <section id="workflow" className="relative z-10 bg-slate-950/50 py-32 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-teal-400 mb-6">Production Workflow</h2>
            <h3 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter">Input to <span className="gradient-text">Asset.</span></h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {[
              { step: '01', title: 'Feed the Model', desc: 'Input your raw hook, script, or a website link. Our AI analyzes the visual potential of your concept.' },
              { step: '02', title: 'Forge Variations', desc: 'The engine generates high-fidelity variations based on viral design principles and your selected style.' },
              { step: '03', title: 'Optimize & Export', desc: 'Use Surgical Background Removal or AI Upscaling to refine your winners for 4K platform delivery.' }
            ].map((item, i) => (
              <div key={i} className="relative">
                {i < 2 && <div className="hidden md:block absolute top-12 left-[100%] w-full h-[2px] bg-gradient-to-r from-indigo-500/50 to-transparent z-0" />}
                <div className="relative z-10 p-10 bg-slate-900/60 rounded-[48px] border border-white/5 group hover:border-teal-500/50 transition-all">
                  <span className="text-7xl font-black text-white/5 group-hover:text-teal-500/20 transition-colors block mb-8">{item.step}</span>
                  <h4 className="text-2xl font-black text-white uppercase mb-4 tracking-tighter">{item.title}</h4>
                  <p className="text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section (Integrated) */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-24">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400 mb-6">Investment</h2>
          <h3 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter">Scale Your <span className="gradient-text">Output.</span></h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRICING_PLANS.map((plan, i) => (
            <div 
              key={i} 
              className={`relative p-8 rounded-[40px] flex flex-col transition-all duration-500 hover:translate-y-[-8px] ${
                plan.popular 
                ? 'bg-gradient-to-br from-indigo-600/20 to-purple-700/20 border border-indigo-500 shadow-2xl shadow-indigo-500/10' 
                : 'bg-slate-900/40 border border-white/5'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[9px] font-black px-6 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-2">{plan.name}</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">/mo</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {plan.features.slice(0, 4).map((f, j) => (
                  <li key={j} className="flex items-start gap-3 text-xs font-semibold text-slate-400">
                    <span className="text-indigo-500 mt-1">✦</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => onStart(ToolType.PRICING)}
                className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                  plan.popular ? 'bg-white text-indigo-900 shadow-xl' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 max-w-3xl mx-auto px-6 py-32 border-t border-white/5">
        <div className="text-center mb-24">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6">Clarifications</h2>
          <h3 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter">Expert <span className="gradient-text">Support.</span></h3>
        </div>
        <div className="space-y-4">
          {[
            { q: "How are credits calculated?", a: "Standard image generations cost 1 credit. High-res upscales and surgical background removals cost 2 credits due to heavy compute requirements." },
            { q: "Can I use SnoopWerk for client projects?", a: "Absolutely. All paid plans include a full commercial license for every asset generated on the platform." },
            { q: "Does the Carousel Studio support multi-languages?", a: "Yes, our language models handle over 50 languages, optimized for local viral nuances." },
            { q: "What makes SnoopWerk better than other AI tools?", a: "SnoopWerk is built on a custom stack specifically tuned for design aesthetics and high conversion metrics, not just generic art." }
          ].map((item, i) => (
            <div key={i} className="bg-slate-900/40 rounded-[32px] border border-white/5 overflow-hidden">
              <button onClick={() => setActiveFaq(activeFaq === i ? null : i)} className="w-full p-8 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
                <span className="text-white font-black uppercase tracking-tight text-sm pr-8">{item.q}</span>
                <span className={`text-2xl transition-transform duration-300 ${activeFaq === i ? 'rotate-45 text-indigo-400' : 'text-slate-600'}`}>+</span>
              </button>
              <div className={`transition-all duration-500 ease-in-out ${activeFaq === i ? 'max-h-60 p-8 pt-0 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-6">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Footer */}
      <footer className="relative z-10 pt-48 pb-24 px-6 max-w-7xl mx-auto text-center">
        <div className="relative p-20 bg-gradient-to-br from-indigo-900/40 to-slate-950 rounded-[64px] border border-white/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
          <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase mb-12 leading-none relative z-10">
            Build Your <br /><span className="gradient-text">Viral Empire.</span>
          </h2>
          <button onClick={handleStartCreatingFree} className="relative z-10 px-16 py-8 bg-white text-black text-xs font-black uppercase tracking-[0.3em] rounded-3xl shadow-3xl shadow-white/10 transition-all hover:scale-105 active:scale-95">
            Launch Workspace Now
          </button>
        </div>

        <div className="mt-48 flex flex-col md:flex-row items-center justify-between gap-12 pt-12 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
               <span className="text-white font-black text-sm">S</span>
            </div>
            <span className="text-sm font-black text-white uppercase tracking-widest">SnoopWerk.com AI</span>
          </div>
          <div className="flex gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            <button onClick={() => scrollToSection('engines')} className="hover:text-white transition-colors">Workspace</button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">API & Enterprise</button>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Legal</a>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">© 2025 SNOOPWERK STUDIO. ALL AI RIGHTS RESERVED.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;