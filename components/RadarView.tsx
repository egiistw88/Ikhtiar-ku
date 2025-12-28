
import React, { useMemo, useState, useEffect } from 'react';
import { Hotspot, TimeState, DailyFinancial, GarageData, UserSettings, ShiftState } from '../types';
import { calculateDistance, vibrate, playSound } from '../utils';
import { toggleValidation, getHotspots, getTodayFinancials, getGarageData, getUserSettings } from '../services/storage';
import { generateDriverStrategy } from '../services/ai';
import { Navigation, CloudRain, Sun, Settings, ThumbsUp, ThumbsDown, Power, Battery, Zap, RefreshCw, Sparkles, X, Utensils, Bike, Package, Layers, Skull, TrendingUp, Clock, CalendarDays, Repeat, RotateCcw, Bot } from 'lucide-react';

// --- CUSTOM DRIVER ICON (SVG) ---
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

interface ScoredHotspot extends Hotspot {
    distance: number;
    score: number;
    isMaintenance?: boolean;
    matchReason?: string;
    isFallback?: boolean;
    priorityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

type QuickFilterType = 'ALL' | 'FOOD' | 'BIKE' | 'SEND';

// Optimization: Sub-component moved outside
const FilterChip = ({ type, label, icon, active, onClick }: { type: QuickFilterType, label: string, icon: React.ReactNode, active: boolean, onClick: (t: QuickFilterType) => void }) => (
    <button 
      onClick={() => onClick(type)}
      className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${active ? 'bg-white text-black border-white shadow-lg scale-105' : 'bg-[#1a1a1a] text-gray-400 border-transparent hover:bg-[#222]'}`}
    >
        {icon} {label}
    </button>
);

export const RadarView: React.FC<RadarViewProps> = ({ hotspots: initialHotspots, currentTime, shiftState, onOpenSettings, onOpenSummary, onRequestRest, onToast }) => {
  const [localHotspots, setLocalHotspots] = useState<Hotspot[]>(initialHotspots);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isRainMode, setIsRainMode] = useState(false);
  const [financials, setFinancials] = useState<DailyFinancial | null>(null);
  const [garage, setGarage] = useState<GarageData | null>(null);
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [timeOnline, setTimeOnline] = useState<number>(0);
  
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('ALL');

  const [isScanning, setIsScanning] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [gpsReady, setGpsReady] = useState(false);

  // Power Menu State
  const [showPowerMenu, setShowPowerMenu] = useState(false);

  useEffect(() => {
    syncData();
    if (navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGpsReady(true);
            },
            (err) => console.log("GPS Error", err),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }
    const interval = setInterval(syncData, 30000); 
    return () => clearInterval(interval);
  }, [shiftState]); 

  const syncData = () => {
        const freshHotspots = getHotspots();
        setLocalHotspots(freshHotspots); 
        setFinancials(getTodayFinancials());
        setGarage(getGarageData());
        setSettings(getUserSettings());
        
        if (shiftState?.startTime) {
            const now = Date.now();
            const hours = (now - shiftState.startTime) / (1000 * 60 * 60);
            setTimeOnline(hours);
        }
  };

  const handleManualScan = () => {
      vibrate(10);
      playSound('click');
      setIsScanning(true);
      setTimeout(() => {
          syncData();
          setIsScanning(false);
          playSound('success');
          onToast("Radar disinkronisasi ulang.");
      }, 800);
  };

  const handleAiAnalysis = async () => {
      if (!gpsReady && !userLocation) {
          onToast("Menunggu sinyal GPS...");
          return;
      }
      
      vibrate(20);
      playSound('click');
      setIsAiLoading(true);
      setAiAdvice(null);
      
      const strategy = await generateDriverStrategy(
          predictions, 
          financials, 
          shiftState, 
          userLocation
      );
      
      setAiAdvice(strategy);
      setIsAiLoading(false);
      vibrate([50, 50, 50]); 
      playSound('success');
  };

  const handleValidation = (id: string, isAccurate: boolean) => {
      toggleValidation(id, isAccurate);
      setLocalHotspots(prev => prev.map(h => 
          h.id === id 
          ? { ...h, validations: [...(h.validations || []), { date: currentTime.fullDate.toISOString().split('T')[0], isAccurate }] } 
          : h
      ));
      vibrate(10);
      playSound(isAccurate ? 'success' : 'click');
      onToast(isAccurate ? "Validasi: Gacor! (Data disimpan)" : "Validasi: Anyep (Akan dihindari)");
  };

  const handleQuickFilter = (type: QuickFilterType) => {
      vibrate(10);
      playSound('click');
      setQuickFilter(type);
      if (type === 'FOOD') onToast("Filter: Kuliner & Shop");
      else if (type === 'BIKE') onToast("Filter: Penumpang");
  };

  // --- SMART RANKING ENGINE ---
  const predictions: ScoredHotspot[] = useMemo(() => {
    const todayStr = currentTime.fullDate.toISOString().split('T')[0];
    const currentHour = currentTime.fullDate.getHours();
    const currentMinute = currentTime.fullDate.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    
    // 1. FILTERING TAHAP AWAL (Hard Filter)
    let candidates = localHotspots.filter(h => {
        // Filter by Type Chip
        if (quickFilter === 'FOOD') {
            if (!(h.category.includes('Culinary') || h.type === 'Food' || h.type.includes('Shop') || h.category === 'Mall/Lifestyle')) return false;
        } else if (quickFilter === 'BIKE') {
            if (!(h.type.includes('Bike') || h.type === 'Ride' || h.category === 'Residential' || h.category === 'Transport Hub')) return false;
        } else if (quickFilter === 'SEND') {
            if (!(h.type.includes('Delivery') || h.category === 'Logistics')) return false;
        } else {
            // User Settings Preferences
            const p = settings.preferences;
            if (!p.showFood && (h.category.includes('Culinary') || h.type === 'Food')) return false;
            if (!p.showBike && (h.type.includes('Bike') || h.type === 'Ride')) return false;
            if (!p.showSend && (h.type.includes('Delivery') || h.category === 'Logistics')) return false;
            if (!p.showShop && (h.type.includes('Shop') || h.category === 'Mall/Lifestyle')) return false;
        }
        return true;
    });

    // 2. SCORING SYSTEM (Pembobotan)
    const scored = candidates.map(h => {
        let score = h.baseScore ? (h.baseScore * 10) : 500; 
        let reasons: string[] = [];
        let distance = 0; 

        if (userLocation && gpsReady) {
            distance = calculateDistance(userLocation.lat, userLocation.lng, h.lat, h.lng);
            const decayFactor = h.isDaily ? 20 : 50; 
            const distPenalty = Math.pow(distance, 1.3) * decayFactor; 
            score -= distPenalty;
            if (distance < 1) reasons.push("Sangat Dekat");
            else if (distance < 3) reasons.push("Jarak Ideal");
        }

        const [hHour, hMin] = h.predicted_hour.split(':').map(Number);
        const hTotalMinutes = hHour * 60 + hMin;
        const diffMinutes = Math.abs(currentTotalMinutes - hTotalMinutes);
        
        if (diffMinutes <= 45) {
            score += 600; 
            reasons.push("Waktu Paling Optimal");
        } else if (diffMinutes <= 90) {
            score += 300; 
            reasons.push("Jam Ramai");
        } else if (diffMinutes <= 180) {
            score -= 100; 
        } else {
            score -= 600; 
        }

        if (h.isDaily) {
            score += 200; 
            const isWeekend = currentTime.dayName === 'Minggu' || currentTime.dayName === 'Sabtu';
            if (isWeekend && h.category === 'Education') score -= 500; 
            if (!isWeekend && h.category === 'Education') score += 200; 
        } else {
            if (h.day === currentTime.dayName) {
                score += 400; 
                reasons.push(`Spesial ${h.day}`);
            } else {
                score -= 800; 
            }
        }

        const lastValidation = h.validations?.sort((a,b) => b.date.localeCompare(a.date))[0];
        if (lastValidation) {
            if (lastValidation.isAccurate) {
                score += 400; 
                reasons.unshift("Terbukti Gacor"); 
            } else {
                score -= 1500; 
            }
        }

        let isMaintenance = false;
        const maintenanceInterval = garage?.serviceInterval || 2000;
        const kmSinceOil = (garage?.currentOdometer || 0) - (garage?.lastOilChangeKm || 0);
        if (kmSinceOil > maintenanceInterval && h.category === 'Service') {
            score += 3000; 
            isMaintenance = true;
            reasons = ["⚠️ WAKTUNYA SERVIS"];
        }

        let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
        if (score > 1000) priority = 'HIGH';
        else if (score > 600) priority = 'MEDIUM';

        if (isRainMode) {
             if (['Mall/Lifestyle', 'Culinary'].includes(h.category)) {
                 score += 500;
                 reasons.push("Teduh & Ramai");
             } else {
                 score -= 500; 
             }
        }

        return {
            ...h,
            distance,
            score: Math.round(score),
            matchReason: reasons[0] || (score > 600 ? "Potensi Tinggi" : "Alternatif"),
            isMaintenance,
            priorityLevel: priority
        };
    });

    const validResults = scored.filter(s => s.score > 0 || s.isMaintenance);
    return validResults.sort((a, b) => b.score - a.score).slice(0, 7);

  }, [localHotspots, currentTime, isRainMode, financials, userLocation, gpsReady, shiftState, settings, quickFilter, garage]);

  const progress = Math.min(100, Math.round(((financials?.netCash || 0) / settings.targetRevenue) * 100));

  return (
    <div className="pt-6 px-4 space-y-8">
      
      {/* POWER MENU MODAL */}
      {showPowerMenu && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-[#1a1a1a] border border-gray-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom-10">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-white uppercase">Menu Istirahat</h3>
                      <button onClick={() => setShowPowerMenu(false)} className="p-2 bg-gray-800 rounded-full"><X size={18} className="text-gray-400"/></button>
                  </div>
                  
                  <div className="space-y-3">
                       <button 
                            onClick={() => { setShowPowerMenu(false); onRequestRest(); }}
                            className="w-full bg-blue-900/20 border border-blue-800 hover:bg-blue-900/30 p-5 rounded-2xl flex items-center gap-4 transition-all"
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-black font-bold">
                                <Battery size={20} />
                            </div>
                            <div className="text-left">
                                <span className="block text-white font-bold text-lg">Mode Istirahat</span>
                                <span className="text-xs text-blue-300">Pause radar & hitung waktu rehat</span>
                            </div>
                        </button>

                        <button 
                            onClick={() => { setShowPowerMenu(false); onOpenSummary(financials); }}
                            className="w-full bg-red-900/20 border border-red-800 hover:bg-red-900/30 p-5 rounded-2xl flex items-center gap-4 transition-all"
                        >
                            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-black font-bold">
                                <Power size={20} />
                            </div>
                            <div className="text-left">
                                <span className="block text-white font-bold text-lg">Tutup Buku</span>
                                <span className="text-xs text-red-300">Akhiri shift hari ini & lihat laporan</span>
                            </div>
                        </button>
                  </div>
              </div>
          </div>
      )}

      {/* 1. CLEAN HEADER */}
      <div className="flex justify-between items-end">
          <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{currentTime.dayName}</p>
              <h1 className="text-5xl font-black text-white tracking-tighter leading-none">{currentTime.timeString}</h1>
          </div>
          <div className="flex gap-3">
                <button 
                    onClick={() => { setIsRainMode(!isRainMode); vibrate(10); playSound('click'); }}
                    className={`p-3 rounded-full transition-all ${isRainMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'bg-[#1a1a1a] text-gray-500'}`}
                >
                    {isRainMode ? <CloudRain size={24} /> : <Sun size={24} />}
                </button>
                 <button 
                    onClick={() => setShowPowerMenu(true)} 
                    className="p-3 rounded-full bg-[#1a1a1a] text-red-400 hover:bg-red-900/20 transition-colors"
                >
                    <Power size={24} />
                </button>
                 <button 
                    onClick={onOpenSettings} 
                    className="p-3 rounded-full bg-[#1a1a1a] text-gray-500 hover:text-white transition-colors"
                >
                    <Settings size={24} />
                </button>
          </div>
      </div>

      {/* 2. PROGRESS BAR (THICK) */}
      <div>
        <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase">Target Harian</span>
            <span className={`text-xl font-black ${progress >= 100 ? 'text-emerald-400' : 'text-white'}`}>{progress}%</span>
        </div>
        <div className="h-4 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
            <div 
                className={`h-full transition-all duration-1000 ${progress >= 100 ? 'bg-emerald-500' : 'bg-app-primary'}`} 
                style={{ width: `${progress}%` }}
            ></div>
        </div>
        {timeOnline > 8 && (
            <div className="mt-2 flex items-center gap-2 text-red-400 text-xs font-bold bg-red-900/10 p-2 rounded-lg border border-red-900/30">
                <Battery size={14} /> Sudah {Math.floor(timeOnline)} jam Online. Jangan lupa istirahat.
            </div>
        )}
      </div>
      
      {/* 3. AI STRATEGY TRIGGER BUTTON */}
      <button 
          onClick={handleAiAnalysis}
          disabled={isAiLoading}
          className={`w-full py-5 rounded-3xl flex items-center justify-between px-6 font-black text-left shadow-lg transition-all active:scale-[0.98] group ${isAiLoading ? 'bg-gray-800 text-gray-500' : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black'}`}
      >
          <div>
              <span className="block text-xs uppercase opacity-70 mb-1">{isAiLoading ? 'Menghubungi Pusat...' : 'Tanya Suhu'}</span>
              <span className="text-xl">{isAiLoading ? 'Sedang Menganalisa...' : 'Minta Strategi Taktis'}</span>
          </div>
          <div className={`p-3 bg-black/10 rounded-full ${isAiLoading ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`}>
              {isAiLoading ? <RefreshCw size={24} /> : <DriverHelmetIcon size={24} />}
          </div>
      </button>

      {/* 4. AI RESULT MODAL (POPUP RE-DESIGN) */}
      {aiAdvice && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-[#121212] border border-gray-800 w-full max-w-lg rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 relative">
                  
                  {/* Modal Header */}
                  <div className="p-6 border-b border-gray-800 bg-[#1a1a1a] flex justify-between items-center sticky top-0 z-10">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black shadow-lg shadow-orange-500/20">
                              <DriverHelmetIcon size={28} />
                          </div>
                          <div>
                            <h3 className="font-black text-white uppercase text-xl leading-none mb-1">Briefing Suhu</h3>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">LIVE STRATEGY</span>
                            </div>
                          </div>
                      </div>
                      <button 
                          onClick={() => setAiAdvice(null)} 
                          className="p-2 bg-gray-800/50 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                      >
                          <X size={24} />
                      </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-8 overflow-y-auto custom-scrollbar bg-[#121212]">
                      {/* Using simple div instead of prose for tighter control and bold text */}
                      <div className="text-lg text-white leading-relaxed font-medium text-center">
                          "{aiAdvice}"
                      </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-gray-800 bg-[#1a1a1a]">
                      <button 
                          onClick={() => { setAiAdvice(null); vibrate(10); playSound('click'); }}
                          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-2xl shadow-lg shadow-emerald-900/50 flex justify-center items-center gap-2 active:scale-95 transition-transform"
                      >
                          <ThumbsUp size={20} /> SIAP LAKSANAKAN!
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* 5. RADAR LIST */}
      <div>
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Zap className="text-app-primary fill-current" size={20} />
                Radar Rezeki
            </h2>
            <button 
                onClick={handleManualScan} 
                className={`p-2 rounded-full bg-[#1a1a1a] text-gray-400 border border-transparent hover:border-gray-600 active:bg-gray-800 ${isScanning ? 'animate-spin text-white' : ''}`}
            >
                <RefreshCw size={18} />
            </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mb-2">
            <FilterChip type="ALL" label="Semua" icon={<Layers size={16} />} active={quickFilter === 'ALL'} onClick={handleQuickFilter} />
            <FilterChip type="FOOD" label="Food" icon={<Utensils size={16} />} active={quickFilter === 'FOOD'} onClick={handleQuickFilter} />
            <FilterChip type="BIKE" label="Bike" icon={<Bike size={16} />} active={quickFilter === 'BIKE'} onClick={handleQuickFilter} />
            <FilterChip type="SEND" label="Kirim" icon={<Package size={16} />} active={quickFilter === 'SEND'} onClick={handleQuickFilter} />
        </div>

        <div className="space-y-4 pb-24">
            {predictions.length === 0 ? (
                <div className="py-12 px-6 text-center rounded-3xl bg-[#111] border border-dashed border-gray-800 space-y-4">
                    <div className="w-20 h-20 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-3">
                        <Skull size={32} className="text-gray-600" />
                    </div>
                    <p className="text-gray-400 font-bold">Zona Anyep (Sepi)</p>
                    <p className="text-xs text-gray-600 mb-4">
                        Tidak ada hotspot relevan di jam {currentTime.timeString}.
                        <br/>Coba geser lokasi atau matikan filter.
                    </p>
                    {quickFilter !== 'ALL' && (
                        <button 
                            onClick={() => handleQuickFilter('ALL')}
                            className="px-4 py-2 bg-gray-800 rounded-xl text-white text-xs font-bold flex items-center gap-2 mx-auto hover:bg-gray-700"
                        >
                            <RotateCcw size={14}/> Reset Filter
                        </button>
                    )}
                </div>
            ) : (
                predictions.map(spot => (
                    <div key={spot.id} className={`bg-[#1a1a1a] rounded-3xl p-5 relative overflow-hidden group active:scale-[0.99] transition-transform ${spot.priorityLevel === 'HIGH' ? 'border border-emerald-500/30' : ''}`}>
                        {spot.isMaintenance && (
                            <div className="absolute inset-0 bg-red-900/10 border-2 border-red-500/50 rounded-3xl z-0 pointer-events-none"></div>
                        )}

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {spot.priorityLevel === 'HIGH' && <span className="text-[10px] bg-emerald-900 text-emerald-400 px-2 py-1 rounded-lg font-bold uppercase inline-flex items-center gap-1"><TrendingUp size={10}/> Super Gacor</span>}
                                        {spot.isDaily && <span className="text-[10px] bg-blue-900/50 text-blue-400 px-2 py-1 rounded-lg font-bold uppercase inline-flex items-center gap-1"><Repeat size={10}/> Rutin</span>}
                                        {!spot.isDaily && <span className="text-[10px] bg-purple-900/50 text-purple-400 px-2 py-1 rounded-lg font-bold uppercase inline-flex items-center gap-1"><CalendarDays size={10}/> {spot.day}</span>}
                                    </div>
                                    
                                    <h3 className="font-black text-xl text-white leading-tight">{spot.origin}</h3>
                                    
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded text-app-primary">
                                            <Clock size={10} />
                                            <span className="text-xs font-bold">{spot.predicted_hour}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500">•</span>
                                        <span className="text-xs text-gray-400">{spot.category}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-2xl font-black ${gpsReady ? 'text-white' : 'text-gray-600'}`}>
                                        {gpsReady ? spot.distance : '?'}
                                    </span>
                                    <span className="text-xs text-gray-500 block">KM</span>
                                </div>
                            </div>
                            
                            <div className="bg-gray-800/40 p-2 rounded-xl mb-4 border border-white/5">
                                <p className="text-xs text-emerald-400 font-bold flex items-center gap-1 mb-1">
                                    <Sparkles size={10} /> {spot.matchReason}
                                </p>
                                <p className="text-[10px] text-gray-500 line-clamp-2">{spot.notes}</p>
                            </div>

                            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                                <button 
                                    onClick={() => { window.open(`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`, '_blank'); vibrate(10); playSound('click'); }}
                                    className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${spot.isMaintenance ? 'bg-red-600 text-white' : 'bg-white text-black'}`}
                                >
                                    <Navigation size={18} />
                                    {spot.isMaintenance ? 'BENGKEL' : 'GAS KESANA'}
                                </button>
                                
                                <button onClick={() => handleValidation(spot.id, true)} className="w-12 flex items-center justify-center bg-gray-800 rounded-xl text-emerald-500 hover:bg-emerald-900/50">
                                    <ThumbsUp size={20} />
                                </button>
                                <button onClick={() => handleValidation(spot.id, false)} className="w-12 flex items-center justify-center bg-gray-800 rounded-xl text-red-500 hover:bg-red-900/50">
                                    <ThumbsDown size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
};
