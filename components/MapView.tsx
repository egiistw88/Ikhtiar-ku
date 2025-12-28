
import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Marker } from 'react-leaflet';
import { Hotspot, TimeState } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { Navigation, Zap, Map as MapIcon, Target, X, Compass, Lightbulb, TrendingUp, Filter, Calendar, Layers, ShieldCheck, Clock, AlertCircle } from 'lucide-react';
import { vibrate, playSound, calculateDistance } from '../utils';
import L from 'leaflet';

// Leaflet CSS is imported in index.html

interface MapViewProps {
  hotspots: Hotspot[];
  currentTime: TimeState;
}

// Helper to update map center
const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 15); // Zoom level lebih dekat untuk detail jalan
    }, [center, map]);
    return null;
};

// INTELLIGENCE ENGINE (The Brain)
const generateTacticalAdvice = (hotspots: Hotspot[], time: TimeState, userLoc: [number, number]) => {
    const hour = time.fullDate.getHours();
    
    // 1. CARI SPOT TERDEKAT & AKTIF
    const activeSpots = hotspots.filter(h => {
        const [hHour] = h.predicted_hour.split(':').map(Number);
        // Window ketat: 1 jam ke belakang s/d 2 jam ke depan
        return Math.abs(hHour - hour) <= 2;
    });

    if (activeSpots.length > 0) {
        // Cari yang paling dekat dengan user
        const nearest = activeSpots.reduce((prev, curr) => {
            const prevDist = calculateDistance(userLoc[0], userLoc[1], prev.lat, prev.lng);
            const currDist = calculateDistance(userLoc[0], userLoc[1], curr.lat, curr.lng);
            return currDist < prevDist ? curr : prev;
        });
        
        const dist = calculateDistance(userLoc[0], userLoc[1], nearest.lat, nearest.lng);

        return {
            type: 'DATA_DRIVEN',
            title: `TARGET TERDEKAT: ${nearest.origin}`,
            highlight: `${nearest.category} • ${dist} KM`,
            message: `Terdeteksi pola ${nearest.type} yang valid di jam segini.`,
            action: `Geser ${dist}km ke arah ${nearest.zone}. Data menunjukkan potensi tinggi.`,
            icon: <Target className="text-red-600" size={32} />,
            colorClass: 'bg-white border-l-4 border-red-600'
        };
    }

    // 2. FALLBACK STRATEGY (Jika tidak ada data spesifik dekat user)
    if (hour >= 6 && hour < 10) return {
        type: 'GENERAL', title: 'MODE RUSH HOUR PAGI', highlight: 'Perumahan -> Sekolah/Kantor',
        message: 'Fokus pada residensial padat. Abaikan mall/kuliner dulu.',
        action: 'Standby di akses keluar komplek perumahan.',
        icon: <Zap className="text-amber-500" size={32} />, colorClass: 'bg-white border-l-4 border-amber-500'
    };
    if (hour >= 11 && hour < 14) return {
        type: 'GENERAL', title: 'MODE MAKAN SIANG', highlight: 'Pusat Kuliner & Kantor',
        message: 'Orderan Food & pengantaran makanan mendominasi.',
        action: 'Merapat ke area Resto Gacoan/McD atau kantin karyawan.',
        icon: <Zap className="text-orange-500" size={32} />, colorClass: 'bg-white border-l-4 border-orange-500'
    };
    if (hour >= 16 && hour < 20) return {
        type: 'GENERAL', title: 'MODE PULANG KERJA', highlight: 'Stasiun & Gedung Kantor',
        message: 'Traffic penjemputan orang (Bike/Car) sangat tinggi.',
        action: 'Standby di Stasiun atau Lobby gedung perkantoran.',
        icon: <Zap className="text-blue-600" size={32} />, colorClass: 'bg-white border-l-4 border-blue-600'
    };
    
    return {
        type: 'GENERAL', title: 'MODE STANDBY AREA', highlight: 'Cari Spot 24 Jam',
        message: 'Belum ada pola spesifik terdeteksi di koordinat ini.',
        action: 'Geser ke area Pusat Kota atau Pasar Induk.',
        icon: <Compass className="text-gray-500" size={32} />, colorClass: 'bg-white border-l-4 border-gray-400'
    };
};

const MapView: React.FC<MapViewProps> = ({ hotspots, currentTime }) => {
  const [userLocation, setUserLocation] = useState<[number, number]>([-6.9175, 107.6191]);
  const [showIntel, setShowIntel] = useState(false);
  const [filterMode, setFilterMode] = useState<'STRICT' | 'ALL'>('STRICT');

  const intel = useMemo(() => generateTacticalAdvice(hotspots, currentTime, userLocation), [hotspots, currentTime, userLocation]);

  // LOGIC FILTER PRECISI
  const displayedHotspots = useMemo(() => {
      if (filterMode === 'ALL') return hotspots;
      
      const currentHour = currentTime.fullDate.getHours();
      
      return hotspots.filter(h => {
          // 1. Logic Hari: Harus cocok hari ATAU tipe harian (isDaily)
          const isDayMatch = h.isDaily || h.day === currentTime.dayName;
          if (!isDayMatch) return false;

          // 2. Logic Waktu: Window ketat (-1 jam s/d +2 jam)
          // Contoh: Jam 10.00, akan menampilkan data jam 09.00 - 12.00
          const [hHour] = h.predicted_hour.split(':').map(Number);
          const timeDiff = hHour - currentHour;
          const isTimeMatch = timeDiff >= -1 && timeDiff <= 2;

          return isTimeMatch;
      });
  }, [hotspots, filterMode, currentTime]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.warn("GPS Access Denied"),
        { enableHighAccuracy: true }
      );
    }
    const timer = setTimeout(() => { setShowIntel(true); playSound('success'); }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleRecenter = () => {
      vibrate(10);
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
              setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          });
      }
  };

  return (
    <div className="h-full w-full relative bg-gray-100 overflow-hidden">
      
      {/* 1. MAP COMPONENT (LIGHT MODE / HIGH CONTRAST) */}
      <MapContainer 
        center={userLocation} 
        zoom={15} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
      >
        {/* TILE LAYER: CartoDB Voyager (Sangat jelas jalanannya, high contrast) */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <MapUpdater center={userLocation} />

        {/* User Location Marker (Blue Pulse) */}
        <CircleMarker 
            center={userLocation} 
            radius={8} 
            pathOptions={{ color: '#ffffff', fillColor: '#2563EB', fillOpacity: 1, weight: 3 }}
        >
             <Popup closeButton={false} offset={[0, -10]} className="font-sans">
                <div className="text-center">
                    <span className="font-bold text-blue-600 text-xs uppercase">Posisi Saya</span>
                </div>
             </Popup>
        </CircleMarker>

        {/* Hotspots Markers */}
        {displayedHotspots.map((spot) => {
            // Visual Differentiation
            const isHighPriority = (spot.baseScore && spot.baseScore > 85) || spot.isUserEntry;
            const radius = isHighPriority ? 10 : 6;
            const opacity = isHighPriority ? 0.9 : 0.6;
            const strokeColor = spot.isUserEntry ? '#000' : '#fff'; // User entry gets black border for visibility

            return (
                <CircleMarker
                    key={spot.id}
                    center={[spot.lat, spot.lng]}
                    radius={radius}
                    pathOptions={{
                        color: strokeColor, 
                        fillColor: CATEGORY_COLORS[spot.category] || '#333',
                        fillOpacity: opacity,
                        weight: 2
                    }}
                >
                    <Popup className="custom-popup-light" closeButton={false}>
                        <div className="min-w-[180px] p-1">
                            {/* Header Badge */}
                            <div className="flex gap-1 mb-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${spot.isDaily ? 'bg-blue-600' : 'bg-purple-600'}`}>
                                    {spot.isDaily ? 'RUTIN' : spot.day.toUpperCase()}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-white flex items-center gap-1">
                                    <Clock size={10}/> {spot.predicted_hour}
                                </span>
                                {spot.isUserEntry && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white flex items-center gap-1">
                                        <ShieldCheck size={10}/> USER
                                    </span>
                                )}
                            </div>
                            
                            <h3 className="font-black text-gray-900 text-sm leading-tight mb-1">{spot.origin}</h3>
                            <p className="text-xs text-gray-600 mb-2 leading-snug">{spot.notes}</p>
                            
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-200 mt-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[spot.category] }}></div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase">{spot.category}</span>
                            </div>
                        </div>
                    </Popup>
                </CircleMarker>
            );
        })}
      </MapContainer>

      {/* 2. TACTICAL INTEL CARD (Modern Floating UI) */}
      {showIntel && (
          <div className="absolute top-4 left-4 right-4 z-[1000] animate-in slide-in-from-top-10 fade-in duration-500">
              <div className={`shadow-xl rounded-2xl p-4 relative overflow-hidden ${intel.colorClass}`}>
                  <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                          <div className="mt-1">{intel.icon}</div>
                          <div>
                              <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-black text-gray-900 uppercase tracking-tight">{intel.title}</h3>
                                  <span className="bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">LIVE</span>
                              </div>
                              <p className="text-sm font-bold text-gray-800 mb-1">{intel.message}</p>
                              <p className="text-xs text-gray-600 leading-relaxed bg-gray-100 p-2 rounded-lg border border-gray-200">
                                  <span className="font-bold">Saran:</span> {intel.action}
                              </p>
                          </div>
                      </div>
                      <button onClick={() => setShowIntel(false)} className="bg-gray-100 p-1 rounded-full text-gray-500 hover:bg-gray-200">
                          <X size={16} />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* 3. FLOATING CONTROLS (Bottom Right) */}
      <div className="absolute bottom-24 right-4 z-[400] flex flex-col gap-3">
         
         {!showIntel && (
             <button 
                onClick={() => { setShowIntel(true); vibrate(10); playSound('click'); }}
                className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-200 text-black active:scale-90 transition-transform"
             >
                <Lightbulb size={24} className="text-yellow-500 fill-current" />
             </button>
         )}
         
         <button 
            onClick={() => { setFilterMode(m => m === 'STRICT' ? 'ALL' : 'STRICT'); vibrate(10); playSound('click'); }}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border active:scale-90 transition-all ${filterMode === 'STRICT' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white border-gray-200 text-gray-500'}`}
         >
            {filterMode === 'STRICT' ? <Filter size={24} /> : <Layers size={24} />}
         </button>

         <button 
            onClick={handleRecenter}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-200 text-gray-700 active:scale-90 transition-transform"
         >
            <Navigation size={24} />
         </button>
      </div>

      {/* 4. LEGEND & STATUS (Bottom Left) */}
      <div className="absolute bottom-24 left-4 z-[400] bg-white/90 backdrop-blur border border-gray-200 px-3 py-2 rounded-lg shadow-lg">
         <div className="flex items-center gap-2 mb-1">
             <div className={`w-2 h-2 rounded-full ${filterMode === 'STRICT' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
             <span className="text-[10px] font-bold text-gray-600 uppercase">
                 {filterMode === 'STRICT' ? 'Mode Presisi (Live)' : 'Mode Riwayat Lengkap'}
             </span>
         </div>
         <div className="text-[9px] text-gray-400">
             Menampilkan {displayedHotspots.length} titik aktif
         </div>
      </div>

    </div>
  );
};

export default MapView;
