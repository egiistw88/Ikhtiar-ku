import React, { useState, useEffect, useRef } from 'react';
import { Hotspot, Transaction } from '../types';
import { getTimeWindow, formatCurrencyInput, parseCurrencyInput, vibrate } from '../utils';
import { MapPin, Loader2, Bike, Utensils, Package, ShoppingBag, CheckCircle2, Navigation, Clock, Gauge, Mic, RotateCcw } from 'lucide-react';
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

// Extend Window interface for Speech API
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
  // LOGIKA INPUT SUARA V9 (SLANG DICTIONARY UPDATE)
  // ==========================================
  const toggleVoiceInput = () => {
      vibrate(20);
      const windowObj = window as unknown as IWindow;
      const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

      if (!SpeechRecognition) {
          showAlert("Browser Tidak Mendukung", "Fitur ini butuh Google Chrome atau WebView Android terbaru.");
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
              setVoiceStatus("Gagal. Coba lagi.");
          };

          recognition.onresult = (event: any) => {
              const transcript = event.results[0][0].transcript;
              setTranscriptPreview(transcript);

              if (event.results[0].isFinal) {
                  processVoiceInput(transcript);
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

  // --- HELPER: TEXT NORMALIZER & SANITIZER ---
  const normalizeText = (text: string): string => {
      let s = text.toLowerCase();

      // 1. CRITICAL FIX: Hapus "Rp" atau "Rp." yang menempel
      // Contoh: "Rp10.000" -> "10.000", "Rp 50rb" -> "50rb"
      s = s.replace(/rp\.?\s*/g, ' '); 
      
      // 2. Ganti desimal & pecahan
      s = s.replace(/setengah/g, '0.5').replace(/satu setengah/g, '1.5');
      s = s.replace(/koma/g, '.').replace(/point/g, '.');

      // 3. Slang Uang -> Angka String (KAMUS GAUL DRIVER)
      const slangMoney: Record<string, string> = {
          'gopek': '500', 
          'seceng': '1000',
          'cenggo': '1500', 
          'goceng': '5000', 
          'ceban': '10000', 
          'noban': '20000', 
          'jigo': '25000',
          'goban': '50000', 
          'gocap': '50000', 
          'cepek': '100000', 
          'juta': '1000000'
      };
      
      // Replace slang dengan angka
      for (const [key, val] of Object.entries(slangMoney)) {
          // \b memastikan hanya mengganti kata utuh, bukan bagian dari kata lain
          s = s.replace(new RegExp(`\\b${key}\\b`, 'g'), val);
      }

      // 4. Konversi Kata Bilangan Dasar (0-100)
      const wordMap: Record<string, string> = {
          'nol': '0', 'satu': '1', 'dua': '2', 'tiga': '3', 'empat': '4',
          'lima': '5', 'enam': '6', 'tujuh': '7', 'delapan': '8', 'sembilan': '9',
          'sepuluh': '10', 'sebelas': '11', 'seratus': '100', 'lima puluh': '50', 
          'dua puluh': '20', 'tiga puluh': '30'
      };
      
      Object.keys(wordMap).forEach(key => {
         // Regex lookahead: Ganti kata angka HANYA JIKA diikuti satuan (ribu/km/meter) atau berdiri sebagai nominal
         const regex = new RegExp(`\\b${key}\\s+(ribu|rb|ratus|puluh|juta|km|kilo|meter)\\b`, 'gi');
         s = s.replace(regex, (match) => match.replace(key, wordMap[key]));
      });

      // Cleanup spasi ganda hasil replace
      return s.replace(/\s+/g, ' ').trim();
  };

  // --- CORE ENGINE V9 ---
  const processVoiceInput = (rawTranscript: string) => {
      vibrate([50, 30, 50]);
      setVoiceStatus("Menganalisis...");

      let processingText = normalizeText(rawTranscript);
      console.log("Processing:", processingText);

      // --- BEDAH 1: EKSTRAKSI JARAK (Distance) ---
      let distVal = 0;
      let distStringMatch = "";

      const distPattern = /(\d+(?:[\.,]\d+)?)\s*(km|kilo|kilometer|meter|m)\b/i;
      const matchDist = processingText.match(distPattern);

      if (matchDist) {
          let val = parseFloat(matchDist[1].replace(',', '.'));
          const unit = matchDist[2].toLowerCase();
          if (unit.startsWith('m') && unit !== 'meter') val /= 1000;
          if (unit === 'meter') val /= 1000;

          distVal = val;
          distStringMatch = matchDist[0];
      } else {
          const contextDist = /(jarak|jauhnya)\s+(\d+(?:[\.,]\d+)?)/i;
          const cm = processingText.match(contextDist);
          if (cm) {
              distVal = parseFloat(cm[2].replace(',', '.'));
              distStringMatch = cm[0];
          }
      }

      if (distVal > 0) {
          setTripDist(distVal.toString());
          processingText = processingText.replace(distStringMatch, " ");
      }

      // --- BEDAH 2: EKSTRAKSI UANG ---
      let moneyVal = 0;
      let moneyStringMatch = "";

      // STRATEGI 1: DETEKSI FORMAT RIBUAN (10.000)
      const dotPattern = /\b\d{1,3}(?:\.\d{3})+\b/g;
      const dotMatches = processingText.match(dotPattern);
      
      if (dotMatches) {
          for (const m of dotMatches) {
              const val = parseInt(m.replace(/\./g, ''));
              if (val >= 1000) {
                  moneyVal = val;
                  moneyStringMatch = m;
                  break; 
              }
          }
      }

      // STRATEGI 2: DETEKSI SUFFIX (10 ribu, 15rb)
      if (moneyVal === 0) {
          const suffixPattern = /(\d+(?:[\.,]\d+)?)\s*(ribu|rb|k|000)\b/i;
          const match = processingText.match(suffixPattern);
          
          if (match) {
              let rawNum = match[1].replace(',', '.');
              let val = parseFloat(rawNum);
              const suffix = match[2].toLowerCase();

              if (suffix === '000') {
                  val = val * 1000; 
              } else {
                  val *= 1000;
              }

              moneyVal = val;
              moneyStringMatch = match[0];
          }
      }

      // STRATEGI 3: ANGKA POLOS BESAR (> 1000)
      if (moneyVal === 0) {
           const bigNumPattern = /\b(\d{4,})\b/;
           const match = processingText.match(bigNumPattern);
           if (match) {
               moneyVal = parseInt(match[1]);
               moneyStringMatch = match[0];
           }
      }

      if (moneyVal > 0) {
          setArgoRaw(formatCurrencyInput(moneyVal.toString()));
          processingText = processingText.replace(moneyStringMatch, " ");
      }

      // --- BEDAH 3: APLIKASI & LAYANAN ---
      const apps: Record<string, AppSource> = {
          'gojek': 'Gojek', 'gofood': 'Gojek', 'gosend': 'Gojek',
          'grab': 'Grab', 'grabfood': 'Grab', 'grabexpress': 'Grab',
          'maxim': 'Maxim', 'shopee': 'Shopee', 'indriver': 'Indriver'
      };
      
      let appFound = false;
      for (const [key, val] of Object.entries(apps)) {
          if (processingText.includes(key)) {
              setAppSource(val);
              appFound = true;
              processingText = processingText.replace(key, " ");
          }
      }

      const services: Record<string, ServiceType> = {
          'food': 'Food', 'makan': 'Food', 'lapar': 'Food', 'restoran': 'Food', 'resto': 'Food',
          'shop': 'Shop', 'belanja': 'Shop', 'mart': 'Shop', 'beli': 'Shop',
          'send': 'Send', 'kirim': 'Send', 'paket': 'Send', 'antar': 'Send',
          'bike': 'Bike', 'motor': 'Bike', 'penumpang': 'Bike', 'jemput': 'Bike', 'ride': 'Bike'
      };

      let serviceFound = false;
      for (const [key, val] of Object.entries(services)) {
          if (processingText.includes(key)) {
              setServiceType(val);
              serviceFound = true;
              processingText = processingText.replace(key, " ");
          }
      }

      // --- BEDAH 4: CLEANUP & LOKASI ---
      const fillers = [
          'dapat', 'orderan', 'dari', 'di', 'ke', 'tujuannya', 'arah', 
          'seharga', 'tarif', 'ongkir', 'biaya', 'harga', 'rupiah', 'rp', 'perak',
          'jarak', 'jauhnya', 'kilo', 'km', 'meter',
          'namanya', 'daerah', 'kawasan', 'lokasi', 'posisi'
      ];
      fillers.forEach(word => {
          processingText = processingText.replace(new RegExp(`\\b${word}\\b`, 'gi'), " ");
      });

      // Split Catatan
      let finalLoc = "";
      let finalNote = "";
      const splitters = ['catatan', 'note', 'keterangan', 'pesan'];
      let splitIndex = -1;

      for (const s of splitters) {
          const idx = processingText.indexOf(s);
          if (idx !== -1) {
              splitIndex = idx;
              processingText = processingText.replace(s, "");
              break;
          }
      }

      if (splitIndex !== -1) {
          finalLoc = processingText.substring(0, splitIndex).trim();
          finalNote = processingText.substring(splitIndex).trim();
      } else {
          finalLoc = processingText.trim();
      }

      finalLoc = finalLoc.replace(/\s+/g, ' ').replace(/[^\w\s\(\)\.\-]/gi, '').trim();
      finalNote = finalNote.replace(/\s+/g, ' ').trim();

      if (!serviceFound && finalLoc) {
          const lower = finalLoc.toLowerCase();
          if (/mie|nasi|kopi|cafe|resto|warung|soto|bakso|geprek|seblak|ayam/i.test(lower)) setServiceType('Food');
          else if (/mart|super|pasar|mall|toko|grosir/i.test(lower)) setServiceType('Shop');
      }

      if (finalLoc) setOrigin(finalLoc.replace(/(?:^|\s)\S/g, a => a.toUpperCase())); 
      if (finalNote) setNotes(finalNote);

      setTranscriptPreview("Siap!");
      setTimeout(() => setTranscriptPreview(""), 1500);
      setVoiceStatus("Ketuk Mic untuk Input Suara");
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
                        Coba: "Dapat Gojek <span className="text-cyan-600 font-bold">di Mie Gacoan</span> sepuluh ribu, <span className="text-white">jarak 3.5 kilo</span>"
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
                    <button 
                        type="button"
                        onClick={() => {setOrigin(''); setNotes(''); vibrate(10);}}
                        className="absolute right-2 top-2 p-2 text-gray-600 hover:text-white"
                        title="Reset Text"
                    >
                        <RotateCcw size={14}/>
                    </button>
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