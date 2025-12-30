
import React, { useState } from 'react';
import { ShiftState, StrategyType } from '../types';
import { saveShiftState, getShiftState } from '../services/storage';
import { getLocalDateString, formatCurrencyInput, parseCurrencyInput } from '../utils';
import { Wallet, ArrowRight, Fuel, AlertTriangle, RefreshCw, CheckCircle2, Gauge, Zap, Banknote, ShieldAlert, Coins, Rabbit, Crosshair } from 'lucide-react';

interface PreRideSetupProps {
    onComplete: () => void;
}

const PreRideSetup: React.FC<PreRideSetupProps> = ({ onComplete }) => {
    const existing = getShiftState();
    const isUpdateMode = !!existing;

    const [balanceRaw, setBalanceRaw] = useState<string>(existing ? formatCurrencyInput(existing.startBalance.toString()) : '');
    const [cashRaw, setCashRaw] = useState<string>(existing ? formatCurrencyInput(existing.startCash.toString()) : '');
    const [fuel, setFuel] = useState<number>(existing ? existing.startFuel : 60);
    const [strategy, setStrategy] = useState<StrategyType>(existing ? existing.strategy : 'FEEDER');
    const [error, setError] = useState<string | null>(null);
    
    // State untuk Modal Briefing
    const [briefing, setBriefing] = useState<{show: boolean, msg: string, subMsg: string, type: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY' | 'NORMAL', icon: any} | null>(null);

    // --- LOGIC ENGINE: SURVIVAL HIERARCHY ---
    const generatePreFlightBriefing = (bal: number, cash: number, fuel: number, strat: StrategyType) => {
        
        // 1. LEVEL BAHAYA FISIK (Bensin)
        if (fuel <= 15) {
            return {
                type: 'CRITICAL',
                icon: Fuel,
                msg: "JANGAN JUDI DENGAN BENSIN!",
                subMsg: "Resiko mogok saat bawa penumpang itu fatal (Bintang 1). Mampir SPBU terdekat sekarang juga sebelum nyalakan aplikasi."
            };
        }

        // 2. LEVEL BAHAYA SISTEM (Saldo Akun)
        // Sniper butuh saldo lebih besar karena main kakap
        const minBal = strat === 'SNIPER' ? 30000 : 10000;
        const minBalWarning = strat === 'SNIPER' ? 50000 : 20000;

        if (bal < minBal) {
            return {
                type: 'CRITICAL',
                icon: ShieldAlert,
                msg: strat === 'SNIPER' ? "SALDO SNIPER TIRIS" : "AKUN RAWAN GAGU",
                subMsg: strat === 'SNIPER'
                    ? "Mau main kakap saldo minimal 30rb Ndan. Topup dulu biar orderan gede masuk."
                    : "Saldo di bawah 10rb bikin server 'malas' kasih order auto. Pancingan harus ada."
            };
        }

        if (bal < minBalWarning) {
            return {
                type: 'WARNING',
                icon: AlertTriangle,
                msg: "SALDO MENIPIS",
                subMsg: "Saldo masih aman tapi segera topup untuk kenyamanan operasional."
            };
        } 

        // 3. STRATEGY SPECIFIC ADVICE
        if (strat === 'SNIPER') {
             return {
                type: 'OPPORTUNITY',
                icon: Crosshair,
                msg: "MODE NGALONG/KAKAP AKTIF",
                subMsg: "Fokus orderan jauh & kakap. Jangan tergoda orderan receh yang bikin capek. Sabar adalah kunci Sniper. Gass!"
            };
        } else {
             return {
                type: 'NORMAL',
                icon: Rabbit,
                msg: "MODE FEEDING SERVER",
                subMsg: "Fokus kuantitas & jarak pendek. Sikat semua orderan masuk (kecuali fiktif) untuk bangun momentum 'Bola Salju'!"
            };
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        const balanceVal = parseCurrencyInput(balanceRaw);
        const cashVal = parseCurrencyInput(cashRaw);
        
        if (isNaN(balanceVal)) { setError("Saldo aplikator harus diisi."); return; }
        if (isNaN(cashVal)) { setError("Uang pegangan harus diisi."); return; }
        
        // Generate Briefing Data
        const advice = generatePreFlightBriefing(balanceVal, cashVal, fuel, strategy);
        
        // Tentukan status shift untuk database
        let status: ShiftState['status'] = 'SAFE';
        if (advice.type === 'CRITICAL') status = 'CRITICAL';
        else if (advice.type === 'WARNING') status = 'WARNING';
        else if (advice.type === 'OPPORTUNITY') status = 'SAFE';

        const newState: ShiftState = {
            date: getLocalDateString(),
            startBalance: balanceVal,
            startCash: cashVal,
            startFuel: fuel,
            startTime: existing ? existing.startTime : Date.now(),
            status: status,
            recommendation: advice.msg,
            strategy: strategy
        };

        saveShiftState(newState);
        
        // Tampilkan Modal Briefing
        setBriefing({
            show: true,
            msg: advice.msg,
            subMsg: advice.subMsg,
            type: advice.type as any,
            icon: advice.icon
        });
    };

    const handleConfirmBriefing = () => {
        setBriefing(null);
        onComplete();
    }

    const handleMoneyChange = (val: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        setter(formatCurrencyInput(val));
    }

    const getBriefingColor = (type: string) => {
        switch(type) {
            case 'CRITICAL': return 'bg-red-900/40 border-red-500 text-red-100';
            case 'WARNING': return 'bg-amber-900/40 border-amber-500 text-amber-100';
            case 'OPPORTUNITY': return 'bg-emerald-900/40 border-emerald-500 text-emerald-100';
            default: return 'bg-blue-900/40 border-blue-500 text-blue-100';
        }
    }
    
    const getIconColor = (type: string) => {
        switch(type) {
            case 'CRITICAL': return 'text-red-500 bg-red-500/20';
            case 'WARNING': return 'text-amber-500 bg-amber-500/20';
            case 'OPPORTUNITY': return 'text-emerald-500 bg-emerald-500/20';
            default: return 'text-blue-500 bg-blue-500/20';
        }
    }

    return (
        <div className="h-full w-full bg-black flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 overflow-y-auto relative">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-emerald-900/20 to-transparent pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-6">
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
                    
                    {/* STRATEGY SELECTOR */}
                    <div className="glass-panel p-4 rounded-3xl border border-gray-800">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block text-center">Pilih Strategi Hari Ini</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                type="button" 
                                onClick={() => setStrategy('FEEDER')}
                                className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 ${strategy === 'FEEDER' ? 'bg-emerald-900/30 border-emerald-500 text-white' : 'bg-black/30 border-gray-700 text-gray-500 hover:bg-gray-800'}`}
                            >
                                <Rabbit size={24} className={strategy === 'FEEDER' ? 'text-emerald-400' : 'text-gray-600'} />
                                <div>
                                    <span className="block text-xs font-black uppercase">Feeder (Pagi)</span>
                                    <span className="block text-[9px] font-medium opacity-70">Main Pendek & Cepat</span>
                                </div>
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setStrategy('SNIPER')}
                                className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 ${strategy === 'SNIPER' ? 'bg-purple-900/30 border-purple-500 text-white' : 'bg-black/30 border-gray-700 text-gray-500 hover:bg-gray-800'}`}
                            >
                                <Crosshair size={24} className={strategy === 'SNIPER' ? 'text-purple-400' : 'text-gray-600'} />
                                <div>
                                    <span className="block text-xs font-black uppercase">Sniper (Malam)</span>
                                    <span className="block text-[9px] font-medium opacity-70">Ngalong & Kakap</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* SALDO CARD */}
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
                    </div>

                    {/* CASH CARD */}
                    <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group focus-within:border-emerald-500/50 transition-colors">
                         <div className="absolute top-0 right-0 p-4 opacity-20 group-focus-within:opacity-50 transition-opacity">
                            <Banknote size={48} />
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

                    {/* FUEL GAUGE */}
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
                        <div className="flex gap-1 h-8 mb-2">
                            {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => (
                                <div 
                                    key={val}
                                    onClick={() => setFuel(val)}
                                    className={`flex-1 rounded-sm cursor-pointer transition-all duration-300 ${fuel >= val ? (val <= 20 ? 'bg-red-500' : 'bg-emerald-500') : 'bg-gray-800 hover:bg-gray-700'}`}
                                ></div>
                            ))}
                        </div>
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

            {/* BRIEFING POPUP */}
            {briefing && briefing.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className={`w-full max-w-sm rounded-3xl p-1 border shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 ${getBriefingColor(briefing.type)}`}>
                        <div className="bg-[#121212] rounded-[22px] p-6 h-full flex flex-col items-center text-center relative overflow-hidden">
                            <div className={`absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[60px] opacity-20 ${briefing.type === 'CRITICAL' ? 'bg-red-500' : briefing.type === 'WARNING' ? 'bg-amber-500' : briefing.type === 'OPPORTUNITY' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ${getIconColor(briefing.type)}`}>
                                <briefing.icon size={36} />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3 leading-none">
                                {briefing.msg}
                            </h3>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-6">
                                <p className="text-gray-300 text-sm leading-relaxed font-medium">
                                    "{briefing.subMsg}"
                                </p>
                            </div>
                            <button 
                                onClick={handleConfirmBriefing}
                                className={`w-full py-4 font-black rounded-xl shadow-lg flex justify-center items-center gap-2 active:scale-95 transition-transform text-black ${briefing.type === 'CRITICAL' ? 'bg-red-500 hover:bg-red-400' : 'bg-app-primary hover:bg-yellow-400'}`}
                            >
                                <ArrowRight size={20} strokeWidth={3} /> LANJUT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PreRideSetup;
