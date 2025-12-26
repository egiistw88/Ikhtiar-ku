import React, { useState, useEffect } from 'react';
import { Hotspot, Transaction } from '../types';
import { getTimeWindow, formatCurrencyInput, parseCurrencyInput, vibrate } from '../utils';
import { Save, MapPin, Loader2, Bike, Utensils, Package, ShoppingBag, CheckCircle2, Navigation, Clock, Gauge } from 'lucide-react';
import { addHotspot, addTransaction } from '../services/storage';

interface JournalEntryProps {
  currentTime: {
    dayName: string;
    timeString: string;
    fullDate: Date;
  };
  onSaved: () => void;
}

type AppSource = 'Gojek' | 'Grab' | 'Maxim' | 'Shopee' | 'Indriver';
type ServiceType = 'Bike' | 'Food' | 'Send' | 'Shop';

const JournalEntry: React.FC<JournalEntryProps> = ({ currentTime, onSaved }) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Mencari satelit...');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [appSource, setAppSource] = useState<AppSource>('Maxim');
  const [serviceType, setServiceType] = useState<ServiceType>('Bike');
  const [argoRaw, setArgoRaw] = useState<string>(''); // Stores "15.000"
  const [origin, setOrigin] = useState(''); 
  const [notes, setNotes] = useState('');
  
  const [entryTime, setEntryTime] = useState<string>(currentTime.timeString);
  const [tripDist, setTripDist] = useState<string>(''); 

  useEffect(() => {
    setEntryTime(currentTime.timeString);
    if (navigator.geolocation) {
      const watcher = navigator.geolocation.watchPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationStatus('GPS Terkunci Akurat');
        },
        (error) => {
          setLocationStatus('Sinyal GPS Lemah');
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watcher);
    } else {
        setLocationStatus('GPS Mati');
    }
  }, []);

  const handleArgoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCurrencyInput(e.target.value);
      setArgoRaw(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    vibrate(50); // Haptic

    if (!coords) {
        alert("Sabar Ndan, GPS belum ngunci lokasi. Geser ke tempat terbuka sebentar.");
        return;
    }
    
    const argoVal = parseCurrencyInput(argoRaw);
    if (!argoVal || argoVal <= 0) {
        alert("Isi dulu argonya Ndan.");
        return;
    }

    setIsSubmitting(true);

    let category: Hotspot['category'] = 'Other';
    if (serviceType === 'Food') category = 'Culinary';
    if (serviceType === 'Bike') category = 'Bike';
    if (serviceType === 'Send') category = 'Logistics';
    if (serviceType === 'Shop') category = 'Mall/Lifestyle';

    const [h, m] = entryTime.split(':').map(Number);
    const timeWindow = getTimeWindow(h);

    const newHotspot: Hotspot = {
        id: Date.now().toString(),
        date: currentTime.fullDate.toISOString().split('T')[0],
        day: currentTime.dayName,
        time_window: timeWindow,
        predicted_hour: entryTime, 
        origin: origin || `Titik ${serviceType} ${appSource}`,
        type: `${serviceType} (${appSource})`,
        category: category,
        lat: coords.lat,
        lng: coords.lng,
        zone: 'User Entry',
        notes: `${notes} [App: ${appSource}] [Argo: ${argoVal}]`,
        isUserEntry: true,
        validations: [{ date: currentTime.fullDate.toISOString().split('T')[0], isAccurate: true }]
    };

    addHotspot(newHotspot);

    const distVal = parseFloat(tripDist) || 0;
    
    const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        date: currentTime.fullDate.toISOString().split('T')[0],
        timestamp: Date.now(),
        amount: argoVal,
        type: 'income',
        category: serviceType === 'Bike' ? 'Trip' : 'Other',
        note: `Orderan ${appSource} - ${origin}`,
        distanceKm: distVal 
    };
    
    addTransaction(newTx);

    setTimeout(() => {
        setIsSubmitting(false);
        onSaved();
    }, 800);
  };

  const AppButton = ({ name, colorClass, activeClass }: { name: AppSource, colorClass: string, activeClass: string }) => (
      <button
        type="button"
        onClick={() => { setAppSource(name); vibrate(10); }}
        className={`relative p-3 rounded-xl border font-bold text-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${appSource === name ? activeClass : 'bg-[#1e1e1e] border-gray-700 text-gray-500 hover:bg-gray-800'}`}
      >
          {appSource === name && <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full animate-pulse shadow-sm"></div>}
          <span className="uppercase tracking-wider">{name}</span>
      </button>
  );

  const ServiceButton = ({ type, icon, label }: { type: ServiceType, icon: React.ReactNode, label: string }) => (
    <button
        type="button"
        onClick={() => { setServiceType(type); vibrate(10); }}
        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all active:scale-95 ${serviceType === type ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/50' : 'bg-[#1e1e1e] border-gray-700 text-gray-400 hover:bg-gray-800'}`}
    >
        {icon}
        <span className="text-xs font-bold uppercase">{label}</span>
    </button>
  );

  return (
    <div className="pb-32 pt-4 px-4 max-w-lg mx-auto min-h-full">
      <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Input Gacor</h2>
            <p className="text-gray-400 text-xs">Simpan ke Radar & Dompet sekaligus.</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold ${coords ? 'bg-emerald-900/30 border-emerald-800 text-emerald-400' : 'bg-red-900/30 border-red-800 text-red-400 animate-pulse'}`}>
             {coords ? <MapPin size={12} /> : <Loader2 size={12} className="animate-spin" />}
             {locationStatus}
          </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sumber Orderan</label>
            <div className="grid grid-cols-3 gap-2">
                <AppButton name="Maxim" colorClass="bg-yellow-400" activeClass="bg-yellow-500 border-yellow-400 text-black" />
                <AppButton name="Gojek" colorClass="bg-green-600" activeClass="bg-green-600 border-green-500 text-white" />
                <AppButton name="Grab" colorClass="bg-white" activeClass="bg-gray-100 border-white text-green-700" />
                <AppButton name="Shopee" colorClass="bg-orange-500" activeClass="bg-orange-500 border-orange-400 text-white" />
                <AppButton name="Indriver" colorClass="bg-emerald-600" activeClass="bg-lime-600 border-lime-500 text-white" />
            </div>
        </div>

        <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Jenis Layanan</label>
            <div className="grid grid-cols-4 gap-2">
                <ServiceButton type="Bike" label="Bike" icon={<Bike size={24} />} />
                <ServiceButton type="Food" label="Food" icon={<Utensils size={24} />} />
                <ServiceButton type="Send" label="Kirim" icon={<Package size={24} />} />
                <ServiceButton type="Shop" label="Belanja" icon={<ShoppingBag size={24} />} />
            </div>
        </div>

        <div className="space-y-2">
             <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pendapatan Bersih (Rp)</label>
             <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                <input 
                    required
                    type="text" 
                    inputMode="numeric"
                    value={argoRaw}
                    onChange={handleArgoChange}
                    placeholder="0"
                    className="w-full p-4 pl-12 bg-[#1e1e1e] border-2 border-gray-700 rounded-2xl text-white text-3xl font-mono font-bold focus:border-cyan-500 focus:outline-none transition-colors placeholder-gray-700"
                />
             </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={12}/> Jam Order
                </label>
                <input 
                    type="time"
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    className="w-full p-3 bg-[#1e1e1e] border border-gray-700 rounded-xl text-white font-mono text-center focus:border-cyan-500"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                    <Gauge size={12}/> Jarak (KM)
                </label>
                <input 
                    type="number"
                    step="0.1"
                    value={tripDist}
                    onChange={(e) => setTripDist(e.target.value)}
                    placeholder="0.0"
                    className="w-full p-3 bg-[#1e1e1e] border border-gray-700 rounded-xl text-white font-mono text-center focus:border-cyan-500"
                />
             </div>
        </div>

        <div className="space-y-4 pt-2">
             <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Nama Titik / Resto</label>
                <div className="relative">
                    <Navigation size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                        required
                        type="text" 
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        placeholder={serviceType === 'Food' ? "Contoh: Mie Gacoan..." : "Contoh: Simpang Dago..."}
                        className="w-full p-4 pl-12 bg-[#1e1e1e] border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none font-medium"
                    />
                </div>
            </div>
             <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Catatan (Opsional)</label>
                <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ada event? Bubaran pabrik? Diskon?"
                    rows={2}
                    className="w-full p-4 bg-[#1e1e1e] border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none text-sm resize-none"
                />
            </div>
        </div>

        <div className="pt-4">
            <button 
                type="submit"
                disabled={!coords || isSubmitting}
                className={`w-full py-4 rounded-xl font-black text-lg shadow-xl flex justify-center items-center gap-2 transition-all active:scale-[0.98] ${!coords ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-400 text-black'}`}
            >
                {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}
                {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN & MASUK DOMPET'}
            </button>
            <p className="text-center text-[10px] text-gray-500 mt-3">
                *Data lokasi otomatis masuk ke algoritma Radar besok.
            </p>
        </div>
      </form>
    </div>
  );
};

export default JournalEntry;