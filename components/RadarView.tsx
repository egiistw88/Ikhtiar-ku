
import React, { useMemo, useState, useEffect } from 'react';
import { Hotspot, TimeState, DailyFinancial, GarageData, UserSettings, ShiftState } from '../types';
import { calculateDistance, getTimeDifference, vibrate, playSound } from '../utils';
import { toggleValidation, getHotspots, getTodayFinancials, getGarageData, getUserSettings } from '../services/storage';
import { generateDriverStrategy } from '../services/ai';
import { CATEGORY_COLORS } from '../constants';
import { Navigation, CloudRain, Sun, Settings, ThumbsUp, ThumbsDown, Power, Battery, Zap, RefreshCw, Sparkles, X, MapPin, Target, Utensils, Bike, Package, Layers, ArrowRight, Skull } from 'lucide-react';

interface RadarViewProps {
  hotspots: Hotspot[];
  currentTime: TimeState;
  shiftState: ShiftState | null;
  onOpenSettings: () => void;
  onOpenSummary: (finance: DailyFinancial | null) => void;
  onRequestRest: () => void; // NEW PROP
  onToast: (msg: string) => void;
}

interface ScoredHotspot extends Hotspot {
    distance: number;
    score: number;
    isMaintenance?: boolean;
    matchReason?: string;
    isFallback?: boolean;
}

type QuickFilterType = 'ALL' | 'FOOD' | 'BIKE' | 'SEND';

