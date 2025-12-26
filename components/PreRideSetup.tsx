import React, { useState, useEffect } from 'react';
import { ShiftState } from '../types';
import { saveShiftState, getShiftState } from '../services/storage';
import { getLocalDateString } from '../utils';
import { Bike, Wallet, Banknote, ArrowRight, Fuel, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

interface PreRideSetupProps {
    onComplete: () => void;
}

const PreRideSetup: React.FC<PreRideSetupProps> = ({ onComplete }) => {
    // Check if we are in "Update Mode" (existing shift)
    const existing = getShiftState();
    const isUpdateMode = !!existing;

    const [balance, setBalance] = useState<string>(existing ? existing.startBalance.toString() : '');
    const [cash, setCash] = useState<string>(existing ? existing.startCash.toString() : '');
    const [fuel, setFuel] = useState<number>(existing ? existing.startFuel : 50);
    const [error, setError] = useState<string | null>(null);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        const balanceVal = parseInt(balance.replace(/\D/g, ''));
        const cashVal = parseInt(cash.replace(/\D/g, ''));
        
        // VALIDATION
        if (isNaN(balanceVal)) { setError("Saldo aplikator harus diisi."); return; }
        if (isNaN(cashVal)) { setError("Uang pegangan harus diisi."); return; }
        
        // Analyze Logic & Generate Strategy
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
        } else if (cashVal < 20000) {
            status = 'WARNING';
            rec = "AWAS KEMBALIAN. Siapkan receh di warung dulu.";
        }

        const newState: ShiftState = {
            date: getLocalDateString(),
            startBalance: balanceVal,
            startCash: cashVal,
            startFuel: fuel,
            startTime: existing ? existing.startTime : Date.now(), // Preserve start time if updating
            status: status,
            recommendation: rec
        };

        saveShiftState(newState);
        onComplete();
    };

    return (
        <div className="h-full w-full bg-[#000] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 overflow-y-auto">
            
            <div className="w-full max-w-md space-y-6 my-auto">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">
                        {isUpdateMode ? 'Update Kondisi' : 'Cek Modal Awal'}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {isUpdateMode ? 'Perbarui data jika habis isi bensin/topup.' : 'Pastikan modal jalan aman agar tidak boncos.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* 1. SALDO APLIKASI */}
                    <div className="bg-[#111] p-5 rounded-2xl border border-gray-800 focus-within:border-app-primary transition-colors shadow-lg">
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
                            <Wallet size={16} className="text-app-primary" /> Saldo Aplikator
                        </label>
                        <div className="relative">
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-white font-bold text-lg">Rp</span>
                            <input 
                                required
                                type="number" 
                                inputMode="numeric"
                                value={balance}
                                onChange={e => setBalance(e.target.value)}
                                placeholder="0"
                                className="w-full bg-transparent pl-8 text-3xl font-mono font-bold text-white focus:outline-none placeholder-gray-700"
                            />
                        </div>
                    </div>

                    {/* 2. SISA BENSIN (SLIDER) */}
                    <div className="bg-[#111] p-5 rounded-2xl border border-gray-800 shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                                <Fuel size={16} className={fuel <= 20 ? 'text-red-500 animate-pulse' : 'text-app-primary'} /> Indikator Bensin
                            </label>
                            <span className={`text-sm font-bold ${fuel <= 20 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {fuel}%
                            </span>
                        </div>
                        
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="10"
                            value={fuel}
                            onChange={e => setFuel(Number(e.target.value))}
                            className="w-full h-4 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-app-primary"
                        />
                        <div className="flex justify-between mt-2 font-bold text-[10px] text-gray-600 uppercase">
                            <span>Mogok</span>
                            <span>Setengah</span>
                            <span>Full Tank</span>
                        </div>
                    </div>

                    {/* 3. UANG TUNAI */}
                    <div className="bg-[#111] p-5 rounded-2xl border border-gray-800 focus-within:border-app-primary transition-colors shadow-lg">
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
                            <Banknote size={16} className="text-app-primary" /> Uang Pegangan (Cash)
                        </label>
                        <div className="relative">
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-white font-bold text-lg">Rp</span>
                            <input 
                                required
                                type="number" 
                                inputMode="numeric"
                                value={cash}
                                onChange={e => setCash(e.target.value)}
                                placeholder="0"
                                className="w-full bg-transparent pl-8 text-3xl font-mono font-bold text-white focus:outline-none placeholder-gray-700"
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-900/30 p-3 rounded-xl border border-red-800 flex items-center gap-2 text-red-400 text-xs font-bold">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {/* Smart Hint Preview */}
                    {(parseInt(balance) < 10000 && balance !== '') && (
                        <div className="bg-red-900/20 border border-red-900 p-3 rounded-xl flex items-center gap-3 animate-pulse">
                            <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
                            <p className="text-red-400 text-xs font-bold leading-tight">
                                Hati-hati! Saldo di bawah 10rb bikin akun "Gagu" (Anyep).
                            </p>
                        </div>
                    )}

                    <button 
                        type="submit"
                        className="w-full py-5 bg-app-primary hover:bg-yellow-400 text-black font-black text-xl rounded-2xl shadow-[0_0_20px_rgba(252,211,77,0.3)] flex justify-center items-center gap-3 transition-transform active:scale-[0.98] mt-4"
                    >
                        {isUpdateMode ? (
                            <>UPDATE DATA <RefreshCw size={24} /></>
                        ) : (
                            <>SIAP NARIK <ArrowRight size={24} strokeWidth={3} /></>
                        )}
                    </button>
                    
                    {isUpdateMode && (
                         <button type="button" onClick={onComplete} className="w-full py-3 text-gray-500 font-bold text-sm">BATAL</button>
                    )}

                </form>
            </div>
        </div>
    );
};

export default PreRideSetup;