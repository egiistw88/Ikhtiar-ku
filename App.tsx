
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, TimeState, Hotspot, DailyFinancial, ShiftState, SystemAlert } from './types';
import { getCurrentTimeInfo, getLocalDateString, playSound, calculateDistance, vibrate } from './utils';
import { getHotspots, getShiftState, runDataHousekeeping, getTodayFinancials, clearShiftState, saveShiftState, incrementOdometer, getGarageData } from './services/storage';
import { evaluateSystemHealth } from './services/logicEngine';
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
import { Radar, Map as MapIcon, Plus, Wallet, Shield, CheckCircle, BellRing } from 'lucide-react';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>('setup'); 
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [currentTime, setCurrentTime] = useState<TimeState>(getCurrentTimeInfo());
  const [shiftState, setShiftState] = useState<ShiftState | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<{ finance: DailyFinancial | null } | null>(null);
  const [isResting, setIsResting] = useState(false);
  
  // Real-time Logic Refs
  const prevLocationRef = useRef<{lat: number, lng: number} | null>(null);
  const odometerBufferRef = useRef<number>(0); // Buffer jarak sebelum ditulis ke DB
  const activeMinutesRef = useRef<number>(0); // Buffer waktu aktif
  const lastActiveCheckRef = useRef<number>(Date.now());
  const seenAlertsRef = useRef<Set<string>>(new Set());
  const lastAlertTimeRef = useRef<number>(0);

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
          if (storedShift) {
             activeMinutesRef.current = storedShift.activeMinutes || 0;
          }
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
    
    // Flush buffer on close
    const handleUnload = () => flushOdometerBuffer();
    window.addEventListener('beforeunload', handleUnload);

    return () => { 
        clearInterval(timer); 
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  // Helper to flush odometer buffer to storage (Prevent Storage Thrashing)
  const flushOdometerBuffer = () => {
      if (odometerBufferRef.current > 0) {
          incrementOdometer(odometerBufferRef.current);
          odometerBufferRef.current = 0;
      }
      // Also save active minutes
      const currentShift = getShiftState();
      if (currentShift) {
          saveShiftState({ ...currentShift, activeMinutes: activeMinutesRef.current });
      }
  };

  // --- REAL-TIME GPS LISTENER & ODOMETER UPDATE ---
  useEffect(() => {
      let watchId: number | null = null;
      if (navigator.geolocation && shiftState && !isResting) {
          watchId = navigator.geolocation.watchPosition(
              (pos) => {
                  const currentLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                  const accuracy = pos.coords.accuracy || 100;
                  const speed = pos.coords.speed || 0; // m/s

                  // LOGIC 1: GPS JITTER FILTER
                  // Abaikan update jika akurasi buruk (> 50m) untuk perhitungan jarak
                  if (accuracy < 50 && prevLocationRef.current) {
                      const dist = calculateDistance(
                          prevLocationRef.current.lat, prevLocationRef.current.lng,
                          currentLoc.lat, currentLoc.lng
                      );
                      
                      // Filter Teleportasi: Max 120km/h = ~33m/s. 
                      // Jika dist > 0.5km dalam hitungan detik, itu glitch.
                      if (dist > 0.01 && dist < 2.0) { 
                          odometerBufferRef.current += dist;
                          
                          // Flush buffer setiap 0.5 KM agar data aman jika HP mati
                          if (odometerBufferRef.current >= 0.5) {
                              flushOdometerBuffer();
                          }
                      }
                  }

                  // LOGIC 2: SMART FATIGUE CALCULATION
                  // Hanya hitung "Active Time" jika driver bergerak > 3 km/h (0.83 m/s)
                  // Ini membedakan "Kerja" vs "Ngetem"
                  const now = Date.now();
                  if (speed > 0.83) {
                      const timeDiff = (now - lastActiveCheckRef.current) / 60000; // minutes
                      if (timeDiff > 0) {
                          activeMinutesRef.current += timeDiff;
                      }
                  }
                  lastActiveCheckRef.current = now;
                  prevLocationRef.current = currentLoc;
                  
                  // Trigger System Health Check every location update (throttled inside func)
                  checkSystemHealth();
              },
              (err) => console.log("GPS Track Error", err),
              { enableHighAccuracy: true } 
          );
      }
      return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [shiftState, isResting]);

  // --- INTELLIGENT NOTIFICATION SYSTEM ---
  const checkSystemHealth = () => {
      const now = Date.now();
      // Throttle checks: max once per minute to save battery
      if (now - lastAlertTimeRef.current < 60000) return;

      // Update Shift State in memory for checker
      const currentShiftMock = shiftState ? { ...shiftState, activeMinutes: activeMinutesRef.current } : null;

      const alerts = evaluateSystemHealth(
          getTodayFinancials(), 
          getGarageData(), 
          currentShiftMock
      );

      if (alerts.length > 0) {
          // Prioritize High alerts
          const topAlert = alerts.sort((a, b) => (a.priority === 'HIGH' ? -1 : 1))[0];
          
          // Logic: Alert Reminder
          // HIGH priority: Remind every 30 mins
          // MEDIUM/LOW: Remind every 4 hours (once per shift segment)
          const alertKey = `${topAlert.id}`;
          const lastSeen = seenAlertsRef.current.has(alertKey);
          
          // Reset seen state logic based on time could be added here, 
          // but for now we use a simple hour-based key suffix in the Engine or here.
          // Let's rely on simple suppression: show once per session unless critical.
          
          const uniqueKey = `${topAlert.id}_${new Date().getHours()}`; // Show once per hour max

          if (!seenAlertsRef.current.has(uniqueKey)) {
              showToast(topAlert.title + ": " + topAlert.message);
              if (topAlert.priority === 'HIGH') {
                  vibrate([200, 100, 200]); 
                  playSound('error'); // Alarm sound
              } else {
                  vibrate(100);
                  playSound('success');
              }
              seenAlertsRef.current.add(uniqueKey);
              lastAlertTimeRef.current = now;
          }
      }
  };

  const handleSetupComplete = () => { refreshAppData(); setView('radar'); };
  const handleRefreshData = () => { refreshAppData(); setView('radar'); };
  const handleOpenSummary = (finance: DailyFinancial | null) => { setSummaryData({ finance: getTodayFinancials() }); setView('summary'); };
  const handleCloseSummary = () => { setView('setup'); setShiftState(null); };
  
  const handleStartRest = () => {
      if (!shiftState) return;
      flushOdometerBuffer(); // Save progress before resting
      const newState: ShiftState = { 
          ...shiftState, 
          activeMinutes: activeMinutesRef.current, // Persist active time
          restData: { isActive: true, startTime: Date.now(), type: 'ISTIRAHAT' } 
      };
      saveShiftState(newState); setShiftState(newState); setIsResting(true); playSound('success');
  };

  const handleResumeWork = () => {
      if (!shiftState) return;
      const { restData, ...resumedState } = shiftState;
      lastActiveCheckRef.current = Date.now(); // Reset timer delta
      saveShiftState(resumedState as ShiftState); setShiftState(resumedState as ShiftState); setIsResting(false); showToast("Selamat Narik Lagi Ndan!");
  };

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 4000); };

  if (loading) return <SplashView onFinish={() => setLoading(false)} />;
  if (view === 'setup') return <PreRideSetup onComplete={handleSetupComplete} />;
  if (view === 'settings') return <SettingsView onBack={() => setView('radar')} onUpdateCondition={() => setView('setup')} />;
  if (view === 'summary') return <ShiftSummary financials={summaryData?.finance || null} shiftState={shiftState} onClose={handleCloseSummary} />;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-black text-gray-100 relative overflow-hidden font-sans">
      {isResting && shiftState?.restData && <RestModeOverlay financials={getTodayFinancials()} startTime={shiftState.restData.startTime} onResume={handleResumeWork} />}
      <SOSButton />
      
      {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[2000] bg-[#1e1e1e]/95 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 fade-in duration-300 w-[90%] max-w-sm border border-gray-700">
              <div className="bg-app-primary/20 p-2 rounded-full"><BellRing size={20} className="text-app-primary animate-pulse" /></div>
              <span className="font-bold text-xs leading-snug">{toastMessage}</span>
          </div>
      )}

      <main className="flex-1 overflow-y-auto no-scrollbar pb-40 relative">
        {view === 'radar' && <RadarView hotspots={hotspots} currentTime={currentTime} shiftState={shiftState} onOpenSettings={() => setView('settings')} onOpenSummary={handleOpenSummary} onRequestRest={handleStartRest} onToast={showToast} />}
        {view === 'map' && <MapView hotspots={hotspots} currentTime={currentTime} shiftState={shiftState} />}
        {view === 'journal' && <JournalEntry currentTime={currentTime} shiftState={shiftState} onSaved={() => { handleRefreshData(); }} />}
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