const RadarView: React.FC<RadarViewProps> = ({ hotspots: initialHotspots, currentTime, shiftState, onOpenSettings, onOpenSummary, onRequestRest, onToast }) => {
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
          onToast("Radar diperbarui");
      }, 800);
  };

  const handleAiAnalysis = async () => {
      vibrate(20);
      playSound('click');
      setIsAiLoading(true);
      setAiAdvice(null);
      const strategy = await generateDriverStrategy(predictions, financials, shiftState);
      setAiAdvice(strategy);
      setIsAiLoading(false);
      vibrate([50, 50]);
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
      onToast(isAccurate ? "Validasi: Gacor!" : "Validasi: Anyep");
  };

  const handleQuickFilter = (type: QuickFilterType) => {
      vibrate(10);
      playSound('click');
      setQuickFilter(type);
      if (type === 'FOOD') onToast("Filter: Kuliner & Shop");
      else if (type === 'BIKE') onToast("Filter: Penumpang");
  };

  const predictions: ScoredHotspot[] = useMemo(() => {
    const todayStr = currentTime.fullDate.toISOString().split('T')[0];
    const currentNet = financials?.netCash || 0;
    const isBehind = (currentNet < (settings.targetRevenue * 0.4)); 

    let candidates = localHotspots.filter(h => {
        const bad = h.validations?.find(v => v.date === todayStr && !v.isAccurate);
        if (bad) return false;
        
        if (quickFilter === 'FOOD') {
            if (!(h.category.includes('Culinary') || h.type === 'Food' || h.type.includes('Shop') || h.category === 'Mall/Lifestyle')) return false;
        } else if (quickFilter === 'BIKE') {
            if (!(h.type.includes('Bike') || h.type === 'Ride' || h.category === 'Residential' || h.category === 'Transport Hub')) return false;
        } else if (quickFilter === 'SEND') {
            if (!(h.type.includes('Delivery') || h.category === 'Logistics')) return false;
        } else {
            const p = settings.preferences;
            if (!p.showFood && (h.category.includes('Culinary') || h.type === 'Food')) return false;
            if (!p.showBike && (h.type.includes('Bike') || h.type === 'Ride')) return false;
            if (!p.showSend && (h.type.includes('Delivery') || h.category === 'Logistics')) return false;
            if (!p.showShop && (h.type.includes('Shop') || h.category === 'Mall/Lifestyle')) return false;
        }

        return true;
    });

    const scoreSpot = (h: Hotspot, isStrictTime: boolean): ScoredHotspot => {
        const dist = (userLocation && gpsReady) ? calculateDistance(userLocation.lat, userLocation.lng, h.lat, h.lng) : 999;
        let score = 100;
        let reason = "";
        let isMaintenance = false;

        const tDiff = getTimeDifference(h.predicted_hour, currentTime.timeString);
        
        if (isStrictTime) {
            if (h.day !== currentTime.dayName) score -= 1000; 
            if (tDiff > 90) score -= 50; 
            reason = "Sesuai Jadwal";
        } else {
            reason = "Alternatif Terdekat";
            score -= 30; 
        }

        if (gpsReady) {
            const fuelLevel = shiftState?.startFuel || 50;
            const radiusLimit = isRainMode ? 5 : (fuelLevel < 25 ? 4 : 20);
            if (dist > radiusLimit) score -= 500; 
            else score -= (dist * 3); 
        } else {
            score -= 10;
        }

        if (isRainMode && ['Mall/Lifestyle', 'Culinary'].includes(h.category)) {
            score += 50; reason = "Spot Teduh & Gacor";
        }
        if (isBehind && h.category === 'Transport Hub') {
            score += 30; reason = "Booster Target";
        }
        if (h.zone.includes('Pusat Kota')) {
            score += 10; 
        }

        const maintenanceInterval = garage?.serviceInterval || 2000;
        const kmSinceOil = (garage?.currentOdometer || 0) - (garage?.lastOilChangeKm || 0);
        
        if (kmSinceOil > maintenanceInterval && h.category === 'Service') {
            score = 2000; 
            isMaintenance = true; 
            reason = "URGENT: SERVIS";
        }

        return { ...h, distance: dist, score: Math.round(score), matchReason: reason, isMaintenance };
    };

    let results = candidates.map(h => scoreSpot(h, true)).filter(h => h.score > 40);

    if (results.length < 3) {
        const fallbacks = candidates
            .map(h => ({ ...scoreSpot(h, false), isFallback: true }))
            .filter(h => {
                if (gpsReady) return h.score > 20 && h.distance < 5;
                return h.score > 20; 
            }) 
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
        
        const existingIds = new Set(results.map(r => r.id));
        fallbacks.forEach(f => {
            if (!existingIds.has(f.id)) results.push(f);
        });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 10);

  }, [localHotspots, currentTime, isRainMode, financials, userLocation, gpsReady, shiftState, settings, quickFilter]);

  const progress = Math.min(100, Math.round(((financials?.netCash || 0) / settings.targetRevenue) * 100));

  const FilterChip = ({ type, label, icon }: { type: QuickFilterType, label: string, icon: React.ReactNode }) => (
      <button 
        onClick={() => handleQuickFilter(type)}
        className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${quickFilter === type ? 'bg-white text-black border-white shadow-lg scale-105' : 'bg-[#1a1a1a] text-gray-400 border-transparent hover:bg-[#222]'}`}
      >
          {icon} {label}
      </button>
  );

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
      
      {/* 3. AI STRATEGY HERO CARD */}
      <div className="relative">
        {!aiAdvice ? (
             <button 
                onClick={handleAiAnalysis}
                disabled={isAiLoading}
                className={`w-full py-5 rounded-3xl flex items-center justify-between px-6 font-black text-left shadow-lg transition-all active:scale-[0.98] group ${isAiLoading ? 'bg-gray-800 text-gray-500' : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black'}`}
            >
                <div>
                    <span className="block text-xs uppercase opacity-70 mb-1">{isAiLoading ? 'Menghubungi Satelit...' : 'Asisten Cerdas'}</span>
                    <span className="text-xl">{isAiLoading ? 'Menganalisis...' : 'Minta Saran Strategi'}</span>
                </div>
                <div className={`p-3 bg-black/10 rounded-full ${isAiLoading ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`}>
                    {isAiLoading ? <RefreshCw size={24} /> : <Sparkles size={24} />}
                </div>
            </button>
        ) : (
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-3xl p-6 relative animate-in fade-in slide-in-from-top-4 shadow-2xl">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center">
                        <Target size={24} className="text-app-primary" />
                    </div>
                    <div>
                        <h4 className="font-black text-app-primary text-xs uppercase mb-2 tracking-wider">
                             STRATEGI ORDERAN
                        </h4>
                        <p className="text-base font-medium text-gray-200 leading-relaxed whitespace-pre-line">
                            {aiAdvice}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => { setAiAdvice(null); vibrate(10); playSound('click'); }}
                    className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white"
                >
                    <X size={20} />
                </button>
            </div>
        )}
      </div>

      {/* 4. RADAR LIST (SPACIOUS) */}
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
            <FilterChip type="ALL" label="Semua" icon={<Layers size={16} />} />
            <FilterChip type="FOOD" label="Food" icon={<Utensils size={16} />} />
            <FilterChip type="BIKE" label="Bike" icon={<Bike size={16} />} />
            <FilterChip type="SEND" label="Kirim" icon={<Package size={16} />} />
        </div>

        <div className="space-y-4 pb-24">
            {predictions.length === 0 ? (
                <div className="py-12 px-6 text-center rounded-3xl bg-[#111] border border-dashed border-gray-800 space-y-4">
                    <div className="w-20 h-20 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-3">
                        <Skull size={32} className="text-gray-600" />
                    </div>
                    <p className="text-gray-400 font-bold">Zona Anyep (Sepi)</p>
                    <p className="text-xs text-gray-600">Tidak ada rekomendasi di filter ini.</p>
                </div>
            ) : (
                predictions.map(spot => (
                    <div key={spot.id} className="bg-[#1a1a1a] rounded-3xl p-5 relative overflow-hidden group active:scale-[0.99] transition-transform">
                        
                        {/* Maintenance Alert Style */}
                        {spot.isMaintenance && (
                            <div className="absolute inset-0 bg-red-900/10 border-2 border-red-500/50 rounded-3xl z-0 pointer-events-none"></div>
                        )}

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    {spot.isFallback && <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded-lg font-bold uppercase mb-2 inline-block">Alternatif</span>}
                                    <h3 className="font-black text-xl text-white leading-tight">{spot.origin}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-bold text-app-primary">{spot.predicted_hour}</span>
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
                            
                            <p className="text-xs text-gray-500 line-clamp-1 mb-4">{spot.notes}</p>

                            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                                <button 
                                    onClick={() => { window.open(`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`, '_blank'); vibrate(10); playSound('click'); }}
                                    className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${spot.isMaintenance ? 'bg-red-600 text-white' : 'bg-white text-black'}`}
                                >
                                    <Navigation size={18} />
                                    {spot.isMaintenance ? 'BENGKEL' : 'GAS KESANA'}
                                </button>
                                
                                <button onClick={() => handleValidation(spot.id, true)} className="w-12 flex items-center justify-center bg-gray-800 rounded-xl text-emerald-500">
                                    <ThumbsUp size={20} />
                                </button>
                                <button onClick={() => handleValidation(spot.id, false)} className="w-12 flex items-center justify-center bg-gray-800 rounded-xl text-red-500">
                                    <ThumbsDown size={20} />
                                </button>
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

export default RadarView;
