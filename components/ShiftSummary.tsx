import React from 'react';
import { DailyFinancial } from '../types';
import { clearShiftState } from '../services/storage';
import { CheckCircle2, PiggyBank, ArrowRight, Wallet, CreditCard, Banknote } from 'lucide-react';

interface ShiftSummaryProps {
    financials: DailyFinancial | null;
    onClose: () => void;
}

const ShiftSummary: React.FC<ShiftSummaryProps> = ({ financials, onClose }) => {
    
    const handleCloseBook = () => {
        clearShiftState(); // Reset "Modal Awal" state so user must setup again next time
        onClose();
    };

    const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

    const netCash = financials?.netCash || 0;
    const maintenance = financials?.maintenanceFund || 0;
    const kitchen = financials?.kitchen || 0;
    const cashIn = financials?.cashIncome || 0;
    const nonCashIn = financials?.nonCashIncome || 0;

    return (
        <div className="fixed inset-0 z-50 bg-[#121212] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
            <div className="w-full max-w-md bg-[#1e1e1e] border border-gray-700 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
                {/* Decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
                <div className="absolute -top-10 -right-10 bg-emerald-500/10 w-40 h-40 rounded-full blur-3xl"></div>

                <div className="text-center mb-6 relative z-10">
                    <div className="mx-auto w-16 h-16 bg-emerald-900/50 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
                        <CheckCircle2 size={32} className="text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Tutup Buku</h2>
                    <p className="text-gray-400 text-sm">Laporan Ikhtiar Hari Ini</p>
                </div>

                <div className="space-y-3 mb-6 flex-1">
                    {/* 1. REALITY SECTION */}
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Rincian Pendapatan</h3>
                        
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-300 flex items-center gap-2"><Banknote size={14} className="text-emerald-500"/> Tunai (Cash)</span>
                            <span className="font-mono font-bold text-emerald-400">
                                {formatRupiah(cashIn)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-300 flex items-center gap-2"><CreditCard size={14} className="text-purple-500"/> Non-Tunai (App)</span>
                            <span className="font-mono font-bold text-purple-400">
                                {formatRupiah(nonCashIn)}
                            </span>
                        </div>
                         <div className="flex justify-between items-center mb-3 pt-2 border-t border-gray-800">
                            <span className="text-xs font-bold text-gray-400">Total Kotor</span>
                            <span className="font-mono font-bold text-white">
                                {financials ? formatRupiah(financials.grossIncome) : 'Rp0'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                         <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Arus Kas Fisik (Dompet)</h3>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm text-gray-300">Pengeluaran Tunai</span>
                            <span className="font-mono font-bold text-red-400">
                                -{financials ? formatRupiah(financials.operationalCost) : 'Rp0'}
                            </span>
                        </div>
                        <div className="border-t border-gray-700 pt-2 flex justify-between items-center">
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                                <Wallet size={16} />
                                Uang di Tangan
                            </span>
                            <span className={`font-mono font-bold text-lg ${netCash >= 0 ? 'text-white' : 'text-red-500'}`}>
                                {formatRupiah(netCash)}
                            </span>
                        </div>
                    </div>

                    {/* 2. SUGGESTION SECTION (TOP UP) */}
                    <div className="bg-amber-900/20 rounded-xl p-4 border border-amber-900/50">
                        <div className="flex items-center gap-2 mb-3">
                            <PiggyBank className="text-amber-400" size={18} />
                            <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Saran Topup & Tabungan</h3>
                        </div>
                        
                        <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg mb-2">
                            <div className="text-xs text-gray-300">
                                <p className="font-bold">Wajib Sisih (10%)</p>
                                <p className="text-[10px] text-gray-500">Untuk servis & depresiasi motor</p>
                            </div>
                            <span className="font-mono font-bold text-amber-400 text-lg">
                                {formatRupiah(maintenance)}
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-400 italic text-center">
                            "Sisihkan uang ini ke rekening terpisah atau Topup Dompet Driver agar tidak terpakai."
                        </p>
                    </div>

                    {/* 3. TAKE HOME PAY */}
                    <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-900/50 text-center">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Boleh Dibawa Pulang (Dana Dapur)</p>
                        <p className="text-3xl font-black text-white tracking-tighter shadow-black drop-shadow-md">
                            {formatRupiah(kitchen)}
                        </p>
                        {nonCashIn > 0 && kitchen > netCash && (
                             <p className="text-[10px] text-purple-400 mt-1">
                                *Sebagian dana ada di Saldo Aplikasi ({formatRupiah(kitchen - netCash)})
                            </p>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={handleCloseBook}
                        className="w-full py-4 bg-white text-black font-extrabold uppercase rounded-xl hover:bg-gray-200 transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                        Selesai & Istirahat <ArrowRight size={20} />
                    </button>
                    <p className="text-center text-[10px] text-gray-500">
                        Sampai jumpa besok, Pejuang Keluarga!
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ShiftSummary;