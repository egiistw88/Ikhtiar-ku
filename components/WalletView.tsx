import React, { useState, useEffect } from 'react';
import { Transaction, DailyFinancial } from '../types';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, getTodayFinancials } from '../services/storage';
import { TrendingUp, TrendingDown, X, Plus, Trash2, Save, AlertTriangle, PieChart, Wrench, Home } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyInput, vibrate } from '../utils';

interface WalletViewProps {
    onToast: (msg: string) => void;
}

const WalletView: React.FC<WalletViewProps> = ({ onToast }) => {
    const [summary, setSummary] = useState<DailyFinancial | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    
    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [editingTxId, setEditingTxId] = useState<string | null>(null);
    const [amountRaw, setAmountRaw] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('income');
    const [category, setCategory] = useState<string>('Trip');
    const [note, setNote] = useState('');

    useEffect(() => { refreshData(); }, []);

    const refreshData = () => {
        setSummary(getTodayFinancials());
        setTransactions(getTransactions().filter(t => t.date === new Date().toISOString().split('T')[0]));
    }

    const openModal = (tx?: Transaction) => {
        vibrate(10);
        if (tx) {
            setEditingTxId(tx.id);
            setType(tx.type);
            setCategory(tx.category);
            setAmountRaw(formatCurrencyInput(tx.amount.toString()));
            setNote(tx.note || '');
        } else {
            setEditingTxId(null);
            setType('income');
            setCategory('Trip');
            setAmountRaw('');
            setNote('');
        }
        setIsModalOpen(true);
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmountRaw(formatCurrencyInput(e.target.value));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        vibrate(20);
        const val = parseCurrencyInput(amountRaw);
        if (!val) return;

        const base = {
            amount: val, type, category: category as any, note,
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now()
        };

        if (editingTxId) {
            updateTransaction({ ...base, id: editingTxId } as Transaction);
            onToast("Transaksi Diperbarui");
        } else {
            addTransaction({ ...base, id: Date.now().toString() });
            onToast("Transaksi Dicatat");
        }
        setIsModalOpen(false);
        refreshData();
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

    const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
    const netCash = summary?.netCash || 0;
    const maintenance = summary?.maintenanceFund || 0;
    const kitchen = summary?.kitchen || 0;

    const categories = type === 'income' 
        ? ['Trip', 'Tip', 'Other'] 
        : ['Fuel', 'Food', 'Maintenance', 'Other'];

    return (
        <div className="pt-4 px-4 space-y-6 pb-28">
            
            {/* 1. HERO CARD */}
            <div className="bg-gradient-to-br from-[#1e1e1e] to-[#000] border border-app-border rounded-3xl p-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600 blur-[80px] opacity-10 rounded-full"></div>
                
                <div className="flex justify-between items-start mb-2">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Uang di Tangan (Net)</p>
                    <div className="p-2 bg-white/5 rounded-full"><PieChart size={16} className="text-emerald-400"/></div>
                </div>
                
                <h2 className={`text-4xl font-black tracking-tight mb-6 ${netCash < 0 ? 'text-app-danger' : 'text-white'}`}>
                    {formatRupiah(netCash)}
                </h2>

                <div className="flex gap-3">
                    <div className="flex-1 bg-emerald-900/20 border border-emerald-900/50 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute -right-2 -top-2 w-10 h-10 bg-emerald-500/20 blur-xl rounded-full"></div>
                        <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                            <Home size={14} />
                            <span className="text-[9px] font-bold uppercase">Uang Dapur</span>
                        </div>
                        <p className="font-mono font-bold text-white text-lg leading-none">{formatRupiah(Math.max(0, kitchen))}</p>
                        <p className="text-[9px] text-gray-500 mt-1">Boleh dibawa pulang</p>
                    </div>

                    <div className="flex-1 bg-amber-900/20 border border-amber-900/50 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute -right-2 -top-2 w-10 h-10 bg-amber-500/20 blur-xl rounded-full"></div>
                        <div className="flex items-center gap-1.5 text-amber-400 mb-1">
                            <Wrench size={14} />
                            <span className="text-[9px] font-bold uppercase">Wajib Sisih</span>
                        </div>
                        <p className="font-mono font-bold text-white text-lg leading-none">{formatRupiah(maintenance)}</p>
                        <p className="text-[9px] text-gray-500 mt-1">Simpan utk servis</p>
                    </div>
                </div>
            </div>

            {/* 2. HISTORY LIST */}
            <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-white">Riwayat Transaksi</h3>
                    <button onClick={() => openModal()} className="text-xs text-app-primary font-bold bg-app-primary/10 px-3 py-1.5 rounded-lg border border-app-primary/30 hover:bg-app-primary/20 transition-colors">
                        + CATAT MANUAL
                    </button>
                </div>

                {transactions.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-2xl bg-[#111]">
                        <p className="text-gray-500 text-sm font-medium">Belum ada tarikan hari ini.</p>
                        <p className="text-xs text-gray-600">Ayo semangat cari orderan!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map(tx => (
                            <div 
                                key={tx.id} 
                                onClick={() => openModal(tx)}
                                className="bg-app-card border border-app-border rounded-xl p-4 flex justify-between items-center active:scale-[0.98] transition-transform hover:border-gray-600"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/5 ${tx.type === 'income' ? 'bg-emerald-900/30 text-emerald-500' : 'bg-red-900/30 text-red-500'}`}>
                                        {tx.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{tx.category}</p>
                                        <p className="text-[10px] text-gray-500 line-clamp-1">{tx.note || 'Tanpa catatan'}</p>
                                    </div>
                                </div>
                                <span className={`font-mono font-bold ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL EDIT/ADD */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
                    <div className="w-full max-w-md bg-[#111] border-t border-app-border p-6 rounded-t-3xl sm:rounded-2xl animate-in slide-in-from-bottom-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">{editingTxId ? 'Edit Data' : 'Catat Manual'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-800 rounded-full text-white"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="flex bg-gray-900 rounded-xl p-1">
                                <button type="button" onClick={() => { setType('income'); setCategory('Trip'); vibrate(10); }} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors ${type === 'income' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>PEMASUKAN</button>
                                <button type="button" onClick={() => { setType('expense'); setCategory('Fuel'); vibrate(10); }} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors ${type === 'expense' ? 'bg-red-600 text-white' : 'text-gray-400'}`}>PENGELUARAN</button>
                            </div>

                            <input 
                                autoFocus
                                type="text" 
                                inputMode="numeric"
                                value={amountRaw}
                                onChange={handleAmountChange}
                                placeholder="0"
                                className="w-full bg-transparent border-b-2 border-gray-700 text-4xl font-mono font-bold text-white py-4 text-center focus:border-app-primary focus:outline-none placeholder-gray-800"
                            />

                            <div className="grid grid-cols-3 gap-2">
                                {categories.map(cat => (
                                    <button 
                                        type="button" 
                                        key={cat}
                                        onClick={() => { setCategory(cat); vibrate(10); }}
                                        className={`py-2 rounded-lg text-xs font-bold border ${category === cat ? 'border-app-primary text-app-primary bg-app-primary/10' : 'border-gray-800 text-gray-500'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <input 
                                type="text"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Catatan (Opsional)"
                                className="w-full bg-gray-900 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />

                            <button type="submit" className="w-full py-4 bg-app-primary hover:bg-yellow-400 text-black font-black rounded-xl text-lg flex justify-center items-center gap-2 mt-4 shadow-glow active:scale-[0.98] transition-transform">
                                <Save size={20} /> SIMPAN
                            </button>

                            {editingTxId && (
                                <button type="button" onClick={() => setIsDeleteConfirmOpen(true)} className="w-full py-3 text-app-danger font-bold text-sm border border-app-danger/30 rounded-xl hover:bg-app-danger/10 flex justify-center items-center gap-2">
                                    <Trash2 size={16} /> HAPUS
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {isDeleteConfirmOpen && (
                 <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4">
                     <div className="bg-[#1e1e1e] border border-app-danger/50 rounded-2xl p-6 w-full max-w-xs text-center animate-in zoom-in-95 duration-200">
                        <AlertTriangle size={40} className="text-app-danger mx-auto mb-4" />
                        <h3 className="text-white font-bold text-lg mb-2">Hapus Permanen?</h3>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 py-3 bg-gray-800 rounded-xl text-white font-bold">Batal</button>
                            <button onClick={handleDelete} className="flex-1 py-3 bg-app-danger rounded-xl text-white font-bold">Hapus</button>
                        </div>
                     </div>
                 </div>
            )}
        </div>
    );
}

export default WalletView;