import React, { useState, useEffect } from 'react';
import { ViewState, TimeState, Hotspot, DailyFinancial, ShiftState } from './types';
import { getCurrentTimeInfo, getLocalDateString, playSound } from './utils';
import { getHotspots, getShiftState, runDataHousekeeping, getTodayFinancials, clearShiftState, saveShiftState } from './services/storage';
import RadarView from './components/RadarView';
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
  
  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Summary & Rest Data State
  const [summaryData, setSummaryData] = useState<{ finance: DailyFinancial | null } | null>(null);
  const [isResting, setIsResting] = useState(false);

  const refreshAppData = () => {
      // 1. Cek Hari Baru (Auto-Reset Logic)
      const storedShift = getShiftState();
      const today = getLocalDateString();
      
      if (storedShift && storedShift.date !== today) {
          console.log("New Day Detected: Resetting Shift State...");
          clearShiftState();
          setShiftState(null);
          setView('setup'); // Paksa masuk setup ulang
          showToast("Hari Baru! Silakan cek modal kembali.");
          setIsResting(false);
      } else {
          setShiftState(storedShift);
          // Check Rest State
          if (storedShift?.restData?.isActive) {
              setIsResting(true);
          }
      }

      setHotspots(getHotspots());
      setCurrentTime(getCurrentTimeInfo());
  };

  // Initial Load & Lifecycle
  useEffect(() => {
    // 1. Run Maintenance (Silent)
    const stats = runDataHousekeeping();
    if (stats.cleanedTxs > 0 || stats.cleanedHotspots > 0) {
        console.log(`Auto-Maintenance: Cleaned ${stats.cleanedTxs} txs & ${stats.cleanedHotspots} old hotspots.`);
    }

    // 2. Load Data & Cek Hari
    refreshAppData();
    
    // Logic penentuan view awal
    const currentShift = getShiftState();
    const today = getLocalDateString();
    
    // Jika ada shift DAN tanggalnya hari ini, masuk radar. Jika tidak, setup.
    if (currentShift && currentShift.date === today) {
        setView('radar');
    } else {
        setView('setup');
    }

    // 3. Multitasking Sync (Auto-Wakeup)
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            console.log("App Resumed: Refreshing Data...");
            refreshAppData();
        }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 4. Timer Jam
    const timer = setInterval(() => {
        setCurrentTime(getCurrentTimeInfo());
    }, 10000); 

    return () => {
        clearInterval(timer);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleSetupComplete = () => {
      refreshAppData(); // Pastikan state terupdate setelah setup
      setView('radar');
  };

  const handleRefreshData = () => {
      refreshAppData();
      setView('radar'); 
  };

  const handleOpenSummary = (finance: DailyFinancial | null) => {
      const freshFinance = getTodayFinancials();
      setSummaryData({ finance: freshFinance });
      setView('summary');
  };

  const handleCloseSummary = () => {
      setView('setup');
      setShiftState(null);
  };
  
  // REST MODE HANDLERS
  const handleStartRest = () => {
      if (!shiftState) return;
      const newState: ShiftState = {
          ...shiftState,
          restData: { isActive: true, startTime: Date.now(), type: 'ISTIRAHAT' }
      };
      saveShiftState(newState);
      setShiftState(newState);
      setIsResting(true);
      playSound('success');
  };

  const handleResumeWork = () => {
      if (!shiftState) return;
      // Remove rest data
      const { restData, ...resumedState } = shiftState;
      saveShiftState(resumedState as ShiftState);
      setShiftState(resumedState as ShiftState);
      setIsResting(false);
      showToast("Selamat Narik Lagi Ndan!");
  };

  // Toast Handler
  const showToast = (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
  };

  if (loading) return <SplashView onFinish={() => setLoading(false)} />;

  if (view === 'setup') return <PreRideSetup onComplete={handleSetupComplete} />;
  if (view === 'settings') return <SettingsView onBack={() => setView('radar')} onUpdateCondition={() => setView('setup')} />;
  if (view === 'summary') return <ShiftSummary financials={summaryData?.finance || null} onClose={handleCloseSummary} />;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-app-bg text-app-text relative overflow-hidden">
      
      {/* REST MODE OVERLAY (High Z-Index) */}
      {isResting && shiftState?.restData && (
          <RestModeOverlay 
              financials={getTodayFinancials()}
              startTime={shiftState.restData.startTime}
              onResume={handleResumeWork}
          />
      )}

      <SOSButton />

      {/* GLOBAL TOAST NOTIFICATION - BOTTOM POSITION */}
      {toastMessage && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000] bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-4 fade-in duration-300 w-max max-w-[90%] border border-emerald-400/50">
              <CheckCircle size={18} className="text-white fill-emerald-800" />
              <span className="font-bold text-sm drop-shadow-md">{toastMessage}</span>
          </div>
      )}

      {/* MAIN VIEWPORT */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-[100px] relative">
        {view === 'radar' && (
            <RadarView 
                hotspots={hotspots} 
                currentTime={currentTime} 
                shiftState={shiftState}
                onOpenSettings={() => setView('settings')}
                onOpenSummary={handleOpenSummary}
                onRequestRest={handleStartRest}
                onToast={showToast}
            />
        )}
        {view === 'map' && <MapView hotspots={hotspots} currentTime={currentTime} />}
        {view === 'journal' && <JournalEntry currentTime={currentTime} onSaved={() => { handleRefreshData(); showToast("Data Berhasil Disimpan!"); }} />}
        {view === 'wallet' && <WalletView onToast={showToast} />}
        {view === 'garage' && <GarageView />}
      </main>

      {/* BOTTOM NAVIGATION (Fixed) */}
      <nav className="absolute bottom-0 left-0 w-full h-[85px] bg-app-card/95 backdrop-blur-lg border-t border-app-border flex justify-around items-end pb-safe pb-3 z-50 shadow-bottom-nav">
        
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

        {/* CENTER ACTION BUTTON */}
        <div className="relative -top-5">
             <button 
                onClick={() => setView('journal')}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-glow transition-all active:scale-90 ${view === 'journal' ? 'bg-app-primary text-black scale-110' : 'bg-app-accent text-white'}`}
            >
                <Plus size={32} strokeWidth={3} />
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
            label="Akun" 
        />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-16 h-14 gap-1 transition-colors ${active ? 'text-app-primary' : 'text-gray-500 hover:text-gray-300'}`}
    >
        <div className={`${active ? 'scale-110' : ''} transition-transform duration-200`}>
            {React.cloneElement(icon as React.ReactElement, { 
                fill: active ? 'currentColor' : 'none', 
                strokeWidth: active ? 2 : 2 
            })}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
    </button>
);

export default App;