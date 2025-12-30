
import React, { useMemo, useState, useEffect } from 'react';
import { Hotspot, TimeState, DailyFinancial, GarageData, UserSettings, ShiftState, StrategyType } from '../types';
import { calculateDistance, vibrate, playSound, calculateFuelRange, shouldRefuel, projectEarnings, calculateEarningsVelocity, isWithinPrayerTime, getTrafficCondition, estimateCompetitionDensity } from '../utils';
import { toggleValidation, getHotspots, getTodayFinancials, getGarageData, getUserSettings, getTransactions } from '../services/storage';
import { generateDriverStrategy } from '../services/ai';
import { FUEL_CONSTANTS, RAIN_SAFE_ZONES } from '../constants';
import { Navigation, CloudRain, Sun, Settings, ThumbsUp, ThumbsDown, Power, Battery, Zap, RefreshCw, Sparkles, X, Utensils, Bike, Package, Layers, Skull, TrendingUp, Clock, RotateCcw, ArrowUpRight, Signal, Rabbit, Crosshair, Flame, Target, Fuel, AlertTriangle, TrendingDown, Users, MapPin } from 'lucide-react';

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
    priorityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    strategyMatch: boolean; // NEW: Apakah sesuai banget sama strategi?
}

type QuickFilterType = 'ALL' | 'FOOD' | 'BIKE' | 'SEND';

