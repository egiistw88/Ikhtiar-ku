
import React from 'react';
import { DailyFinancial } from '../types';
import { clearShiftState } from '../services/storage';
import { CheckCircle2, ArrowRight, Wallet, Home, AlertCircle } from 'lucide-react';

interface ShiftSummaryProps { financials: DailyFinancial | null; onClose: () => void; }

const ShiftSummary: React.FC<ShiftSummaryProps> = ({ financials, onClose }) => {
    const handleCloseBook = () => { clearShiftState(); onClose(); };
    const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
    
    const net = financials?.netCash || 0;
    const kitchen = financials?.kitchen || 0;
    const gross = financials?.grossIncome || 0;

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
            {/* Confetti / Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px] animate-pulse"></div>

            <div className="w-full max-w-sm relative z-10 text-center space-y-6">
                
                <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.5)] mb-2">
                    <CheckCircle2 size={40} className="text-black" />
                </div>
                
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Mission Complete</h1>
                    <p className="text-emerald-400 font-bold text-sm tracking-widest uppercase">Shift Selesai</p>
                </div>

                <div className="glass-panel p-6 rounded-3xl space-y-6 border border-emerald-500/30">
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Pendapatan (Gross)</p>
                        <p className="text-2xl font-mono font-bold text-white">{fmt(gross)}</p>
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
                    
                    <div className="pt-4 border-t border-white/10">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Home size={16} className="text-emerald-400"/>
                            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Uang Dapur (Bersih)</p>
                        </div>
                        <p className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">{fmt(kitchen)}</p>
                        {kitchen > net && <p className="text-[10px] text-purple-400 mt-2 flex justify-center items-center gap-1"><AlertCircle size={10}/> Sebagian ada di Saldo App</p>}
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
