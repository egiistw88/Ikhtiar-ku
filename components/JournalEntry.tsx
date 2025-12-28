
import React, { useState, useEffect, useRef } from 'react';
import { Hotspot, Transaction } from '../types';
import { getTimeWindow, formatCurrencyInput, parseCurrencyInput, vibrate, playSound } from '../utils';
import { MapPin, Loader2, Bike, Utensils, Package, ShoppingBag, X, Save, CreditCard, Banknote, Mic, Zap, ChevronRight, RotateCcw } from 'lucide-react';
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
  const [isCash, setIsCash] = useState<boolean>(true);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState<string>('');
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

  // --- SMART PARSING LOGIC (Sama seperti sebelumnya, tetap dipertahankan) ---
  const parseIndonesianNumber = (text: string): number | null => {
      const wordMap: Record<string, number> = {
          'satu': 1, 'dua': 2, 'tiga': 3, 'empat': 4, 'lima': 5,
          'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9, 'sepuluh': 10,
          'sebelas': 11, 'seratus': 100, 'seribu': 1000, 'goceng': 5000, 
          'ceban': 10000, 'noban': 20000, 'gocap': 50000, 'cepek': 100000,
          'setengah': 500
      };

      const lower = text.toLowerCase().replace(/\./g, '');
      const directMatch = lower.match(/(\d+(?:,\d+)?)\s*(rb|ribu|k|jt|juta)?/);
      if (directMatch) {
          let val = parseFloat(directMatch[1].replace(',', '.'));
          const suffix = directMatch[2];
          if (suffix === 'rb' || suffix === 'ribu' || suffix === 'k') val *= 1000;
          if (suffix === 'jt' || suffix === 'juta') val *= 1000000;
          if (val < 100) val *= 1000; 
          return Math.floor(val);
      }

      if (lower.includes('ribu')) {
          const parts = lower.split('ribu')[0].trim().split(' ');
          let tempVal = 0;
          parts.forEach(p => {
              if (wordMap[p]) tempVal += wordMap[p];
              if (p === 'puluh') tempVal *= 10;
              if (p === 'belas') tempVal += 10;
              if (p === 'ratus') tempVal *= 100;
          });
           if (tempVal === 0) return null;
           return tempVal * 1000;
      }
      
      for (const [key, val] of Object.entries(wordMap)) {
          if (lower.includes(key) && val >= 5000) return val;
      }

      return null;
  };

  const processSmartVoice = (text: string) => {
      let cleanText = text.toLowerCase();
      
      if (cleanText.includes('simpan') || cleanText.includes('masuk') || cleanText.includes('kirim')) {
          handleSubmitVoice();
          return;
      }

      const moneyRegex = /(\d+(?:[.,]\d+)?\s*(?:rb|ribu|k)?)|(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|seratus|goceng|ceban|noban|gocap|cepek)\s*(?:puluh|belas|ratus)?\s*(?:ribu)?/gi;
      const moneyMatches = cleanText.match(moneyRegex);
      
      if (moneyMatches) {
          const bestMatch = moneyMatches.reduce((a, b) => a.length > b.length ? a : b);
          const parsedMoney = parseIndonesianNumber(bestMatch);
          if (parsedMoney && parsedMoney > 500) {
              setArgoRaw(formatCurrencyInput(parsedMoney.toString()));
              cleanText = cleanText.replace(bestMatch, '');
          }
      }

      if (cleanText.includes('gojek')) setAppSource('Gojek');
      else if (cleanText.includes('grab')) setAppSource('Grab');
      else if (cleanText.includes('shopee') || cleanText.includes('oren')) setAppSource('Shopee');
      else if (cleanText.includes('maxim') || cleanText.includes('kuning')) setAppSource('Maxim');
      else if (cleanText.includes('indriver')) setAppSource('Indriver');

      if (cleanText.includes('makan') || cleanText.includes('food')) setServiceType('Food');
      else if (cleanText.includes('kirim') || cleanText.includes('paket')) setServiceType('Send');
      else if (cleanText.includes('belanja') || cleanText.includes('mart')) setServiceType('Shop');
      else if (cleanText.includes('antar') || cleanText.includes('bike') || cleanText.includes('penumpang')) setServiceType('Bike');

      if (cleanText.includes('tunai') || cleanText.includes('cash')) setIsCash(true);
      else if (cleanText.includes('saldo') || cleanText.includes('ovo') || cleanText.includes('gopay')) setIsCash(false);

      let locationRaw = cleanText.replace(/\b(di|ke|dari|yang|namanya|lokasi|tujuan)\b/g, '').trim();
      locationRaw = locationRaw.replace(/\s+/g, ' ').replace(/[^\w\s]/gi, '');
      
      if (locationRaw.length > 3) {
          const formattedLoc = locationRaw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          setOrigin(formattedLoc);
      }
      
      vibrate(50);
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
          rec.continuous = false; 
          rec.interimResults = true; 
          
          rec.onstart = () => { 
              setIsListening(true); 
              setTranscriptPreview("Mendengarkan..."); 
              vibrate(20);
          };
          
          rec.onend = () => { setIsListening(false); vibrate(20); };
          
          rec.onresult = (e: any) => {
              const text = Array.from(e.results).map((result: any) => result[0].transcript).join('');
              setTranscriptPreview(text);
              if (e.results[0].isFinal) { processSmartVoice(text); playSound('success'); }
          };
          
          recognitionRef.current = rec;
          rec.start();
          playSound('click');
      } catch (e) { console.error(e); setIsListening(false); }
  };

  const saveLogic = () => {
    const argoVal = parseCurrencyInput(argoRaw);
    if (!argoVal || isNaN(argoVal) || argoVal <= 0) { 
        setAlert({show: true, msg: "Nominal belum diisi!"}); 
        return; 
    }

    setIsSubmitting(true);
    vibrate(50);
    playSound('success');

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
            notes: `Input Manual [${appSource}]`, isUserEntry: true,
            isDaily: false, baseScore: 100, 
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
        distanceKm: 0,
        isCash
    };
    addTransaction(newTx);
    
    setTimeout(() => { setIsSubmitting(false); onSaved(); }, 800);
  }

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); saveLogic(); };
  const handleSubmitVoice = () => saveLogic();

  // Clean UI Components
  const AppPill = ({ name, color, textColor }: { name: AppSource, color: string, textColor: string }) => (
      <button 
        type="button" 
        onClick={() => { setAppSource(name); vibrate(5); }} 
        className={`flex-shrink-0 px-5 py-3 rounded-full border transition-all duration-200 text-xs font-black uppercase tracking-wide ${appSource === name ? `${color} ${textColor} border-transparent shadow-lg scale-105` : 'bg-[#1a1a1a] border-gray-800 text-gray-500'}`}
      >
          {name}
      </button>
  );

  return (
    <div className="h-full flex flex-col bg-black pb-32">
      <CustomDialog isOpen={alert.show} type="alert" title="Info" message={alert.msg} onConfirm={() => setAlert({show: false, msg: ''})} />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col pt-6 px-5 space-y-6">
          
          {/* 1. MONEY CARD (Clean & Big) */}
          <div className="bg-[#1a1a1a] rounded-3xl p-6 border border-gray-800 relative">
             <div className="flex justify-between items-start mb-2">
                 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pendapatan</label>
                 <div className={`px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 ${coords ? 'text-emerald-500 bg-emerald-900/20' : 'text-red-500 bg-red-900/20'}`}>
                    <MapPin size={10} /> {coords ? 'GPS ON' : 'NO GPS'}
                 </div>
             </div>
             
             <div className="flex items-baseline gap-1 my-2">
                 <span className="text-2xl font-bold text-gray-600">Rp</span>
                 <input 
                      autoFocus
                      required type="text" inputMode="numeric" placeholder="0"
                      value={argoRaw} onChange={e => setArgoRaw(formatCurrencyInput(e.target.value))}
                      className="w-full bg-transparent text-5xl font-mono font-black text-white focus:outline-none placeholder-gray-800"
                  />
             </div>

             {/* Integrated Payment Toggle */}
             <div className="flex bg-black/50 p-1 rounded-xl mt-4 border border-gray-800/50">
                 <button type="button" onClick={() => setIsCash(true)} className={`flex-1 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 transition-all ${isCash ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>
                    <Banknote size={14} /> Tunai
                 </button>
                 <button type="button" onClick={() => setIsCash(false)} className={`flex-1 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 transition-all ${!isCash ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>
                    <CreditCard size={14} /> App
                 </button>
             </div>
          </div>

          {/* 2. VOICE TRIGGER (Spatial Centerpiece) */}
          <div className="relative">
             {isListening && <div className="absolute inset-0 bg-red-600/10 blur-xl rounded-full animate-pulse"></div>}
             <button 
                type="button"
                onClick={toggleVoice} 
                className={`w-full py-4 rounded-2xl border transition-all flex items-center justify-between px-5 group ${isListening ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-[#1a1a1a] border-gray-800 text-gray-400 hover:border-gray-600'}`}
             >
                 <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isListening ? 'bg-red-600 text-white animate-bounce' : 'bg-black text-gray-500 group-hover:text-white'}`}>
                        <Mic size={20} />
                     </div>
                     <div className="text-left">
                         <span className="block text-[9px] uppercase font-bold tracking-wider opacity-70">Smart Voice</span>
                         <span className={`block font-bold text-sm ${isListening ? 'text-white' : 'text-gray-300'}`}>
                            {isListening ? 'Mendengarkan...' : 'Tekan & Bicara'}
                         </span>
                     </div>
                 </div>
                 {transcriptPreview && (
                     <div className="text-right max-w-[100px]">
                         <span className="text-[9px] text-emerald-400 font-mono italic truncate block">"{transcriptPreview}"</span>
                     </div>
                 )}
             </button>
             {/* Hint Text */}
             {!isListening && !transcriptPreview && (
                 <p className="text-[9px] text-gray-600 text-center mt-2">
                     Contoh: "Gojek Bike 15 ribu tunai di Stasiun"
                 </p>
             )}
          </div>

          {/* 3. DETAILS CARD (Horizontal Scroll & Grid) */}
          <div className="space-y-4">
              
              {/* App Source - Horizontal Scroll for breathing room */}
              <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar -mx-5 px-5">
                  <AppPill name="Maxim" color="bg-yellow-500" textColor="text-black" />
                  <AppPill name="Gojek" color="bg-green-600" textColor="text-white" />
                  <AppPill name="Grab" color="bg-white" textColor="text-green-700" />
                  <AppPill name="Shopee" color="bg-orange-500" textColor="text-white" />
                  <AppPill name="Indriver" color="bg-lime-500" textColor="text-black" />
              </div>

              {/* Service Type - Clean Grid */}
              <div className="grid grid-cols-4 gap-2">
                  {[
                      {id: 'Bike', icon: <Bike size={18}/>, label: 'Bike'},
                      {id: 'Food', icon: <Utensils size={18}/>, label: 'Food'},
                      {id: 'Send', icon: <Package size={18}/>, label: 'Kirim'},
                      {id: 'Shop', icon: <ShoppingBag size={18}/>, label: 'Jajan'}
                  ].map(s => (
                      <button 
                        key={s.id} 
                        type="button" 
                        onClick={() => { setServiceType(s.id as any); vibrate(10); }} 
                        className={`py-3 rounded-2xl flex flex-col items-center gap-1 transition-all border ${serviceType === s.id ? 'bg-app-primary border-app-primary text-black' : 'bg-[#1a1a1a] border-gray-800 text-gray-500 hover:bg-gray-800'}`}
                      >
                          {s.icon} 
                          <span className="text-[10px] font-bold uppercase">{s.label}</span>
                      </button>
                  ))}
              </div>

              {/* Location Input - Standard Clean Input */}
              <div className="relative">
                   <input 
                      type="text" placeholder="Lokasi jemput (Opsional)..."
                      value={origin} onChange={e => setOrigin(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl px-4 py-3 text-xs text-white focus:border-app-primary focus:outline-none placeholder-gray-600"
                  />
                  {origin && <button onClick={() => setOrigin('')} className="absolute right-3 top-3 text-gray-500 p-1"><X size={14}/></button>}
              </div>
          </div>

          {/* 4. FOOTER ACTION */}
          <div className="pt-2">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-glow transition-all active:scale-[0.98] ${isSubmitting ? 'bg-gray-800 text-gray-500' : 'bg-app-primary text-black hover:bg-yellow-400'}`}
              >
                  {isSubmitting ? <Loader2 className="animate-spin"/> : <Save size={20} strokeWidth={2.5} />}
                  SIMPAN
              </button>
          </div>

      </form>
      
    </div>
  );
};

export default JournalEntry;
