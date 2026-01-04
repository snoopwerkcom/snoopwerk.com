
import React from 'react';
import { ToolType, AppToolsState, UserCredits } from '../types';
import ToolABTesting from './ToolABTesting';
import ToolPOD from './ToolPOD';
import ToolLogoDesigner from './ToolLogoDesigner';
import ToolCarousel from './ToolCarousel';

interface DashboardProps {
  activeTool: ToolType;
  toolsState: AppToolsState;
  onUpdateState: <K extends keyof AppToolsState>(key: K, newState: Partial<AppToolsState[K]>) => void;
  onNavigate: (tool: ToolType, image?: string) => void;
  onExit: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ activeTool, toolsState, onUpdateState, onNavigate, onExit }) => {
  const updateCredits = (credits: UserCredits) => onUpdateState('credits', credits);

  const renderTool = () => {
    switch (activeTool) {
      case ToolType.THUMBNAILS:
        return <ToolCarousel state={toolsState.carousel} credits={toolsState.credits} onUpdate={(s) => onUpdateState('carousel', s)} onUpdateCredits={updateCredits} onAction={onNavigate} />;
      case ToolType.AB_TESTING:
        return <ToolABTesting state={toolsState.abTesting} credits={toolsState.credits} onUpdate={(s) => onUpdateState('abTesting', s)} onUpdateCredits={updateCredits} onAction={onNavigate} />;
      case ToolType.POD_MERCH: 
        return <ToolPOD state={toolsState.pod} credits={toolsState.credits} onUpdate={(s) => onUpdateState('pod', s)} onUpdateCredits={updateCredits} onAction={onNavigate} />;
      case ToolType.LOGO_DESIGNER:
        return <ToolLogoDesigner state={toolsState.logo} onUpdate={(s) => onUpdateState('logo', s)} />;
      default: 
        return <ToolCarousel state={toolsState.carousel} credits={toolsState.credits} onUpdate={(s) => onUpdateState('carousel', s)} onUpdateCredits={updateCredits} onAction={onNavigate} />;
    }
  };

  const navItems = [
    { type: ToolType.THUMBNAILS, label: 'Carousel Studio', icon: '🎞️' },
    { type: ToolType.AB_TESTING, label: 'Thumbnail Maker', icon: '📊' },
    { type: ToolType.POD_MERCH, label: 'Merch Designer', icon: '👕' },
    { type: ToolType.LOGO_DESIGNER, label: 'Logo Lab', icon: '✒️' },
    { type: ToolType.PRICING, label: 'Pricing', icon: '💳' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="w-72 bg-[#111] border-r border-white/5 flex flex-col z-50 shadow-2xl">
        <div className="p-8 flex flex-col items-center justify-center border-b border-white/5">
          <button 
            onClick={() => onNavigate(ToolType.LANDING)}
            className="group flex flex-col items-center gap-1 transition-transform hover:scale-105"
          >
            <span className="text-white text-xl font-extrabold tracking-tight pb-1">
              SnoopWerk<span className="text-blue-400">.com</span>
            </span>
          </button>
        </div>

        <div className="px-6 py-6 overflow-y-auto custom-scrollbar flex-1">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2">Creative Stack</p>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.type}
                onClick={() => onNavigate(item.type)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all duration-300 relative group ${
                  activeTool === item.type 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className={`text-xl transition-transform group-hover:scale-110 ${activeTool === item.type ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className="tracking-wide text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-white/5">
          <button 
            onClick={onExit}
            className="w-full flex items-center gap-4 px-5 py-3 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest border border-white/5 rounded-xl hover:bg-white/5"
          >
            <span>🏠</span>
            Home Base
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#050505] relative">
        <div className="h-full">{renderTool()}</div>
      </main>
    </div>
  );
};

export default Dashboard;
