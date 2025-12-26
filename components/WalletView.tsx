import React, { useState, useEffect } from 'react';
import { Transaction, DailyFinancial } from '../types';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, getTodayFinancials } from '../services/storage';
import { Wallet, TrendingUp, TrendingDown, X, PiggyBank, Plus, Utensils, Fuel, Banknote, Save, Bike, ShoppingBag, Pencil, Trash2, AlertTriangle } from 'lucide-react';

const WalletView: React.FC = () => {
    const [summary, setSummary] = useState<DailyFinancial | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false); // State untuk Custom Delete Dialog
    const [editingTxId, setEditingTxId] = useState<string | null>(null);
    
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

    const openModalForAdd = (initialType: 'income' | 'expense') => {
        setEditingTxId(null); // Mode Add
        setType(initialType);
        setCategory(initialType === 'income' ? 'Trip' : 'Fuel');
        setAmount('');
        setNote('');
        setDistance('');
        setIsModalOpen(true);
    };

    const openModalForEdit = (tx: Transaction) => {
        setEditingTxId(tx.id); // Mode Edit
        setType(tx.type);
        setCategory(tx.category);
        setAmount(tx.amount.toString());
        setNote(tx.note || '');
        setDistance(tx.distanceKm ? tx.distanceKm.toString() : '');
        setIsModalOpen(true);
    };

    // Trigger Custom Dialog
    const handleDeleteClick = () => {
        if (!editingTxId) return;
        setIsDeleteConfirmOpen(true);
    };

    // Eksekusi Hapus
    const confirmDelete = () => {
        if (editingTxId) {
            deleteTransaction(editingTxId);
            setIsDeleteConfirmOpen(false); // Tutup dialog confirm
            setIsModalOpen(false); // Tutup form utama
            refreshData();
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseInt(amount.replace(/\D/g, ''));
        if (!val || val <= 0) return;

        const timestamp = Date.now();
        const dateStr = new Date().toISOString().split('T')[0];

        // Base object
        const txData = {
            amount: val,
            type,
            category: category as any,
            note,
            distanceKm: type === 'income' && category === 'Trip' && distance ? parseFloat(distance) : undefined
        };

        if (editingTxId) {
            // Update Existing
            const existing = transactions.find(t => t.id === editingTxId);
            if (existing) {
                const updatedTx: Transaction = {
                    ...existing,
                    ...txData
                };
                updateTransaction(updatedTx);
            }
        } else {
            // Create New
            const newTx: Transaction = {
                id: timestamp.toString(),
                date: dateStr,
                timestamp: timestamp,
                ...txData
            };
            addTransaction(newTx);
        }

        setIsModalOpen(false); // Close Modal
        refreshData();
    };

    const formatRupiah = (num: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    };

    // Helper for Category Chips
    const CategoryChip = ({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) => (
        <button
            type="button"
            onClick={() => setCategory(value)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${category === value 
                ? (type === 'income' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-600 border-red-500 text-white') 
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
        >
            {icon}
            <span className="text-xs font-bold uppercase">{label}</span>
        </button>
    );

    const netCash = summary?.netCash || 0;
    const percentage = summary ? Math.min(100, Math.round((summary.grossIncome / summary.target) * 100)) : 0;

    return (
        <div className="pb-32 pt-4 px-4 space-y-6 relative min-h-full">
            
            {/* 1. HERO CARD: Uang di Tangan */}
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
                <p className={`text-5xl font-black mb-2 tracking-tighter shadow-black drop-shadow-lg ${netCash >= 0 ? 'text-white' : 'text-red-500'}`}>
                    {formatRupiah(netCash)}
                </p>
                
                {/* Mini Stats */}
                <div className="flex gap-4 mt-6">
                     <div className="flex-1 bg-black/40 p-2 rounded-lg border border-gray-700 backdrop-blur-sm">
                         <div className="flex items-center gap-1 text-green-400 mb-1">
                            <TrendingUp size={12} />
                            <span className="text-[10px] uppercase font-bold">Masuk</span>
                         </div>
                        <p className="text-sm font-bold text-white font-mono">{summary ? formatRupiah(summary.grossIncome) : '0'}</p>
                    </div>
                     <div className="flex-1 bg-black/40 p-2 rounded-lg border border-gray-700 backdrop-blur-sm">
                         <div className="flex items-center gap-1 text-red-400 mb-1">
                            <TrendingDown size={12} />
                            <span className="text-[10px] uppercase font-bold">Keluar</span>
                         </div>
                        <p className="text-sm font-bold text-white font-mono">{summary ? formatRupiah(summary.operationalCost) : '0'}</p>
                    </div>
                </div>
            </div>

            {/* 2. Target Progress */}
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

            {/* 3. History List */}
            <div className="space-y-3">
                <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Riwayat Hari Ini</h3>
                {transactions.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-800 rounded-xl">
                        <Wallet className="mx-auto text-gray-700 mb-2" size={32} />
                        <p className="text-gray-600 text-sm italic">Belum ada transaksi.</p>
                    </div>
                ) : (
                    transactions.map(tx => (
                        <button 
                            key={tx.id} 
                            onClick={() => openModalForEdit(tx)}
                            className="w-full flex justify-between items-center bg-[#1e1e1e] p-4 rounded-xl border border-gray-800 animate-in slide-in-from-bottom-2 hover:bg-gray-800 transition-colors group text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                    {tx.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white flex items-center gap-2">
                                        {tx.category}
                                        <Pencil size={10} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </p>
                                    <p className="text-[10px] text-gray-500">{tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} • {tx.note || '-'}</p>
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
                        </button>
                    ))
                )}
            </div>

            {/* 4. FLOATING ACTION BUTTON (TRIGGER) */}
            <div className="fixed bottom-24 left-0 w-full px-4 z-30">
                <button 
                    onClick={() => openModalForAdd('income')}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-black h-16 rounded-2xl shadow-[0_10px_30px_rgba(6,182,212,0.4)] flex items-center justify-center gap-3 transition-transform active:scale-95"
                >
                    <Plus size={28} className="font-black" />
                    <span className="text-lg font-black tracking-wide uppercase">CATAT DUIT</span>
                </button>
            </div>

            {/* 5. MODAL FORM INPUT/EDIT */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-[#121212] border-t border-gray-700 sm:border sm:rounded-2xl p-6 shadow-2xl relative animate-in slide-in-from-bottom-10 duration-300">
                        
                        {/* Header Modal */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{editingTxId ? 'Edit Transaksi' : 'Catat Transaksi'}</h3>
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)} 
                                className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            
                            {/* Type Switcher (Big Tabs) */}
                            <div className="flex p-1 bg-gray-800 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => { setType('income'); setCategory('Trip'); }}
                                    className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${type === 'income' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <TrendingUp size={16} /> PEMASUKAN
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setType('expense'); setCategory('Fuel'); }}
                                    className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${type === 'expense' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <TrendingDown size={16} /> PENGELUARAN
                                </button>
                            </div>

                            {/* Main Input */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Nominal (Rupiah)</label>
                                <input 
                                    autoFocus
                                    type="number" 
                                    inputMode="numeric"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className={`w-full p-4 bg-gray-900 border-2 rounded-xl text-white text-3xl font-bold font-mono focus:outline-none ${type === 'income' ? 'focus:border-emerald-500' : 'focus:border-red-500'} border-gray-700 placeholder-gray-600`}
                                    placeholder="0"
                                    required
                                />
                            </div>

                            {/* Category Chips (Quick Select) */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-3">Kategori</label>
                                <div className="flex flex-wrap gap-2">
                                    {type === 'income' ? (
                                        <>
                                            <CategoryChip label="Orderan" value="Trip" icon={<Bike size={16} />} />
                                            <CategoryChip label="Tip Customer" value="Tip" icon={<PiggyBank size={16} />} />
                                            <CategoryChip label="Lainnya" value="Other" icon={<Plus size={16} />} />
                                        </>
                                    ) : (
                                        <>
                                            <CategoryChip label="Bensin" value="Fuel" icon={<Fuel size={16} />} />
                                            <CategoryChip label="Makan" value="Food" icon={<Utensils size={16} />} />
                                            <CategoryChip label="Servis" value="Maintenance" icon={<Wallet size={16} />} />
                                            <CategoryChip label="Belanja" value="Other" icon={<ShoppingBag size={16} />} />
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Optional: Distance for Trip */}
                            {type === 'income' && category === 'Trip' && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Jarak Tempuh (KM)</label>
                                    <input 
                                        type="number" 
                                        inputMode="decimal"
                                        value={distance}
                                        onChange={e => setDistance(e.target.value)}
                                        className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white font-bold focus:border-cyan-400 focus:outline-none"
                                        placeholder="0.0"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">*Penting untuk menghitung depresiasi mesin.</p>
                                </div>
                            )}

                            {/* Save Button */}
                            <button 
                                type="submit" 
                                className={`w-full py-4 rounded-xl font-extrabold text-lg flex justify-center items-center gap-2 shadow-lg transition-transform active:scale-95 text-white ${type === 'income' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}
                            >
                                <Save size={20} />
                                {editingTxId ? 'UPDATE DATA' : `SIMPAN ${type === 'income' ? 'PEMASUKAN' : 'PENGELUARAN'}`}
                            </button>
                            
                            {/* DELETE BUTTON (TRIGGER CUSTOM DIALOG) */}
                            {editingTxId && (
                                <button 
                                    type="button" 
                                    onClick={handleDeleteClick}
                                    className="w-full py-4 mt-3 bg-red-900/20 text-red-500 border border-red-900 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-red-900/40 transition-colors"
                                >
                                    <Trash2 size={20} />
                                    HAPUS TRANSAKSI
                                </button>
                            )}

                        </form>
                    </div>
                </div>
            )}

            {/* 6. CUSTOM DELETE CONFIRMATION DIALOG (Driver Friendly) */}
            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 px-4">
                     <div className="w-full max-w-sm bg-[#1e1e1e] border border-red-900/50 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
                                <AlertTriangle size={32} className="text-red-500" />
                            </div>
                            
                            <h3 className="text-xl font-black text-white uppercase mb-2">Hapus Orderan Ini?</h3>
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                Yakin Ndan mau dihapus? Data riwayat ini bakal ilang permanen dan <strong className="text-red-400">gabisa dibalikin</strong>. Itungan setoran hari ini bisa berubah lho.
                            </p>

                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={() => setIsDeleteConfirmOpen(false)}
                                    className="flex-1 py-3 rounded-xl font-bold text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors"
                                >
                                    Gak Jadi
                                </button>
                                <button 
                                    onClick={confirmDelete}
                                    className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 shadow-[0_4px_15px_rgba(220,38,38,0.4)] transition-all active:scale-95"
                                >
                                    Sikat, Hapus!
                                </button>
                            </div>
                        </div>
                     </div>
                </div>
            )}

        </div>
    );
}

export default WalletView;