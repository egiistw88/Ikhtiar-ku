import React, { useMemo, useState, useEffect } from 'react';
import { Hotspot, TimeState, DailyFinancial, GarageData, UserSettings, ShiftState } from '../types';
import { calculateDistance, getTimeDifference, isNightTime } from '../utils';
import { toggleValidation, getHotspots, getTodayFinancials, getGarageData, getUserSettings } from '../services/storage';
import { CATEGORY_COLORS } from '../constants';
import { Navigation, CloudRain, Sun, Settings, ThumbsUp, ThumbsDown, MapPin, Wrench, Power, AlertTriangle, CheckCircle, Battery } from 'lucide-react';

interface RadarViewProps {
  hotspots: Hotspot[];
  currentTime: TimeState;
  shiftState: ShiftState | null;
  onOpenSettings: () => void;
  onOpenSummary: (finance: DailyFinancial | null) => void;
}

interface ScoredHotspot extends Hotspot {
    distance: number;
    score: number;
    isMaintenance?: boolean;
    matchReason?: string;
}

const RadarView: React.FC<RadarViewProps> = ({ hotspots: initialHotspots, currentTime, shiftState, onOpenSettings, onOpenSummary }) => {
  const [localHotspots, setLocalHotspots] = useState<Hotspot[]>(initialHotspots);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isRainMode, setIsRainMode] = useState(false);
  const [financials, setFinancials] = useState<DailyFinancial | null>(null);
  const [garage, setGarage] = useState<GarageData | null>(null);
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());

  // GPS & Data Sync
  useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            undefined,
            { enableHighAccuracy: true }
        );
    }
    
    const sync = () => {
        setLocalHotspots(initialHotspots);
        setFinancials(getTodayFinancials());
        setGarage(getGarageData());
        setSettings(getUserSettings());
    };

    sync();
    const interval = setInterval(sync, 60000);
    return () => clearInterval(interval);
  }, [initialHotspots]);

  const handleValidation = (id: string, isAccurate: boolean) => {
      toggleValidation(id, isAccurate);
      setLocalHotspots(getHotspots());
  };

  // ==========================================
  // LOGIC: SCORING ENGINE (Optimized)
  // ==========================================
  const predictions: ScoredHotspot[] = useMemo(() => {
    const todayStr = currentTime.fullDate.toISOString().split('T')[0];
    const currentNet = financials?.netCash || 0;
    const isBehind = (currentNet < (settings.targetRevenue * 0.4)); // Behind target logic

    // Filter Logic
    let matches = localHotspots.filter(h => {
        // Day Check
        if (h.day !== currentTime.dayName) return false;
        
        // Bad Feedback Check
        const bad = h.validations?.find(v => v.date === todayStr && !v.isAccurate);
        if (bad) return false;

        // Settings Prefs
        const p = settings.preferences;
        if (!p.showFood && h.category.includes('Culinary')) return false;
        if (!p.showBike && h.type.includes('Bike')) return false;
        if (!p.showSend && (h.type.includes('Delivery') || h.category === 'Logistics')) return false;

        return true;
    });

    // Scoring Map
    return matches.map(h => {
        const dist = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, h.lat, h.lng) : 0;
        let score = 100;
        let reason = "Sesuai Jadwal";

        // Time Penalty (Strict)
        const tDiff = getTimeDifference(h.predicted_hour, currentTime.timeString);
        if (tDiff > 90) score = -100;
        else score -= (tDiff * 0.5);

        // Distance Penalty (Adaptive based on fuel)
        const fuelLevel = shiftState?.startFuel || 50;
        const radiusLimit = isRainMode ? 5 : (fuelLevel < 25 ? 3 : 10); // Restrict radius if low fuel
        
        if (dist > radiusLimit) score = -100;
        else score -= (dist * 3);

        // Context Bonus
        if (isRainMode && ['Mall/Lifestyle', 'Culinary'].includes(h.category)) {
            score += 30; reason = "Spot Teduh";
        }
        if (isBehind && h.category === 'Transport Hub') {
            score += 20; reason = "Potensi Argo Jauh";
        }

        // Maintenance Override
        if (garage && (garage.currentOdometer - garage.lastOilChangeKm > 2000) && h.category === 'Service') {
            score = 500; h.isMaintenance = true; reason = "PERLU SERVIS";
        }

        return { ...h, distance: dist, score: Math.round(score), matchReason: reason };
    })
    .filter(h => h.score > 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Show Top 5 Only

  }, [localHotspots, currentTime, isRainMode, financials, userLocation, shiftState]);

  const progress = Math.min(100, Math.round(((financials?.netCash || 0) / settings.targetRevenue) * 100));
  const statusColor = shiftState?.status === 'CRITICAL' ? 'bg-red-500' : shiftState?.status === 'WARNING' ? 'bg-yellow-500' : 'bg-emerald-500';

  return (
    <div className="pt-4 px-4 space-y-6">
      
      {/* 1. DASHBOARD HEADER */}
      <div className="relative bg-app-card rounded-3xl p-5 border border-app-border overflow-hidden">
        {/* Ambient Glow */}
        <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full opacity-20 ${progress >= 100 ? 'bg-app-accent' : 'bg-app-primary'}`}></div>
        
        <div className="flex justify-between items-start mb-6">
            <div>
                <h1 className="text-4xl font-black text-white tracking-tighter">{currentTime.timeString}</h1>
                <p className="text-app-primary text-sm font-bold uppercase tracking-widest">{currentTime.dayName}</p>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => setIsRainMode(!isRainMode)}
                    className={`p-3 rounded-2xl transition-all ${isRainMode ? 'bg-blue-600 text-white shadow-glow' : 'bg-app-border text-gray-400'}`}
                >
                    {isRainMode ? <CloudRain size={20} className="animate-bounce" /> : <Sun size={20} />}
                </button>
                <button onClick={onOpenSettings} className="p-3 rounded-2xl bg-app-border text-gray-400">
                    <Settings size={20} />
                </button>
            </div>
        </div>

        {/* NEW: STATUS KESIAPAN TEMPUR (Replaces On-Bid Duration) */}
        <div className="bg-[#000] rounded-xl p-3 border border-gray-800 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${statusColor}`}>
                    {shiftState?.status === 'SAFE' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Status Modal</p>
                    <p className="text-white text-xs font-bold leading-tight max-w-[150px]">
                        {shiftState?.recommendation || "Siap Tempur"}
                    </p>
                </div>
            </div>
            <div onClick={() => onOpenSummary(financials)} className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg cursor-pointer">
                 <Power size={20} className="text-red-400" />
            </div>
        </div>

        {/* Progress Bar */}
        <div>
            <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400 mb-1">
                <span>Target Harian</span>
                <span className={progress >= 100 ? 'text-app-accent' : 'text-white'}>{progress}%</span>
            </div>
            <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-1000 ${progress >= 100 ? 'bg-app-accent' : 'bg-app-primary'}`} 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
      </div>

      {/* 2. PREDICTION LIST */}
      <div>
        <div className="flex justify-between items-end mb-4 px-1">
            <h2 className="text-lg font-bold text-white">Radar Rezeki</h2>
            <span className="text-xs text-app-primary font-mono">{predictions.length} Spot Aktif</span>
        </div>

        <div className="space-y-3">
            {predictions.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-app-border rounded-2xl">
                    <p className="text-gray-500 font-bold">Radar Sepi Ndan...</p>
                    <p className="text-xs text-gray-600 mt-1">Coba geser lokasi atau matikan filter.</p>
                </div>
            ) : (
                predictions.map(spot => (
                    <div key={spot.id} className="bg-app-card border border-app-border rounded-2xl p-4 relative group">
                        {/* Left Border Color Indicator */}
                        <div 
                            className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full" 
                            style={{ backgroundColor: spot.isMaintenance ? '#EF4444' : CATEGORY_COLORS[spot.category] || '#fff' }}
                        ></div>

                        <div className="pl-3">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-lg text-white leading-tight">{spot.origin}</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">{spot.category} • {spot.matchReason}</p>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xl font-mono font-bold text-app-primary">{spot.predicted_hour}</span>
                                    <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">
                                        {spot.distance} km
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-4">
                                <button 
                                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`, '_blank')}
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${spot.isMaintenance ? 'bg-app-danger text-white' : 'bg-white text-black hover:bg-gray-200'}`}
                                >
                                    <Navigation size={16} />
                                    {spot.isMaintenance ? 'KE BENGKEL' : 'GAS KESANA'}
                                </button>
                                
                                <div className="flex gap-1">
                                    <button onClick={() => handleValidation(spot.id, true)} className="p-2.5 bg-gray-800 rounded-xl text-app-accent border border-gray-700">
                                        <ThumbsUp size={18} />
                                    </button>
                                    <button onClick={() => handleValidation(spot.id, false)} className="p-2.5 bg-gray-800 rounded-xl text-app-danger border border-gray-700">
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