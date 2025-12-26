import React, { useMemo, useState, useEffect } from 'react';
import { Hotspot, TimeState, DailyFinancial, GarageData, UserSettings } from '../types';
import { isWithinTimeWindow, calculateDistance, getTimeDifference, isNightTime } from '../utils';
import { toggleValidation, getShiftStart, getHotspots, getTodayFinancials, getGarageData, getUserSettings } from '../services/storage';
import { CATEGORY_COLORS } from '../constants';
import { Navigation, CloudRain, Sun, Coffee, ThumbsUp, ThumbsDown, MapPin, Wrench, BarChart3, Settings as SettingsIcon } from 'lucide-react';

interface RadarViewProps {
  hotspots: Hotspot[];
  currentTime: TimeState;
  onOpenSettings: () => void;
  onOpenSummary: (hours: number, finance: DailyFinancial | null) => void;
}

// Extend Hotspot type locally for scoring
interface ScoredHotspot extends Hotspot {
    distance: number;
    score: number;
    isMaintenance?: boolean;
    matchReason?: string;
}

const RadarView: React.FC<RadarViewProps> = ({ hotspots: initialHotspots, currentTime, onOpenSettings, onOpenSummary }) => {
  const [localHotspots, setLocalHotspots] = useState<Hotspot[]>(initialHotspots);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isRainMode, setIsRainMode] = useState(false);
  const [shiftStart, setShiftStart] = useState<Date>(new Date());
  const [hoursOnline, setHoursOnline] = useState(0);
  const [financials, setFinancials] = useState<DailyFinancial | null>(null);
  const [garage, setGarage] = useState<GarageData | null>(null);
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());

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
    setSettings(getUserSettings());

    const interval = setInterval(() => {
        setShiftStart(getShiftStart());
        const diff = (new Date().getTime() - getShiftStart().getTime()) / 1000 / 60 / 60;
        setHoursOnline(diff);
        setFinancials(getTodayFinancials());
        setGarage(getGarageData());
        setSettings(getUserSettings());
    }, 60000); 
    return () => clearInterval(interval);
  }, [initialHotspots]);

  const handleValidation = (id: string, isAccurate: boolean) => {
      toggleValidation(id, isAccurate);
      setLocalHotspots(getHotspots());
  };
  
  const handleNavigate = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  // ==========================================
  // ALGORITMA CERDAS: SCORING & FILTERING
  // ==========================================
  const predictions: ScoredHotspot[] = useMemo(() => {
    const todayStr = currentTime.fullDate.toISOString().split('T')[0];
    const currentHour = currentTime.fullDate.getHours();
    
    // Status Keuangan: Check if we are behind based on Real Net Cash
    // Jika netCash kurang dari 50% target dan sudah sore, driver butuh orderan besar/jauh.
    const currentNet = financials?.netCash || 0;
    const isBehindTarget = (currentNet < (settings.targetRevenue * 0.5)) && currentHour >= 14;

    // Radius Constraint (Dinari)
    const MAX_RADIUS_KM = isRainMode ? 4.0 : 8.0; // Saat hujan, max 4km. Normal 8km.
    const MAX_RADIUS_KEJAR_TARGET = 12.0; // Kalau lagi kejar target, rela jauh.

    let scoredSpots: ScoredHotspot[] = localHotspots.map(h => {
        const dist = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, h.lat, h.lng) : 0;
        return { ...h, distance: dist, score: 0 };
    });

    // FILTER 1: HARD FILTERS (Day, Validation, Maintenance)
    scoredSpots = scoredSpots.filter(h => {
        // Must match day
        if (h.day !== currentTime.dayName) return false;
        
        // Exclude invalidated spots for today
        const todayVal = h.validations?.find(v => v.date === todayStr);
        if (todayVal && todayVal.isAccurate === false) return false;

        return true;
    });

    // FILTER 2: USER PREFERENCES (From Settings)
    scoredSpots = scoredSpots.filter(h => {
        const cat = h.category;
        const type = h.type;
        const prefs = settings.preferences;

        // Broad category matching logic
        if (!prefs.showFood && (cat === 'Culinary' || cat === 'Culinary Night')) return false;
        if (!prefs.showBike && (type === 'Bike' || cat === 'Transport Hub' || cat === 'Education' || cat === 'Education/Office')) return false;
        if (!prefs.showSend && (type === 'Bike Delivery' || cat === 'Logistics')) return false;
        if (!prefs.showShop && (cat === 'Market' || cat === 'Mall/Lifestyle' || cat === 'Residential/Shop')) return false;
        
        return true;
    });

    // FILTER 3: RAIN MODE INTELLIGENCE
    if (isRainMode) {
        scoredSpots = scoredSpots.filter(h => {
            // Saat hujan: Sembunyikan 'Bike' (Penumpang), Pendidikan, Fasilitas Umum
            // Fokus ke: Food, Delivery, Logistics, Shop
            const bannedInRain = ['Bike', 'Education', 'Gov/Facility', 'Transport Hub', 'Education/Office'];
            return !bannedInRain.includes(h.category);
        });
    }

    // SCORING ENGINE
    scoredSpots = scoredSpots.map(h => {
        let score = 100; // Base Score
        let matchReason = "Sesuai Jadwal";

        // A. Time Scoring
        // We look for spots within -30 mins to +90 mins of predicted hour
        const timeDiff = getTimeDifference(h.predicted_hour, currentTime.timeString);
        
        if (timeDiff > 90) {
            score = -100; // Too far in time, kill it
        } else {
            // Penalty for time difference: -1 point per minute off
            score -= (timeDiff * 0.8);
        }

        // B. Distance Scoring
        // Heavy penalty for distance
        if (h.distance > (isBehindTarget ? MAX_RADIUS_KEJAR_TARGET : MAX_RADIUS_KM)) {
            score = -100; // Too far, kill it
        } else {
            // -5 points per KM
            score -= (h.distance * 5);
        }

        // C. Rain Mode Bonus (Shelter/Mall)
        if (isRainMode && ['Mall/Lifestyle', 'Culinary'].includes(h.category)) {
            score += 15;
            matchReason = "Spot Indoor (Hujan)";
        }

        // D. Financial Context Bonus
        if (isBehindTarget) {
            if (['Mall/Lifestyle', 'Transport Hub', 'Culinary Night'].includes(h.category)) {
                score += 20;
                matchReason = "Potensi Orderan Besar";
            }
        }

        // E. Maintenance Injection
        if (garage) {
            const kmDiff = garage.currentOdometer - garage.lastOilChangeKm;
            if (kmDiff >= 2000 && (h.category === 'Service' || h.notes.toLowerCase().includes('bengkel'))) {
                score = 200; // FORCE TOP PRIORITY
                h.isMaintenance = true;
                matchReason = "DARURAT SERVIS";
            }
        }

        return { ...h, score: Math.round(score), matchReason };
    });

    // FILTER 4: Remove low scores
    scoredSpots = scoredSpots.filter(h => h.score > 40); // Only relevant spots

    // SORTING: Highest Score First
    scoredSpots.sort((a, b) => b.score - a.score);

    // LIMIT: Top 7 only to prevent confusion
    return scoredSpots.slice(0, 7);

  }, [localHotspots, currentTime, isRainMode, financials, userLocation, garage, settings]);

  const isNight = isNightTime(currentTime.fullDate);
  // Progress Bar visual logic based on Net Cash vs Target
  const currentNetCash = financials?.netCash || 0;
  const progressPercent = Math.max(0, Math.min(100, (currentNetCash / settings.targetRevenue) * 100));

  return (
    <div className="pb-24 pt-4 px-4 space-y-6">
      
      {/* Header Dashboard */}
      <div className={`rounded-2xl p-5 text-white shadow-xl relative overflow-hidden border border-gray-700 transition-colors ${currentNetCash < (settings.targetRevenue * 0.3) && currentTime.fullDate.getHours() > 17 ? 'bg-amber-900/40 border-amber-600' : 'bg-[#1e1e1e]'}`}>
        
        {/* Night Mode Indicator */}
        {isNight && <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>}

        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Durasi On-Bid</span>
                <span className={`text-2xl font-mono font-bold ${hoursOnline > 12 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
                    {Math.floor(hoursOnline)}<span className="text-sm">j</span> {Math.round((hoursOnline % 1) * 60)}<span className="text-sm">m</span>
                </span>
            </div>

            <div className="flex gap-2">
                 <button 
                    onClick={onOpenSettings}
                    className="flex items-center justify-center p-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                >
                    <SettingsIcon size={20} />
                </button>
                <button 
                    onClick={() => setIsRainMode(!isRainMode)}
                    className={`flex items-center justify-center p-2 rounded-xl transition-all border ${isRainMode ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                >
                    {isRainMode ? <CloudRain size={20} className="animate-bounce" /> : <Sun size={20} />}
                </button>
            </div>
        </div>

        {/* Progress Bar Target */}
        {financials && (
            <div className="relative z-10 mb-4 bg-black/40 p-3 rounded-lg flex items-center gap-3 border border-gray-700/50">
                 <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
                        <span>Target Bersih</span>
                        <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${progressPercent < 30 ? 'bg-red-500' : 'bg-cyan-400'}`} style={{ width: `${progressPercent}%`}}></div>
                    </div>
                 </div>
            </div>
        )}

        <div className="relative z-10 flex justify-between items-end">
            <div>
                <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-extrabold tracking-tighter text-white">{currentTime.timeString}</p>
                    <p className="text-lg text-gray-400 font-bold uppercase">{currentTime.dayName}</p>
                </div>
                <p className="text-gray-400 mt-2 text-xs font-medium">
                    {isRainMode 
                        ? "MODE HUJAN: Menampilkan spot indoor & non-bike." 
                        : predictions.length > 0 
                            ? `${predictions.length} rekomendasi aktif.` 
                            : "Tidak ada spot relevan."
                    }
                </p>
            </div>
            
            {/* TUTUP BUKU BUTTON */}
            <button 
                onClick={() => onOpenSummary(hoursOnline, financials)}
                className="text-[10px] font-bold text-red-400 hover:text-red-300 border border-red-900 bg-red-900/20 px-3 py-1.5 rounded-lg"
            >
                TUTUP BUKU
            </button>
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
                 <h3 className="text-xl font-bold text-gray-300">Radar Sepi</h3>
                 <p className="text-gray-500 text-sm mt-2 max-w-xs">
                     Tidak ada titik yang cocok dengan filter Anda. Coba cek pengaturan atau matikan filter.
                 </p>
            </div>
        )}
      </div>
    </div>
  );
};

// Insight Card Component
const HotspotCard: React.FC<{ 
    spot: ScoredHotspot; 
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
                {/* 1. Header: TIME & SCORE */}
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                         <span className={`px-3 py-1.5 rounded-lg text-lg font-extrabold text-white border ${isMaintenance ? 'bg-red-800 border-red-500' : 'bg-gray-800 border-gray-700'}`}>
                            {spot.predicted_hour}
                        </span>
                        {/* Relevance Badge */}
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-800 border border-gray-700">
                             <BarChart3 size={12} className={spot.score > 80 ? 'text-green-400' : 'text-yellow-400'} />
                             <span className={`text-[10px] font-bold ${spot.score > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                                Skor: {spot.score}%
                             </span>
                        </div>
                    </div>
                    {spot.distance !== undefined && (
                        <div className={`flex items-center gap-1 font-mono font-bold text-sm px-2 py-1 rounded ${spot.distance > 5 ? 'text-amber-400 bg-amber-900/10' : 'text-cyan-400 bg-cyan-900/10'}`}>
                            <MapPin size={14} />
                            {spot.distance} km
                        </div>
                    )}
                </div>
                
                {/* 2. Content: LOCATION NAME */}
                <h3 className={`text-2xl font-extrabold leading-tight mb-1 tracking-tight ${isMaintenance ? 'text-red-400' : 'text-white'}`}>
                    {spot.origin}
                </h3>

                <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-black/30 px-2 py-1 rounded border border-gray-700">
                        {spot.category}
                    </span>
                    <span className="text-[10px] italic text-gray-500">
                        • {spot.matchReason}
                    </span>
                </div>
                
                {/* 3. Notes */}
                <p className={`text-xs mb-5 leading-relaxed line-clamp-2 ${isMaintenance ? 'text-white font-bold bg-red-900/30 p-2 rounded' : 'text-gray-400'}`}>
                    {spot.notes}
                </p>
                
                {/* 4. Actions */}
                <div className="grid grid-cols-[1fr_auto] gap-3 items-center pt-2">
                    <button 
                        onClick={() => onNavigate(spot.lat, spot.lng)}
                        className={`h-12 font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg ${isMaintenance ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-gray-100 hover:bg-white text-black'}`}
                    >
                        <Navigation size={18} />
                        NAVIGASI
                    </button>
                    
                    {/* Feedback Buttons */}
                    <div className="flex gap-2">
                         <button 
                            onClick={() => onValidate(spot.id, true)}
                            disabled={isValidated}
                            className={`h-12 w-12 flex items-center justify-center rounded-xl border-2 font-bold transition-all ${isValidated && validation?.isAccurate ? 'bg-green-900/50 border-green-500 text-green-400' : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'}`}
                        >
                            <ThumbsUp size={20} />
                        </button>
                        <button 
                            onClick={() => onValidate(spot.id, false)}
                            disabled={isValidated}
                            className={`h-12 w-12 flex items-center justify-center rounded-xl border-2 font-bold transition-all ${isValidated && !validation?.isAccurate ? 'bg-red-900/50 border-red-500 text-red-400' : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'}`}
                        >
                            <ThumbsDown size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RadarView;