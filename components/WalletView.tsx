import React, { useState, useEffect } from 'react';
import { Transaction, DailyFinancial } from '../types';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, getTodayFinancials } from '../services/storage';
import { TrendingUp, TrendingDown, X, Plus, Trash2, Save, AlertTriangle } from 'lucide-react';

const WalletView: React.FC = () => {
    const [summary, setSummary] = useState<DailyFinancial | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    
    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [editingTxId, setEditingTxId] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('income');
    const [category, setCategory] = useState<string>('Trip');
    const [note, setNote] = useState('');

    useEffect(() => { refreshData(); }, []);

    const refreshData = () => {
        setSummary(getTodayFinancials());
        setTransactions(getTransactions().filter(t => t.date === new Date().toISOString().split('T')[0]));
    }

    const openModal = (tx?: Transaction) => {
        if (tx) {
            setEditingTxId(tx.id);
            setType(tx.type);
            setCategory(tx.category);
            setAmount(tx.amount.toString());
            setNote(tx.note || '');
        } else {
            setEditingTxId(null);
            setType('income');
            setCategory('Trip');
            setAmount('');
            setNote('');
        }
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseInt(amount.replace(/\D/g, ''));
        if (!val) return;

        const base = {
            amount: val, type, category: category as any, note,
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now()
        };

        if (editingTxId) {
            updateTransaction({ ...base, id: editingTxId } as Transaction);
        } else {
            addTransaction({ ...base, id: Date.now().toString() });
        }
        setIsModalOpen(false);
        refreshData();
    };

    const handleDelete = () => {
        if (editingTxId) {
            deleteTransaction(editingTxId);
            setIsDeleteConfirmOpen(false);
            setIsModalOpen(false);
            refreshData();
        }
    };

    const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
    const netCash = summary?.netCash || 0;

    return (
        <div className="pt-4 px-4 space-y-6">
            
            {/* 1. HERO CARD: DIGITAL WALLET STYLE */}
            <div className="bg-gradient-to-br from-app-card to-[#000] border border-app-border rounded-3xl p-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-app-accent blur-[80px] opacity-10 rounded-full"></div>
                
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Dompet Driver (Hari Ini)</p>
                <h2 className={`text-4xl font-black tracking-tight mb-6 ${netCash < 0 ? 'text-app-danger' : 'text-white'}`}>
                    {formatRupiah(netCash)}
                </h2>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-1 text-app-accent mb-1">
                            <TrendingUp size={14} /> <span className="text-[10px] font-bold uppercase">Masuk</span>
                        </div>
                        <p className="font-mono font-bold text-white">{summary ? formatRupiah(summary.grossIncome) : '0'}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-1 text-app-danger mb-1">
                            <TrendingDown size={14} /> <span className="text-[10px] font-bold uppercase">Keluar</span>
                        </div>
                        <p className="font-mono font-bold text-white">{summary ? formatRupiah(summary.operationalCost) : '0'}</p>
                    </div>
                </div>
            </div>

            {/* 2. HISTORY LIST (Ticket Style) */}
            <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-white">Riwayat Transaksi</h3>
                    <button onClick={() => openModal()} className="text-xs text-app-primary font-bold bg-app-primary/10 px-3 py-1.5 rounded-lg border border-app-primary/30">
                        + MANUAL
                    </button>
                </div>

                {transactions.length === 0 ? (
                    <div className="text-center py-10 text-gray-600 italic text-sm">Belum ada tarikan hari ini.</div>
                ) : (
                    transactions.map(tx => (
                        <div 
                            key={tx.id} 
                            onClick={() => openModal(tx)}
                            className="bg-app-card border border-app-border rounded-xl p-4 flex justify-between items-center active:scale-[0.98] transition-transform"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-app-accent/10 text-app-accent' : 'bg-app-danger/10 text-app-danger'}`}>
                                    {tx.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">{tx.category}</p>
                                    <p className="text-[10px] text-gray-500">{tx.note || 'Tanpa catatan'}</p>
                                </div>
                            </div>
                            <span className={`font-mono font-bold ${tx.type === 'income' ? 'text-app-accent' : 'text-app-danger'}`}>
                                {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                            </span>
                        </div>
                    ))
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
                                <button type="button" onClick={() => setType('income')} className={`flex-1 py-3 rounded-lg font-bold text-sm ${type === 'income' ? 'bg-app-accent text-black' : 'text-gray-400'}`}>PEMASUKAN</button>
                                <button type="button" onClick={() => setType('expense')} className={`flex-1 py-3 rounded-lg font-bold text-sm ${type === 'expense' ? 'bg-app-danger text-white' : 'text-gray-400'}`}>PENGELUARAN</button>
                            </div>

                            <input 
                                autoFocus
                                type="number" 
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="0"
                                className="w-full bg-transparent border-b-2 border-gray-700 text-4xl font-mono font-bold text-white py-4 text-center focus:border-app-primary focus:outline-none placeholder-gray-800"
                            />

                            <div className="grid grid-cols-3 gap-2">
                                {['Trip', 'Tip', 'Food', 'Fuel', 'Maintenance', 'Other'].map(cat => (
                                    <button 
                                        type="button" 
                                        key={cat}
                                        onClick={() => setCategory(cat)}
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

                            <button type="submit" className="w-full py-4 bg-app-primary hover:bg-yellow-400 text-black font-black rounded-xl text-lg flex justify-center items-center gap-2 mt-4">
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

            {/* CONFIRM DELETE */}
            {isDeleteConfirmOpen && (
                 <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4">
                     <div className="bg-[#1e1e1e] border border-app-danger/50 rounded-2xl p-6 w-full max-w-xs text-center">
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