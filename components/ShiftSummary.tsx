
import React from 'react';
import { DailyFinancial, ShiftState } from '../types';
import { clearShiftState, getTransactions, getShiftState, getLocalDateString } from '../services/storage';
import { CheckCircle2, ArrowRight, Wallet, Home, AlertCircle, Crosshair, Rabbit, Trophy, TrendingUp } from 'lucide-react';

interface ShiftSummaryProps { financials: DailyFinancial | null; shiftState: ShiftState | null; onClose: () => void; }

const ShiftSummary: React.FC<ShiftSummaryProps> = ({ financials, shiftState, onClose }) => {
    const handleCloseBook = () => { clearShiftState(); onClose(); };
    const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

    const net = financials?.netCash || 0;
    const kitchen = financials?.kitchen || 0;
    const gross = financials?.grossIncome || 0;

    // --- STRATEGY PERFORMANCE ANALYTICS ---
    const calculatePerformance = () => {
        const currentShift = shiftState || getShiftState();
        const todayStr = currentShift?.date || getLocalDateString();
        const txs = getTransactions().filter(t => t.date === todayStr && t.type === 'income' && t.category === 'Trip');
        const totalTrips = txs.length;
        
        // Calculate Duration
        const startTime = shiftState?.startTime || Date.now();
        const durationHours = Math.max(0.5, (Date.now() - startTime) / (1000 * 60 * 60)); // Min 0.5 jam
        
        const strategy = shiftState?.strategy || 'FEEDER';
        let grade = 'B';
        let title = 'Lumayan';
        let metricLabel = '';
        let metricValue = '';
        
        if (strategy === 'SNIPER') {
            // Sniper dinilai dari RATA-RATA ARGO
            const avgArgo = totalTrips > 0 ? (gross / totalTrips) : 0;
            metricLabel = 'Rata-rata Argo';
            metricValue = fmt(avgArgo);
            
            if (avgArgo > 25000) { grade = 'S'; title = 'Sniper Elite!'; }
            else if (avgArgo > 15000) { grade = 'A'; title = 'Tepat Sasaran'; }
            else { grade = 'C'; title = 'Kurang Sabar?'; }

        } else {
            // Feeder dinilai dari TRIP PER JAM
            const tripsPerHour = totalTrips / durationHours;
            metricLabel = 'Trip / Jam';
            metricValue = tripsPerHour.toFixed(1);

            if (tripsPerHour > 1.5) { grade = 'S'; title = 'Gacor Parah!'; }
            else if (tripsPerHour > 0.8) { grade = 'A'; title = 'Konsisten'; }
            else { grade = 'C'; title = 'Server Anyep'; }
        }

        return { grade, title, metricLabel, metricValue, totalTrips };
    };

    const perf = calculatePerformance();

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
            {/* Confetti / Glow */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[100px] animate-pulse ${perf.grade === 'S' ? 'bg-emerald-500/20' : perf.grade === 'C' ? 'bg-red-500/20' : 'bg-blue-500/20'}`}></div>

            <div className="w-full max-w-sm relative z-10 text-center space-y-6">
                
                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.1)] mb-2 relative ${perf.grade === 'S' ? 'bg-emerald-500' : 'bg-gray-800 border-4 border-gray-700'}`}>
                    {perf.grade === 'S' ? <Trophy size={40} className="text-black" /> : <span className="text-4xl font-black text-white">{perf.grade}</span>}
                    <div className="absolute -bottom-2 bg-black px-3 py-1 rounded-full border border-gray-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                        {shiftState?.strategy === 'SNIPER' ? <Crosshair size={10}/> : <Rabbit size={10}/>} {shiftState?.strategy}
                    </div>
                </div>
                
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">{perf.title}</h1>
                    <p className="text-gray-400 font-bold text-sm tracking-wide mt-1">Laporan Shift Berakhir</p>
                </div>

                <div className="glass-panel p-6 rounded-3xl space-y-6 border border-white/10">
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/10">
                        <div>
                             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{perf.metricLabel}</p>
                             <p className="text-xl font-mono font-bold text-white">{perf.metricValue}</p>
                        </div>
                        <div>
                             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Trip</p>
                             <p className="text-xl font-mono font-bold text-white">{perf.totalTrips}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Pendapatan (Gross)</p>
                        <p className="text-3xl font-mono font-bold text-white tracking-tight">{fmt(gross)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left">
                        <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Pengeluaran</p>
                            <p className="font-mono font-bold text-red-400">-{fmt(financials?.operationalCost || 0)}</p>
                        </div>
                         <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Saving (10%)</p>
                            <p className="font-mono font-bold text-amber-400">{fmt(financials?.maintenanceFund || 0)}</p>
                        </div>
                    </div>
                    
                    <div className="bg-emerald-900/20 p-4 rounded-2xl border border-emerald-500/20">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Home size={14} className="text-emerald-400"/>
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Uang Dapur (Bersih)</p>
                        </div>
                        <p className="text-2xl font-black text-white tracking-tighter">{fmt(kitchen)}</p>
                        {kitchen > net && <p className="text-[9px] text-gray-400 mt-1 flex justify-center items-center gap-1"><AlertCircle size={10}/> Sebagian saldo di App</p>}
                    </div>
                </div>

                <button onClick={handleCloseBook} className="w-full py-5 bg-white text-black font-black text-lg rounded-3xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-gray-200">
                    ISTIRAHAT <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default ShiftSummary;
