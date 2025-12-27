import React, { useMemo, useState, useEffect } from 'react';
import { Hotspot, TimeState, DailyFinancial, GarageData, UserSettings, ShiftState } from '../types';
import { calculateDistance, getTimeDifference, vibrate, playSound } from '../utils';
import { toggleValidation, getHotspots, getTodayFinancials, getGarageData, getUserSettings } from '../services/storage';
import { generateDriverStrategy } from '../services/ai';
import { CATEGORY_COLORS } from '../constants';
import { Navigation, CloudRain, Sun, Settings, ThumbsUp, ThumbsDown, Disc, Power, Battery, Zap, RefreshCw, Sparkles, X, MapPin, Target, Loader2, Utensils, Bike, Package, ShoppingBag, Layers, Coffee, Moon } from 'lucide-react';
import CustomDialog from './CustomDialog';

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
          onToast("Radar berhasil diperbarui!");
      }, 1000);
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
  const statusColor = shiftState?.status === 'CRITICAL' ? 'bg-red-500' : shiftState?.status === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500';

  const FilterChip = ({ type, label, icon }: { type: QuickFilterType, label: string, icon: React.ReactNode }) => (
      <button 
        onClick={() => handleQuickFilter(type)}
        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${quickFilter === type ? 'bg-white text-black border-white shadow-glow' : 'bg-[#1e1e1e] text-gray-400 border-gray-700 hover:bg-gray-800'}`}
      >
          {icon} {label}
      </button>
  );

  return (
    <div className="pt-4 px-4 space-y-6">
      
      {/* POWER MENU DIALOG */}
      {showPowerMenu && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-[#1e1e1e] border border-gray-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative animate-in slide-in-from-bottom-10">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-white uppercase">Mau Ngapain Ndan?</h3>
                      <button onClick={() => setShowPowerMenu(false)} className="p-2 bg-gray-800 rounded-full"><X size={18} className="text-gray-400"/></button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                       <button 
                            onClick={() => { setShowPowerMenu(false); onRequestRest(); }}
                            className="bg-gray-800 border border-gray-600 hover:bg-gray-700 p-4 rounded-xl flex flex-col items-center gap-2 group transition-all active:scale-95"
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-900/50">
                                <Coffee size={24} className="text-blue-400" />
                            </div>
                            <span className="text-sm font-bold text-gray-200">Istirahat Dulu</span>
                        </button>

                        <button 
                            onClick={() => { setShowPowerMenu(false); onOpenSummary(financials); }}
                            className="bg-gray-800 border border-gray-600 hover:bg-gray-700 p-4 rounded-xl flex flex-col items-center gap-2 group transition-all active:scale-95"
                        >
                            <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center group-hover:bg-red-900/50">
                                <Power size={24} className="text-red-400" />
                            </div>
                            <span className="text-sm font-bold text-gray-200">Tutup Buku</span>
                        </button>
                  </div>
              </div>
          </div>
      )}

      {/* 1. DASHBOARD HEADER */}
      <div className="relative bg-app-card rounded-3xl p-5 border border-app-border overflow-hidden shadow-lg">
        <div className={`absolute top-0 right-0 w-40 h-40 blur-[80px] rounded-full opacity-20 transition-colors duration-1000 ${progress >= 100 ? 'bg-emerald-400' : 'bg-app-primary'}`}></div>
        
        <div className="flex justify-between items-start mb-6">
            <div>
                <div className="flex items-baseline gap-2">
                     <h1 className="text-4xl font-black text-white tracking-tighter">{currentTime.timeString}</h1>
                     <span className="text-xs font-bold text-gray-500 uppercase">{currentTime.dayName}</span>
                </div>
            </div>
            
            <div className="flex gap-2 relative z-10">
                <button 
                    onClick={() => { setIsRainMode(!isRainMode); vibrate(10); playSound('click'); }}
                    className={`p-3 rounded-2xl transition-all active:scale-95 ${isRainMode ? 'bg-blue-600 text-white shadow-glow ring-2 ring-blue-400' : 'bg-[#222] text-gray-400 border border-gray-700'}`}
                >
                    {isRainMode ? <CloudRain size={20} className="animate-bounce" /> : <Sun size={20} />}
                </button>
                <button onClick={() => { onOpenSettings(); playSound('click'); }} className="p-3 rounded-2xl bg-[#222] border border-gray-700 text-gray-400 hover:text-white transition-colors">
                    <Settings size={20} />
                </button>
            </div>
        </div>

        {/* STATUS & FATIGUE */}
        <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#000]/60 backdrop-blur-sm rounded-xl p-3 border border-gray-800 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`}></div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Kondisi Modal</span>
                </div>
                <p className={`text-xs font-bold leading-tight ${shiftState?.status === 'SAFE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {shiftState?.status === 'SAFE' ? 'Aman Terkendali' : (shiftState?.startBalance < 10000 ? 'Saldo Kritis!' : 'Perlu Perhatian')}
                </p>
            </div>

            <div className={`bg-[#000]/60 backdrop-blur-sm rounded-xl p-3 border border-gray-800 flex flex-col justify-center ${timeOnline > 8 ? 'border-red-500/50' : ''}`}>
                 <div className="flex items-center gap-2 mb-1">
                    <Battery size={10} className={timeOnline > 8 ? 'text-red-500' : 'text-app-primary'} />
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Durasi On-Bid</span>
                </div>
                <p className="text-white text-xs font-mono font-bold">
                    {Math.floor(timeOnline)} jam {(timeOnline % 1 * 60).toFixed(0)} m
                </p>
                {timeOnline > 8 && <span className="text-[9px] text-red-500 font-bold uppercase mt-1">Istirahat Ndan!</span>}
            </div>
        </div>

        {/* TARGET PROGRESS */}
        <div className="relative pt-2">
            <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400 mb-1">
                <span>Target: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(settings.targetRevenue)}</span>
                <span className={progress >= 100 ? 'text-app-accent' : 'text-white'}>{progress}%</span>
            </div>
            <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700/50">
                <div 
                    className={`h-full transition-all duration-1000 relative ${progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-gradient-to-r from-amber-400 to-app-primary'}`} 
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-30"></div>
                </div>
            </div>
        </div>

        <button 
            onClick={() => { setShowPowerMenu(true); playSound('click'); }}
            className="absolute bottom-4 right-4 bg-[#222] hover:bg-gray-700 text-red-400 p-2 rounded-lg border border-gray-700 transition-colors shadow-lg z-20"
            title="Menu Istirahat / Tutup Buku"
        >
            <Power size={18} />
        </button>
      </div>
      
      {/* AI STRATEGY BOX */}
      <div className="relative">
        {!aiAdvice ? (
             <button 
                onClick={handleAiAnalysis}
                disabled={isAiLoading}
                className={`w-full py-4 border rounded-2xl flex items-center justify-center gap-2 font-black text-sm shadow-lg transition-all active:scale-[0.98] ${isAiLoading ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-yellow-400 text-black border-yellow-500 hover:bg-yellow-300 shadow-yellow-400/20'}`}
            >
                {isAiLoading ? <RefreshCw size={20} className="animate-spin" /> : <Sparkles size={20} className="text-black" />}
                {isAiLoading ? "MENGANALISIS..." : "ANALISA ORDERAN (AI)"}
            </button>
        ) : (
            <div className="bg-gradient-to-br from-yellow-400/10 to-yellow-600/5 border border-yellow-500/50 rounded-2xl p-5 relative animate-in fade-in slide-in-from-top-4 shadow-lg shadow-yellow-900/10">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-app-primary rounded-xl flex items-center justify-center shadow-lg border border-yellow-300">
                        <Disc size={28} className="text-red-600 animate-[spin_3s_linear_infinite]" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h4 className="font-black text-app-primary text-xs uppercase mb-1 tracking-wider flex items-center gap-1">
                             <Target size={12}/> STRATEGI ORDERAN
                        </h4>
                        <p className="text-sm font-bold text-gray-200 leading-relaxed whitespace-pre-line tracking-wide">
                            {aiAdvice}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => { setAiAdvice(null); vibrate(10); playSound('click'); }}
                    className="absolute top-2 right-2 p-2 bg-black/20 rounded-full text-gray-400 hover:text-white hover:bg-black/40 transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        )}
      </div>

      {/* 2. INTELLIGENT RADAR LIST */}
      <div>
        <div className="flex flex-col gap-3 mb-4">
            <div className="flex justify-between items-end px-1">
                <div className="flex items-center gap-2">
                    <Zap className="text-app-primary fill-current" size={18} />
                    <h2 className="text-lg font-bold text-white">Radar Rezeki</h2>
                    <button 
                        onClick={handleManualScan} 
                        className={`ml-2 p-1.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 transition-all active:bg-gray-700 ${isScanning ? 'animate-spin text-app-primary border-app-primary' : ''}`}
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
                <span className="text-xs text-gray-500 font-mono border border-gray-800 px-2 py-1 rounded-lg bg-[#111]">
                    {predictions.length} Titik
                </span>
            </div>

            {/* QUICK FILTER CHIPS */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <FilterChip type="ALL" label="Semua" icon={<Layers size={14} />} />
                <FilterChip type="FOOD" label="Food & Shop" icon={<Utensils size={14} />} />
                <FilterChip type="BIKE" label="Bike/Car" icon={<Bike size={14} />} />
                <FilterChip type="SEND" label="Kirim" icon={<Package size={14} />} />
            </div>
        </div>

        <div className="space-y-3 pb-24">
            {predictions.length === 0 ? (
                <div className="py-10 px-6 text-center border-2 border-dashed border-gray-800 rounded-2xl bg-[#111] space-y-4 animate-in fade-in">
                    <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-800">
                        <CloudRain size={32} className="text-gray-600" />
                    </div>
                    <div>
                        <p className="text-gray-300 font-bold text-sm">Zona Anyep (Tidak Ada Spot)</p>
                        <p className="text-xs text-gray-600 mt-1 max-w-[220px] mx-auto">Coba matikan filter layanan atau tunggu beberapa saat lagi.</p>
                    </div>
                    <div className="flex gap-2 justify-center">
                         <button 
                            onClick={() => handleQuickFilter('ALL')}
                            className="px-5 py-2.5 bg-gray-800 text-white border border-gray-700 rounded-full text-xs font-bold hover:bg-gray-700"
                        >
                            TAMPILKAN SEMUA
                        </button>
                        <button 
                            onClick={handleManualScan}
                            className="px-5 py-2.5 bg-gray-800 text-app-primary border border-gray-700 rounded-full text-xs font-bold hover:bg-gray-700"
                        >
                            REFRESH
                        </button>
                    </div>
                </div>
            ) : (
                predictions.map(spot => (
                    <div key={spot.id} className="bg-app-card border border-app-border rounded-2xl p-4 relative group hover:border-gray-600 transition-colors">
                        
                        {spot.isFallback && (
                            <div className="absolute top-0 right-0 bg-gray-800 text-gray-400 text-[9px] px-2 py-1 rounded-bl-xl rounded-tr-xl font-bold uppercase tracking-wider">
                                Alternatif
                            </div>
                        )}

                        <div 
                            className="absolute left-0 top-4 bottom-4 w-1.5 rounded-r-full shadow-[0_0_10px_rgba(0,0,0,0.5)]" 
                            style={{ backgroundColor: spot.isMaintenance ? '#EF4444' : CATEGORY_COLORS[spot.category] || '#fff' }}
                        ></div>

                        <div className="pl-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className="pr-4">
                                    <h3 className="font-bold text-lg text-white leading-tight mb-1">{spot.origin}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono border border-gray-700">
                                            {spot.category}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${spot.isFallback ? 'bg-gray-900 text-gray-500 border-gray-800' : 'bg-emerald-900/30 text-emerald-400 border-emerald-800'}`}>
                                            {spot.matchReason}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <span className="block text-xl font-mono font-bold text-app-primary">{spot.predicted_hour}</span>
                                    <span className={`text-[10px] font-bold ${gpsReady ? 'text-gray-500' : 'text-amber-500 animate-pulse'}`}>
                                        {gpsReady ? `${spot.distance} km` : 'Mencari Lokasi...'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-4 border-t border-gray-800 pt-3">
                                <button 
                                    onClick={() => { window.open(`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`, '_blank'); vibrate(10); playSound('click'); }}
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 ${spot.isMaintenance ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'bg-white text-black hover:bg-gray-200 shadow-glow'}`}
                                >
                                    <Navigation size={16} />
                                    {spot.isMaintenance ? 'KE BENGKEL' : 'GAS KESANA'}
                                </button>
                                
                                <div className="flex gap-1">
                                    <button onClick={() => handleValidation(spot.id, true)} className="p-2.5 bg-[#222] hover:bg-gray-800 rounded-xl text-emerald-500 border border-gray-700 transition-colors">
                                        <ThumbsUp size={18} />
                                    </button>
                                    <button onClick={() => handleValidation(spot.id, false)} className="p-2.5 bg-[#222] hover:bg-gray-800 rounded-xl text-red-500 border border-gray-700 transition-colors">
                                        <ThumbsDown size={18} />
                                    </button>
                                </div>
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