export const RadarView: React.FC<RadarViewProps> = ({ hotspots: initialHotspots, currentTime, shiftState, onOpenSettings, onOpenSummary, onRequestRest, onToast }) => {
  const [localHotspots, setLocalHotspots] = useState<Hotspot[]>(initialHotspots);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isRainMode, setIsRainMode] = useState(false);
  const [financials, setFinancials] = useState<DailyFinancial | null>(null);
  const [garage, setGarage] = useState<GarageData | null>(null);
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('ALL');
  const [isScanning, setIsScanning] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [gpsReady, setGpsReady] = useState(false);
  const [showPowerMenu, setShowPowerMenu] = useState(false);
  
  const [momentumScore, setMomentumScore] = useState(0); 

  useEffect(() => {
    syncData();
    calculateMomentum();
    
    let watchId: number | null = null;
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGpsReady(true);
            },
            (err) => console.log("GPS Error/Waiting...", err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
    }

    const handleResume = () => {
        if (document.visibilityState === 'visible') {
            syncData(); 
            calculateMomentum();
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        setGpsReady(true);
                    },
                    undefined,
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            }
        }
    };
    document.addEventListener('visibilitychange', handleResume);

    const interval = setInterval(() => { syncData(); calculateMomentum(); }, 30000); 

    return () => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleResume);
    };
  }, [shiftState]); 

  const syncData = () => {
        setLocalHotspots(getHotspots()); 
        setFinancials(getTodayFinancials());
        setGarage(getGarageData());
        setSettings(getUserSettings());
  };

  const calculateMomentum = () => {
      const txs = getTransactions();
      const now = Date.now();
      const twoHoursAgo = now - (2 * 60 * 60 * 1000);
      const recentTx = txs.filter(t => t.timestamp > twoHoursAgo);
      
      const strategy = shiftState?.strategy || 'FEEDER';
      let score = 0;

      if (strategy === 'SNIPER') {
          // Sniper Logic: Kualitas (Nilai Order) lebih penting
          // Order > 30rb = 50 poin. Order < 30rb = 10 poin.
          recentTx.forEach(tx => {
              if (tx.amount >= 30000) score += 50;
              else score += 10;
          });
      } else {
          // Feeder Logic: Kuantitas (Jumlah Order) lebih penting
          // 1 Order = 25 poin. (4 order dalam 2 jam = 100%)
          score = recentTx.length * 25;
      }
      
      setMomentumScore(Math.min(100, score));
  }

  // LOGIC REVISI: Golden Time Dynamic based on Strategy
  const getGoldenTimeStatus = (): { active: boolean, label: string, color: string } => {
      const hour = currentTime.fullDate.getHours();
      const strat = shiftState?.strategy || 'FEEDER';

      if (strat === 'SNIPER') {
          // Sniper Golden Time: 22.00 - 04.00
          if (hour >= 22 || hour < 4) return { active: true, label: 'GOLDEN TIME: NGALONG', color: 'text-purple-400' };
          if (hour >= 18 && hour < 22) return { active: false, label: 'WARMING UP', color: 'text-blue-400' };
          return { active: false, label: 'OFF DUTY', color: 'text-gray-600' };
      } else {
          // Feeder Golden Time: Rush Hours
          if (hour >= 6 && hour < 9) return { active: true, label: 'GOLDEN TIME: PAGI', color: 'text-amber-400' };
          if (hour >= 11 && hour < 13) return { active: true, label: 'GOLDEN TIME: SIANG', color: 'text-orange-400' };
          if (hour >= 16 && hour < 19) return { active: true, label: 'GOLDEN TIME: SORE', color: 'text-emerald-400' };
          return { active: false, label: 'JAM NORMAL', color: 'text-gray-500' };
      }
  };

  const goldenTime = getGoldenTimeStatus();

  const handleManualScan = () => {
      vibrate(10);
      playSound('click');
      setIsScanning(true);
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGpsReady(true);
            },
            () => onToast("GPS Lemah/Mati"),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
          );
      }
      setTimeout(() => { syncData(); setIsScanning(false); playSound('success'); onToast("Radar diperbarui"); }, 1000);
  };

  const handleAiAnalysis = async () => {
      vibrate(20); playSound('click'); setIsAiLoading(true); setAiAdvice(null);
      const strategy = await generateDriverStrategy(predictions, financials, shiftState, userLocation);
      setAiAdvice(strategy); setIsAiLoading(false); vibrate([50, 50, 50]); playSound('success');
  };

  const handleValidation = (id: string, isAccurate: boolean) => {
      toggleValidation(id, isAccurate);
      setLocalHotspots(prev => prev.map(h => h.id === id ? { ...h, validations: [...(h.validations || []), { date: currentTime.fullDate.toISOString().split('T')[0], isAccurate }] } : h));
      vibrate(10); playSound(isAccurate ? 'success' : 'click'); onToast(isAccurate ? "Validasi: Gacor! (Disimpan)" : "Validasi: Anyep (Dihindari)");
  };

  // --- CORE RANKING ALGORITHM ---
  const predictions: ScoredHotspot[] = useMemo(() => {
    const currentHour = currentTime.fullDate.getHours();
    const currentMinute = currentTime.fullDate.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const strategy = shiftState?.strategy || 'FEEDER';
    
    const candidates = localHotspots.filter(h => {
        if (quickFilter === 'FOOD') return (h.category.includes('Culinary') || h.type === 'Food' || h.type.includes('Shop') || h.category === 'Mall/Lifestyle');
        if (quickFilter === 'BIKE') return (h.type.includes('Bike') || h.type === 'Ride' || h.category === 'Residential' || h.category === 'Transport Hub');
        if (quickFilter === 'SEND') return (h.type.includes('Delivery') || h.category === 'Logistics');
        return true;
    });

    const scored = candidates.map(h => {
        let score = h.baseScore ? (h.baseScore * 10) : 500; 
        let reasons: string[] = [];
        let distance = 0; 
        let strategyMatch = false;

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
        
        if (diffMinutes <= 45) { score += 600; reasons.push("Jam Gacor"); }
        else if (diffMinutes <= 90) score += 300;
        else if (diffMinutes <= 180) score -= 100;
        else score -= 600;

        if (h.isDaily) score += 200;
        else if (h.day === currentTime.dayName) { score += 400; reasons.push(`Spesial ${h.day}`); }
        else score -= 800;

        // --- STRATEGY MULTIPLIER (THE BRAIN) ---
        if (strategy === 'SNIPER') {
            // Sniper likes Hubs, Malls, Long Distance potential
            if (['Transport Hub', 'Mall/Lifestyle', 'Culinary Night', 'Commercial', 'Logistics'].includes(h.category)) {
                score += 800; // HUGE BOOST
                strategyMatch = true;
                reasons.unshift("🎯 Target Sniper");
            } else if (['Residential', 'School', 'Education'].includes(h.category)) {
                score -= 1000; // HEAVY PENALTY (Noise Reduction)
                reasons.push("Receh (Hindari)");
            }
        } else {
            // Feeder likes Residential, School, Quick trips
            if (['Residential', 'Education', 'School', 'Residential/Shop'].includes(h.category)) {
                score += 500;
                strategyMatch = true;
                reasons.unshift("⚡ Fast Track");
            }
            // Proximity is king for Feeder
            if (distance < 2) score += 400;
        }

        let isMaintenance = false;
        const maintenanceInterval = garage?.serviceInterval || 2000;
        const kmSinceOil = (garage?.currentOdometer || 0) - (garage?.lastOilChangeKm || 0);
        if (kmSinceOil > maintenanceInterval && h.category === 'Service') {
            score += 5000; isMaintenance = true; reasons = ["⚠️ WAKTUNYA SERVIS"];
        }

        let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
        if (score > 1200) priority = 'HIGH';
        else if (score > 600) priority = 'MEDIUM';

        // INTELLIGENT RAIN MODE: Boost shelter zones
        if (isRainMode) {
             if (['Mall/Lifestyle', 'Culinary', 'Culinary Night'].includes(h.category)) { 
                 score += 700; 
                 reasons.unshift("☔ Zona Teduh"); 
             }
             else if (['Transport Hub', 'Commercial'].includes(h.category)) {
                 score += 300; // Partial boost untuk indoor areas
                 reasons.push("Semi-Teduh");
             }
             else {
                 score -= 600; // Heavy penalty untuk outdoor
             }
        }
        
        // TRAFFIC MULTIPLIER
        const trafficCondition = getTrafficCondition(h.zone, currentHour);
        if (trafficCondition.status === 'HEAVY' && strategy === 'FEEDER') {
            score += 300; // Feeder loves traffic jams
            reasons.push("Macet = Cuan");
        }

        return { ...h, distance, score: Math.round(score), matchReason: reasons[0] || (score > 600 ? "Potensi" : "Alternatif"), isMaintenance, priorityLevel: priority, strategyMatch };
    });

    // Filter out negative scores entirely to reduce noise
    return scored.filter(s => s.score > 0 || s.isMaintenance).sort((a, b) => b.score - a.score).slice(0, 7);
  }, [localHotspots, currentTime, isRainMode, financials, userLocation, gpsReady, shiftState, settings, quickFilter, garage]);

  const progress = Math.min(100, Math.round(((financials?.netCash || 0) / settings.targetRevenue) * 100));

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

      {/* HEADER WITH STRATEGY INDICATOR */}
      <div className="flex justify-between items-start">
          <div>
              <div className="flex items-center gap-2 mb-1">
                 <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${shiftState?.strategy === 'SNIPER' ? 'bg-purple-900/30 text-purple-400 border border-purple-500/30' : 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'}`}>
                    {shiftState?.strategy === 'SNIPER' ? <Crosshair size={10}/> : <Rabbit size={10}/>}
                    {shiftState?.strategy === 'SNIPER' ? 'MODE SNIPER' : 'MODE FEEDER'}
                 </span>
                 {isRainMode && <span className="text-[10px] font-bold text-blue-300 bg-blue-900/30 px-2 py-0.5 rounded flex items-center gap-1"><CloudRain size={10}/> HUJAN</span>}
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

      {/* MOMENTUM & SERVER STATUS CARD */}
      <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-gray-800 relative overflow-hidden">
          <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${goldenTime.active ? 'bg-amber-400 animate-pulse' : 'bg-gray-600'}`}></div>
                  <span className={`text-xs font-black uppercase ${goldenTime.color}`}>{goldenTime.label}</span>
              </div>
              <div className="flex items-center gap-1">
                  <Flame size={14} className={momentumScore > 50 ? 'text-orange-500 animate-bounce' : 'text-gray-600'} />
                  <span className="text-[10px] font-bold text-gray-400">MOMENTUM</span>
              </div>
          </div>
          
          <div className="relative h-2 w-full bg-black rounded-full overflow-hidden">
              <div 
                  className={`absolute left-0 top-0 h-full transition-all duration-1000 ${momentumScore > 75 ? 'bg-orange-500' : 'bg-blue-600'}`} 
                  style={{ width: `${momentumScore}%` }}
              ></div>
          </div>
          <div className="flex justify-between mt-1 text-[9px] font-mono text-gray-500">
              <span>DINGIN</span>
              <span>HANGAT</span>
              <span>GACOR</span>
          </div>

          {/* DYNAMIC MOMENTUM ADVICE */}
          {momentumScore < 20 && (
              <div className={`mt-3 p-2 border rounded-lg flex items-start gap-2 ${shiftState?.strategy === 'SNIPER' ? 'bg-purple-900/20 border-purple-800' : 'bg-blue-900/20 border-blue-800'}`}>
                  {shiftState?.strategy === 'SNIPER' ? (
                      <>
                        <Target size={12} className="text-purple-400 mt-0.5" />
                        <p className="text-[10px] text-purple-200 leading-tight">
                            <strong>Mental Baja!</strong> Akun dingin hal biasa buat Sniper. Tunggu satu tarikan besar, jangan panik ambil receh. Sabar!
                        </p>
                      </>
                  ) : (
                      <>
                        <Zap size={12} className="text-blue-400 mt-0.5" />
                        <p className="text-[10px] text-blue-200 leading-tight">
                            <strong>Akun Dingin?</strong> "Cocol" manual orderan pendek sekarang untuk memancing server (Feeding). Jangan cancel!
                        </p>
                      </>
                  )}
              </div>
          )}
      </div>

      {/* SMART DASHBOARD: Earnings Projection + Fuel + Prayer Alert */}
      <div className="space-y-3">
        {/* EARNINGS PROJECTION */}
        {shiftState && financials && (() => {
          const elapsedMinutes = Math.floor((Date.now() - shiftState.startTime) / 60000);
          const projectedEarnings = projectEarnings(financials.grossIncome, elapsedMinutes);
          const earningsVelocity = calculateEarningsVelocity(financials.grossIncome, elapsedMinutes);
          const isOnTrack = projectedEarnings >= settings.targetRevenue;
          
          return (
            <div className={`bg-[#1a1a1a] rounded-2xl p-4 border ${isOnTrack ? 'border-emerald-800' : 'border-orange-800'} relative overflow-hidden`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Proyeksi Akhir Shift</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-2xl font-black ${isOnTrack ? 'text-emerald-400' : 'text-orange-400'}`}>Rp{Math.round(projectedEarnings/1000)}k</span>
                    {isOnTrack ? (
                      <TrendingUp size={16} className="text-emerald-400" />
                    ) : (
                      <TrendingDown size={16} className="text-orange-400" />
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">Kecepatan</span>
                  <span className="text-sm font-bold text-app-primary">Rp{Math.round(earningsVelocity/1000)}k/jam</span>
                </div>
              </div>
              <div className="h-2 w-full bg-black rounded-full overflow-hidden border border-gray-700">
                <div className={`h-full transition-all duration-1000 ${isOnTrack ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, progress)}%` }}></div>
              </div>
              {!isOnTrack && elapsedMinutes > 60 && (
                <p className="text-[10px] text-orange-300 mt-2 flex items-center gap-1">
                  <AlertTriangle size={10} /> Kecepatan kurang! {shiftState.strategy === 'SNIPER' ? 'Cari 1-2 orderan besar.' : 'Tingkatkan frekuensi orderan.'}
                </p>
              )}
            </div>
          );
        })()}

        {/* FUEL MONITOR */}
        {shiftState && (() => {
          const fuelPercent = shiftState.startFuel;
          const fuelRange = calculateFuelRange(fuelPercent);
          const needRefuel = shouldRefuel(fuelPercent);
          const isCritical = fuelPercent <= FUEL_CONSTANTS.CRITICAL_FUEL_THRESHOLD;
          
          return (
            <div className={`bg-[#1a1a1a] rounded-2xl p-3 border ${isCritical ? 'border-red-700 animate-pulse' : needRefuel ? 'border-yellow-700' : 'border-gray-800'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isCritical ? 'bg-red-900/30' : needRefuel ? 'bg-yellow-900/30' : 'bg-gray-900'}`}>
                    <Fuel size={18} className={isCritical ? 'text-red-400' : needRefuel ? 'text-yellow-400' : 'text-gray-400'} />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Bensin Tersisa</span>
                    <span className={`text-lg font-black ${isCritical ? 'text-red-400' : needRefuel ? 'text-yellow-400' : 'text-white'}`}>{fuelPercent}% (~{Math.round(fuelRange)}km)</span>
                  </div>
                </div>
                {needRefuel && (
                  <div className="text-right">
                    <span className="text-[9px] text-yellow-300 font-bold block">ISI BENSIN</span>
                    <span className="text-xs text-gray-400">Rp{Math.round((100-fuelPercent)/100 * FUEL_CONSTANTS.TANK_CAPACITY * FUEL_CONSTANTS.FUEL_PRICE_PER_LITER / 1000)}k</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* PRAYER TIME ALERT */}
        {(() => {
          const prayerCheck = isWithinPrayerTime(currentTime.timeString);
          if (prayerCheck.isPrayerTime) {
            return (
              <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                  <span className="text-xl">🕌</span>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-black text-purple-200">Waktu {prayerCheck.prayer}</span>
                  <p className="text-[10px] text-purple-300">Rehat sejenak, berkah pasti datang.</p>
                </div>
              </div>
            );
          }
          return null;
        })()}
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

        {/* RAIN SHELTER RECOMMENDATIONS */}
        {isRainMode && userLocation && gpsReady && (
            <div className="bg-blue-900/20 border border-blue-700 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                    <CloudRain size={18} className="text-blue-400" />
                    <h3 className="font-black text-blue-200 uppercase text-sm">Tempat Teduh Terdekat</h3>
                </div>
                <div className="space-y-2">
                    {RAIN_SAFE_ZONES
                        .map(shelter => ({
                            ...shelter,
                            distance: calculateDistance(userLocation.lat, userLocation.lng, shelter.lat, shelter.lng)
                        }))
                        .sort((a, b) => a.distance - b.distance)
                        .slice(0, 3)
                        .map((shelter, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${shelter.lat},${shelter.lng}`, '_blank');
                                    vibrate(10);
                                    playSound('click');
                                }}
                                className="w-full bg-blue-950/50 border border-blue-800 rounded-xl p-3 flex items-center justify-between hover:bg-blue-900/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <MapPin size={16} className="text-blue-400" />
                                    <div className="text-left">
                                        <span className="text-xs font-bold text-blue-200 block">{shelter.name}</span>
                                        <span className="text-[10px] text-blue-400">{shelter.zone}</span>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-blue-300">{shelter.distance.toFixed(1)} km</span>
                            </button>
                        ))
                    }
                </div>
                <p className="text-[10px] text-blue-300 mt-3 italic">💡 Tunggu hujan reda sambil standby di dalam. Order food biasa meningkat saat hujan.</p>
            </div>
        )}

        {/* Content Area */}
        <div className="space-y-4 pb-4">
            {isScanning ? (
                [1,2,3].map(i => (
                    <div key={i} className="bg-[#1a1a1a] rounded-3xl p-5 border border-gray-800 animate-pulse">
                        <div className="h-6 w-3/4 bg-gray-800 rounded mb-4"></div>
                        <div className="flex justify-between"><div className="h-4 w-1/3 bg-gray-800 rounded"></div><div className="h-8 w-16 bg-gray-800 rounded"></div></div>
                    </div>
                ))
            ) : predictions.length === 0 ? (
                <div className="py-12 px-6 text-center rounded-3xl bg-[#1a1a1a] border border-dashed border-gray-800 space-y-4">
                    <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-800"><Skull size={28} className="text-gray-600" /></div>
                    <p className="text-gray-300 font-bold">Zona Anyep</p>
                    <p className="text-xs text-gray-500 max-w-[250px] mx-auto leading-relaxed">
                        {shiftState?.strategy === 'SNIPER' 
                            ? "Sabar Ndan. Coba geser ke Stasiun, Bandara, atau Pusat Kota 24 Jam." 
                            : "Sepi orderan? Coba geser ke Perumahan Padat atau Pusat Jajanan."}
                    </p>
                    {quickFilter !== 'ALL' && <button onClick={() => setQuickFilter('ALL')} className="px-4 py-2 bg-gray-800 rounded-xl text-white text-xs font-bold flex items-center gap-2 mx-auto hover:bg-gray-700"><RotateCcw size={14}/> Reset Filter</button>}
                </div>
            ) : (
                predictions.map(spot => (
                    <div key={spot.id} className={`bg-[#1a1a1a] rounded-3xl p-5 relative overflow-hidden group active:scale-[0.99] transition-transform border ${spot.priorityLevel === 'HIGH' ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-gray-800'}`}>
                        {spot.isMaintenance && (
                            <div className="absolute inset-0 bg-red-900/10 border-2 border-red-500/50 rounded-3xl z-20 pointer-events-none flex items-center justify-center">
                                <span className="bg-red-600 text-white font-black text-xs px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">Wajib Servis</span>
                            </div>
                        )}
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-wrap gap-1.5">
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
                            <div className="mb-4">
                                <h3 className="font-black text-lg text-white leading-tight mb-1 line-clamp-2">{spot.origin}</h3>
                                <div className="flex items-center gap-2 mb-3">
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{spot.category}</p>
                                    {(() => {
                                        const traffic = getTrafficCondition(spot.zone, currentTime.fullDate.getHours());
                                        if (traffic.status === 'HEAVY') {
                                            return <span className="text-[9px] bg-red-900/30 text-red-400 px-2 py-0.5 rounded font-bold">🚗 MACET</span>;
                                        }
                                        return null;
                                    })()}
                                    {(() => {
                                        const competition = estimateCompetitionDensity(spot.zone, currentTime.fullDate.getHours());
                                        if (competition.level === 'HIGH') {
                                            return <span className="text-[9px] bg-orange-900/30 text-orange-400 px-2 py-0.5 rounded font-bold flex items-center gap-1"><Users size={8}/> RAMAI</span>;
                                        }
                                        return null;
                                    })()}
                                </div>
                                <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-start gap-3 mb-2">
                                    <Sparkles size={16} className="text-app-primary shrink-0 mt-0.5" />
                                    <div><p className="text-xs text-app-primary font-bold mb-1">{spot.matchReason}</p><p className="text-[10px] text-gray-400 leading-snug line-clamp-2">{spot.notes}</p></div>
                                </div>
                                {(() => {
                                    const competition = estimateCompetitionDensity(spot.zone, currentTime.fullDate.getHours());
                                    if (competition.level !== 'LOW') {
                                        return (
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                <Users size={10} />
                                                <span>{competition.description}</span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
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
