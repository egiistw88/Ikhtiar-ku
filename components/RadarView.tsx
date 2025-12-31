
import React, { useState, useEffect, useRef } from 'react';
import { Hotspot, TimeState, DailyFinancial, GarageData, UserSettings, ShiftState, EngineOutput } from '../types';
import { vibrate, playSound } from '../utils';
import { toggleValidation, getHotspots, getTodayFinancials, getGarageData, getUserSettings, getTransactions } from '../services/storage';
import { generateDriverStrategy } from '../services/ai';
import { runLogicEngine } from '../services/logicEngine';
import { Navigation, CloudRain, Sun, Settings, ThumbsUp, ThumbsDown, Power, Battery, Zap, RefreshCw, Sparkles, X, Utensils, Bike, Package, Layers, Skull, TrendingUp, Clock, RotateCcw, ArrowUpRight, Signal, Rabbit, Crosshair, Flame, Radio, User, History, CheckCheck } from 'lucide-react';

const DriverHelmetIcon = ({ size = 24, className = "" }: {size?: number, className?: string}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 2C7.58172 2 4 5.58172 4 10V14C4 16.2091 5.79086 18 8 18H16C18.2091 18 20 16.2091 20 14V10C20 5.58172 16.4183 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 10H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="8" y="10" width="8" height="4" rx="1" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
        <path d="M9 18V20C9 21.1046 9.89543 22 11 22H13C14.1046 22 15 21.1046 15 20V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);

interface RadarViewProps {
  hotspots: Hotspot[];
  currentTime: TimeState;
  shiftState: ShiftState | null;
  onOpenSettings: () => void;
  onOpenSummary: (finance: DailyFinancial | null) => void;
  onRequestRest: () => void;
  onToast: (msg: string) => void;
}

export const RadarView: React.FC<RadarViewProps> = ({ hotspots: initialHotspots, currentTime, shiftState, onOpenSettings, onOpenSummary, onRequestRest, onToast }) => {
  // State Data
  const [localHotspots, setLocalHotspots] = useState<Hotspot[]>(initialHotspots);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [financials, setFinancials] = useState<DailyFinancial | null>(null);
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  
  // State UI
  const [isRainMode, setIsRainMode] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [gpsReady, setGpsReady] = useState(false);
  const [showPowerMenu, setShowPowerMenu] = useState(false);
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'FOOD' | 'BIKE' | 'SEND'>('ALL');

  // ENGINE OUTPUT STATE
  const [engineOut, setEngineOut] = useState<EngineOutput | null>(null);

  // Refs for intervals
  const pulseRef = useRef<any>(null);

  useEffect(() => {
    refreshAllData();
    let watchId: number | null = null;
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLocation(newLoc);
                setGpsReady(true);
            },
            (err) => console.log("GPS Error", err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
    }
    // REAL-TIME HEARTBEAT (Every 10 seconds refresh logic)
    pulseRef.current = setInterval(() => { runEngine(); }, 10000); 

    const handleResume = () => { if (document.visibilityState === 'visible') refreshAllData(); };
    document.addEventListener('visibilitychange', handleResume);

    return () => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        if (pulseRef.current) clearInterval(pulseRef.current);
        document.removeEventListener('visibilitychange', handleResume);
    };
  }, [shiftState, userLocation, isRainMode]); 

  const refreshAllData = () => {
      setLocalHotspots(getHotspots()); 
      setFinancials(getTodayFinancials());
      setSettings(getUserSettings());
      runEngine();
  };

  const runEngine = () => {
      const output = runLogicEngine(
          getHotspots(),
          userLocation,
          shiftState,
          getTodayFinancials(),
          getTransactions(),
          getUserSettings(),
          isRainMode // PASS RAIN MODE TO ENGINE
      );
      setEngineOut(output);
  };

  const handleManualScan = () => {
      vibrate(10); playSound('click'); setIsScanning(true);
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGpsReady(true);
                setTimeout(() => { 
                    refreshAllData(); 
                    setIsScanning(false); 
                    playSound('success'); 
                    onToast("Radar diperbarui"); 
                }, 1000);
            },
            () => { onToast("GPS Lemah/Mati"); setIsScanning(false); },
            { enableHighAccuracy: true, timeout: 5000 }
          );
      }
  };

  const handleAiAnalysis = async () => {
      if (!engineOut) return;
      vibrate(20); playSound('click'); setIsAiLoading(true); setAiAdvice(null);
      const strategy = await generateDriverStrategy(engineOut.scoredHotspots, financials, shiftState, userLocation);
      setAiAdvice(strategy); setIsAiLoading(false); vibrate([50, 50, 50]); playSound('success');
  };

  const handleValidation = (id: string, isAccurate: boolean) => {
      toggleValidation(id, isAccurate);
      refreshAllData();
      vibrate(10); playSound(isAccurate ? 'success' : 'click'); onToast(isAccurate ? "Validasi: Gacor! (Disimpan)" : "Validasi: Anyep (Dihindari)");
  };

  const displayedHotspots = (engineOut?.scoredHotspots || []).filter(h => {
        if (quickFilter === 'FOOD') return (h.category.includes('Culinary') || h.type === 'Food' || h.type.includes('Shop') || h.category === 'Mall/Lifestyle');
        if (quickFilter === 'BIKE') return (h.type.includes('Bike') || h.type === 'Ride' || h.category === 'Residential' || h.category === 'Transport Hub');
        if (quickFilter === 'SEND') return (h.type.includes('Delivery') || h.category === 'Logistics');
        return true;
  }).slice(0, 7);

  const progress = Math.min(100, Math.round(((financials?.grossIncome || 0) / settings.targetRevenue) * 100));

  return (
    <div className="pt-6 px-4 space-y-6">
      
      {/* POWER MENU OVERLAY */}
      {showPowerMenu && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-[#1a1a1a] border border-gray-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom-10">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-white uppercase">Menu Istirahat</h3>
                      <button onClick={() => setShowPowerMenu(false)} className="p-2 bg-gray-800 rounded-full"><X size={18} className="text-gray-400"/></button>
                  </div>
                  <div className="space-y-3">
                       <button onClick={() => { setShowPowerMenu(false); onRequestRest(); }} className="w-full bg-blue-900/20 border border-blue-800 hover:bg-blue-900/30 p-5 rounded-2xl flex items-center gap-4 transition-all">
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-black font-bold"><Battery size={20} /></div>
                            <div className="text-left"><span className="block text-white font-bold text-lg">Mode Istirahat</span><span className="text-xs text-blue-300">Pause radar & timer</span></div>
                        </button>
                        <button onClick={() => { setShowPowerMenu(false); onOpenSummary(financials); }} className="w-full bg-red-900/20 border border-red-800 hover:bg-red-900/30 p-5 rounded-2xl flex items-center gap-4 transition-all">
                            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-black font-bold"><Power size={20} /></div>
                            <div className="text-left"><span className="block text-white font-bold text-lg">Tutup Buku</span><span className="text-xs text-red-300">Akhiri shift & laporan</span></div>
                        </button>
                  </div>
              </div>
          </div>
      )}

      {/* HEADER WITH REALTIME PULSE */}
      <div className="flex justify-between items-start">
          <div>
              <div className="flex items-center gap-2 mb-1">
                 <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${shiftState?.strategy === 'SNIPER' ? 'bg-purple-900/30 text-purple-400 border border-purple-500/30' : 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'}`}>
                    {shiftState?.strategy === 'SNIPER' ? <Crosshair size={10}/> : <Rabbit size={10}/>}
                    {shiftState?.strategy === 'SNIPER' ? 'MODE SNIPER' : 'MODE FEEDER'}
                 </span>
                 <span className="flex items-center gap-1 bg-red-900/20 px-2 py-0.5 rounded border border-red-500/20">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span className="text-[9px] font-bold text-red-400">LIVE</span>
                 </span>
              </div>
              <h1 className="text-5xl font-black text-white tracking-tighter leading-none font-mono">{currentTime.timeString}</h1>
          </div>
          <div className="flex gap-2">
                <button onClick={() => { setIsRainMode(!isRainMode); vibrate(10); playSound('click'); }} className={`p-3 rounded-2xl transition-all border ${isRainMode ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-[#1a1a1a] border-gray-800 text-gray-500'}`}>
                    {isRainMode ? <CloudRain size={20} /> : <Sun size={20} />}
                </button>
                 <button onClick={() => setShowPowerMenu(true)} className="p-3 rounded-2xl bg-[#1a1a1a] border border-gray-800 text-red-400 hover:bg-red-900/20 transition-colors"><Power size={20} /></button>
                 <button onClick={onOpenSettings} className="p-3 rounded-2xl bg-[#1a1a1a] border border-gray-800 text-gray-400 hover:text-white transition-colors"><Settings size={20} /></button>
          </div>
      </div>

      {/* MOMENTUM & SERVER STATUS CARD (ENGINE POWERED) */}
      <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-gray-800 relative overflow-hidden">
          <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${engineOut?.goldenTime.isActive ? 'bg-amber-400 animate-pulse' : 'bg-gray-600'}`}></div>
                  <span className={`text-xs font-black uppercase ${engineOut?.goldenTime.isActive ? 'text-amber-400' : 'text-gray-500'}`}>{engineOut?.goldenTime.label || 'Loading...'}</span>
              </div>
              <div className="flex items-center gap-1">
                  <Flame size={14} className={(engineOut?.momentum.score || 0) > 50 ? 'text-orange-500 animate-bounce' : 'text-gray-600'} />
                  <span className="text-[10px] font-bold text-gray-400">MOMENTUM</span>
              </div>
          </div>
          
          <div className="relative h-2 w-full bg-black rounded-full overflow-hidden">
              <div 
                  className={`absolute left-0 top-0 h-full transition-all duration-1000 ${(engineOut?.momentum.score || 0) > 75 ? 'bg-orange-500' : 'bg-blue-600'}`} 
                  style={{ width: `${engineOut?.momentum.score || 0}%` }}
              ></div>
          </div>
          <div className="flex justify-between mt-1 text-[9px] font-mono text-gray-500">
              <span>{engineOut?.momentum.label}</span>
              <span className="text-right text-[10px] text-white font-bold">{Math.round(engineOut?.momentum.score || 0)}/100</span>
          </div>

          {(engineOut?.momentum.advice) && (
              <div className={`mt-3 p-3 border rounded-xl flex items-start gap-3 transition-colors ${shiftState?.strategy === 'SNIPER' ? 'bg-purple-900/20 border-purple-800/50' : 'bg-blue-900/20 border-blue-800/50'}`}>
                  <div className="mt-0.5"><Radio size={16} className="text-white animate-pulse" /></div>
                  <p className="text-xs text-gray-200 leading-snug italic font-medium">
                     "{engineOut.momentum.advice}"
                  </p>
              </div>
          )}
      </div>

      {/* PROGRESS BAR */}
      <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-gray-800 relative overflow-hidden">
        <div className="flex justify-between items-end mb-2 relative z-10">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target Harian</span>
            <span className={`text-xl font-black ${progress >= 100 ? 'text-emerald-400' : 'text-white'}`}>{progress}%</span>
        </div>
        <div className="h-3 w-full bg-black rounded-full overflow-hidden relative z-10 border border-gray-700">
            <div className={`h-full transition-all duration-1000 relative ${progress >= 100 ? 'bg-emerald-500' : 'bg-app-primary'}`} style={{ width: `${progress}%` }}>
                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-stripes_1s_linear_infinite]"></div>
            </div>
        </div>
      </div>
      
      {/* AI BUTTON */}
      <button onClick={handleAiAnalysis} disabled={isAiLoading} className={`w-full py-4 rounded-2xl flex items-center justify-between px-5 font-black text-left shadow-lg transition-all active:scale-[0.98] group border-b-4 ${isAiLoading ? 'bg-gray-800 border-gray-900 text-gray-500' : 'bg-gradient-to-r from-gray-800 to-gray-900 border-black text-white hover:border-app-primary/50'}`}>
          <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isAiLoading ? 'bg-gray-700 animate-pulse' : 'bg-app-primary text-black'}`}>
                  {isAiLoading ? <RefreshCw size={20} className="animate-spin" /> : <DriverHelmetIcon size={28} />}
              </div>
              <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-400 mb-0.5">{isAiLoading ? 'MENGHUBUNGKAN...' : 'AI STRATEGY'}</span>
                  <span className={`text-lg leading-none ${isAiLoading ? 'text-gray-500' : 'text-app-primary'}`}>{isAiLoading ? 'Sedang Menganalisa...' : 'Minta Arahan Suhu'}</span>
              </div>
          </div>
          {!isAiLoading && <ArrowUpRight size={20} className="text-gray-500 group-hover:text-white transition-colors" />}
      </button>

      {/* AI MODAL */}
      {aiAdvice && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-[#121212] border border-gray-800 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 relative">
                  <div className="p-6 border-b border-gray-800 bg-[#1a1a1a] flex justify-between items-center rounded-t-3xl">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-app-primary flex items-center justify-center text-black"><DriverHelmetIcon size={24} /></div>
                          <div><h3 className="font-black text-white uppercase text-lg leading-none">Briefing Suhu</h3><span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">LIVE STRATEGY</span></div>
                      </div>
                      <button onClick={() => setAiAdvice(null)} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white"><X size={20}/></button>
                  </div>
                  <div className="p-8 bg-[#121212] overflow-y-auto"><div className="text-xl text-white leading-relaxed font-medium text-center italic">"{aiAdvice}"</div></div>
                  <div className="p-4 border-t border-gray-800 bg-[#1a1a1a] rounded-b-3xl">
                      <button onClick={() => { setAiAdvice(null); vibrate(10); playSound('click'); }} className="w-full py-4 bg-emerald-600 text-white font-black text-lg rounded-2xl shadow-lg flex justify-center items-center gap-2 active:scale-95 transition-transform"><ThumbsUp size={20} /> SIAP LAKSANAKAN!</button>
                  </div>
              </div>
          </div>
      )}

      {/* RADAR LIST */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tight"><Zap className="text-app-primary fill-current" size={18} /> Radar Rezeki</h2>
            <div className="flex gap-2">
                <div className="flex items-center gap-1 bg-[#1a1a1a] border border-gray-800 px-2 py-1 rounded-lg">
                    {gpsReady ? <Signal size={14} className="text-emerald-500" /> : <Signal size={14} className="text-red-500 animate-pulse" />}
                    <span className="text-[9px] font-bold text-gray-500">{gpsReady ? 'GPS ON' : 'NO GPS'}</span>
                </div>
                <button onClick={handleManualScan} className={`p-2 rounded-xl bg-[#1a1a1a] text-gray-400 border border-gray-800 hover:text-white active:bg-gray-800 ${isScanning ? 'animate-spin text-app-primary' : ''}`}><RefreshCw size={16} /></button>
            </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-2 px-1">
            {[
                {id: 'ALL', icon: <Layers size={14}/>, label: 'Semua'},
                {id: 'FOOD', icon: <Utensils size={14}/>, label: 'Food'},
                {id: 'BIKE', icon: <Bike size={14}/>, label: 'Bike'},
                {id: 'SEND', icon: <Package size={14}/>, label: 'Kirim'},
            ].map(f => (
                <button key={f.id} onClick={() => { setQuickFilter(f.id as any); vibrate(10); playSound('click'); }} className={`px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all border whitespace-nowrap ${quickFilter === f.id ? 'bg-app-primary text-black border-app-primary shadow-glow scale-105' : 'bg-[#1a1a1a] text-gray-400 border-gray-800 hover:border-gray-600'}`}>
                    {f.icon} {f.label}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="space-y-4 pb-4">
            {isScanning ? (
                [1,2,3].map(i => (
                    <div key={i} className="bg-[#1a1a1a] rounded-3xl p-5 border border-gray-800 animate-pulse">
                        <div className="h-6 w-3/4 bg-gray-800 rounded mb-4"></div>
                        <div className="flex justify-between"><div className="h-4 w-1/3 bg-gray-800 rounded"></div><div className="h-8 w-16 bg-gray-800 rounded"></div></div>
                    </div>
                ))
            ) : displayedHotspots.length === 0 ? (
                <div className="py-12 px-6 text-center rounded-3xl bg-[#1a1a1a] border border-dashed border-gray-800 space-y-4">
                    <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-800"><Skull size={28} className="text-gray-600" /></div>
                    <p className="text-gray-300 font-bold">Zona Anyep</p>
                    <p className="text-xs text-gray-500 max-w-[250px] mx-auto leading-relaxed">
                         {engineOut?.tacticalAdvice.action || "Coba geser ke lokasi lain."}
                    </p>
                    {quickFilter !== 'ALL' && <button onClick={() => setQuickFilter('ALL')} className="px-4 py-2 bg-gray-800 rounded-xl text-white text-xs font-bold flex items-center gap-2 mx-auto hover:bg-gray-700"><RotateCcw size={14}/> Reset Filter</button>}
                </div>
            ) : (
                displayedHotspots.map(spot => (
                    <div key={spot.id} className={`bg-[#1a1a1a] rounded-3xl p-5 relative overflow-hidden group active:scale-[0.99] transition-transform border ${spot.priorityLevel === 'HIGH' ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-gray-800'}`}>
                        {spot.isMaintenance && (
                            <div className="absolute inset-0 bg-red-900/10 border-2 border-red-500/50 rounded-3xl z-20 pointer-events-none flex items-center justify-center">
                                <span className="bg-red-600 text-white font-black text-xs px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">Wajib Servis</span>
                            </div>
                        )}
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-wrap gap-1.5">
                                    {/* USER HISTORY BADGE */}
                                    {spot.isUserEntry && (
                                         <span className="text-[9px] bg-blue-900/30 text-blue-400 border border-blue-500/30 px-2 py-1 rounded font-black uppercase inline-flex items-center gap-1">
                                            <History size={10}/> Riwayat Anda
                                        </span>
                                    )}
                                    {/* VISIT COUNT BADGE */}
                                    {spot.visitCount && spot.visitCount > 1 && (
                                         <span className="text-[9px] bg-yellow-900/30 text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded font-black uppercase inline-flex items-center gap-1">
                                            <CheckCheck size={10}/> {spot.visitCount}x Kesini
                                        </span>
                                    )}

                                    {/* Strategy Match Badge */}
                                    {spot.strategyMatch && (
                                        <span className={`text-[9px] px-2 py-1 rounded font-black uppercase inline-flex items-center gap-1 ${shiftState?.strategy === 'SNIPER' ? 'bg-purple-600 text-white' : 'bg-emerald-500 text-black'}`}>
                                            {shiftState?.strategy === 'SNIPER' ? <Crosshair size={10}/> : <Rabbit size={10}/>} {shiftState?.strategy === 'SNIPER' ? 'TARGET KAKAP' : 'FEEDER SPOT'}
                                        </span>
                                    )}
                                    {spot.priorityLevel === 'HIGH' && !spot.strategyMatch && <span className="text-[9px] bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded font-black uppercase inline-flex items-center gap-1"><TrendingUp size={10}/> Potensial</span>}
                                    <span className="text-[9px] bg-gray-800 text-gray-300 px-2 py-1 rounded font-bold uppercase inline-flex items-center gap-1"><Clock size={10}/> {spot.predicted_hour}</span>
                                </div>
                                <div className="text-right">
                                     <span className={`text-3xl font-black leading-none font-mono ${gpsReady ? 'text-white' : 'text-gray-600'}`}>{gpsReady ? spot.distance : '-'}</span>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase block mt-0.5">KM</span>
                                </div>
                            </div>
                            <div className="mb-5">
                                <h3 className="font-black text-lg text-white leading-tight mb-1 line-clamp-2">{spot.origin}</h3>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">{spot.category}</p>
                                <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-start gap-3">
                                    <Sparkles size={16} className="text-app-primary shrink-0 mt-0.5" />
                                    <div><p className="text-xs text-app-primary font-bold mb-1">{spot.matchReason}</p><p className="text-[10px] text-gray-400 leading-snug line-clamp-2">{spot.notes}</p></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                                <button onClick={() => { window.open(`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`, '_blank'); vibrate(10); playSound('click'); }} className={`py-3.5 rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg ${spot.isMaintenance ? 'bg-red-600 text-white' : 'bg-white text-black hover:bg-gray-200'}`}>
                                    <Navigation size={18} fill="currentColor" /> {spot.isMaintenance ? 'Bengkel' : 'Gas Kesana'}
                                </button>
                                <button onClick={() => handleValidation(spot.id, true)} className="w-12 flex items-center justify-center bg-gray-800 border border-gray-700 rounded-xl text-emerald-500 hover:bg-emerald-900/30 hover:border-emerald-500/50 transition-colors"><ThumbsUp size={20} /></button>
                                <button onClick={() => handleValidation(spot.id, false)} className="w-12 flex items-center justify-center bg-gray-800 border border-gray-700 rounded-xl text-red-500 hover:bg-red-900/30 hover:border-red-500/50 transition-colors"><ThumbsDown size={20} /></button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};
