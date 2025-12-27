import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Hotspot, TimeState } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { Navigation, Zap, Map as MapIcon, Target, X, Compass, Lightbulb, TrendingUp, Filter, Calendar, Layers } from 'lucide-react';
import { vibrate, playSound } from '../utils';

// Leaflet CSS is imported in index.html

interface MapViewProps {
  hotspots: Hotspot[];
  currentTime: TimeState;
}

// Helper to update map center
const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center);
    }, [center, map]);
    return null;
};

// INTELLIGENCE ENGINE
const generateTacticalAdvice = (hotspots: Hotspot[], time: TimeState) => {
    const hour = time.fullDate.getHours();
    const day = time.dayName;
    
    // 1. FILTER: Cari data historis yang relevan dengan JAM INI (+- 1 jam) & HARI INI
    const relevantSpots = hotspots.filter(h => {
        const [hHour] = h.predicted_hour.split(':').map(Number);
        // Toleransi waktu 2 jam (misal jam 10, cari data jam 08-12)
        const isTimeMatch = Math.abs(hHour - hour) <= 2; 
        // Prioritaskan hari yang sama, tapi jika data sedikit, ambil hari apa saja
        const isDayMatch = h.day === day;
        return isTimeMatch;
    });

    // 2. ANALISIS: Jika ada data historis
    if (relevantSpots.length > 0) {
        // Cari Zona Terbanyak
        const zones: Record<string, number> = {};
        const categories: Record<string, number> = {};
        
        relevantSpots.forEach(h => {
            zones[h.zone] = (zones[h.zone] || 0) + 1;
            categories[h.category] = (categories[h.category] || 0) + 1;
        });

        const topZone = Object.keys(zones).reduce((a, b) => zones[a] > zones[b] ? a : b);
        const topCat = Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b);
        const count = relevantSpots.length;

        return {
            type: 'DATA_DRIVEN',
            title: `Pola Orderan ${day} Jam ${hour}:00`,
            highlight: topZone,
            message: `Terdeteksi ${count} riwayat orderan di sekitar jam ini. Dominasi layanan: ${topCat}.`,
            action: `Segera merapat ke ${topZone}. Peluang ${topCat} tinggi berdasarkan sejarah akunmu.`,
            icon: <TrendingUp className="text-emerald-400" size={32} />
        };
    }

    // 3. FALLBACK: Pengetahuan Umum Ojol (Jika data kosong/baru)
    // Logika berdasarkan kebiasaan umum di lapangan
    if (hour >= 5 && hour < 9) {
        return {
            type: 'GENERAL',
            title: 'Strategi Pagi (Rush Hour)',
            highlight: 'Perumahan & Sekolah',
            message: 'Jam sibuk orang berangkat kerja & sekolah.',
            action: 'Ngetem di akses keluar perumahan padat atau dekat SD/SMP favorit. Fokus Bike/Car.',
            icon: <Zap className="text-yellow-400" size={32} />
        };
    }
    if (hour >= 11 && hour < 14) {
        return {
            type: 'GENERAL',
            title: 'Strategi Makan Siang',
            highlight: 'Pusat Kantor & Kuliner',
            message: 'Orang kantor pesan makan atau keluar makan.',
            action: 'Geser ke area perkantoran atau pusat jajanan (Gacoan/McD/Foodcourt). Fokus Bike/Food.',
            icon: <Target className="text-red-400" size={32} />
        };
    }
    if (hour >= 16 && hour < 20) {
        return {
            type: 'GENERAL',
            title: 'Strategi Pulang Kerja',
            highlight: 'Stasiun, Mall & Kantor',
            message: 'Traffic bubaran kantor sangat tinggi.',
            action: 'Standby di Stasiun, Halte Bus, atau Lobby Mall/Kantor. Arah tujuan biasanya ke Perumahan.',
            icon: <Compass className="text-blue-400" size={32} />
        };
    }
    if (hour >= 20 || hour < 5) {
        return {
            type: 'GENERAL',
            title: 'Strategi Malam/Dini Hari',
            highlight: 'Kuliner Malam & RS',
            message: 'Orderan didominasi lapar malam atau darurat.',
            action: 'Cari Martabak, Nasi Goreng Tektek, atau RS 24 Jam. Matikan fitur Auto-Bid jika ingin selektif.',
            icon: <Lightbulb className="text-purple-400" size={32} />
        };
    }
    
    // Default Mid-Day
    return {
        type: 'GENERAL',
        title: 'Jam Tanggung (Sepi)',
        highlight: 'Mall & Logistik',
        message: 'Biasanya orderan agak anyep di jam ini.',
        action: 'Coba main ke area Gudang/Logistik untuk paket, atau Mall untuk orderan belanja/shop.',
        icon: <MapIcon className="text-gray-400" size={32} />
    };
};

