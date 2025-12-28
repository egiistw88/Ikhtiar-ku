
import React, { useState } from 'react';
import { ShiftState } from '../types';
import { saveShiftState, getShiftState } from '../services/storage';
import { getLocalDateString, formatCurrencyInput, parseCurrencyInput } from '../utils';
import { Wallet, ArrowRight, Fuel, AlertTriangle, RefreshCw, CheckCircle2, Gauge } from 'lucide-react';

interface PreRideSetupProps {
    onComplete: () => void;
}

const PreRideSetup: React.FC<PreRideSetupProps> = ({ onComplete }) => {
    const existing = getShiftState();
    const isUpdateMode = !!existing;

    const [balanceRaw, setBalanceRaw] = useState<string>(existing ? formatCurrencyInput(existing.startBalance.toString()) : '');
    const [cashRaw, setCashRaw] = useState<string>(existing ? formatCurrencyInput(existing.startCash.toString()) : '');
    const [fuel, setFuel] = useState<number>(existing ? existing.startFuel : 60);
    const [error, setError] = useState<string | null>(null);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        const balanceVal = parseCurrencyInput(balanceRaw);
        const cashVal = parseCurrencyInput(cashRaw);
        
        if (isNaN(balanceVal)) { setError("Saldo aplikator harus diisi."); return; }
        if (isNaN(cashVal)) { setError("Uang pegangan harus diisi."); return; }
        
        let status: ShiftState['status'] = 'SAFE';
        let rec = "MODAL AMAN. Fokus cari orderan kakap & jauh!";

        if (balanceVal < 10000) {
            status = 'CRITICAL';
            rec = "SALDO KRITIS! Wajib Topup min 20rb atau orderan anyep.";
        } else if (fuel <= 20) {
            status = 'WARNING';
            rec = "BENSIN TIRIS. Jangan ambil orderan jauh/macet.";
        } else if (balanceVal < 30000) {
            status = 'WARNING';
            rec = "SALDO TIPIS. Prioritaskan orderan tunai/pendek.";
        }

        const newState: ShiftState = {
            date: getLocalDateString(),
            startBalance: balanceVal,
            startCash: cashVal,
            startFuel: fuel,
            startTime: existing ? existing.startTime : Date.now(),
            status: status,
            recommendation: rec
        };

        saveShiftState(newState);
        onComplete();
    };

    const handleMoneyChange = (val: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        setter(formatCurrencyInput(val));
    }

    return (
        <div className="h-full w-full bg-black flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 overflow-y-auto relative">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-emerald-900/20 to-transparent pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1a1a1a] rounded-2xl mb-4 border border-gray-800 shadow-neon">
                        <Gauge size={32} className="text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-2">
                        {isUpdateMode ? 'System Check' : 'Pre-Flight Check'}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {isUpdateMode ? 'Update parameter modal & bensin.' : 'Pastikan amunisi siap sebelum tempur.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* 1. SALDO CARD */}
                    <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group focus-within:border-emerald-500/50 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-20 group-focus-within:opacity-50 transition-opacity">
                            <Wallet size={48} />
                        </div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Saldo Aplikator</label>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-gray-500">Rp</span>
                            <input 
                                required
                                type="text" 
                                inputMode="numeric"
                                value={balanceRaw}
                                onChange={e => handleMoneyChange(e.target.value, setBalanceRaw)}
                                placeholder="0"
                                className="w-full bg-transparent text-4xl font-mono font-bold text-white focus:outline-none placeholder-gray-800"
                            />
                        </div>
                        {parseInt(balanceRaw.replace(/\./g, '')) < 10000 && balanceRaw !== '' && (
                            <div className="mt-2 text-red-400 text-xs font-bold flex items-center gap-1">
                                <AlertTriangle size={12}/> Akun Berisiko Gagu!
                            </div>
                        )}
                    </div>

                    {/* 2. CASH CARD */}
                    <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group focus-within:border-emerald-500/50 transition-colors">
                         <div className="absolute top-0 right-0 p-4 opacity-20 group-focus-within:opacity-50 transition-opacity">
                            <Wallet size={48} />
                        </div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Uang Tunai (Cash)</label>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-gray-500">Rp</span>
                            <input 
                                required
                                type="text" 
                                inputMode="numeric"
                                value={cashRaw}
                                onChange={e => handleMoneyChange(e.target.value, setCashRaw)}
                                placeholder="0"
                                className="w-full bg-transparent text-4xl font-mono font-bold text-white focus:outline-none placeholder-gray-800"
                            />
                        </div>
                    </div>

                    {/* 3. FUEL GAUGE */}
                    <div className="glass-panel p-5 rounded-3xl">
                        <div className="flex justify-between items-center mb-4">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <Fuel size={14} className={fuel <= 20 ? 'text-red-500 animate-pulse' : 'text-emerald-500'} /> 
                                Tangki Bensin
                            </label>
                            <span className={`text-xl font-black ${fuel <= 20 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {fuel}%
                            </span>
                        </div>
                        
                        {/* Visual Bars for Fuel */}
                        <div className="flex gap-1 h-8 mb-2">
                            {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => (
                                <div 
                                    key={val}
                                    onClick={() => setFuel(val)}
                                    className={`flex-1 rounded-sm cursor-pointer transition-all duration-300 ${fuel >= val ? (val <= 20 ? 'bg-red-500' : 'bg-emerald-500') : 'bg-gray-800 hover:bg-gray-700'}`}
                                ></div>
                            ))}
                        </div>
                        <p className="text-center text-[10px] text-gray-500 uppercase">Tap bar untuk set level</p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-xl text-red-400 text-center text-xs font-bold animate-pulse">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        className="w-full py-5 mt-4 bg-app-primary hover:bg-yellow-400 text-black font-black text-xl rounded-3xl shadow-glow flex justify-center items-center gap-3 transition-transform active:scale-[0.98] group"
                    >
                        {isUpdateMode ? 'UPDATE DATA' : 'SIAP JALAN'}
                        {isUpdateMode ? <RefreshCw size={24} className="group-active:rotate-180 transition-transform"/> : <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform"/>}
                    </button>
                    
                    {isUpdateMode && (
                         <button type="button" onClick={onComplete} className="w-full py-3 text-gray-500 font-bold text-xs tracking-widest uppercase hover:text-white transition-colors">Batal</button>
                    )}

                </form>
            </div>
        </div>
    );
};

export default PreRideSetup;
