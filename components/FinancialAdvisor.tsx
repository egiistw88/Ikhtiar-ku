import React, { useMemo } from 'react';
import { Transaction, DailyFinancial } from '../types';
import { Wallet, TrendingUp, AlertTriangle, Coffee, ThumbsUp, HeartHandshake, ShieldCheck } from 'lucide-react';
import { vibrate } from '../utils';

interface FinancialAdvisorProps {
    transaction: Transaction;
    dailyStats: DailyFinancial;
    onClose: () => void;
}

const FinancialAdvisor: React.FC<FinancialAdvisorProps> = ({ transaction, dailyStats, onClose }) => {
    
    // --- BRAIN: ENGINE ANALISA KONTEKS ---
    const advice = useMemo(() => {
        const { type, category, amount } = transaction;
        const { netCash, grossIncome } = dailyStats;
        const ratio = grossIncome > 0 ? (amount / grossIncome) : 0;

        // SCENARIO 1: PENGELUARAN (EXPENSE)
        if (type === 'expense') {
            // A. Top Up / Modal
            if (category === 'TopUp') {
                return {
                    theme: 'success',
                    title: 'Suntikan Modal!',
                    icon: <ShieldCheck size={40} className="text-emerald-500" />,
                    message: 'Investasi bagus, Ndan! Saldo cukup bikin akun makin "gacor" dan enteng terima orderan.',
                    action: 'Semoga balik modal cepat!'
                };
            }
            // B. Jajan (Food/Coffee)
            if (category === 'Food') {
                if (netCash < 20000) {
                    return {
                        theme: 'warning',
                        title: 'Awas Boncos!',
                        icon: <AlertTriangle size={40} className="text-red-500" />,
                        message: 'Uang di tangan lagi tipis banget. Pastikan ini makan/minum yang perlu aja ya. Jangan boros dulu.',
                        action: 'Fokus cari orderan tunai!'
                    };
                } else if (amount > 15000) {
                    return {
                        theme: 'neutral',
                        title: 'Isi Tenaga Dulu',
                        icon: <Coffee size={40} className="text-orange-500" />,
                        message: 'Gapapa mahal dikit biar mood naik. Habis ini wajib ganti uangnya pake 2 tarikan ya!',
                        action: 'Gaspol lagi habis ini!'
                    };
                }
            }
            // C. Bensin
            if (category === 'Fuel') {
                return {
                    theme: 'neutral',
                    title: 'Amunisi Siap',
                    icon: <Wallet size={40} className="text-blue-500" />,
                    message: 'Tangki penuh = Hati tenang. Jangan tolak orderan jauh sekarang, bensin udah aman!',
                    action: 'Sapu bersih orderan!'
                };
            }
             // D. Parkir
             if (category === 'Parking') {
                return {
                    theme: 'neutral',
                    title: 'Receh Jadi Bukit',
                    icon: <Wallet size={40} className="text-gray-400" />,
                    message: 'Biaya siluman nih. 2000 kalo dikali 10 jadi 20rb juga. Pintar-pintar cari parkiran gratis ya Ndan.',
                    action: 'Catat terus biar tau bocornya.'
                };
            }
        }

        // SCENARIO 2: PEMASUKAN (INCOME)
        if (type === 'income') {
            // A. Kakap (Diatas 30rb)
            if (amount >= 30000) {
                return {
                    theme: 'success',
                    title: 'ALHAMDULILLAH KAKAP!',
                    icon: <ThumbsUp size={40} className="text-yellow-400 animate-bounce" />,
                    message: 'Rezeki nomplok! Langsung sisihkan buat Tabungan Servis biar nggak kepake jajan.',
                    action: 'Mantap, lanjut cari lagi!'
                };
            }
            // B. Tip
            if (category === 'Tip') {
                return {
                    theme: 'success',
                    title: 'Rezeki Anak Soleh',
                    icon: <HeartHandshake size={40} className="text-pink-500" />,
                    message: 'Pelayanan prima membuahkan hasil. Pertahankan bintang 5-nya Ndan!',
                    action: 'Berkah berlimpah!'
                };
            }
        }

        // DEFAULT FALLBACK
        return {
            theme: 'neutral',
            title: 'Data Tersimpan',
            icon: <TrendingUp size={40} className="text-gray-400" />,
            message: 'Setiap rupiah yang dicatat adalah langkah menuju manajemen keuangan yang lebih baik.',
            action: 'Lanjut!'
        };

    }, [transaction, dailyStats]);

    // Render Logic
    const getColor = () => {
        if (advice.theme === 'success') return 'bg-emerald-900/40 border-emerald-500/50';
        if (advice.theme === 'warning') return 'bg-red-900/40 border-red-500/50';
        return 'bg-gray-800 border-gray-600';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 ${getColor()}`}>
                
                {/* Background Glow */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>

                <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                    <div className="p-4 bg-[#1e1e1e] rounded-full border border-gray-700 shadow-lg">
                        {advice.icon}
                    </div>
                    
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                            {advice.title}
                        </h3>
                        <p className="text-gray-300 text-sm leading-relaxed font-medium">
                            "{advice.message}"
                        </p>
                    </div>

                    <div className="pt-2 w-full">
                         <button 
                            onClick={() => { onClose(); vibrate(10); }}
                            className="w-full py-3.5 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition-colors shadow-lg active:scale-[0.98]"
                        >
                            {advice.action}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialAdvisor;