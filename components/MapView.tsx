import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Hotspot, TimeState } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { Navigation } from 'lucide-react';
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

const MapView: React.FC<MapViewProps> = ({ hotspots }) => {
  const [userLocation, setUserLocation] = useState<[number, number]>([-6.9175, 107.6191]); // Default Bandung center

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn("Location access denied, using default center", error);
        }
      );
    }
  }, []);

  return (
    <div className="h-full w-full relative bg-gray-100">
      <MapContainer 
        center={userLocation} 
        zoom={14} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        {/* LIGHT MODE TILES: CartoDB Voyager - High Contrast, Clean, Very Readable */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <MapUpdater center={userLocation} />

        {/* User Location Marker - Blue Pulse */}
        <CircleMarker 
            center={userLocation} 
            radius={8} 
            pathOptions={{ color: 'white', fillColor: '#2563EB', fillOpacity: 1, weight: 3 }}
        >
             <Popup className="custom-popup">
                <div className="text-gray-900 font-bold">Lokasi Anda</div>
             </Popup>
        </CircleMarker>

        {/* Hotspots */}
        {hotspots.map((spot) => (
            <CircleMarker
                key={spot.id}
                center={[spot.lat, spot.lng]}
                radius={8}
                pathOptions={{
                    color: '#FFFFFF', // White stroke for contrast against map
                    fillColor: CATEGORY_COLORS[spot.category] || CATEGORY_COLORS['Other'],
                    fillOpacity: 0.9,
                    weight: 2 // Thicker border to make it pop
                }}
            >
                <Popup className="custom-popup">
                    <div className="min-w-[200px] text-gray-800">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-1 rounded">{spot.day} • {spot.predicted_hour}</span>
                            <span className="text-[10px] text-gray-500">{spot.category}</span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1 leading-tight">{spot.origin}</h3>
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{spot.notes}</p>
                        <button 
                            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`, '_blank')}
                            className="w-full flex justify-center items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded transition-colors"
                        >
                            <Navigation size={12} />
                            Buka Google Maps
                        </button>
                    </div>
                </Popup>
            </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend Overlay - Light Mode optimized */}
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md border border-gray-200 p-3 rounded-lg shadow-xl z-[400] text-xs max-h-48 overflow-y-auto">
        <h4 className="font-bold mb-2 text-gray-800">Legenda Titik</h4>
        <div className="space-y-1.5 text-gray-600">
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5252] border border-gray-300 block"></span>
                <span>Makanan</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#18FFFF] border border-gray-300 block"></span>
                <span>Penumpang</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#69F0AE] border border-gray-300 block"></span>
                <span>Logistik</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FFD740] border border-gray-300 block"></span>
                <span>Kawasan Bisnis</span>
            </div>
             <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF6E40] border border-gray-300 block"></span>
                <span>Perumahan</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;