import React, { useMemo, useState, useEffect } from 'react';
import { Hotspot, TimeState, DailyFinancial, GarageData, UserSettings, ShiftState } from '../types';
import { calculateDistance, getTimeDifference, vibrate } from '../utils';
import { toggleValidation, getHotspots, getTodayFinancials, getGarageData, getUserSettings } from '../services/storage';
import { CATEGORY_COLORS } from '../constants';
import { Navigation, CloudRain, Sun, Settings, ThumbsUp, ThumbsDown, MapPin, Wrench, Power, AlertTriangle, CheckCircle, Battery, Zap, RefreshCw } from 'lucide-react';

interface RadarViewProps {
  hotspots: Hotspot[];
  currentTime: TimeState;
  shiftState: ShiftState | null;
  onOpenSettings: () => void;
  onOpenSummary: (finance: DailyFinancial | null) => void;
  onToast: (msg: string) => void;
}

interface ScoredHotspot extends Hotspot {
    distance: number;
    score: number;
    isMaintenance?: boolean;
    matchReason?: string;
    isFallback?: boolean;
}

const RadarView: React.FC<RadarViewProps> = ({ hotspots: initialHotspots, currentTime, shiftState, onOpenSettings, onOpenSummary, onToast }) => {
  const [localHotspots, setLocalHotspots] = useState<Hotspot[]>(initialHotspots);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isRainMode, setIsRainMode] = useState(false);
  const [financials, setFinancials] = useState<DailyFinancial | null>(null);
  const [garage, setGarage] = useState<GarageData | null>(null);
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [timeOnline, setTimeOnline] = useState<number>(0);
  
  // Scanning State
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Initial sync
    syncData();
    
    // Auto sync location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            undefined,
            { enableHighAccuracy: true }
        );
    }

    const interval = setInterval(syncData, 60000);
    return () => clearInterval(interval);
  }, [initialHotspots, shiftState]);

  const syncData = () => {
        setLocalHotspots(getHotspots()); // Ensure we pull latest from storage
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
      setIsScanning(true);
      // Simulate scan delay
      setTimeout(() => {
          setIsScanning(false);
          syncData();
          onToast("Radar Diperbarui");
      }, 800);
  };

  const handleValidation = (id: string, isAccurate: boolean) => {
      toggleValidation(id, isAccurate);
      setLocalHotspots(getHotspots());
      vibrate(10);
  };

  // ==========================================
  // SMART LOGIC: SCORING ENGINE V2
  // ==========================================
  const predictions: ScoredHotspot[] = useMemo(() => {
    const todayStr = currentTime.fullDate.toISOString().split('T')[0];
    const currentNet = financials?.netCash || 0;
    const isBehind = (currentNet < (settings.targetRevenue * 0.4)); 

    let candidates = localHotspots.filter(h => {
        const bad = h.validations?.find(v => v.date === todayStr && !v.isAccurate);
        if (bad) return false;
        
        const p = settings.preferences;
        if (!p.showFood && h.category.includes('Culinary')) return false;
        if (!p.showBike && h.type.includes('Bike')) return false;
        if (!p.showSend && (h.type.includes('Delivery') || h.category === 'Logistics')) return false;

        return true;
    });

    const scoreSpot = (h: Hotspot, isStrictTime: boolean): ScoredHotspot => {
        const dist = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, h.lat, h.lng) : 0;
        let score = 100;
        let reason = "";
        let isMaintenance = false;

        const tDiff = getTimeDifference(h.predicted_hour, currentTime.timeString);
        if (isStrictTime) {
            if (h.day !== currentTime.dayName) score -= 500; 
            if (tDiff > 90) score -= 50;
            reason = "Sesuai Jadwal";
        } else {
            reason = "Alternatif Terdekat";
            score -= 20; 
        }

        const fuelLevel = shiftState?.startFuel || 50;
        const radiusLimit = isRainMode ? 5 : (fuelLevel < 25 ? 4 : 15);
        
        if (dist > radiusLimit) score -= 200; 
        else score -= (dist * 2);

        if (isRainMode && ['Mall/Lifestyle', 'Culinary'].includes(h.category)) {
            score += 40; reason = "Spot Teduh & Gacor";
        }
        if (isBehind && h.category === 'Transport Hub') {
            score += 25; reason = "Booster Target";
        }
        if (h.zone.includes('Pusat Kota')) {
            score += 10; 
        }

        const maintenanceInterval = garage?.serviceInterval || 2000;
        if (garage && (garage.currentOdometer - garage.lastOilChangeKm > maintenanceInterval) && h.category === 'Service') {
            score = 1000; isMaintenance = true; reason = "URGENT: SERVIS";
        }

        return { ...h, distance: dist, score: Math.round(score), matchReason: reason, isMaintenance };
    };

    let results = candidates
        .map(h => scoreSpot(h, true))
        .filter(h => h.score > 40 && h.day === currentTime.dayName);

    if (results.length < 3) {
        const fallbacks = candidates
            .map(h => ({ ...scoreSpot(h, false), isFallback: true }))
            .filter(h => h.score > 30 && h.distance < 5) 
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
        
        const existingIds = new Set(results.map(r => r.id));
        fallbacks.forEach(f => {
            if (!existingIds.has(f.id)) results.push(f);
        });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 10);

  }, [localHotspots, currentTime, isRainMode, financials, userLocation, shiftState]);

  const progress = Math.min(100, Math.round(((financials?.netCash || 0) / settings.targetRevenue) * 100));
  const statusColor = shiftState?.status === 'CRITICAL' ? 'bg-red-500' : shiftState?.status === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="pt-4 px-4 space-y-6">
      
      {/* 1. DASHBOARD HEADER */}
      <div className="relative bg-app-card rounded-3xl p-5 border border-app-border overflow-hidden">
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
                    onClick={() => { setIsRainMode(!isRainMode); vibrate(10); }}
                    className={`p-3 rounded-2xl transition-all active:scale-95 ${isRainMode ? 'bg-blue-600 text-white shadow-glow ring-2 ring-blue-400' : 'bg-[#222] text-gray-400 border border-gray-700'}`}
                >
                    {isRainMode ? <CloudRain size={20} className="animate-bounce" /> : <Sun size={20} />}
                </button>
                <button onClick={onOpenSettings} className="p-3 rounded-2xl bg-[#222] border border-gray-700 text-gray-400 hover:text-white transition-colors">
                    <Settings size={20} />
                </button>
            </div>
        </div>

        {/* STATUS PANEL & FATIGUE MONITOR */}
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
            onClick={() => onOpenSummary(financials)}
            className="absolute bottom-4 right-4 bg-[#222] hover:bg-gray-700 text-red-400 p-2 rounded-lg border border-gray-700 transition-colors shadow-lg z-20"
            title="Tutup Buku / Selesai Shift"
        >
            <Power size={18} />
        </button>
      </div>

      {/* 2. INTELLIGENT RADAR LIST */}
      <div>
        <div className="flex justify-between items-end mb-4 px-1">
            <div className="flex items-center gap-2">
                <Zap className="text-app-primary fill-current" size={18} />
                <h2 className="text-lg font-bold text-white">Radar Rezeki</h2>
                
                <button 
                    onClick={handleManualScan} 
                    className={`ml-2 p-1.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 ${isScanning ? 'animate-spin text-app-primary border-app-primary' : ''}`}
                >
                    <RefreshCw size={14} />
                </button>
            </div>
            <span className="text-xs text-gray-500 font-mono border border-gray-800 px-2 py-1 rounded-lg bg-[#111]">
                {predictions.length} Titik Potensial
            </span>
        </div>

        <div className="space-y-3 pb-24">
            {predictions.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-gray-800 rounded-2xl bg-[#111]">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CloudRain size={32} className="text-gray-500" />
                    </div>
                    <p className="text-gray-400 font-bold">Area Sepi (Zona Anyep)</p>
                    <p className="text-xs text-gray-600 mt-1 max-w-[200px] mx-auto">Saran: Geser ke pusat keramaian atau matikan filter.</p>
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
                                    <span className="text-[10px] font-bold text-gray-500">
                                        {spot.distance} km
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-4 border-t border-gray-800 pt-3">
                                <button 
                                    onClick={() => { window.open(`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`, '_blank'); vibrate(10); }}
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