import React, { useEffect, useState } from 'react';
import { DailyFinancial } from '../types';
import { Coffee, Moon, Sun, CloudRain, Sunrise, Bed, PlayCircle, Lock } from 'lucide-react';
import { getRestAdvice } from '../utils';

interface RestModeOverlayProps {
    financials: DailyFinancial | null;
    startTime: number;
    onResume: () => void;
}

const RestModeOverlay: React.FC<RestModeOverlayProps> = ({ financials, startTime, onResume }) => {
    const [elapsed, setElapsed] = useState<string>('00:00');
    const [advice, setAdvice] = useState<any>(null);

    useEffect(() => {
        const hour = new Date().getHours();
        setAdvice(getRestAdvice(hour));

        const timer = setInterval(() => {
            const now = Date.now();
            const diff = now - startTime;
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setElapsed(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(timer);
    }, [startTime]);

    const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    const progress = financials ? (financials.grossIncome / financials.target) * 100 : 0;

    const renderIcon = () => {
        if (!advice) return <Coffee size={64} className="text-white animate-pulse" />;
        switch(advice.type) {
            case 'SHOLAT': return <Moon size={64} className="text-emerald-400 animate-pulse" />;
            case 'MAKAN': return <Coffee size={64} className="text-orange-400 animate-bounce" />;
            default: return <Bed size={64} className="text-blue-400 animate-pulse" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[5000] bg-[#0f172a] flex flex-col items-center justify-between p-8 text-center animate-in fade-in duration-500">
            
            {/* TOP BAR */}
            <div className="w-full flex justify-between items-center text-gray-500">
                <div className="flex items-center gap-2">
                    <Lock size={16} /> Mode Istirahat Aktif
                </div>
                <div className="text-xs font-mono opacity-50">IKHTIAR-KU LOCKED</div>
            </div>

            {/* CENTER CONTENT */}
            <div className="flex flex-col items-center gap-6">
                
                {/* ICON & RIPPLE EFFECT */}
                <div className="relative">
                    <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
                    <div className="w-32 h-32 rounded-full border-4 border-white/10 flex items-center justify-center relative bg-[#1e293b] shadow-2xl">
                        {renderIcon()}
                    </div>
                </div>

                {/* TIMER */}
                <div>
                    <h1 className="text-6xl font-black text-white font-mono tracking-tighter shadow-lg drop-shadow-2xl">
                        {elapsed}
                    </h1>
                    <p className="text-gray-400 text-sm mt-2 uppercase tracking-widest font-bold">Durasi Rehat</p>
                </div>

                {/* ADVICE CARD */}
                {advice && (
                    <div className="max-w-xs bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
                        <p className="text-lg text-white font-medium leading-relaxed italic">
                            "{advice.text}"
                        </p>
                    </div>
                )}
            </div>

            {/* BOTTOM STATS & ACTION */}
            <div className="w-full space-y-6">
                
                {/* Mini Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Pendapatan</p>
                        <p className="text-lg font-mono font-bold text-emerald-400">{formatRupiah(financials?.grossIncome || 0)}</p>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Target</p>
                        <p className="text-lg font-mono font-bold text-white">{Math.round(progress)}%</p>
                    </div>
                </div>

                <button 
                    onClick={onResume}
                    className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
                >
                    <PlayCircle size={24} fill="black" className="text-white" />
                    LANJUT NARIK
                </button>
            </div>
        </div>
    );
};

export default RestModeOverlay;