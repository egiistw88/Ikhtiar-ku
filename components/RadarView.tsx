import React, { useMemo, useState, useEffect } from 'react';
import { Hotspot, TimeState, DailyFinancial, GarageData } from '../types';
import { isWithinTimeWindow, calculateDistance, getTimeDifference, isNightTime } from '../utils';
import { toggleValidation, getShiftStart, resetShiftStart, getHotspots, getTodayFinancials, getGarageData } from '../services/storage';
import { CATEGORY_COLORS } from '../constants';
import { Navigation, CloudRain, Sun, Coffee, ThumbsUp, ThumbsDown, MapPin, AlertTriangle, Wrench, ArrowRight } from 'lucide-react';

interface RadarViewProps {
  hotspots: Hotspot[];
  currentTime: TimeState;
}

const RadarView: React.FC<RadarViewProps> = ({ hotspots: initialHotspots, currentTime }) => {
  const [localHotspots, setLocalHotspots] = useState<Hotspot[]>(initialHotspots);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isRainMode, setIsRainMode] = useState(false);
  const [shiftStart, setShiftStart] = useState<Date>(new Date());
  const [hoursOnline, setHoursOnline] = useState(0);
  const [financials, setFinancials] = useState<DailyFinancial | null>(null);
  const [garage, setGarage] = useState<GarageData | null>(null);

  // Get Location on Mount
  useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.log("GPS Error", err),
            { enableHighAccuracy: true }
        );
    }
  }, []);

  // Sync Data Loop
  useEffect(() => {
    setLocalHotspots(initialHotspots);
    setFinancials(getTodayFinancials());
    setGarage(getGarageData());
    setShiftStart(getShiftStart());

    const interval = setInterval(() => {
        setShiftStart(getShiftStart());
        const diff = (new Date().getTime() - getShiftStart().getTime()) / 1000 / 60 / 60;
        setHoursOnline(diff);
        setFinancials(getTodayFinancials());
        setGarage(getGarageData()); // Keep garage data fresh for alerts
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [initialHotspots]);

  const handleValidation = (id: string, isAccurate: boolean) => {
      toggleValidation(id, isAccurate);
      setLocalHotspots(getHotspots());
  };
  
  // ==========================================
  // THE BRAIN TEST: ALGORITHM IMPLEMENTATION
  // ==========================================
  const predictions = useMemo(() => {
    // 1. Time Filtering (Standard)
    let filtered = localHotspots.filter(h => {
      if (h.day !== currentTime.dayName) return false;
      return isWithinTimeWindow(h.predicted_hour, currentTime.timeString);
    });

    // 2. Feedback Loop Filter
    const todayStr = currentTime.fullDate.toISOString().split('T')[0];
    filtered = filtered.filter(h => {
        const todayVal = h.validations?.find(v => v.date === todayStr);
        return !(todayVal && todayVal.isAccurate === false);
    });

    // 3. RAIN MODE (Strict Filtering)
    if (isRainMode) {
        // HIDE Bike, Commercial, Education, Gov/Facility, Transport Hub
        // Only show Delivery, Food, Logistics, etc.
        filtered = filtered.filter(h => 
            !['Bike', 'Commercial', 'Education', 'Gov/Facility', 'Transport Hub', 'Residential'].includes(h.category)
        );
    }

    // 4. Financial Gap Analysis
    const currentHour = currentTime.fullDate.getHours();
    const isBehindTarget = financials && (financials.netProfit < (financials.target * 0.5)) && currentHour >= 14;

    if (isBehindTarget) {
        filtered = filtered.map(h => {
            if (['Mall/Lifestyle', 'Transport Hub', 'Culinary Night'].includes(h.category)) {
                return { ...h, notes: `[KEJAR TARGET] ${h.notes}` };
            }
            return h;
        });
    }

    // 5. MAINTENANCE INJECTION (ASSET CHECK)
    let maintenanceSpot: (Hotspot & { isMaintenance?: boolean }) | null = null;
    if (garage) {
        const kmDiff = garage.currentOdometer - garage.lastOilChangeKm;
        if (kmDiff >= 2000) {
            // Find closest Service spot
            const serviceSpots = localHotspots.filter(h => h.category === 'Service' || h.notes.toLowerCase().includes('bengkel'));
            if (serviceSpots.length > 0) {
                maintenanceSpot = { 
                    ...serviceSpots[0], 
                    isMaintenance: true, 
                    notes: `⚠️ PERINGATAN: OLI SUDAH PAKAI ${kmDiff} KM! Ganti sekarang.`,
                    origin: "⚠️ " + serviceSpots[0].origin
                };
            }
        }
    }

    // 6. Calculate Distance
    let mapped = filtered.map(h => {
        const dist = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, h.lat, h.lng) : 0;
        return { ...h, distance: dist };
    });

    if (userLocation) {
        // Filter > 10km unless it's High Value
        mapped = mapped.filter(h => h.distance <= 10 || ['Mall/Lifestyle', 'Transport Hub'].includes(h.category));
    }

    // 7. SORTING (Precision Sort)
    mapped.sort((a, b) => {
        // A. Maintenance Alert ALWAYS First
        if ((a as any).isMaintenance) return -1;
        if ((b as any).isMaintenance) return 1;

        // B. Contextual Priority
        let scoreA = 0;
        let scoreB = 0;

        if (isBehindTarget) {
             if (a.notes.includes('[KEJAR TARGET]')) scoreA += 5;
             if (b.notes.includes('[KEJAR TARGET]')) scoreB += 5;
        }

        if (scoreA !== scoreB) return scoreB - scoreA;

        // C. Time Precision (The closest minute match wins)
        const diffA = getTimeDifference(a.predicted_hour, currentTime.timeString);
        const diffB = getTimeDifference(b.predicted_hour, currentTime.timeString);
        if (Math.abs(diffA - diffB) > 10) { // If difference is significant (>10 mins), prioritize time
            return diffA - diffB;
        }

        // D. Distance
        return a.distance - b.distance;
    });

    if (maintenanceSpot) {
        const dist = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, maintenanceSpot.lat, maintenanceSpot.lng) : 0;
        const spotWithDist = { ...maintenanceSpot, distance: dist };
        if (!mapped.find(h => h.id === spotWithDist.id)) {
            mapped.unshift(spotWithDist);
        } else {
            mapped = mapped.filter(h => h.id !== spotWithDist.id);
            mapped.unshift(spotWithDist);
        }
    }

    return mapped;

  }, [localHotspots, currentTime, isRainMode, hoursOnline, financials, userLocation, garage]);

  const handleNavigate = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const isNight = isNightTime(currentTime.fullDate);

  return (
    <div className="pb-24 pt-4 px-4 space-y-6">
      
      {/* Header Dashboard */}
      <div className={`rounded-2xl p-5 text-white shadow-xl relative overflow-hidden border border-gray-700 transition-colors ${financials && financials.netProfit < (financials.target * 0.5) && currentTime.fullDate.getHours() > 17 ? 'bg-amber-900/40 border-amber-600' : 'bg-[#1e1e1e]'}`}>
        
        {/* Night Mode Indicator */}
        {isNight && <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>}

        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Durasi On-Bid</span>
                <span className={`text-2xl font-mono font-bold ${hoursOnline > 4 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
                    {Math.floor(hoursOnline)}<span className="text-sm">j</span> {Math.round((hoursOnline % 1) * 60)}<span className="text-sm">m</span>
                </span>
            </div>

            <button 
                onClick={() => setIsRainMode(!isRainMode)}
                className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all border ${isRainMode ? 'bg-blue-900/80 border-blue-400 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
            >
                {isRainMode ? <CloudRain size={20} className="animate-bounce" /> : <Sun size={20} />}
                <span className="text-[10px] font-bold mt-1">{isRainMode ? 'HUJAN' : 'CERAH'}</span>
            </button>
        </div>

        {/* Progress Bar Target */}
        {financials && (
            <div className="relative z-10 mb-4 bg-black/40 p-3 rounded-lg flex items-center gap-3 border border-gray-700/50">
                 <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
                        <span>Target Harian</span>
                        <span>{Math.round((financials.netProfit / financials.target) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${financials.netProfit < (financials.target * 0.5) && currentTime.fullDate.getHours() > 17 ? 'bg-amber-500' : 'bg-cyan-400'}`} style={{ width: `${Math.min(100, (financials.netProfit / financials.target) * 100)}%`}}></div>
                    </div>
                 </div>
            </div>
        )}

        <div className="relative z-10">
            <div className="flex items-baseline gap-2">
                <p className="text-5xl font-extrabold tracking-tighter text-white">{currentTime.timeString}</p>
                <p className="text-lg text-gray-400 font-bold uppercase">{currentTime.dayName}</p>
            </div>
            <p className="text-gray-400 mt-2 text-xs font-medium">
                {isRainMode 
                    ? "MODE HUJAN: Fokus Food & Delivery. Bike disembunyikan." 
                    : predictions.length > 0 
                        ? `${predictions.length} peluang di sekitar Anda.` 
                        : "Belum ada pola spesifik. Coba menu Peta."
                }
            </p>
        </div>
      </div>

      {/* Main Predictions */}
      <div className="space-y-4">
        {predictions.length > 0 ? (
             predictions.map(spot => (
                <HotspotCard 
                    key={spot.id} 
                    spot={spot} 
                    onNavigate={handleNavigate} 
                    onValidate={handleValidation}
                    currentDate={currentTime.fullDate.toISOString().split('T')[0]}
                />
            ))
        ) : (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
                 <Coffee size={48} className="text-gray-600 mb-4" />
                 <h3 className="text-xl font-bold text-gray-300">Zona Tenang</h3>
                 <p className="text-gray-500 text-sm mt-2 max-w-xs">Tidak ada data historis dalam radius waktu 60 menit. Waktunya istirahat atau cek Peta Panas.</p>
            </div>
        )}
      </div>
    </div>
  );
};

