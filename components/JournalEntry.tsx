import React, { useState, useEffect, useRef } from 'react';
import { Hotspot, Transaction } from '../types';
import { getTimeWindow, formatCurrencyInput, parseCurrencyInput, vibrate } from '../utils';
import { Save, MapPin, Loader2, Bike, Utensils, Package, ShoppingBag, CheckCircle2, Navigation, Clock, Gauge, Mic, MicOff, Zap } from 'lucide-react';
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

// Web Speech API Types extension
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

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

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

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

  // ==========================================
  // SMART VOICE PARSING ENGINE
  // ==========================================
  const toggleVoiceInput = () => {
      vibrate(20);
      const windowObj = window as unknown as IWindow;
      const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

      if (!SpeechRecognition) {
          alert("Browser ini tidak mendukung fitur suara. Gunakan Google Chrome.");
          return;
      }

      if (isListening) {
          recognitionRef.current?.stop();
          setIsListening(false);
          return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID'; // Wajib Bahasa Indonesia
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e: any) => { 
          console.error(e); 
          setIsListening(false); 
          alert("Gagal mendengar. Cek izin mikrofon atau coba lagi.");
      };

      recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript.toLowerCase();
          parseVoiceCommand(transcript);
      };

      recognitionRef.current = recognition;
      recognition.start();
  };

  const parseVoiceCommand = (text: string) => {
      // Step 1: Detect Money (Slang & Formal)
      const moneyMap: Record<string, number> = {
          'goceng': 5000, 'ceban': 10000, 'cenggo': 1500, 'noban': 20000, 
          'goban': 50000, 'cepek': 100000, 'juta': 1000000,
          'ribu': 1000, 'rb': 1000
      };

      let amount = 0;
      
      // Regex untuk "15 ribu", "20rb"
      const digitMatch = text.match(/(\d+)\s*(ribu|rb)/);
      if (digitMatch) {
          amount = parseInt(digitMatch[1]) * 1000;
      } else {
          // Cek slang satu per satu
          for (const [key, val] of Object.entries(moneyMap)) {
              if (text.includes(key)) {
                  if (key === 'ribu' || key === 'rb') continue; // Skip modifier
                  amount = val;
                  break; // Prioritize first slang found
              }
          }
          // Fallback: cari angka saja
          if (amount === 0) {
             const plainDigit = text.match(/(\d+)/);
             if (plainDigit) {
                 // Asumsi jika driver nyebut "15" maksudnya "15.000" (konteks ojol)
                 const val = parseInt(plainDigit[1]);
                 amount = val < 1000 ? val * 1000 : val;
             }
          }
      }

      if (amount > 0) setArgoRaw(formatCurrencyInput(amount.toString()));

      // Step 2: Smart Categorization
      // Auto-detect service based on brand/keywords
      if (text.includes('gofood') || text.includes('grabfood') || text.includes('shopeefood') || text.includes('gacoan') || text.includes('mcd') || text.includes('kfc') || text.includes('mixue')) {
          setServiceType('Food');
      } else if (text.includes('gomart') || text.includes('belanja') || text.includes('indomaret') || text.includes('alfamart')) {
          setServiceType('Shop');
      } else if (text.includes('gosend') || text.includes('paket') || text.includes('barang')) {
          setServiceType('Send');
      } else if (text.includes('goride') || text.includes('grabbike') || text.includes('penumpang') || text.includes('sekolah') || text.includes('stasiun')) {
          setServiceType('Bike');
      }

      // Step 3: Detect App Source
      if (text.includes('maxim')) setAppSource('Maxim');
      else if (text.includes('gojek') || text.includes('gofood') || text.includes('gosend')) setAppSource('Gojek');
      else if (text.includes('grab')) setAppSource('Grab');
      else if (text.includes('shopee')) setAppSource('Shopee');
      else if (text.includes('indriver')) setAppSource('Indriver');

      // Step 4: Extract Location Name (Cleanup)
      const removeWords = [
          'dapat', 'orderan', 'di', 'ke', 'dari', 'seharga', 'tarif', 'ongkir', 'rupiah',
          'maxim', 'gojek', 'grab', 'shopee', 'indriver', 'gofood', 'grabfood',
          'ribu', 'rb', 'goceng', 'ceban', 'goban', 'cepek', 'noban',
          'food', 'bike', 'send', 'shop', 'tunai', 'cash'
      ];
      
      let loc = text;
      // Remove numbers
      loc = loc.replace(/\d+/g, '');
      // Remove keywords
      removeWords.forEach(w => {
          const regex = new RegExp(`\\b${w}\\b`, 'gi');
          loc = loc.replace(regex, '');
      });
      
      loc = loc.trim().replace(/\s+/g, ' '); // Clean double spaces
      loc = loc.replace(/\b\w/g, c => c.toUpperCase()); // Title Case

      if (loc.length > 2) {
          setOrigin(loc);
      } else {
          // If extracted text is too short, probably failed, don't overwrite if user already typed
          if (!origin) setOrigin("Titik Jemput (Edit Manual)");
      }
      
      vibrate([50, 50]); // Success vibration
  };

  const handleArgoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCurrencyInput(e.target.value);
      setArgoRaw(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    vibrate(50); 

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

  // UI Components helpers
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
        
        {/* VOICE INPUT BUTTON */}
        <div className="relative">
            <button 
                type="button"
                onClick={toggleVoiceInput}
                className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all border-2 overflow-hidden relative ${isListening ? 'bg-red-600 text-white border-red-500' : 'bg-[#222] text-cyan-400 border-gray-700 hover:border-cyan-500'}`}
            >
                {/* Visualizer Effect when listening */}
                {isListening && (
                    <div className="absolute inset-0 bg-red-600 flex items-center justify-center gap-1 opacity-20">
                         <div className="w-1 h-full bg-white animate-[bounce_0.5s_infinite]"></div>
                         <div className="w-1 h-full bg-white animate-[bounce_0.5s_infinite_0.1s]"></div>
                         <div className="w-1 h-full bg-white animate-[bounce_0.5s_infinite_0.2s]"></div>
                         <div className="w-1 h-full bg-white animate-[bounce_0.5s_infinite_0.3s]"></div>
                         <div className="w-1 h-full bg-white animate-[bounce_0.5s_infinite_0.4s]"></div>
                    </div>
                )}
                
                {isListening ? <MicOff size={24} className="animate-pulse" /> : <Mic size={24} />}
                <span className="relative z-10">{isListening ? 'MENDENGARKAN...' : 'INPUT SUARA (AI)'}</span>
            </button>
            {!isListening && (
                <p className="text-center text-[10px] text-gray-500 mt-2 italic">
                    Coba ucapkan: "Dapat Gofood di Mie Gacoan dua puluh lima ribu"
                </p>
            )}
        </div>

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
                    {/* Auto-fill indicator */}
                    {origin && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-500 animate-in fade-in">
                            <CheckCircle2 size={18} />
                        </div>
                    )}
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