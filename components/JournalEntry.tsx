import React, { useState, useEffect } from 'react';
import { Hotspot, TimeState } from '../types';
import { DAYS_INDONESIA, CATEGORY_COLORS } from '../constants';
import { getTimeWindow } from '../utils';
import { Save, MapPin, Loader2 } from 'lucide-react';
import { addHotspot } from '../services/storage';

interface JournalEntryProps {
  currentTime: TimeState;
  onSaved: () => void;
}

const JournalEntry: React.FC<JournalEntryProps> = ({ currentTime, onSaved }) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Mencari lokasi...');
  
  // Form State
  const [origin, setOrigin] = useState('');
  const [category, setCategory] = useState('Culinary');
  const [notes, setNotes] = useState('');
  const [zone, setZone] = useState('');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationStatus('Lokasi terkunci.');
        },
        (error) => {
          setLocationStatus('Gagal lock GPS.');
          console.error(error);
        }
      );
    } else {
        setLocationStatus('GPS tidak didukung.');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) {
        alert("Mohon tunggu sampai lokasi GPS terkunci.");
        return;
    }

    const newHotspot: Hotspot = {
        id: Date.now().toString(),
        date: currentTime.fullDate.toISOString().split('T')[0],
        day: currentTime.dayName,
        time_window: getTimeWindow(currentTime.fullDate.getHours()),
        predicted_hour: currentTime.timeString,
        origin: origin,
        type: 'User Entry',
        category: category as any,
        lat: coords.lat,
        lng: coords.lng,
        zone: zone || 'Lokasi Saya',
        notes: notes,
        isUserEntry: true
    };

    addHotspot(newHotspot);
    onSaved(); // Redirect or clear
  };

  return (
    <div className="p-6 pb-24 max-w-lg mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Catat Gacor</h2>
        <p className="text-gray-400 text-sm mt-1">Simpan titik rezeki Anda untuk hari esok.</p>
      </div>

      <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 text-sm font-medium border transition-colors ${coords ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-amber-900/30 text-amber-400 border-amber-800'}`}>
        {coords ? <MapPin size={20} /> : <Loader2 size={20} className="animate-spin" />}
        <span>{locationStatus}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nama Tempat / Resto</label>
            <input 
                required
                type="text" 
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Contoh: Mie Gacoan Setiabudi"
                className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none transition-all"
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kategori</label>
                <div className="relative">
                    <select 
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none"
                    >
                        {Object.keys(CATEGORY_COLORS).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Area</label>
                 <input 
                    type="text" 
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    placeholder="Cth: Setiabudi"
                    className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
            </div>
        </div>

        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Catatan</label>
            <textarea 
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Kenapa ramai? Bubaran pabrik? Promo?"
                rows={3}
                className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
        </div>

        <div className="pt-6">
            <button 
                type="submit"
                disabled={!coords}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-4 rounded-xl shadow-lg flex justify-center items-center gap-2 transition-all active:scale-[0.98]"
            >
                <Save size={20} />
                SIMPAN TITIK INI
            </button>
        </div>
      </form>
    </div>
  );
};

export default JournalEntry;