// Insight Card Component - Optimized for "At a Glance" reading
const HotspotCard: React.FC<{ 
    spot: Hotspot & { distance?: number, isMaintenance?: boolean }; 
    onNavigate: (lat: number, lng: number) => void; 
    onValidate: (id: string, isAccurate: boolean) => void;
    currentDate: string;
}> = ({ spot, onNavigate, onValidate, currentDate }) => {
    
    const validation = spot.validations?.find(v => v.date === currentDate);
    const isValidated = !!validation;
    
    const accentColor = CATEGORY_COLORS[spot.category] || '#EEEEEE';
    const isMaintenance = spot.isMaintenance;

    return (
        <div 
            className={`rounded-2xl overflow-hidden bg-[#1e1e1e] border-l-[6px] shadow-lg relative transition-all active:scale-[0.99] ${isMaintenance ? 'border-2 border-red-600 animate-pulse' : ''}`}
            style={{ borderLeftColor: isMaintenance ? '#DC2626' : accentColor }}
        >
            {isMaintenance && (
                <div className="bg-red-600 text-white text-xs font-bold px-4 py-1 flex items-center gap-2">
                    <Wrench size={12} />
                    PERINGATAN PERAWATAN
                </div>
            )}

            <div className="p-5">
                {/* 1. Header: TIME (The most important context) */}
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                         <span className={`px-3 py-1.5 rounded-lg text-lg font-extrabold text-white border ${isMaintenance ? 'bg-red-800 border-red-500' : 'bg-gray-800 border-gray-700'}`}>
                            {spot.predicted_hour}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-black/30 px-2 py-1 rounded">
                            {spot.category}
                        </span>
                    </div>
                    {spot.distance !== undefined && (
                        <div className="flex items-center gap-1 text-cyan-400 font-mono font-bold text-sm bg-cyan-900/10 px-2 py-1 rounded">
                            <MapPin size={14} />
                            {spot.distance} km
                        </div>
                    )}
                </div>
                
                {/* 2. Content: LOCATION NAME (Huge Typography) */}
                <h3 className={`text-3xl font-extrabold leading-none mb-3 tracking-tight ${isMaintenance ? 'text-red-400' : 'text-white'}`}>
                    {spot.origin}
                </h3>
                
                {/* 3. Notes (De-emphasized, concise) */}
                <p className={`text-xs mb-5 leading-relaxed line-clamp-2 ${isMaintenance ? 'text-white font-bold bg-red-900/30 p-2 rounded' : 'text-gray-500'}`}>
                    {spot.notes}
                </p>
                
                {/* 4. Actions: Large Touch Targets (Thumb Zone) */}
                <div className="grid grid-cols-[1fr_auto] gap-3 items-center pt-2">
                    <button 
                        onClick={() => onNavigate(spot.lat, spot.lng)}
                        className={`h-14 font-extrabold text-lg rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg ${isMaintenance ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-white hover:bg-gray-100 text-black'}`}
                    >
                        <Navigation size={24} />
                        NAVIGASI
                    </button>
                    
                    {/* Feedback Buttons */}
                    <div className="flex gap-2">
                         <button 
                            onClick={() => onValidate(spot.id, true)}
                            disabled={isValidated}
                            className={`h-14 w-14 flex items-center justify-center rounded-xl border-2 font-bold transition-all ${isValidated && validation?.isAccurate ? 'bg-green-900/50 border-green-500 text-green-400' : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'}`}
                        >
                            <ThumbsUp size={24} />
                        </button>
                        <button 
                            onClick={() => onValidate(spot.id, false)}
                            disabled={isValidated}
                            className={`h-14 w-14 flex items-center justify-center rounded-xl border-2 font-bold transition-all ${isValidated && !validation?.isAccurate ? 'bg-red-900/50 border-red-500 text-red-400' : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'}`}
                        >
                            <ThumbsDown size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RadarView;