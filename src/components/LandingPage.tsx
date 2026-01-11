
import React, { useState, useEffect } from 'react';
import { ToolType, PRICING_PLANS } from '../types';

interface LandingPageProps {
  onStart: (tool: ToolType) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      if (isScrolled !== scrolled) setScrolled(isScrolled);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-200 selection:bg-indigo-500/30 overflow-x-hidden font-inter">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-5%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[160px] animate-glow" />
        <div className="absolute bottom-[5%] right-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[160px] animate-glow [animation-delay:4s]" />
        <div className="absolute top-[30%] left-[40%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[160px] opacity-60 animate-glow [animation-delay:2s]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 border-b ${scrolled ? 'bg-slate-950/80 backdrop-blur-2xl border-white/10 py-4' : 'bg-transparent border-transparent py-8'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
              <span className="text-white font-black text-2xl">S</span>
            </div>
            <span className="text-xl font-black text-white tracking-tighter uppercase">
              SnoopWerk<span className="text-indigo-400">.com</span>
            </span>
          </div>
          
          <div className="hidden lg:flex items-center gap-10">
            {['Engines', 'Workflow', 'Pricing', 'FAQ'].map((item) => (
              <button 
                key={item} 
                onClick={() => scrollToSection(item.toLowerCase())} 
                className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-all hover:translate-y-[-1px]"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => onStart(ToolType.PRICING)} 
              className="hidden sm:block text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
            >
              Log In
            </button>
            <button 
              onClick={() => onStart(ToolType.THUMBNAILS)} 
              className="px-7 py-3 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all shadow-xl active:scale-95"
            >
              Launch Studio
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 pt-56 pb-32 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Neural Engine v2.5 Live</span>
        </div>

        {/* New Feature Announcement Bar */}
        <div className="inline-flex mb-12 animate-in fade-in zoom-in duration-1000 delay-200">
          <div className="px-6 py-3 bg-red-600/10 border border-red-500/30 rounded-2xl backdrop-blur-xl group hover:bg-red-600/20 transition-all cursor-default shadow-lg shadow-red-600/5">
            <p className="text-[10px] font-[1000] text-red-500 uppercase tracking-[0.2em] leading-none flex items-center gap-2">
              🔥 NEW: INTEGRATED VIRAL HOOK GENERATOR — CLICK LESS, GET MORE VIEWS 🔥
            </p>
          </div>
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-[7.5rem] font-[1000] text-white tracking-tighter leading-[0.85] uppercase mb-12 drop-shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
          SNOOP<span className="text-indigo-500">@</span>WERK: <br />
          <span className="gradient-text">The Viral Hook Factory.</span>
        </h1>
        
        <div className="max-w-4xl mx-auto mb-16 space-y-4 animate-in fade-in duration-1000 delay-300">
          <p className="text-2xl md:text-3xl text-white font-black uppercase tracking-[0.2em] leading-tight">
            Precision Thumbnails. Lethal Hooks. <span className="text-indigo-400">Max Growth.</span>
          </p>
          <p className="text-lg md:text-xl text-slate-400 font-bold uppercase tracking-[0.3em]">
            Thumbnail A/B Testing on Steroids.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in duration-1000 delay-500">
          <button onClick={() => onStart(ToolType.THUMBNAILS)} className="w-full sm:w-auto px-16 py-7 bg-white text-black font-black rounded-3xl hover:bg-slate-200 transition-all shadow-2xl shadow-white/5 uppercase tracking-[0.2em] text-xs active:scale-95">
            Start Generating — Free
          </button>
          <button onClick={() => scrollToSection('engines')} className="w-full sm:w-auto px-16 py-7 glass-effect text-white font-black rounded-3xl border border-white/10 hover:bg-white/5 transition-all uppercase tracking-[0.2em] text-xs active:scale-95">
            Explore Engines
          </button>
        </div>
      </header>

      {/* Brand Roll */}
      <section className="relative z-10 py-24 border-y border-white/5 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600 text-center mb-16">Trusted by 1,200+ Agencies & Modern Enterprise Nodes</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-16 items-center opacity-30 grayscale hover:grayscale-0 transition-all duration-700 px-12">
             <div className="text-3xl font-black italic tracking-tighter text-center">VELOCITY</div>
             <div className="text-3xl font-black italic tracking-tighter text-center">STUDIO.X</div>
             <div className="text-3xl font-black italic tracking-tighter text-center">GROWTH.AI</div>
             <div className="text-3xl font-black italic tracking-tighter text-center">SYNTH_LAB</div>
             <div className="text-3xl font-black italic tracking-tighter text-center">MODERN_OS</div>
          </div>
        </div>
      </section>

      {/* Engines Grid */}
      <section id="engines" className="relative z-10 max-w-7xl mx-auto px-6 py-32">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 mb-20">
          <div className="max-w-3xl">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-6">The Production Stack</h2>
            <h3 className="text-4xl md:text-7xl font-[1000] text-white tracking-tighter leading-none uppercase mb-8">
              One Command. <br /><span className="gradient-text">Infinite Output.</span>
            </h3>
            <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-xl">
              Specialized neural engines designed for the next generation of creative speed. No bloat. Just performance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { 
              title: 'Carousel Studio', 
              desc: 'Convert podcasts, scripts, or blog posts into elite 10-slide Instagram carousels in under 60 seconds.', 
              icon: '🎞️', 
              type: ToolType.THUMBNAILS, 
              color: 'from-indigo-600/30 to-slate-900',
              bgImage: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1974&auto=format&fit=crop',
              tag: 'TOP RATED'
            },
            { 
              title: 'Thumbnail Laboratory', 
              desc: 'Forge high-impact visual hooks with real-time A/B variations. Engineered for max CTR.', 
              icon: '📊', 
              type: ToolType.AB_TESTING, 
              color: 'from-teal-600/30 to-slate-900',
              tag: 'GROWTH ENGINE'
            },
            { 
              title: 'Merch Forge', 
              desc: 'High-precision subject isolation and upscaling. Turn rough sketches into retail-ready assets.', 
              icon: '👕', 
              type: ToolType.POD_MERCH, 
              color: 'from-purple-600/30 to-slate-900',
              tag: 'CREATOR COMMERCE'
            },
            { 
              title: 'Identity Hub', 
              desc: 'Minimalist branding and vector-grade logos for modern startups. Speed-optimized delivery.', 
              icon: '✒️', 
              type: ToolType.LOGO_DESIGNER, 
              color: 'from-pink-600/30 to-slate-900',
              tag: 'PRO BRANDING'
            }
          ].map((feature, i) => (
            <div 
              key={i} 
              onClick={() => onStart(feature.type)} 
              className="group relative h-[440px] bg-slate-900/40 rounded-[48px] border border-white/5 p-10 flex flex-col justify-between hover:border-white/20 transition-all cursor-pointer overflow-hidden backdrop-blur-xl"
            >
              {/* Conditional Realistic Background Image - Only for Carousel Studio */}
              {feature.bgImage && (
                <div 
                  className="absolute inset-0 z-0 opacity-20 group-hover:opacity-40 transition-opacity duration-1000 bg-cover bg-center grayscale group-hover:grayscale-0 scale-100 group-hover:scale-110"
                  style={{ backgroundImage: `url("${feature.bgImage}")` }}
                />
              )}
              
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-40 group-hover:opacity-60 transition-opacity duration-700`} />
              
              <div className="relative z-10 flex justify-between items-start">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 border border-white/5 shadow-2xl">
                  {feature.icon}
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-black/40 px-4 py-2 rounded-full border border-white/10">{feature.tag}</span>
              </div>

              <div className="relative z-10">
                <h4 className="text-3xl md:text-4xl font-black text-white mb-4 uppercase tracking-tighter leading-none">{feature.title}</h4>
                <p className="text-slate-300 text-base font-medium leading-relaxed mb-8 max-w-sm group-hover:text-white transition-colors drop-shadow-md font-semibold">{feature.desc}</p>
                <div className="inline-flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-indigo-400 group-hover:text-white transition-colors">
                  Launch Engine
                  <svg className="w-4 h-4 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-32 bg-indigo-600/5 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {[
            { label: 'Creative Throughput', value: '4.2M+' },
            { label: 'Enterprise Nodes', value: '620+' },
            { label: 'Verified Creators', value: '150k' },
            { label: 'Avg Conversion Lift', value: '44%' }
          ].map((stat, i) => (
            <div key={i} className="space-y-3">
              <div className="text-4xl md:text-6xl font-[1000] text-white tracking-tighter">{stat.value}</div>
              <div className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-24">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400 mb-6">Access Tiers</h2>
          <h3 className="text-4xl md:text-8xl font-[1000] text-white uppercase tracking-tighter">Choose Your <span className="gradient-text">Power.</span></h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRICING_PLANS.map((plan, i) => (
            <div 
              key={i} 
              className={`relative p-8 rounded-[40px] flex flex-col transition-all duration-500 hover:translate-y-[-8px] ${
                plan.popular 
                ? 'bg-gradient-to-br from-indigo-900/40 to-slate-950 border-2 border-indigo-500 shadow-3xl shadow-indigo-500/10' 
                : 'bg-slate-900/30 border border-white/5'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[9px] font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-2xl">
                  Best Value
                </div>
              )}
              <div className="mb-10">
                <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-3">{plan.name}</h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">{plan.price}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">/mo</span>
                </div>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-3 text-[11px] font-semibold text-slate-400 leading-tight">
                    <span className="text-indigo-500 mt-1 shrink-0 text-base">✦</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => onStart(ToolType.PRICING)}
                className={`w-full py-5 rounded-[20px] font-black uppercase tracking-[0.2em] text-[10px] transition-all ${
                  plan.popular ? 'bg-white text-indigo-950 shadow-2xl hover:bg-slate-200' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 max-w-4xl mx-auto px-6 py-32 border-t border-white/5">
        <div className="text-center mb-20">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6">Intelligence Support</h2>
          <h3 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter">Engine <span className="gradient-text">Specs.</span></h3>
        </div>
        <div className="space-y-4">
          {[
            { q: "How are credits allocated across engines?", a: "Your monthly credits are pooled. Standard AI tasks cost 1 credit. High-resolution upscaling, neural background removal, and complex studio edits cost 2 credits each." },
            { q: "Is the commercial license global?", a: "Yes. Every asset generated on a paid plan (Basic, Pro, Agency) carries a permanent, royalty-free commercial license for global distribution." },
            { q: "Can I upgrade or downgrade anytime?", a: "Absolutely. Changes take effect immediately. Remaining credits from your previous tier are rolled over for the current billing cycle." },
            { q: "Does Carousel Studio support YouTube video imports?", a: "Yes. Simply paste any YouTube or Podcast URL, and our engine will extract the transcript, identify viral hooks, and generate a complete slide deck." }
          ].map((item, i) => (
            <div key={i} className="bg-slate-900/30 rounded-[32px] border border-white/5 overflow-hidden transition-all hover:border-white/10">
              <button onClick={() => setActiveFaq(activeFaq === i ? null : i)} className="w-full p-8 flex items-center justify-between text-left group">
                <span className="text-white font-black uppercase tracking-tight text-base pr-8 group-hover:text-indigo-400 transition-colors">{item.q}</span>
                <span className={`text-3xl transition-transform duration-500 ${activeFaq === i ? 'rotate-45 text-indigo-500' : 'text-slate-700'}`}>+</span>
              </button>
              <div className={`transition-all duration-500 ease-in-out ${activeFaq === i ? 'max-h-[300px] p-8 pt-0 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="text-slate-400 text-base leading-relaxed border-t border-white/5 pt-6">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer / Final CTA */}
      <footer className="relative z-10 pt-32 pb-16 px-6 max-w-7xl mx-auto">
        <div className="relative p-16 md:p-24 bg-gradient-to-br from-indigo-950/50 to-slate-950 rounded-[64px] border border-white/10 overflow-hidden shadow-3xl text-center">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[160px] -translate-y-1/2 translate-x-1/2" />
          <h2 className="text-5xl md:text-[7rem] font-[1000] text-white tracking-tighter uppercase mb-12 leading-none relative z-10">
            Own Your <br /><span className="gradient-text">Visual DNA.</span>
          </h2>
          <button onClick={() => onStart(ToolType.THUMBNAILS)} className="relative z-10 px-16 py-6 bg-white text-black text-xs font-black uppercase tracking-[0.4em] rounded-[24px] shadow-3xl shadow-white/10 transition-all hover:scale-105 active:scale-95">
            Deploy Now — Free
          </button>
        </div>

        <div className="mt-32 flex flex-col md:flex-row items-center justify-between gap-8 pt-12 border-t border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
               <span className="text-white font-black text-xl">S</span>
            </div>
            <span className="text-xs font-black text-white uppercase tracking-widest">SnoopWerk Studio</span>
          </div>
          <div className="flex gap-8 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
            <button onClick={() => scrollToSection('engines')} className="hover:text-white transition-colors">Engines</button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Pricing</button>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">API</a>
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-700">© 2025 SNOOPWERK OS. GLOBAL AI RIGHTS RESERVED.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
