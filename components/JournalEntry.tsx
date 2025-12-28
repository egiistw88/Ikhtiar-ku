
import React, { useState, useEffect, useRef } from 'react';
import { Hotspot, Transaction } from '../types';
import { getTimeWindow, formatCurrencyInput, parseCurrencyInput, vibrate, playSound } from '../utils';
import { MapPin, Loader2, Bike, Utensils, Package, ShoppingBag, CheckCircle2, RotateCcw, Save, CreditCard, Banknote, Mic, Radio, X, Zap } from 'lucide-react';
import { addHotspot, addTransaction } from '../services/storage';
import CustomDialog from './CustomDialog';

interface JournalEntryProps {
  currentTime: { dayName: string; timeString: string; fullDate: Date; };
  onSaved: () => void;
}

type AppSource = 'Gojek' | 'Grab' | 'Maxim' | 'Shopee' | 'Indriver';
type ServiceType = 'Bike' | 'Food' | 'Send' | 'Shop';

interface IWindow extends Window { webkitSpeechRecognition: any; SpeechRecognition: any; }

const JournalEntry: React.FC<JournalEntryProps> = ({ currentTime, onSaved }) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [appSource, setAppSource] = useState<AppSource>('Maxim');
  const [serviceType, setServiceType] = useState<ServiceType>('Bike');
  const [argoRaw, setArgoRaw] = useState<string>(''); 
  const [origin, setOrigin] = useState(''); 
  const [notes, setNotes] = useState('');
  const [tripDist, setTripDist] = useState<string>(''); 
  const [isCash, setIsCash] = useState<boolean>(true);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState<string>('');
  const [recognizedParts, setRecognizedParts] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);

  // Alert State
  const [alert, setAlert] = useState<{show: boolean, msg: string}>({show: false, msg: ''});

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("GPS Error"),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // --- SMART PARSING LOGIC ---
  const parseIndonesianNumber = (text: string): number | null => {
      // Mapping kata ke angka
      const wordMap: Record<string, number> = {
          'satu': 1, 'dua': 2, 'tiga': 3, 'empat': 4, 'lima': 5,
          'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9, 'sepuluh': 10,
          'sebelas': 11, 'seratus': 100, 'seribu': 1000, 'goceng': 5000, 
          'ceban': 10000, 'noban': 20000, 'gocap': 50000, 'cepek': 100000,
          'setengah': 500 // konteks ribu
      };

      const lower = text.toLowerCase().replace(/\./g, '');
      
      // 1. Cek Angka Langsung (e.g. "15000", "15rb", "15k")
      const directMatch = lower.match(/(\d+(?:,\d+)?)\s*(rb|ribu|k|jt|juta)?/);
      if (directMatch) {
          let val = parseFloat(directMatch[1].replace(',', '.'));
          const suffix = directMatch[2];
          if (suffix === 'rb' || suffix === 'ribu' || suffix === 'k') val *= 1000;
          if (suffix === 'jt' || suffix === 'juta') val *= 1000000;
          // Asumsi jika user bilang "15" dalam konteks ojol, maksudnya "15.000"
          if (val < 100) val *= 1000; 
          return Math.floor(val);
      }

      // 2. Cek Kata (Simple Parser untuk "Dua Puluh Ribu")
      // Ini implementasi sederhana, bisa dikembangkan
      if (lower.includes('ribu')) {
          const parts = lower.split('ribu')[0].trim().split(' ');
          let tempVal = 0;
          parts.forEach(p => {
              if (wordMap[p]) tempVal += wordMap[p];
              if (p === 'puluh') tempVal *= 10; // Logika dasar (perlu library terbilang js untuk full accuracy)
              if (p === 'belas') tempVal += 10;
              if (p === 'ratus') tempVal *= 100;
          });
          // Fallback regex jika logika kata gagal, ambil angka pertama yg ketemu di string
           if (tempVal === 0) return null;
           return tempVal * 1000;
      }
      
      // Cek slang
      for (const [key, val] of Object.entries(wordMap)) {
          if (lower.includes(key) && val >= 5000) return val;
      }

      return null;
  };

  const processSmartVoice = (text: string) => {
      let cleanText = text.toLowerCase();
      const detectedLog: string[] = [];

      // 0. CEK COMMAND "SIMPAN" / "MASUK"
      if (cleanText.includes('simpan') || cleanText.includes('masuk') || cleanText.includes('kirim')) {
          handleSubmitVoice();
          return;
      }

      // 1. DETEKSI HARGA (Priority)
      // Mencari angka atau kata uang
      const moneyRegex = /(\d+(?:[.,]\d+)?\s*(?:rb|ribu|k)?)|(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|seratus|goceng|ceban|noban|gocap|cepek)\s*(?:puluh|belas|ratus)?\s*(?:ribu)?/gi;
      const moneyMatches = cleanText.match(moneyRegex);
      
      if (moneyMatches) {
          // Ambil match terpanjang yang kemungkinan besar adalah harga
          const bestMatch = moneyMatches.reduce((a, b) => a.length > b.length ? a : b);
          const parsedMoney = parseIndonesianNumber(bestMatch);
          if (parsedMoney && parsedMoney > 500) {
              setArgoRaw(formatCurrencyInput(parsedMoney.toString()));
              cleanText = cleanText.replace(bestMatch, ''); // Hapus harga dari text
              detectedLog.push(`Rp${parsedMoney}`);
          }
      }

      // 2. DETEKSI APLIKASI
      if (cleanText.includes('gojek')) { setAppSource('Gojek'); cleanText = cleanText.replace('gojek', ''); detectedLog.push('Gojek'); }
      else if (cleanText.includes('grab')) { setAppSource('Grab'); cleanText = cleanText.replace('grab', ''); detectedLog.push('Grab'); }
      else if (cleanText.includes('shopee') || cleanText.includes('shope') || cleanText.includes('oren')) { setAppSource('Shopee'); cleanText = cleanText.replace(/shopee|shope|oren/g, ''); detectedLog.push('Shopee'); }
      else if (cleanText.includes('maxim') || cleanText.includes('kuning')) { setAppSource('Maxim'); cleanText = cleanText.replace(/maxim|kuning/g, ''); detectedLog.push('Maxim'); }
      else if (cleanText.includes('indriver') || cleanText.includes('in driver')) { setAppSource('Indriver'); cleanText = cleanText.replace(/indriver|in driver/g, ''); detectedLog.push('Indriver'); }

      // 3. DETEKSI LAYANAN
      if (cleanText.includes('makan') || cleanText.includes('food') || cleanText.includes('lapar')) { setServiceType('Food'); cleanText = cleanText.replace(/makan|food|lapar/g, ''); detectedLog.push('Food'); }
      else if (cleanText.includes('kirim') || cleanText.includes('paket') || cleanText.includes('send') || cleanText.includes('barang')) { setServiceType('Send'); cleanText = cleanText.replace(/kirim|paket|send|barang/g, ''); detectedLog.push('Send'); }
      else if (cleanText.includes('belanja') || cleanText.includes('shop') || cleanText.includes('mart') || cleanText.includes('beli')) { setServiceType('Shop'); cleanText = cleanText.replace(/belanja|shop|mart|beli/g, ''); detectedLog.push('Shop'); }
      else if (cleanText.includes('antar') || cleanText.includes('jemput') || cleanText.includes('bike') || cleanText.includes('orang') || cleanText.includes('penumpang') || cleanText.includes('motor')) { setServiceType('Bike'); cleanText = cleanText.replace(/antar|jemput|bike|orang|penumpang|motor/g, ''); detectedLog.push('Bike'); }

      // 4. DETEKSI PEMBAYARAN
      if (cleanText.includes('tunai') || cleanText.includes('cash') || cleanText.includes('kes')) { setIsCash(true); cleanText = cleanText.replace(/tunai|cash|kes/g, ''); detectedLog.push('Tunai'); }
      else if (cleanText.includes('saldo') || cleanText.includes('ovo') || cleanText.includes('gopay') || cleanText.includes('non tunai')) { setIsCash(false); cleanText = cleanText.replace(/saldo|ovo|gopay|non tunai/g, ''); detectedLog.push('Saldo'); }

      // 5. SISANYA ADALAH LOKASI
      // Bersihkan kata sambung
      let locationRaw = cleanText.replace(/\b(di|ke|dari|yang|namanya|lokasi|tujuan)\b/g, '').trim();
      // Hapus karakter aneh & double space
      locationRaw = locationRaw.replace(/\s+/g, ' ').replace(/[^\w\s]/gi, '');
      
      if (locationRaw.length > 3) {
          // Capitalize first letters
          const formattedLoc = locationRaw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          setOrigin(formattedLoc);
          detectedLog.push(`Lokasi: ${formattedLoc}`);
      }

      setRecognizedParts(detectedLog);
      if (detectedLog.length > 0) vibrate(50);
  };

  const toggleVoice = () => {
      const Win = window as unknown as IWindow;
      const Speech = Win.SpeechRecognition || Win.webkitSpeechRecognition;

      if (!Speech) { setAlert({show: true, msg: "Browser tidak support voice input."}); return; }

      if (isListening) { 
          recognitionRef.current?.stop(); 
          setIsListening(false); 
          return; 
      }

      try {
          const rec = new Speech();
          rec.lang = 'id-ID'; 
          rec.continuous = false; // Single shot for better mobile battery
          rec.interimResults = true; // Show live text
          
          rec.onstart = () => { 
              setIsListening(true); 
              setTranscriptPreview("Mendengarkan..."); 
              setRecognizedParts([]);
              vibrate(20);
          };
          
          rec.onend = () => { 
              setIsListening(false); 
              vibrate(20);
          };
          
          rec.onresult = (e: any) => {
              const text = Array.from(e.results)
                .map((result: any) => result[0].transcript)
                .join('');
              
              setTranscriptPreview(text);
              
              // Process final result only
              if (e.results[0].isFinal) {
                  processSmartVoice(text);
                  playSound('success');
              }
          };
          
          rec.onerror = (e: any) => {
              console.error(e);
              setIsListening(false);
              setTranscriptPreview("Gagal mendengar. Coba lagi.");
          };

          recognitionRef.current = rec;
          rec.start();
          playSound('click');
      } catch (e) { console.error(e); setIsListening(false); }
  };

  const saveLogic = () => {
    const argoVal = parseCurrencyInput(argoRaw);
    if (!argoVal || isNaN(argoVal) || argoVal <= 0) { 
        setAlert({show: true, msg: "Sebutkan nominal harga dulu, Ndan."}); 
        return; 
    }

    setIsSubmitting(true);
    vibrate(50);
    playSound('success');

    // Save Data Logic
    let category: Hotspot['category'] = 'Other';
    if (serviceType === 'Food') category = 'Culinary';
    if (serviceType === 'Bike') category = 'Bike';
    if (serviceType === 'Send') category = 'Logistics';
    if (serviceType === 'Shop') category = 'Mall/Lifestyle';

    if (coords) {
        const [h] = currentTime.timeString.split(':').map(Number);
        const newHotspot: Hotspot = {
            id: Date.now().toString(),
            date: currentTime.fullDate.toISOString().split('T')[0],
            day: currentTime.dayName,
            time_window: getTimeWindow(h),
            predicted_hour: currentTime.timeString, 
            origin: origin || `Titik ${serviceType}`,
            type: `${serviceType} (${appSource})`,
            category, lat: coords.lat, lng: coords.lng, zone: 'User Entry',
            notes: `${notes} [${appSource}]`, isUserEntry: true,
            isDaily: false, 
            baseScore: 100, 
            validations: [{ date: currentTime.fullDate.toISOString().split('T')[0], isAccurate: true }]
        };
        addHotspot(newHotspot);
    }

    const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        date: currentTime.fullDate.toISOString().split('T')[0],
        timestamp: Date.now(),
        amount: argoVal,
        type: 'income',
        category: serviceType === 'Bike' ? 'Trip' : 'Other',
        note: `${appSource} - ${origin || 'Manual'}`,
        distanceKm: parseFloat(tripDist) || 0,
        isCash
    };
    addTransaction(newTx);
    
    setTimeout(() => { setIsSubmitting(false); onSaved(); }, 800);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveLogic();
  };

  // Triggered by voice command
  const handleSubmitVoice = () => {
      saveLogic();
  }

  const SourceChip = ({ name, col }: { name: AppSource, col: string }) => (
      <button type="button" onClick={() => { setAppSource(name); vibrate(10); }} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all border ${appSource === name ? `${col} text-white shadow-lg scale-105 border-transparent` : 'bg-black border-gray-800 text-gray-600'}`}>
          {name}
      </button>
  );

  return (
    <div className="pb-32 pt-4 px-4 max-w-lg mx-auto h-full flex flex-col">
      <CustomDialog isOpen={alert.show} type="alert" title="Info" message={alert.msg} onConfirm={() => setAlert({show: false, msg: ''})} />

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Input Suara</h2>
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${coords ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400' : 'bg-red-900/30 border-red-500/30 text-red-400'}`}>
             <MapPin size={10} /> {coords ? 'GPS OK' : 'NO GPS'}
          </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
        
        {/* VOICE HERO (REDESIGNED) */}
        <div className="relative">
            {/* Visualizer Ring */}
            {isListening && (
                <div className="absolute inset-0 bg-red-600/20 rounded-3xl blur-xl animate-pulse"></div>
            )}
            
            <button 
                type="button"
                onClick={toggleVoice}
                className={`w-full py-8 rounded-3xl font-black text-lg flex flex-col items-center justify-center gap-2 transition-all border relative overflow-hidden shadow-2xl z-10 ${isListening ? 'bg-red-600 border-red-500 text-white scale-[1.02]' : 'bg-[#1a1a1a] border-gray-700 text-cyan-400 hover:bg-gray-800'}`}
            >
                {isListening ? (
                    <div className="flex flex-col items-center gap-2">
                        <Mic size={40} className="animate-bounce" />
                        <span className="text-sm font-mono uppercase tracking-widest animate-pulse">Mendengarkan...</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <Mic size={40} /> 
                        <span className="text-sm tracking-widest uppercase">Tap & Bicara</span>
                    </div>
                )}
                
                {/* Transcript Overlay */}
                <div className="mt-2 px-4 w-full text-center">
                    <p className={`text-xs font-mono line-clamp-2 ${isListening ? 'text-white' : 'text-gray-500'}`}>
                        {transcriptPreview || '"Maxim Bike 15 ribu tunai di BIP"'}
                    </p>
                    
                    {/* Detection Chips */}
                    {recognizedParts.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 mt-2 animate-in fade-in slide-in-from-bottom-2">
                            {recognizedParts.map((part, i) => (
                                <span key={i} className="text-[9px] bg-black/40 px-2 py-1 rounded text-white border border-white/20">
                                    {part}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </button>
        </div>

        {/* APP SOURCE */}
        <div className="flex gap-2">
            <SourceChip name="Maxim" col="bg-yellow-500" />
            <SourceChip name="Gojek" col="bg-green-600" />
            <SourceChip name="Grab" col="bg-white !text-green-700" />
            <SourceChip name="Shopee" col="bg-orange-500" />
        </div>

        {/* SERVICE TYPE */}
        <div className="grid grid-cols-4 gap-2">
            {[
                {id: 'Bike', icon: <Bike size={20}/>, label: 'Bike'},
                {id: 'Food', icon: <Utensils size={20}/>, label: 'Food'},
                {id: 'Send', icon: <Package size={20}/>, label: 'Kirim'},
                {id: 'Shop', icon: <ShoppingBag size={20}/>, label: 'Jajan'}
            ].map(s => (
                <button key={s.id} type="button" onClick={() => { setServiceType(s.id as any); vibrate(10); }} className={`p-3 rounded-2xl flex flex-col items-center gap-1 transition-all border ${serviceType === s.id ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-[#1a1a1a] border-gray-800 text-gray-500'}`}>
                    {s.icon} <span className="text-[9px] font-bold uppercase">{s.label}</span>
                </button>
            ))}
        </div>

        {/* MAIN INPUTS */}
        <div className="bg-[#1a1a1a] border border-gray-800 p-4 rounded-3xl space-y-4">
            {/* ARGO */}
            <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Pendapatan Bersih</label>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl font-bold text-gray-500">Rp</span>
                    <input 
                        required type="text" inputMode="numeric" placeholder="0"
                        value={argoRaw} onChange={e => setArgoRaw(formatCurrencyInput(e.target.value))}
                        className="w-full bg-transparent text-4xl font-mono font-bold text-white focus:outline-none placeholder-gray-800"
                    />
                </div>
            </div>
            
            {/* CASH TOGGLE */}
            <div className="flex bg-black p-1 rounded-xl">
                <button type="button" onClick={() => setIsCash(true)} className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all ${isCash ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500'}`}>
                    <Banknote size={14}/> TUNAI
                </button>
                <button type="button" onClick={() => setIsCash(false)} className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all ${!isCash ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500'}`}>
                    <CreditCard size={14}/> SALDO
                </button>
            </div>

            {/* LOCATION */}
            <div className="relative">
                 <input 
                    type="text" placeholder="Lokasi (Opsional)..."
                    value={origin} onChange={e => setOrigin(e.target.value)}
                    className="w-full bg-black/30 border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-cyan-500 focus:outline-none placeholder-gray-700"
                />
                {origin && <button type="button" onClick={() => setOrigin('')} className="absolute right-3 top-3 text-gray-500"><X size={16}/></button>}
            </div>
        </div>

        {/* SUBMIT */}
        <button 
            type="submit" disabled={isSubmitting}
            className={`mt-auto w-full py-5 rounded-3xl font-black text-xl flex items-center justify-center gap-2 shadow-glow transition-transform active:scale-[0.98] ${isSubmitting ? 'bg-gray-800 text-gray-500' : 'bg-app-primary text-black'}`}
        >
            {isSubmitting ? <Loader2 className="animate-spin"/> : <Save size={24}/>}
            SIMPAN
        </button>
        <p className="text-center text-[10px] text-gray-500">
            Atau katakan <span className="text-white font-bold">"SIMPAN"</span> saat bicara.
        </p>

      </form>
    </div>
  );
};

export default JournalEntry;
