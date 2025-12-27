import React, { useState, useEffect, useRef } from 'react';
import { Hotspot, Transaction } from '../types';
import { getTimeWindow, formatCurrencyInput, parseCurrencyInput, vibrate } from '../utils';
import { MapPin, Loader2, Bike, Utensils, Package, ShoppingBag, CheckCircle2, Navigation, Clock, Gauge, Mic, Volume2, XCircle, MicOff } from 'lucide-react';
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
  // SMART VOICE PARSING ENGINE V2
  // ==========================================
  const toggleVoiceInput = () => {
      vibrate(20);
      const windowObj = window as unknown as IWindow;
      const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

      if (!SpeechRecognition) {
          showAlert("Ups!", "Browser ini tidak mendukung fitur suara. Gunakan Chrome atau browser bawaan Android terbaru.");
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
          recognition.lang = 'id-ID'; // Wajib Bahasa Indonesia
          recognition.continuous = false; 
          recognition.interimResults = true; 

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
                  setVoiceStatus("Tidak ada suara terdeteksi");
              } else if (e.error === 'not-allowed') {
                  showAlert("Izin Ditolak", "Izinkan akses mikrofon di pengaturan browser.");
              } else {
                  setVoiceStatus("Gagal. Coba lagi.");
              }
          };

          recognition.onresult = (event: any) => {
              const transcript = event.results[0][0].transcript.toLowerCase();
              setTranscriptPreview(transcript);

              if (event.results[0].isFinal) {
                  parseVoiceCommand(transcript);
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

  // --- LOGIC UTAMA PEMECAH KALIMAT ---
  const parseVoiceCommand = (rawText: string) => {
      vibrate([30, 50, 30]); 
      setVoiceStatus("Memproses Cerdas...");
      
      let processingText = rawText;

      // 1. EKSTRAKSI UANG (Money)
      // Mencari pola: "15 ribu", "15rb", "15k", "goceng", dll.
      // Kita cabut dari teks agar tidak mengganggu deteksi lokasi.
      const moneyMap: Record<string, number> = {
          'goceng': 5000, 'ceban': 10000, 'cenggo': 1500, 'noban': 20000, 
          'goban': 50000, 'cepek': 100000, 'juta': 1000000, 'setengah juta': 500000
      };

      let amount = 0;
      let moneyMatched = false;

      // Cek Slang dulu
      for (const [key, val] of Object.entries(moneyMap)) {
          if (processingText.includes(key)) {
              amount = val;
              processingText = processingText.replace(key, ""); // Hapus dari kalimat
              moneyMatched = true;
              break;
          }
      }

      // Cek Pola Angka + Ribu
      if (!moneyMatched) {
          const digitMatch = processingText.match(/(\d+(?:[\.,]\d+)?)\s*(ribu|rb|k|000)/i);
          if (digitMatch) {
              // Bersihkan titik/koma jika ada (misal 1.5 ribu jarang, tapi 15 ribu umum)
              const rawNum = digitMatch[1].replace(',', '.');
              amount = parseFloat(rawNum) * 1000;
              processingText = processingText.replace(digitMatch[0], ""); // Hapus
              moneyMatched = true;
          } else {
              // Cek angka saja yang berdiri sendiri dan besar (asumsi user sebut "lima belas ribu" tapi STT nulis "15000")
              const plainNumber = processingText.match(/\b(\d{4,})\b/); // Minimal 4 digit (1000+)
              if (plainNumber) {
                  amount = parseInt(plainNumber[1]);
                  processingText = processingText.replace(plainNumber[0], "");
              }
          }
      }

      if (amount > 0) setArgoRaw(formatCurrencyInput(amount.toString()));

      // 2. EKSTRAKSI JARAK (Distance)
      // Pola: "5 kilo", "5.2 km", "jarak 10"
      const distMatch = processingText.match(/(\d+(?:[\.,]\d+)?)\s*(km|kilo|kilometer)/i);
      if (distMatch) {
          const distStr = distMatch[1].replace(',', '.');
          setTripDist(distStr);
          processingText = processingText.replace(distMatch[0], ""); // Hapus
      }

      // 3. EKSTRAKSI APLIKASI & LAYANAN
      // Set state jika ketemu, lalu hapus kata kuncinya dari kalimat
      if (processingText.includes('maxim')) { setAppSource('Maxim'); processingText = processingText.replace('maxim', ''); }
      else if (processingText.includes('gojek') || processingText.includes('gofood')) { setAppSource('Gojek'); processingText = processingText.replace(/gojek|gofood|gosend/g, ''); }
      else if (processingText.includes('grab')) { setAppSource('Grab'); processingText = processingText.replace(/grab|grabfood/g, ''); }
      else if (processingText.includes('shopee')) { setAppSource('Shopee'); processingText = processingText.replace(/shopee|shopeefood/g, ''); }
      else if (processingText.includes('indriver')) { setAppSource('Indriver'); processingText = processingText.replace('indriver', ''); }

      if (processingText.includes('food') || processingText.includes('makan') || processingText.includes('gacoan')) { setServiceType('Food'); processingText = processingText.replace(/food|makan/g, ''); }
      else if (processingText.includes('shop') || processingText.includes('belanja') || processingText.includes('mart')) { setServiceType('Shop'); processingText = processingText.replace(/shop|belanja|mart/g, ''); }
      else if (processingText.includes('send') || processingText.includes('paket') || processingText.includes('antar') || processingText.includes('kirim')) { setServiceType('Send'); processingText = processingText.replace(/send|paket|antar|kirim|barang/g, ''); }
      else if (processingText.includes('bike') || processingText.includes('ride') || processingText.includes('penumpang') || processingText.includes('orang') || processingText.includes('jemput')) { setServiceType('Bike'); processingText = processingText.replace(/bike|ride|penumpang|orang|jemput|motor/g, ''); }

      // 4. MEMBERSIHKAN KATA SAMBUNG (FILLER)
      // Hapus kata-kata tidak penting agar sisa kalimat murni Lokasi/Catatan
      const fillers = ['dapat', 'orderan', 'seharga', 'tarif', 'ongkir', 'rupiah', 'tunai', 'cash', 'di', 'ke', 'dari', 'namanya'];
      fillers.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          processingText = processingText.replace(regex, " ");
      });

      // 5. MEMISAHKAN LOKASI & CATATAN
      // Sisanya sekarang kemungkinan besar adalah Lokasi.
      // Tapi cek dulu apakah user bilang "catatan..."
      let extractedLocation = "";
      let extractedNotes = "";

      if (processingText.includes("catatan")) {
          const parts = processingText.split("catatan");
          extractedLocation = parts[0].trim();
          extractedNotes = parts[1].trim();
      } else if (processingText.includes("note")) {
          const parts = processingText.split("note");
          extractedLocation = parts[0].trim();
          extractedNotes = parts[1].trim();
      } else {
          // Tidak ada kata "catatan", berarti sisanya adalah Lokasi semua
          extractedLocation = processingText.trim();
      }

      // Bersihkan spasi ganda & karakter aneh
      extractedLocation = extractedLocation.replace(/\s+/g, ' ').replace(/[^\w\s]/gi, '').trim();
      extractedNotes = extractedNotes.replace(/\s+/g, ' ').trim();

      // Title Case untuk Lokasi (misal: "mie gacoan" -> "Mie Gacoan")
      if (extractedLocation.length > 0) {
          const formattedLoc = extractedLocation.toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase());
          setOrigin(formattedLoc);
      }
      
      if (extractedNotes.length > 0) {
          setNotes(extractedNotes);
      }

      setTranscriptPreview(`Berhasil!`);
      setTimeout(() => setTranscriptPreview(""), 3000);
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
                        Coba: "Dapat Gojek <span className="text-cyan-600 font-bold">di Trans Studio</span> lima puluh ribu, jarak 10 kilo"
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