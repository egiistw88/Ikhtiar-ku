import React, { useState, useEffect } from 'react';
import { Transaction, DailyFinancial } from '../types';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, getTodayFinancials } from '../services/storage';
import { TrendingUp, TrendingDown, X, Plus, Trash2, Save, AlertTriangle, PieChart, Wrench, Home, Smartphone, Coffee, Zap, Car, ArrowUpRight, ArrowDownLeft, Receipt, Coins, Wallet, CreditCard, Banknote, Calendar, Clock } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyInput, vibrate } from '../utils';
import FinancialAdvisor from './FinancialAdvisor';

interface WalletViewProps {
    onToast: (msg: string) => void;
}

// KATEGORI UI CONFIG - Icon & Warna spesifik
const CAT_CONFIG: Record<string, { label: string, icon: React.ReactNode, color: string, bg: string }> = {
    // Income
    'Trip': { label: 'Ongkos', icon: <TrendingUp />, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
    'Tip': { label: 'Tip CS', icon: <Coins />, color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
    'Bonus': { label: 'Insentif', icon: <Zap />, color: 'text-cyan-400', bg: 'bg-cyan-900/30' },
    'Other': { label: 'Lainnya', icon: <Receipt />, color: 'text-gray-400', bg: 'bg-gray-800' },
    
    // Expense
    'Fuel': { label: 'Bensin', icon: <Car />, color: 'text-red-400', bg: 'bg-red-900/30' },
    'Food': { label: 'Makan/Ngopi', icon: <Coffee />, color: 'text-orange-400', bg: 'bg-orange-900/30' },
    'TopUp': { label: 'Top Up', icon: <Smartphone />, color: 'text-purple-400', bg: 'bg-purple-900/30' },
    'Parking': { label: 'Parkir', icon: <ArrowDownLeft />, color: 'text-gray-400', bg: 'bg-gray-800' },
    'Maintenance': { label: 'Servis/Oli', icon: <Wrench />, color: 'text-red-500', bg: 'bg-red-900/40' },
    'Data': { label: 'Pulsa', icon: <Zap />, color: 'text-blue-400', bg: 'bg-blue-900/30' },
    'Installment': { label: 'Cicilan', icon: <Receipt />, color: 'text-pink-400', bg: 'bg-pink-900/30' },
};

const WalletView: React.FC<WalletViewProps> = ({ onToast }) => {
    const [summary, setSummary] = useState<DailyFinancial | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    
    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [editingTxId, setEditingTxId] = useState<string | null>(null);
    
    // Advisor State (The "Brain")
    const [advisorTrigger, setAdvisorTrigger] = useState<{tx: Transaction, stats: DailyFinancial} | null>(null);
    
    // Form Inputs
    const [amountRaw, setAmountRaw] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('income');
    const [category, setCategory] = useState<string>('Trip');
    const [note, setNote] = useState('');
    const [isCash, setIsCash] = useState<boolean>(true);
    
    // NEW: Date & Time Editing
    const [customDate, setCustomDate] = useState<string>('');
    const [customTime, setCustomTime] = useState<string>('');

    useEffect(() => { refreshData(); }, []);

    const refreshData = () => {
        setSummary(getTodayFinancials());
        // Sort: Newest First
        setTransactions(getTransactions()
            .filter(t => t.date === new Date().toISOString().split('T')[0])
            .sort((a,b) => b.timestamp - a.timestamp)
        );
    }

    const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

    // --- QUICK ACTIONS ---
    const handleQuickAdd = (amount: number, cat: any, text: string) => {
        vibrate(20);
        const newTx: Transaction = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now(),
            amount: amount,
            type: 'expense',
            category: cat,
            note: text,
            isCash: true // Default quick actions are cash (parkir, ngopi)
        };
        addTransaction(newTx);
        
        // Refresh first to get updated stats for advice
        const newStats = getTodayFinancials(); 
        setSummary(newStats);
        setTransactions(prev => [newTx, ...prev]);

        // Trigger Advisor
        setAdvisorTrigger({ tx: newTx, stats: newStats });
    };

    // --- MODAL LOGIC ---
    const openModal = (tx?: Transaction) => {
        vibrate(10);
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().slice(0, 5);

        if (tx) {
            setEditingTxId(tx.id);
            setType(tx.type);
            setCategory(tx.category);
            setAmountRaw(formatCurrencyInput(tx.amount.toString()));
            setNote(tx.note || '');
            setIsCash(tx.isCash !== false); // Default true
            
            // Set Date/Time from tx timestamp
            const d = new Date(tx.timestamp);
            setCustomDate(tx.date);
            setCustomTime(d.toTimeString().slice(0, 5));
        } else {
            setEditingTxId(null);
            setType('income');
            setCategory('Trip');
            setAmountRaw('');
            setNote('');
            setIsCash(true);
            setCustomDate(currentDate);
            setCustomTime(currentTime);
        }
        setIsModalOpen(true);
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmountRaw(formatCurrencyInput(e.target.value));
    };

    const addQuickAmount = (val: number) => {
        vibrate(5);
        const current = parseCurrencyInput(amountRaw);
        setAmountRaw(formatCurrencyInput((current + val).toString()));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        vibrate(20);
        const val = parseCurrencyInput(amountRaw);
        if (!val) return;

        // Construct Timestamp from Custom Date & Time
        const [hours, minutes] = customTime.split(':').map(Number);
        const timestampDate = new Date(customDate);
        timestampDate.setHours(hours, minutes);
        const timestamp = timestampDate.getTime();

        const base = {
            amount: val, type, category: category as any, note, isCash,
            date: customDate, // Use edited date
            timestamp: timestamp // Use edited timestamp
        };

        if (editingTxId) {
            updateTransaction({ ...base, id: editingTxId } as Transaction);
            onToast("Transaksi Diperbarui");
            refreshData();
        } else {
            const newTx = { ...base, id: Date.now().toString() } as Transaction;
            addTransaction(newTx);
            
            // Refresh & Trigger Advisor for New Entries Only
            const newStats = getTodayFinancials();
            setSummary(newStats);
            setTransactions(prev => [newTx, ...prev]);
            
            // Only trigger advisor if entry is for Today
            if (customDate === new Date().toISOString().split('T')[0]) {
                setAdvisorTrigger({ tx: newTx, stats: newStats });
            }
        }
        setIsModalOpen(false);
    };

    const handleDelete = () => {
        if (editingTxId) {
            vibrate(50);
            deleteTransaction(editingTxId);
            setIsDeleteConfirmOpen(false);
            setIsModalOpen(false);
            refreshData();
            onToast("Transaksi Dihapus");
        }
    };

    const netCash = summary?.netCash || 0;
    const maintenance = summary?.maintenanceFund || 0;
    const kitchen = summary?.kitchen || 0;

    const incomeCats = ['Trip', 'Tip', 'Bonus', 'Other'];
    const expenseCats = ['Fuel', 'Food', 'TopUp', 'Parking', 'Data', 'Maintenance', 'Installment', 'Other'];
    const activeCats = type === 'income' ? incomeCats : expenseCats;
    const quickChips = [2000, 5000, 10000, 20000, 50000];

    return (
        <div className="pt-4 px-4 space-y-6 pb-32">
            
            {/* ADVISOR POPUP */}
            {advisorTrigger && (
                <FinancialAdvisor 
                    transaction={advisorTrigger.tx}
                    dailyStats={advisorTrigger.stats}
                    onClose={() => setAdvisorTrigger(null)}
                />
            )}

            {/* 1. DOMPET UTAMA (Smart Card) */}
            <div className="bg-gradient-to-br from-[#1e1e1e] to-[#000] border border-app-border rounded-3xl p-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-600 blur-[90px] opacity-15 rounded-full animate-pulse"></div>
                
                <div className="flex justify-between items-center mb-4">
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                        <Wallet size={12} className="text-yellow-500"/> Real Cash (Tunai)
                    </p>
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                        <TrendingUp size={12} className="text-emerald-400" />
                        <span className="text-[10px] font-mono text-emerald-400">{formatRupiah(summary?.grossIncome || 0)}</span>
                        <span className="text-gray-600 mx-1">|</span>
                        <TrendingDown size={12} className="text-red-400" />
                        <span className="text-[10px] font-mono text-red-400">{formatRupiah(summary?.operationalCost || 0)}</span>
                    </div>
                </div>
                
                <h2 className={`text-4xl font-black tracking-tighter mb-6 ${netCash < 0 ? 'text-red-500' : 'text-white'}`}>
                    {formatRupiah(netCash)}
                </h2>

                <div className="grid grid-cols-2 gap-3">
                    {/* Kitchen Fund */}
                    <div className={`border rounded-xl p-3 relative overflow-hidden transition-colors ${kitchen > 0 ? 'bg-emerald-900/20 border-emerald-900/50' : 'bg-gray-800/30 border-gray-700'}`}>
                         <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                            <Home size={12} />
                            <span className="text-[9px] font-bold uppercase">Uang Dapur</span>
                        </div>
                        <p className={`font-mono font-bold text-lg ${kitchen > 0 ? 'text-white' : 'text-gray-500'}`}>{formatRupiah(Math.max(0, kitchen))}</p>
                        <div className="h-1 w-full bg-gray-700 mt-2 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: kitchen > 0 ? '100%' : '0%' }}></div>
                        </div>
                    </div>

                    {/* Maintenance Fund */}
                    <div className="bg-amber-900/20 border border-amber-900/50 rounded-xl p-3 relative overflow-hidden">
                         <div className="flex items-center gap-1.5 text-amber-400 mb-1">
                            <Wrench size={12} />
                            <span className="text-[9px] font-bold uppercase">Tabungan Servis</span>
                        </div>
                        <p className="font-mono font-bold text-white text-lg">{formatRupiah(maintenance)}</p>
                        <div className="h-1 w-full bg-gray-700 mt-2 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: '100%' }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. QUICK ACTIONS */}
            <div>
                <h3 className="font-bold text-white px-1 text-[10px] uppercase tracking-wide opacity-70 mb-2">Jalan Pintas (Quick Actions)</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    <button 
                        onClick={() => handleQuickAdd(2000, 'Parking', 'Parkir')}
                        className="flex-shrink-0 w-24 p-3 bg-[#1e1e1e] border border-gray-700 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-gray-800 active:scale-95 transition-all"
                    >
                        <div className="bg-gray-700 p-1.5 rounded-full"><ArrowDownLeft size={14} className="text-gray-300"/></div>
                        <span className="text-[10px] font-bold text-gray-300">Parkir 2rb</span>
                    </button>
                     <button 
                        onClick={() => handleQuickAdd(5000, 'Food', 'Ngopi/Es')}
                        className="flex-shrink-0 w-24 p-3 bg-[#1e1e1e] border border-gray-700 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-gray-800 active:scale-95 transition-all"
                    >
                        <div className="bg-orange-900/30 p-1.5 rounded-full"><Coffee size={14} className="text-orange-400"/></div>
                        <span className="text-[10px] font-bold text-gray-300">Ngopi 5rb</span>
                    </button>
                    <button 
                        onClick={() => openModal()}
                        className="flex-shrink-0 w-24 p-3 bg-app-primary border border-yellow-500 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-yellow-400 active:scale-95 transition-all shadow-lg shadow-yellow-900/20"
                    >
                        <div className="bg-black/20 p-1.5 rounded-full"><Plus size={14} className="text-black"/></div>
                        <span className="text-[10px] font-black text-black uppercase">Manual</span>
                    </button>
                </div>
            </div>

            {/* 3. TRANSACTION HISTORY */}
            <div className="space-y-3">
                <h3 className="font-bold text-white px-1 text-sm uppercase tracking-wide opacity-70">Riwayat Hari Ini</h3>

                {transactions.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-gray-800 rounded-2xl bg-[#111]">
                        <Receipt size={32} className="text-gray-700 mx-auto mb-2" />
                        <p className="text-gray-500 text-xs font-bold">Dompet masih kosong.</p>
                        <p className="text-[10px] text-gray-600">Semua pemasukan & pengeluaran muncul disini.</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {transactions.map(tx => {
                            const conf = CAT_CONFIG[tx.category] || { label: tx.category, icon: <Receipt />, color: 'text-gray-400', bg: 'bg-gray-800' };
                            return (
                                <div 
                                    key={tx.id} 
                                    onClick={() => openModal(tx)}
                                    className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-3 flex justify-between items-center active:bg-gray-800 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/5 ${conf.bg} ${conf.color}`}>
                                            {React.cloneElement(conf.icon as React.ReactElement, { size: 18 })}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-200 text-xs flex items-center gap-2">
                                                {conf.label}
                                                {tx.isCash === false && <span className="text-[9px] bg-purple-900/50 text-purple-300 px-1.5 rounded border border-purple-800/50">NON-TUNAI</span>}
                                            </p>
                                            <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{tx.note || new Date(tx.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                    <div className={`text-right ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                        <p className="font-mono font-bold text-sm">
                                            {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                                        </p>
                                        <p className="text-[9px] text-gray-600 font-bold uppercase">{tx.type === 'income' ? 'Masuk' : 'Keluar'}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* MODAL INPUT */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
                    <div className="w-full max-w-md bg-[#161616] border-t border-gray-700 p-0 rounded-t-3xl sm:rounded-2xl animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto">
                        
                        <div className="sticky top-0 bg-[#161616] z-10 px-6 pt-6 pb-4 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">{editingTxId ? 'Edit Data' : 'Catat Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-800 rounded-full text-white hover:bg-gray-700 transition-colors"><X size={18}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            {/* TYPE SWITCHER */}
                            <div className="grid grid-cols-2 bg-black p-1.5 rounded-2xl border border-gray-800">
                                <button type="button" onClick={() => { setType('income'); setCategory('Trip'); vibrate(10); }} className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${type === 'income' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
                                    Pemasukan
                                </button>
                                <button type="button" onClick={() => { setType('expense'); setCategory('Fuel'); vibrate(10); }} className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${type === 'expense' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
                                    Pengeluaran
                                </button>
                            </div>
                            
                            {/* DATE & TIME (Backdate feature) */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Calendar size={12}/> Tanggal</label>
                                    <input 
                                        type="date"
                                        value={customDate}
                                        onChange={e => setCustomDate(e.target.value)}
                                        className="w-full bg-[#111] border border-gray-700 rounded-xl p-3 text-white text-xs font-mono text-center focus:border-gray-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Clock size={12}/> Jam</label>
                                    <input 
                                        type="time"
                                        value={customTime}
                                        onChange={e => setCustomTime(e.target.value)}
                                        className="w-full bg-[#111] border border-gray-700 rounded-xl p-3 text-white text-xs font-mono text-center focus:border-gray-500"
                                    />
                                </div>
                            </div>

                            {/* AMOUNT INPUT */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Nominal (Rp)</label>
                                <input 
                                    autoFocus={!editingTxId}
                                    type="text" 
                                    inputMode="numeric"
                                    value={amountRaw}
                                    onChange={handleAmountChange}
                                    placeholder="0"
                                    className="w-full bg-[#111] border-2 border-gray-700 rounded-2xl text-4xl font-mono font-bold text-white py-4 text-center focus:border-app-primary focus:outline-none placeholder-gray-800"
                                />
                                
                                {/* Quick Chips */}
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                    {quickChips.map(val => (
                                        <button 
                                            key={val} 
                                            type="button" 
                                            onClick={() => addQuickAmount(val)}
                                            className="flex-shrink-0 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 text-xs font-mono font-bold text-emerald-400 active:scale-95 transition-transform"
                                        >
                                            +{val/1000}k
                                        </button>
                                    ))}
                                    <button type="button" onClick={() => {setAmountRaw(''); vibrate(10);}} className="flex-shrink-0 px-3 py-1.5 bg-gray-800 text-red-400 rounded-lg text-xs font-bold border border-gray-700">RESET</button>
                                </div>
                            </div>
                            
                            {/* PAYMENT METHOD TOGGLE */}
                             <div className="flex gap-2">
                                 <button 
                                    type="button" 
                                    onClick={() => { setIsCash(true); vibrate(10); }}
                                    className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 border font-bold text-xs transition-all ${isCash ? 'bg-emerald-900/40 border-emerald-500 text-emerald-400' : 'bg-[#1e1e1e] border-gray-700 text-gray-500'}`}
                                 >
                                     <Banknote size={16} /> TUNAI
                                 </button>
                                 <button 
                                    type="button" 
                                    onClick={() => { setIsCash(false); vibrate(10); }}
                                    className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 border font-bold text-xs transition-all ${!isCash ? 'bg-purple-900/40 border-purple-500 text-purple-400' : 'bg-[#1e1e1e] border-gray-700 text-gray-500'}`}
                                 >
                                     <CreditCard size={16} /> NON-TUNAI
                                 </button>
                             </div>

                            {/* CATEGORY GRID */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Kategori</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {activeCats.map(cat => {
                                        const conf = CAT_CONFIG[cat] || { label: cat, icon: <Receipt />, color: 'text-gray-400', bg: 'bg-gray-800' };
                                        const isActive = category === cat;
                                        return (
                                            <button 
                                                type="button" 
                                                key={cat}
                                                onClick={() => { setCategory(cat); vibrate(10); }}
                                                className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all border ${isActive ? 'bg-gray-800 border-app-primary scale-105 shadow-lg' : 'bg-[#111] border-gray-800 opacity-60 hover:opacity-100'}`}
                                            >
                                                <div className={`${conf.color} ${isActive ? 'animate-pulse' : ''}`}>
                                                    {React.cloneElement(conf.icon as React.ReactElement, { size: 20 })}
                                                </div>
                                                <span className={`text-[9px] font-bold text-center leading-tight ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                                    {conf.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Catatan</label>
                                <input 
                                    type="text"
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    placeholder="Contoh: Parkir di Mall A..."
                                    className="w-full bg-[#111] rounded-xl p-4 text-white text-sm focus:outline-none border border-gray-700 focus:border-gray-500"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                {editingTxId && (
                                    <button type="button" onClick={() => setIsDeleteConfirmOpen(true)} className="flex-1 py-4 bg-red-900/20 text-red-500 font-bold rounded-xl border border-red-900/50 hover:bg-red-900/30">
                                        <Trash2 size={20} className="mx-auto" />
                                    </button>
                                )}
                                <button type="submit" className="flex-[4] py-4 bg-app-primary hover:bg-yellow-400 text-black font-black rounded-xl text-lg flex justify-center items-center gap-2 shadow-glow active:scale-[0.98] transition-transform">
                                    <Save size={20} /> SIMPAN
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDeleteConfirmOpen && (
                 <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
                     <div className="bg-[#1e1e1e] border border-red-500/50 rounded-2xl p-6 w-full max-w-xs text-center animate-in zoom-in-95 duration-200 shadow-2xl shadow-red-900/20">
                        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                        <h3 className="text-white font-bold text-lg mb-2">Hapus Data Ini?</h3>
                        <p className="text-gray-400 text-xs mb-6">Data yang dihapus tidak bisa dikembalikan.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 py-3 bg-gray-800 rounded-xl text-white font-bold border border-gray-600">Batal</button>
                            <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 rounded-xl text-white font-bold shadow-lg">Hapus</button>
                        </div>
                     </div>
                 </div>
            )}
        </div>
    );
}

export default WalletView;