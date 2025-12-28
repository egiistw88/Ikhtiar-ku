
import React, { useState, useEffect, useRef } from 'react';
import { Hotspot, Transaction } from '../types';
import { getTimeWindow, formatCurrencyInput, parseCurrencyInput, vibrate, playSound } from '../utils';
import { MapPin, Loader2, Bike, Utensils, Package, ShoppingBag, CheckCircle2, RotateCcw, Save, CreditCard, Banknote, Mic, Radio, X } from 'lucide-react';
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

  // --- VOICE LOGIC (Simplified) ---
  const toggleVoice = () => {
      vibrate(20);
      const Win = window as unknown as IWindow;
      const Speech = Win.SpeechRecognition || Win.webkitSpeechRecognition;

      if (!Speech) { setAlert({show: true, msg: "Browser tidak support voice input."}); return; }

      if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }

      try {
          const rec = new Speech();
          rec.lang = 'id-ID'; 
          rec.continuous = false;
          rec.onstart = () => { setIsListening(true); setTranscriptPreview("Mendengarkan..."); };
          rec.onend = () => setIsListening(false);
          rec.onresult = (e: any) => {
              const text = e.results[0][0].transcript;
              setTranscriptPreview(text);
              processText(text);
          };
          recognitionRef.current = rec;
          rec.start();
          playSound('click');
      } catch (e) { console.error(e); setIsListening(false); }
  };

  const processText = (text: string) => {
      playSound('success');
      const lower = text.toLowerCase();

      // Detect App
      if (lower.includes('gojek')) setAppSource('Gojek');
      else if (lower.includes('grab')) setAppSource('Grab');
      else if (lower.includes('shopee')) setAppSource('Shopee');
      else if (lower.includes('indriver')) setAppSource('Indriver');
      else if (lower.includes('maxim')) setAppSource('Maxim');

      // Detect Service
      if (lower.includes('makan') || lower.includes('food')) setServiceType('Food');
      else if (lower.includes('kirim') || lower.includes('paket') || lower.includes('send')) setServiceType('Send');
      else if (lower.includes('belanja') || lower.includes('shop') || lower.includes('mart')) setServiceType('Shop');
      else if (lower.includes('penumpang') || lower.includes('orang') || lower.includes('bike')) setServiceType('Bike');

      // Detect Money (Basic regex)
      const moneyMatch = text.match(/(\d+)(?:ribu|rb|k)/i) || text.match(/(\d{4,})/);
      if (moneyMatch) {
          let val = parseInt(moneyMatch[1]);
          if (val < 1000) val *= 1000;
          setArgoRaw(formatCurrencyInput(val.toString()));
      }

      // Detect Location keywords
      const locKeywords = lower.split(' di ')[1] || lower.split(' dari ')[1];
      if (locKeywords) setOrigin(locKeywords.replace(/[^\w\s]/gi, '').split(' ').slice(0, 3).join(' '));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const argoVal = parseCurrencyInput(argoRaw);
    if (!argoVal || isNaN(argoVal) || argoVal <= 0) { 
        setAlert({show: true, msg: "Nominal argo tidak valid, Ndan."}); 
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
            isDaily: false, // User Entry defaults to specific date
            baseScore: 100, // User Entry always high score
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
  };

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
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Input Order</h2>
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${coords ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400' : 'bg-red-900/30 border-red-500/30 text-red-400'}`}>
             <MapPin size={10} /> {coords ? 'GPS OK' : 'NO GPS'}
          </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
        
        {/* VOICE HERO */}
        <button 
            type="button"
            onClick={toggleVoice}
            className={`w-full py-6 rounded-3xl font-black text-lg flex flex-col items-center justify-center gap-2 transition-all border relative overflow-hidden shadow-2xl ${isListening ? 'bg-red-600 border-red-500 text-white' : 'glass-panel text-cyan-400 border-cyan-500/30 hover:bg-cyan-900/10'}`}
        >
            {isListening ? (
                <div className="animate-pulse flex items-center gap-2"><Radio size={24}/> MENDENGARKAN...</div>
            ) : (
                <><Mic size={32} /> <span className="text-sm tracking-widest">TAP & BICARA</span></>
            )}
            {transcriptPreview && <p className="text-xs font-mono mt-1 text-white opacity-80 px-4 line-clamp-1">"{transcriptPreview}"</p>}
        </button>

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
                <button key={s.id} type="button" onClick={() => { setServiceType(s.id as any); vibrate(10); }} className={`p-3 rounded-2xl flex flex-col items-center gap-1 transition-all border ${serviceType === s.id ? 'bg-emerald-600 border-emerald-500 text-white' : 'glass-panel border-gray-800 text-gray-500'}`}>
                    {s.icon} <span className="text-[9px] font-bold uppercase">{s.label}</span>
                </button>
            ))}
        </div>

        {/* MAIN INPUTS */}
        <div className="glass-panel p-4 rounded-3xl space-y-4">
            {/* ARGO */}
            <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Pendapatan Bersih</label>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl font-bold text-gray-500">Rp</span>
                    <input 
                        required autoFocus type="text" inputMode="numeric" placeholder="0"
                        value={argoRaw} onChange={e => setArgoRaw(formatCurrencyInput(e.target.value))}
                        className="w-full bg-transparent text-4xl font-mono font-bold text-white focus:outline-none placeholder-gray-800"
                    />
                </div>
            </div>
            
            {/* CASH TOGGLE */}
            <div className="flex bg-black/50 p-1 rounded-xl">
                <button type="button" onClick={() => setIsCash(true)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${isCash ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500'}`}>TUNAI</button>
                <button type="button" onClick={() => setIsCash(false)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!isCash ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500'}`}>SALDO</button>
            </div>

            {/* LOCATION */}
            <div className="relative">
                 <input 
                    type="text" placeholder="Nama Lokasi / Resto..."
                    value={origin} onChange={e => setOrigin(e.target.value)}
                    className="w-full bg-black/30 border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-cyan-500 focus:outline-none"
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

      </form>
    </div>
  );
};

export default JournalEntry;