const MapView: React.FC<MapViewProps> = ({ hotspots, currentTime }) => {
  const [userLocation, setUserLocation] = useState<[number, number]>([-6.9175, 107.6191]); // Default Bandung center
  const [showIntel, setShowIntel] = useState(false);
  
  // MAP FILTER STATE
  const [filterMode, setFilterMode] = useState<'RELEVANT' | 'ALL'>('RELEVANT');

  // Generate Advice Memoized
  const intel = useMemo(() => generateTacticalAdvice(hotspots, currentTime), [hotspots, currentTime]);

  // Filtered Hotspots based on Mode
  const displayedHotspots = useMemo(() => {
      if (filterMode === 'ALL') return hotspots;
      
      // RELEVANT MODE: Only show hotspots for CURRENT DAY and +- 2 Hours window
      // This prevents map clutter and keeps data actionable
      return hotspots.filter(h => {
          // If it's today's day
          if (h.day !== currentTime.dayName) return false;
          
          const [hHour] = h.predicted_hour.split(':').map(Number);
          const currentHour = currentTime.fullDate.getHours();
          
          // Show spots valid from 2 hours ago until 3 hours ahead (broad window)
          return Math.abs(hHour - currentHour) <= 4;
      });
  }, [hotspots, filterMode, currentTime]);

  useEffect(() => {
    // Get Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => console.warn("Location access denied", error)
      );
    }

    // Auto show intel on first load
    const timer = setTimeout(() => {
        setShowIntel(true);
        vibrate(50);
        playSound('success');
    }, 500); // Delay dikit biar smooth

    return () => clearTimeout(timer);
  }, []);

  const handleRecenter = () => {
      vibrate(10);
      playSound('click');
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
              setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          });
      }
  };

  const toggleFilter = () => {
      vibrate(10);
      playSound('click');
      setFilterMode(prev => prev === 'RELEVANT' ? 'ALL' : 'RELEVANT');
  }

  return (
    <div className="h-full w-full relative bg-gray-900 overflow-hidden">
      
      {/* MAP COMPONENT */}
      <MapContainer 
        center={userLocation} 
        zoom={14} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false} // Custom control nanti
      >
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapUpdater center={userLocation} />

        {/* User Location Marker */}
        <CircleMarker 
            center={userLocation} 
            radius={8} 
            pathOptions={{ color: 'white', fillColor: '#2563EB', fillOpacity: 1, weight: 3 }}
        >
             <Popup className="custom-popup">
                <div className="text-gray-900 font-bold">Lokasi Anda</div>
             </Popup>
        </CircleMarker>

        {/* Hotspots Markers */}
        {displayedHotspots.map((spot) => (
            <CircleMarker
                key={spot.id}
                center={[spot.lat, spot.lng]}
                radius={6}
                pathOptions={{
                    color: CATEGORY_COLORS[spot.category] || '#fff', 
                    fillColor: CATEGORY_COLORS[spot.category] || '#fff',
                    fillOpacity: 0.6,
                    weight: 1
                }}
            >
                <Popup className="custom-popup">
                    <div className="min-w-[200px] text-gray-800">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold uppercase text-white bg-black/50 px-1 rounded">{spot.day} • {spot.predicted_hour}</span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1 leading-tight">{spot.origin}</h3>
                        <p className="text-xs text-gray-600 mb-2">{spot.notes}</p>
                        <div className="text-[10px] font-mono bg-gray-100 p-1 rounded inline-block">
                            {spot.category}
                        </div>
                    </div>
                </Popup>
            </CircleMarker>
        ))}
      </MapContainer>

      {/* --- TACTICAL INTEL POPUP (THE NEW FEATURE) --- */}
      {showIntel && (
          <div className="absolute inset-0 z-[1000] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-[#1e1e1e] border border-gray-600 w-full max-w-sm rounded-2xl p-0 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
                  
                  {/* Decor Bar */}
                  <div className={`h-1.5 w-full ${intel.type === 'DATA_DRIVEN' ? 'bg-emerald-500' : 'bg-app-primary'}`}></div>
                  
                  <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-xl bg-gray-800 border border-gray-700`}>
                                  {intel.icon}
                              </div>
                              <div>
                                  <h3 className="text-white font-black uppercase text-sm tracking-wider">{intel.title}</h3>
                                  <p className="text-[10px] text-gray-400 font-mono">AI TACTICAL SUPPORT</p>
                              </div>
                          </div>
                          <button onClick={() => setShowIntel(false)} className="text-gray-500 hover:text-white">
                              <X size={20} />
                          </button>
                      </div>

                      <div className="mb-5 space-y-3">
                          <div className="bg-black/40 rounded-lg p-3 border-l-2 border-gray-500">
                              <p className="text-gray-300 text-xs font-medium leading-relaxed">
                                  "{intel.message}"
                              </p>
                          </div>
                          
                          <div>
                               <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 flex items-center gap-1">
                                   <Target size={12} /> Target Operasi:
                               </p>
                               <p className={`text-xl font-black ${intel.type === 'DATA_DRIVEN' ? 'text-emerald-400' : 'text-app-primary'} tracking-tight`}>
                                   {intel.highlight}
                               </p>
                          </div>
                          
                          <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                               <p className="text-xs text-white font-bold">
                                   💡 Saran: <span className="font-normal text-gray-300">{intel.action}</span>
                               </p>
                          </div>
                      </div>

                      <button 
                          onClick={() => { setShowIntel(false); vibrate(20); playSound('click'); }}
                          className={`w-full py-3.5 rounded-xl font-black text-black text-sm uppercase tracking-wide shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2 ${intel.type === 'DATA_DRIVEN' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-app-primary hover:bg-yellow-400'}`}
                      >
                          <Navigation size={18} fill="black" /> Siap, Laksanakan!
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- FLOATING ACTION BUTTONS --- */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-3">
         {/* Re-open Intel Button */}
         {!showIntel && (
             <button 
                onClick={() => { setShowIntel(true); vibrate(10); playSound('click'); }}
                className="w-10 h-10 bg-app-primary rounded-full flex items-center justify-center shadow-lg border-2 border-yellow-300 text-black active:scale-90 transition-transform animate-in zoom-in"
                title="Minta Saran Strategi"
             >
                <Lightbulb size={20} fill="currentColor" />
             </button>
         )}
         
         {/* FILTER TOGGLE BUTTON (NEW) */}
         <button 
            onClick={toggleFilter}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border active:scale-90 transition-all ${filterMode === 'RELEVANT' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
            title="Filter Peta"
         >
            {filterMode === 'RELEVANT' ? <Calendar size={18} /> : <Layers size={18} />}
         </button>

         {/* Recenter GPS */}
         <button 
            onClick={handleRecenter}
            className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center shadow-lg border border-gray-600 text-white active:scale-90 transition-transform"
         >
            <Navigation size={18} />
         </button>
      </div>

      {/* Legend & Filter Info */}
      <div className="absolute bottom-6 left-4 z-[400] bg-black/80 backdrop-blur border border-gray-700 p-2 rounded-lg shadow-xl">
         <div className="flex gap-3 text-[10px] font-bold text-gray-300 mb-1">
             <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#FF5252]"></div>Food</div>
             <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#18FFFF]"></div>Bike</div>
             <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#69F0AE]"></div>Send</div>
         </div>
         <div className="text-[9px] text-gray-500 font-mono border-t border-gray-700 pt-1 mt-1">
             Mode: {filterMode === 'RELEVANT' ? 'Hanya Hari Ini (Fokus)' : 'Semua Data History'}
         </div>
      </div>

    </div>
  );
};

export default MapView;