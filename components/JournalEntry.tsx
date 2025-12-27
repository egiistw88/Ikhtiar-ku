import React, { useState, useEffect, useRef } from 'react';
import { Hotspot, Transaction } from '../types';
import { getTimeWindow, formatCurrencyInput, parseCurrencyInput, vibrate } from '../utils';
import { MapPin, Loader2, Bike, Utensils, Package, ShoppingBag, CheckCircle2, Navigation, Clock, Gauge, Mic, MicOff, Volume2, X } from 'lucide-react';
import { addHotspot, addTransaction } from '../services/storage';
import CustomDialog from './CustomDialog';

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
  const [argoRaw, setArgoRaw] = useState<string>(''); 
  const [origin, setOrigin] = useState(''); 
  const [notes, setNotes] = useState('');
  const [entryTime, setEntryTime] = useState<string>(currentTime.timeString);
  const [tripDist, setTripDist] = useState<string>(''); 

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('Ketuk Mic untuk Input Suara');
  const [transcriptPreview, setTranscriptPreview] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  // Dialog State
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, title: string, msg: string}>({
      isOpen: false, title: '', msg: ''
  });

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
  // SMART VOICE PARSING ENGINE V4 (SURGICAL EXTRACTION)
  // ==========================================
  const toggleVoiceInput = () => {
      vibrate(20);
      const windowObj = window as unknown as IWindow;
      const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

      if (!SpeechRecognition) {
          showAlert("Ups!", "Browser ini tidak mendukung fitur suara. Gunakan Chrome atau Update WebView Android System.");
          return;
      }

      if (isListening) {
          stopListening();
          return;
      }

      startListening(SpeechRecognition);
  };

  const startListening = (SpeechRecognition: any) => {
      try {
          const recognition = new SpeechRecognition();
          recognition.lang = 'id-ID'; 
          recognition.continuous = false; 
          recognition.interimResults = true; 
          recognition.maxAlternatives = 1;

          recognition.onstart = () => {
              setIsListening(true);
              setVoiceStatus("Mendengarkan...");
              setTranscriptPreview("");
          };

          recognition.onend = () => {
              setIsListening(false);
              setVoiceStatus("Ketuk Mic untuk Input Suara");
          };

          recognition.onerror = (e: any) => { 
              console.error(e); 
              setIsListening(false);
              if (e.error === 'no-speech') {
                  setVoiceStatus("Tidak ada suara...");
              } else if (e.error === 'not-allowed') {
                  showAlert("Izin Ditolak", "Izinkan akses mikrofon di pengaturan browser.");
              } else {
                  setVoiceStatus("Gagal. Coba lagi.");
              }
          };

          recognition.onresult = (event: any) => {
              // Get the latest result
              const transcript = event.results[0][0].transcript;
              setTranscriptPreview(transcript);

              if (event.results[0].isFinal) {
                  parseVoiceCommand(transcript.toLowerCase());
              }
          };

          recognitionRef.current = recognition;
          recognition.start();
      } catch (e) {
          console.error(e);
          showAlert("Error", "Gagal memulai mikrofon.");
      }
  };

  const stopListening = () => {
      if (recognitionRef.current) {
          recognitionRef.current.stop();
          setIsListening(false);
      }
  };

  const showAlert = (title: string, msg: string) => {
      setAlertConfig({ isOpen: true, title, msg });
  };

  // Helper: Normalisasi angka lisan ke simbol matematika
  const normalizeNumbers = (text: string): string => {
      let res = text;
      // Ganti kata penghubung desimal
      res = res.replace(/\b(koma|point|titik)\b/g, '.');
      // Ganti pecahan umum
      res = res.replace(/\bsetengah\b/g, '0.5');
      res = res.replace(/\bsatu setengah\b/g, '1.5');
      return res;
  };

  const parseVoiceCommand = (rawText: string) => {
      vibrate([30, 50, 30]); 
      setVoiceStatus("Memproses Cerdas...");
      
      // 1. Pre-processing: Normalisasi Angka
      let text = normalizeNumbers(rawText);

      // ============================================
      // STEP 1: EKSTRAKSI UANG (Money Extraction)
      // ============================================
      const moneySlang: Record<string, number> = {
          'goceng': 5000, 'ceban': 10000, 'cenggo': 1500, 'noban': 20000, 
          'goban': 50000, 'cepek': 100000, 'juta': 1000000
      };
      
      let amount = 0;

      // A. Cek Slang
      for (const [key, val] of Object.entries(moneySlang)) {
          if (text.includes(key)) {
              amount = val;
              text = text.replace(key, " "); // Remove found token
              break; 
          }
      }

      // B. Cek Pattern Standar (Angka + Ribu/K)
      // Regex menangkap: "15 ribu", "15rb", "15.000", "15 k"
      if (amount === 0) {
          const moneyRegex = /(\d+(?:[\.,]\d+)?)\s*(ribu|rb|k|000|rupiah)\b/i;
          const match = text.match(moneyRegex);
          if (match) {
              const numStr = match[1].replace(',', '.'); // Normalize 15,5 to 15.5
              let val = parseFloat(numStr);
              // Jika user bilang "15 ribu", val = 15. Jika "15.000 rupiah", val = 15000.
              if (val < 1000) val *= 1000; 
              
              amount = val;
              text = text.replace(match[0], " "); // Remove token
          }
      }

      // C. Cek Angka "Naked" yang besar (misal: "ongkos dua puluh lima ribu" -> "ongkos 25000")
      // WebSpeech API sering output "25000" langsung jika penyebutan jelas.
      if (amount === 0) {
          const bigNumRegex = /\b(\d{4,})\b/; // Angka minimal 4 digit (1000+)
          const match = text.match(bigNumRegex);
          if (match) {
              amount = parseInt(match[1]);
              text = text.replace(match[0], " ");
          }
      }

      if (amount > 0) setArgoRaw(formatCurrencyInput(amount.toString()));

      // ============================================
      // STEP 2: EKSTRAKSI JARAK (Distance Extraction)
      // ============================================
      let distance = 0;
      
      // A. Pattern dengan Satuan (KM/M)
      // Menangkap: "3.5 km", "3.5 kilo", "500 meter"
      const distRegex = /(\d+(?:\.\d+)?)\s*(km|kilo|kilometer|meter|m)\b/i;
      const distMatch = text.match(distRegex);
      
      if (distMatch) {
          let val = parseFloat(distMatch[1]);
          const unit = distMatch[2];
          if (unit.startsWith('m')) val /= 1000; // Convert meter to KM
          
          distance = val;
          text = text.replace(distMatch[0], " ");
      } 
      // B. Pattern Konteks (tanpa satuan, tapi didahului kata "jarak")
      // Menangkap: "jarak 3.5", "jauhnya 10"
      else {
          const contextDistRegex = /\b(jarak|jauhnya)\s+(\d+(?:\.\d+)?)\b/i;
          const match = text.match(contextDistRegex);
          if (match) {
              distance = parseFloat(match[2]);
              text = text.replace(match[0], " ");
          }
      }

      if (distance > 0) {
          setTripDist(distance % 1 === 0 ? distance.toString() : distance.toFixed(1));
      }

      // ============================================
      // STEP 3: EKSTRAKSI APLIKASI (App Source)
      // ============================================
      // Kita cek keywords, set state, lalu HAPUS dari teks agar tidak masuk ke lokasi
      const apps: Record<string, AppSource> = {
          'gojek': 'Gojek', 'gofood': 'Gojek', 'gosend': 'Gojek',
          'grab': 'Grab', 'grabfood': 'Grab',
          'maxim': 'Maxim',
          'shopee': 'Shopee', 'shopeefood': 'Shopee',
          'indriver': 'Indriver'
      };

      for (const [key, val] of Object.entries(apps)) {
          if (text.includes(key)) {
              setAppSource(val);
              text = text.replace(new RegExp(`\\b${key}\\b`, 'g'), " ");
              break; // Prioritas pertama menang
          }
      }

      // ============================================
      // STEP 4: EKSTRAKSI LAYANAN (Service Type)
      // ============================================
      // Cek keywords layanan eksplisit
      let serviceFound = false;
      const services: Record<string, ServiceType> = {
          'food': 'Food', 'makan': 'Food',
          'shop': 'Shop', 'belanja': 'Shop', 'mart': 'Shop',
          'send': 'Send', 'kirim': 'Send', 'paket': 'Send', 'barang': 'Send', 'antar': 'Send',
          'bike': 'Bike', 'ride': 'Bike', 'motor': 'Bike', 'penumpang': 'Bike', 'jemput': 'Bike'
      };

      for (const [key, val] of Object.entries(services)) {
          if (text.includes(key)) {
              setServiceType(val);
              text = text.replace(new RegExp(`\\b${key}\\b`, 'g'), " ");
              serviceFound = true;
              break;
          }
      }

      // ============================================
      // STEP 5: PEMBERSIHAN SAMPAH (Garbage Collection)
      // ============================================
      // Hapus kata-kata filler yang tidak berguna untuk Nama Lokasi
      const stopWords = [
          'dapat', 'orderan', 'tarikan', 'cust', 'customer',
          'di', 'ke', 'dari', 'tujuannya', 'posisi',
          'seharga', 'tarif', 'ongkir', 'argo', 'tunai', 'cash', 'bayar', 'dikasih',
          'jarak', 'jauhnya', 'kilo', 'km',
          'namanya', 'daerah', 'kawasan'
      ];
      
      stopWords.forEach(w => {
          text = text.replace(new RegExp(`\\b${w}\\b`, 'gi'), " ");
      });

      // ============================================
      // STEP 6: LOKASI & CATATAN (Contextual Split)
      // ============================================
      // Sisa teks sekarang harusnya hanya Lokasi + Catatan
      let locationRaw = "";
      let notesRaw = "";

      // Cek pemisah catatan
      const noteKeywords = ['catatan', 'note', 'keterangan', 'pesan'];
      let splitIndex = -1;
      
      for (const kw of noteKeywords) {
          const idx = text.indexOf(kw);
          if (idx !== -1) {
              splitIndex = idx;
              text = text.replace(kw, ""); // Hapus kata kuncinya (misal: "catatan")
              break;
          }
      }

      if (splitIndex !== -1) {
          locationRaw = text.substring(0, splitIndex).trim();
          notesRaw = text.substring(splitIndex).trim();
      } else {
          locationRaw = text.trim();
      }

      // INTELLIGENT SERVICE INFERENCE (Jika layanan belum ketemu di Step 4)
      // Jika lokasi mengandung kata makanan, set ke Food otomatis
      if (!serviceFound) {
          const foodKeywords = ['mie', 'nasi', 'kopi', 'cafe', 'resto', 'warung', 'ayam', 'bakso', 'soto', 'pizza', 'burger'];
          if (foodKeywords.some(kw => locationRaw.includes(kw))) {
              setServiceType('Food');
          }
          const shopKeywords = ['alfamart', 'indomaret', 'yomart', 'superindo', 'pasar', 'mall'];
          if (shopKeywords.some(kw => locationRaw.includes(kw))) {
              setServiceType('Shop');
          }
      }

      // Final Cleanups
      locationRaw = locationRaw.replace(/\s+/g, ' ').trim();
      notesRaw = notesRaw.replace(/\s+/g, ' ').trim();

      // Set State
      if (locationRaw) {
          // Title Case
          setOrigin(locationRaw.toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase()));
      }
      if (notesRaw) {
          setNotes(notesRaw.charAt(0).toUpperCase() + notesRaw.slice(1));
      }

      // Visual Feedback
      setTranscriptPreview("Berhasil Diproses!");
      setTimeout(() => setTranscriptPreview(""), 2000);
  };

  const handleArgoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCurrencyInput(e.target.value);
      setArgoRaw(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    vibrate(50); 

    if (!coords) {
        showAlert("GPS Lemah", "Sabar Ndan, GPS belum ngunci lokasi. Geser ke tempat terbuka sebentar.");
        return;
    }
    
    const argoVal = parseCurrencyInput(argoRaw);
    if (!argoVal || argoVal <= 0) {
        showAlert("Lupa Argo?", "Isi dulu argonya Ndan.");
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
      <CustomDialog 
        isOpen={alertConfig.isOpen}
        type="alert"
        title={alertConfig.title}
        message={alertConfig.msg}
        onConfirm={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />

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
        
        {/* VOICE INPUT BUTTON - SMART & VISUAL */}
        <div className="relative group">
            {/* ACTIVE LISTENING VISUALIZER */}
            {isListening && (
                <>
                    <div className="absolute inset-0 bg-red-600 rounded-2xl animate-ping opacity-30"></div>
                    <div className="absolute -inset-1 bg-red-600/20 rounded-3xl animate-pulse blur-sm"></div>
                </>
            )}
            
            <button 
                type="button"
                onClick={toggleVoiceInput}
                className={`w-full py-6 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all border-2 overflow-hidden relative shadow-xl z-10 ${isListening ? 'bg-red-600 text-white border-red-500 scale-[1.02]' : 'bg-[#222] text-cyan-400 border-gray-700 hover:border-cyan-500 hover:bg-[#2a2a2a]'}`}
            >
                {isListening ? (
                    <div className="flex items-center gap-2">
                        <span className="flex gap-1 h-4 items-center">
                            <span className="w-1 h-2 bg-white animate-[bounce_1s_infinite]"></span>
                            <span className="w-1 h-4 bg-white animate-[bounce_1.2s_infinite]"></span>
                            <span className="w-1 h-3 bg-white animate-[bounce_0.8s_infinite]"></span>
                        </span>
                        <span className="uppercase tracking-widest animate-pulse">MENDENGARKAN...</span>
                    </div>
                ) : (
                    <>
                        <Mic size={24} />
                        <span className="uppercase tracking-wide text-sm md:text-base">Input Suara (AI)</span>
                    </>
                )}
            </button>
            
            {/* Status & Transcript Area */}
            <div className={`mt-3 text-center transition-all duration-300 min-h-[40px] flex flex-col justify-center`}>
                {transcriptPreview ? (
                    <p className={`text-sm font-bold italic leading-tight animate-in fade-in slide-in-from-top-2 ${isListening ? 'text-white' : 'text-emerald-400'}`}>
                        "{transcriptPreview}"
                    </p>
                ) : (
                    <p className="text-[10px] text-gray-500 italic">
                        Coba: "Dapat Gojek <span className="text-cyan-600 font-bold">di Mie Gacoan</span> lima puluh ribu, <span className="text-white">jarak 3 koma 5 kilo</span>"
                    </p>
                )}
            </div>
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
                <div className="relative">
                    <input 
                        type="number"
                        step="0.1"
                        value={tripDist}
                        onChange={(e) => setTripDist(e.target.value)}
                        placeholder="0.0"
                        className={`w-full p-3 border rounded-xl text-white font-mono text-center focus:border-cyan-500 transition-all ${tripDist ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-[#1e1e1e] border-gray-700'}`}
                    />
                    {tripDist && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500 animate-in fade-in">
                            <CheckCircle2 size={16} />
                        </div>
                    )}
                </div>
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