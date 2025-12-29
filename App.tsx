
import React, { useState, useEffect } from 'react';
import { ViewState, TimeState, Hotspot, DailyFinancial, ShiftState } from './types';
import { getCurrentTimeInfo, getLocalDateString, playSound } from './utils';
import { getHotspots, getShiftState, runDataHousekeeping, getTodayFinancials, clearShiftState, saveShiftState } from './services/storage';
import { RadarView } from './components/RadarView';
import MapView from './components/MapView';
import JournalEntry from './components/JournalEntry';
import WalletView from './components/WalletView';
import GarageView from './components/GarageView';
import SOSButton from './components/SOSButton';
import SplashView from './components/SplashView';
import SettingsView from './components/SettingsView';
import ShiftSummary from './components/ShiftSummary';
import PreRideSetup from './components/PreRideSetup';
import RestModeOverlay from './components/RestModeOverlay';
import { Radar, Map as MapIcon, Plus, Wallet, Shield, CheckCircle } from 'lucide-react';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>('setup'); 
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [currentTime, setCurrentTime] = useState<TimeState>(getCurrentTimeInfo());
  const [shiftState, setShiftState] = useState<ShiftState | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<{ finance: DailyFinancial | null } | null>(null);
  const [isResting, setIsResting] = useState(false);

  const refreshAppData = () => {
      const storedShift = getShiftState();
      const today = getLocalDateString();
      if (storedShift && storedShift.date !== today) {
          clearShiftState();
          setShiftState(null);
          setView('setup'); 
          showToast("Hari Baru! Silakan cek modal kembali.");
          setIsResting(false);
      } else {
          setShiftState(storedShift);
          if (storedShift?.restData?.isActive) setIsResting(true);
      }
      setHotspots(getHotspots());
      setCurrentTime(getCurrentTimeInfo());
  };

  useEffect(() => {
    runDataHousekeeping();
    refreshAppData();
    const currentShift = getShiftState();
    const today = getLocalDateString();
    if (currentShift && currentShift.date === today) setView('radar'); else setView('setup');

    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') refreshAppData(); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const timer = setInterval(() => setCurrentTime(getCurrentTimeInfo()), 10000); 
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", handleVisibilityChange); };
  }, []);

  const handleSetupComplete = () => { refreshAppData(); setView('radar'); };
  const handleRefreshData = () => { refreshAppData(); setView('radar'); };
  const handleOpenSummary = (finance: DailyFinancial | null) => { setSummaryData({ finance: getTodayFinancials() }); setView('summary'); };
  const handleCloseSummary = () => { setView('setup'); setShiftState(null); };
  
  const handleStartRest = () => {
      if (!shiftState) return;
      const newState: ShiftState = { ...shiftState, restData: { isActive: true, startTime: Date.now(), type: 'ISTIRAHAT' } };
      saveShiftState(newState); setShiftState(newState); setIsResting(true); playSound('success');
  };

  const handleResumeWork = () => {
      if (!shiftState) return;
      const { restData, ...resumedState } = shiftState;
      saveShiftState(resumedState as ShiftState); setShiftState(resumedState as ShiftState); setIsResting(false); showToast("Selamat Narik Lagi Ndan!");
  };

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); };

  if (loading) return <SplashView onFinish={() => setLoading(false)} />;
  if (view === 'setup') return <PreRideSetup onComplete={handleSetupComplete} />;
  if (view === 'settings') return <SettingsView onBack={() => setView('radar')} onUpdateCondition={() => setView('setup')} />;
  if (view === 'summary') return <ShiftSummary financials={summaryData?.finance || null} onClose={handleCloseSummary} />;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-black text-gray-100 relative overflow-hidden font-sans">
      {isResting && shiftState?.restData && <RestModeOverlay financials={getTodayFinancials()} startTime={shiftState.restData.startTime} onResume={handleResumeWork} />}
      <SOSButton />
      
      {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[2000] bg-emerald-600/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 w-[90%] max-w-sm border border-emerald-400/30">
              <div className="bg-white/20 p-1 rounded-full"><CheckCircle size={18} className="text-white" /></div>
              <span className="font-bold text-sm leading-snug">{toastMessage}</span>
          </div>
      )}

      <main className="flex-1 overflow-y-auto no-scrollbar pb-40 relative">
        {view === 'radar' && <RadarView hotspots={hotspots} currentTime={currentTime} shiftState={shiftState} onOpenSettings={() => setView('settings')} onOpenSummary={handleOpenSummary} onRequestRest={handleStartRest} onToast={showToast} />}
        {view === 'map' && <MapView hotspots={hotspots} currentTime={currentTime} shiftState={shiftState} />}
        {view === 'journal' && <JournalEntry currentTime={currentTime} onSaved={() => { handleRefreshData(); showToast("Data Disimpan!"); }} />}
        {view === 'wallet' && <WalletView shiftState={shiftState} onToast={showToast} />}
        {view === 'garage' && <GarageView />}
      </main>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none pb-safe">
          <nav className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-auto">
            <NavButton active={view === 'radar'} onClick={() => setView('radar')} icon={<Radar size={22} />} label="Radar" />
            <NavButton active={view === 'wallet'} onClick={() => setView('wallet')} icon={<Wallet size={22} />} label="Dompet" />
            <button onClick={() => setView('journal')} className={`w-14 h-14 -mt-8 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 ${view === 'journal' ? 'bg-app-primary text-black ring-4 ring-black scale-110' : 'bg-app-primary text-black ring-4 ring-[#1a1a1a]'}`}>
                <Plus size={28} strokeWidth={3} />
            </button>
            <NavButton active={view === 'map'} onClick={() => setView('map')} icon={<MapIcon size={22} />} label="Peta" />
            <NavButton active={view === 'garage'} onClick={() => setView('garage')} icon={<Shield size={22} />} label="Akun" />
          </nav>
      </div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-10 gap-1 transition-all ${active ? 'text-app-primary' : 'text-gray-500 hover:text-gray-300'}`}>
        <div className={`transition-transform duration-200 ${active ? '-translate-y-1' : ''}`}>{React.cloneElement(icon as React.ReactElement, { fill: active ? 'currentColor' : 'none', strokeWidth: active ? 2.5 : 2 })}</div>
        {active && <div className="w-1 h-1 bg-app-primary rounded-full animate-in zoom-in"></div>}
    </button>
);

export default App;
