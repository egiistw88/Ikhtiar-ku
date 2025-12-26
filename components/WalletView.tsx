import React, { useState, useEffect } from 'react';
import { Transaction, DailyFinancial } from '../types';
import { getTransactions, addTransaction, getTodayFinancials } from '../services/storage';
import { Wallet, TrendingUp, TrendingDown, Wrench, PiggyBank, Target, Plus, Minus, Utensils, Fuel, Gauge, AlertCircle, Banknote } from 'lucide-react';

const WalletView: React.FC = () => {
    const [summary, setSummary] = useState<DailyFinancial | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [showForm, setShowForm] = useState(false);
    
    // Form State
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('income');
    const [category, setCategory] = useState<string>('Trip');
    const [note, setNote] = useState('');
    const [distance, setDistance] = useState('');

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        setSummary(getTodayFinancials());
        setTransactions(getTransactions().filter(t => t.date === new Date().toISOString().split('T')[0]));
    }

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseInt(amount.replace(/\D/g, ''));
        if (!val || val <= 0) return;

        const newTx: Transaction = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now(),
            amount: val,
            type,
            category: category as any,
            note,
            distanceKm: type === 'income' && category === 'Trip' && distance ? parseFloat(distance) : undefined
        };

        addTransaction(newTx);
        setShowForm(false);
        setAmount('');
        setNote('');
        setDistance('');
        refreshData();
    };

    const formatRupiah = (num: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    };

    // Calculate percentage based on NET CASH (Reality) vs Target
    const percentage = summary ? Math.min(100, Math.round((summary.grossIncome / summary.target) * 100)) : 0;
    const netCash = summary?.netCash || 0;

    return (
        <div className="pb-24 pt-4 px-4 space-y-6">
            
            {/* HERO: UANG DI TANGAN (Real Cash Flow) */}
            <div className={`rounded-3xl p-6 shadow-2xl border-2 relative overflow-hidden transition-colors ${netCash >= 0 ? 'bg-[#1e1e1e] border-emerald-900/50' : 'bg-red-900/10 border-red-900'}`}>
                <div className="absolute right-[-20px] top-[-20px] p-4 opacity-10 text-white">
                    <Banknote size={180} />
                </div>
                
                <h2 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                    {netCash >= 0 ? (
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
                    ) : (
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]"></div>
                    )}
                    UANG DI TANGAN (BERSIH)
                </h2>
                <p className={`text-6xl font-black mb-2 tracking-tighter shadow-black drop-shadow-lg ${netCash >= 0 ? 'text-white' : 'text-red-500'}`}>
                    {formatRupiah(netCash)}
                </p>
                <p className="text-xs text-gray-500 mb-8 max-w-[70%] font-medium">
                    Ini adalah sisa uang nyata setelah dikurangi biaya bensin & makan hari ini.
                </p>

                {/* Sub-Allocations Suggestions */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/40 p-3 rounded-xl border border-gray-700 backdrop-blur-sm">
                         <div className="flex items-center gap-2 text-green-400 mb-1">
                            <Utensils size={14} />
                            <span className="text-[10px] uppercase font-bold">Dana Dapur</span>
                         </div>
                        <p className="text-xl font-bold text-white">{summary ? formatRupiah(summary.kitchen) : '0'}</p>
                    </div>
                    <div className="bg-black/40 p-3 rounded-xl border border-gray-700 backdrop-blur-sm">
                         <div className="flex items-center gap-2 text-amber-400 mb-1">
                            <PiggyBank size={14} />
                            <span className="text-[10px] uppercase font-bold">Wajib Sisih (10%)</span>
                         </div>
                        <p className="text-xl font-bold text-white">{summary ? formatRupiah(summary.maintenanceFund) : '0'}</p>
                    </div>
                </div>
            </div>

            {/* Cash Flow Summary */}
            <div className="grid grid-cols-2 gap-4">
                 <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                    <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Total Pendapatan</span>
                    <span className="text-lg font-mono font-bold text-emerald-400">{summary ? formatRupiah(summary.grossIncome) : '0'}</span>
                </div>
                 <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                    <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Total Pengeluaran</span>
                    <span className="text-lg font-mono font-bold text-red-400">{summary ? formatRupiah(summary.operationalCost) : '0'}</span>
                </div>
            </div>

            {/* Target Progress */}
            <div className="bg-[#1e1e1e] p-4 rounded-xl border border-gray-700">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Target Omzet Harian</p>
                        <p className="text-xl font-bold text-emerald-400">{summary ? formatRupiah(summary.target) : '0'}</p>
                    </div>
                    <div className="text-right">
                         <span className="text-2xl font-bold text-white">{percentage}%</span>
                    </div>
                </div>
                <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                </div>
            </div>

            {/* Action Button - Giant Size */}
            <button 
                onClick={() => setShowForm(!showForm)}
                className={`w-full h-16 rounded-2xl shadow-xl flex justify-center items-center gap-3 transition-all active:scale-[0.98] ${showForm ? 'bg-gray-700 text-white' : 'bg-cyan-500 hover:bg-cyan-400 text-black'}`}
            >
                {showForm ? <Minus size={28} /> : <Plus size={28} className="font-bold" />}
                <span className="text-lg font-black tracking-wide uppercase">{showForm ? 'BATAL' : 'CATAT DUIT'}</span>
            </button>

            {/* Transaction Form */}
            {showForm && (
                <form onSubmit={handleSave} className="bg-gray-800 p-5 rounded-xl border border-gray-700 space-y-4 animate-in fade-in slide-in-from-top-4">
                    <div className="flex gap-2 p-1 bg-black/40 rounded-lg">
                        <button 
                            type="button" 
                            onClick={() => setType('income')}
                            className={`flex-1 py-3 rounded-md text-sm font-bold transition-colors ${type === 'income' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            PEMASUKAN
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setType('expense')}
                            className={`flex-1 py-3 rounded-md text-sm font-bold transition-colors ${type === 'expense' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            PENGELUARAN
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Nominal (Rp)</label>
                            <input 
                                type="number" 
                                inputMode="numeric"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full p-4 bg-[#121212] border border-gray-600 rounded-lg text-white text-xl font-bold focus:border-cyan-400 focus:outline-none"
                                placeholder="0"
                                required
                            />
                        </div>
                        {type === 'income' && category === 'Trip' && (
                             <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Jarak (KM)</label>
                                <input 
                                    type="number" 
                                    inputMode="decimal"
                                    value={distance}
                                    onChange={e => setDistance(e.target.value)}
                                    className="w-full p-4 bg-[#121212] border border-gray-600 rounded-lg text-white text-xl font-bold focus:border-cyan-400 focus:outline-none"
                                    placeholder="0"
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Kategori</label>
                        <select 
                            value={category} 
                            onChange={e => setCategory(e.target.value)}
                            className="w-full p-4 bg-[#121212] border border-gray-600 rounded-lg text-white font-bold focus:border-cyan-400 focus:outline-none appearance-none"
                        >
                            {type === 'income' ? (
                                <>
                                    <option value="Trip">Trip / Orderan</option>
                                    <option value="Tip">Tip Customer</option>
                                    <option value="Other">Lainnya</option>
                                </>
                            ) : (
                                <>
                                    <option value="Fuel">Bensin (BBM)</option>
                                    <option value="Food">Makan/Minum</option>
                                    <option value="Maintenance">Servis/Sparepart</option>
                                    <option value="Other">Lainnya</option>
                                </>
                            )}
                        </select>
                    </div>

                    <button type="submit" className="w-full py-4 bg-white text-black hover:bg-gray-200 rounded-lg font-extrabold uppercase tracking-wide text-lg">
                        SIMPAN
                    </button>
                </form>
            )}

            {/* History List */}
            <div className="space-y-3">
                <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Riwayat Hari Ini</h3>
                {transactions.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-4 italic">Belum ada transaksi masuk.</p>
                ) : (
                    transactions.map(tx => (
                        <div key={tx.id} className="flex justify-between items-center bg-[#1e1e1e] p-4 rounded-xl border border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                    {tx.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{tx.category}</p>
                                    <p className="text-[10px] text-gray-500">{tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`font-mono font-bold text-lg block ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                    {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                                </span>
                                {tx.distanceKm && (
                                    <span className="text-[10px] text-cyan-500 font-mono">{tx.distanceKm} km</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default WalletView;