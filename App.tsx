import React, { useState, useEffect } from 'react';
import { ViewState, TimeState, Hotspot } from './types';
import { getCurrentTimeInfo } from './utils';
import { getHotspots } from './services/storage';
import RadarView from './components/RadarView';
import MapView from './components/MapView';
import JournalEntry from './components/JournalEntry';
import WalletView from './components/WalletView';
import GarageView from './components/GarageView';
import SOSButton from './components/SOSButton';
import { Radar, Map as MapIcon, PlusCircle, Wallet, Shield } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('radar');
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [currentTime, setCurrentTime] = useState<TimeState>(getCurrentTimeInfo());

  // Initialization
  useEffect(() => {
    // Load data
    const data = getHotspots();
    setHotspots(data);

    // Timer for clock
    const timer = setInterval(() => {
        setCurrentTime(getCurrentTimeInfo());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const handleRefreshData = () => {
      setHotspots(getHotspots());
      setView('radar'); // Go back to radar after saving
  };

  const renderContent = () => {
    switch (view) {
        case 'radar':
            return <RadarView hotspots={hotspots} currentTime={currentTime} />;
        case 'map':
            return <MapView hotspots={hotspots} currentTime={currentTime} />;
        case 'journal':
            return <JournalEntry currentTime={currentTime} onSaved={handleRefreshData} />;
        case 'wallet':
            return <WalletView />;
        case 'garage':
            return <GarageView />;
        default:
            return <RadarView hotspots={hotspots} currentTime={currentTime} />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 overflow-hidden font-sans text-gray-100">
      
      {/* GLOBAL FLOATING SOS BUTTON */}
      <SOSButton />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative scroll-smooth">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="h-[80px] bg-gray-800 border-t border-gray-700 flex justify-between items-center px-4 pb-2 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
        <NavButton 
            active={view === 'radar'} 
            onClick={() => setView('radar')} 
            icon={<Radar size={24} />} 
            label="Radar" 
        />
        <NavButton 
            active={view === 'wallet'} 
            onClick={() => setView('wallet')} 
            icon={<Wallet size={24} />} 
            label="Dompet" 
        />
        <div className="relative -top-6">
             <button 
                onClick={() => setView('journal')}
                className="bg-emerald-600 text-white rounded-full p-4 shadow-emerald-900/50 shadow-lg border-4 border-gray-900 hover:bg-emerald-500 transition-transform active:scale-95"
            >
                <PlusCircle size={32} />
             </button>
        </div>
        <NavButton 
            active={view === 'map'} 
            onClick={() => setView('map')} 
            icon={<MapIcon size={24} />} 
            label="Peta" 
        />
         <NavButton 
            active={view === 'garage'} 
            onClick={() => setView('garage')} 
            icon={<Shield size={24} />} 
            label="Garasi" 
        />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-12 py-2 transition-colors ${active ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
    >
        <div className={`mb-1 ${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : ''} transition-transform`}>{icon}</div>
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
    </button>
);

export default App;