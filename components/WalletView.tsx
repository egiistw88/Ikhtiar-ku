
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, DailyFinancial } from '../types';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, getTodayFinancials } from '../services/storage';
import { TrendingUp, TrendingDown, X, Plus, Trash2, Save, AlertTriangle, Coffee, Zap, Car, ArrowDownLeft, Receipt, Coins, Wallet, CreditCard, Banknote, Calendar, Clock, Milestone, ArrowUpRight } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyInput, vibrate } from '../utils';
import FinancialAdvisor from './FinancialAdvisor';

interface WalletViewProps {
    onToast: (msg: string) => void;
}

const WalletView: React.FC<WalletViewProps> = ({ onToast }) => {
    const [summary, setSummary] = useState<DailyFinancial | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [editingTxId, setEditingTxId] = useState<string | null>(null);
    
    const [advisorTrigger, setAdvisorTrigger] = useState<{tx: Transaction, stats: DailyFinancial} | null>(null);
    
    const [amountRaw, setAmountRaw] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('income');
    const [category, setCategory] = useState<string>('Trip');
    const [note, setNote] = useState('');
    const [isCash, setIsCash] = useState<boolean>(true);
    const [customDate, setCustomDate] = useState<string>('');
    const [customTime, setCustomTime] = useState<string>('');

    useEffect(() => { refreshData(); }, []);

    const refreshData = () => {
        setSummary(getTodayFinancials());
        setTransactions(getTransactions()
            .filter(t => t.date === new Date().toISOString().split('T')[0])
            .sort((a,b) => b.timestamp - a.timestamp)
        );
    }

    const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

    const targetForecast = useMemo(() => {
        if (!summary) return null;
        const remaining = summary.target - summary.grossIncome;
        if (remaining <= 0) return { status: 'ACHIEVED' };
        
        const tripTxs = transactions.filter(t => t.type === 'income' && t.category === 'Trip');
        const avgOrder = tripTxs.length > 0 ? (tripTxs.reduce((sum, t) => sum + t.amount, 0) / tripTxs.length) : 12000;
        
        return {
            status: 'ONGOING',
            remaining: remaining,
            tripsNeeded: Math.ceil(remaining / avgOrder)
        };
    }, [summary, transactions]);

    const handleQuickAdd = (amount: number, cat: string, text: string) => {
        vibrate(20);
        const newTx: Transaction = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now(),
            amount: amount,
            type: 'expense',
            category: cat as any,
            note: text,
            isCash: true
        };
        addTransaction(newTx);
        const newStats = getTodayFinancials(); 
        setSummary(newStats);
        setTransactions(prev => [newTx, ...prev]);
        setAdvisorTrigger({ tx: newTx, stats: newStats });
    };

    const openModal = (tx?: Transaction) => {
        vibrate(10);
        const now = new Date();
        if (tx) {
            setEditingTxId(tx.id);
            setType(tx.type);
            setCategory(tx.category);
            setAmountRaw(formatCurrencyInput(tx.amount.toString()));
            setNote(tx.note || '');
            setIsCash(tx.isCash !== false);
            setCustomDate(tx.date);
            setCustomTime(new Date(tx.timestamp).toTimeString().slice(0, 5));
        } else {
            setEditingTxId(null);
            setType('income');
            setCategory('Trip');
            setAmountRaw('');
            setNote('');
            setIsCash(true);
            setCustomDate(now.toISOString().split('T')[0]);
            setCustomTime(now.toTimeString().slice(0, 5));
        }
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        vibrate(20);
        const val = parseCurrencyInput(amountRaw);
        if (!val) return;

        const [hours, minutes] = customTime.split(':').map(Number);
        const timestampDate = new Date(customDate);
        timestampDate.setHours(hours, minutes);

        const base = {
            amount: val, type, category: category as any, note, isCash,
            date: customDate, timestamp: timestampDate.getTime()
        };

        if (editingTxId) {
            updateTransaction({ ...base, id: editingTxId } as Transaction);
            onToast("Diperbarui");
            refreshData();
        } else {
            const newTx = { ...base, id: Date.now().toString() } as Transaction;
            addTransaction(newTx);
            const newStats = getTodayFinancials();
            setSummary(newStats);
            setTransactions(prev => [newTx, ...prev]);
            if (customDate === new Date().toISOString().split('T')[0]) {
                setAdvisorTrigger({ tx: newTx, stats: newStats });
            }
        }
        setIsModalOpen(false);
    };

    const handleDelete = () => {
        if (editingTxId) {
            deleteTransaction(editingTxId);
            setIsDeleteConfirmOpen(false);
            setIsModalOpen(false);
            refreshData();
            onToast("Dihapus");
        }
    };

    const quickChips = [2000, 5000, 10000, 20000, 50000];
    const netCash = summary?.netCash || 0;

    return (
        <div className="pt-6 px-4 space-y-8 pb-32">
            
            {advisorTrigger && <FinancialAdvisor transaction={advisorTrigger.tx} dailyStats={advisorTrigger.stats} onClose={() => setAdvisorTrigger(null)} />}

            <div className="bg-[#1a1a1a] rounded-3xl p-6 relative overflow-hidden border border-gray-800">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
                
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <Wallet size={14} className="text-emerald-500"/> Uang di Tangan (Real)
                </p>
                <h2 className={`text-5xl font-black tracking-tighter mb-6 ${netCash < 0 ? 'text-red-500' : 'text-white'}`}>
                    {formatRupiah(netCash)}
                </h2>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/40 p-3 rounded-xl">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                            <ArrowDownLeft size={16}/> Pemasukan
                        </div>
                        <p className="font-mono text-white font-bold">{formatRupiah(summary?.cashIncome || 0)}</p>
                    </div>
                    <div className="bg-black/40 p-3 rounded-xl">
                        <div className="flex items-center gap-2 text-red-400 text-xs font-bold mb-1">
                            <ArrowUpRight size={16}/> Pengeluaran
                        </div>
                        <p className="font-mono text-white font-bold">{formatRupiah(summary?.operationalCost || 0)}</p>
                    </div>
                </div>

                {targetForecast && targetForecast.status === 'ONGOING' && (
                    <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-gray-800 rounded-full text-app-primary"><Milestone size={18}/></div>
                        <div className="text-xs text-gray-400">
                            Kurang <span className="text-white font-bold">{formatRupiah(targetForecast.remaining || 0)}</span> lagi. 
                            Kira-kira <span className="text-app-primary font-bold">{targetForecast.tripsNeeded} tarikan</span>.
                        </div>
                    </div>
                )}
            </div>

            <div>
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                    <Zap size={18} className="text-app-primary" /> Aksi Cepat
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    <button 
                        onClick={() => handleQuickAdd(2000, 'Parking', 'Parkir')}
                        className="bg-[#1a1a1a] p-4 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform border border-transparent hover:border-gray-700"
                    >
                        <ArrowDownLeft size={24} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-300">Parkir 2rb</span>
                    </button>
                    <button 
                        onClick={() => handleQuickAdd(5000, 'Food', 'Ngopi/Es')}
                        className="bg-[#1a1a1a] p-4 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform border border-transparent hover:border-gray-700"
                    >
                        <Coffee size={24} className="text-orange-400" />
                        <span className="text-xs font-bold text-gray-300">Ngopi 5rb</span>
                    </button>
                    <button 
                        onClick={() => openModal()}
                        className="bg-app-primary p-4 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform text-black shadow-lg"
                    >
                        <Plus size={24} strokeWidth={3} />
                        <span className="text-xs font-black uppercase">Manual</span>
                    </button>
                </div>
            </div>

            <div>
                <h3 className="font-bold text-white mb-3">Riwayat</h3>
                {transactions.length === 0 ? (
                    <div className="py-8 text-center text-gray-600 text-sm">Belum ada transaksi hari ini.</div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map(tx => (
                            <div key={tx.id} onClick={() => openModal(tx)} className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-2xl active:bg-[#222]">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-900/20 text-emerald-500' : 'bg-red-900/20 text-red-500'}`}>
                                        {tx.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{tx.category}</p>
                                        <p className="text-xs text-gray-500">{tx.note || (tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran')}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`block font-mono font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                                    </span>
                                    {!tx.isCash && <span className="text-[9px] font-bold bg-purple-900 text-purple-300 px-1 rounded">APP</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex items-end sm:items-center justify-center">
                    <div className="w-full max-w-md bg-[#161616] border-t border-gray-800 p-6 rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-white">{editingTxId ? 'Edit Data' : 'Catat Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-500"/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="flex bg-black p-1 rounded-xl">
                                <button type="button" onClick={() => setType('income')} className={`flex-1 py-3 rounded-lg font-bold text-sm ${type === 'income' ? 'bg-emerald-600 text-white' : 'text-gray-500'}`}>PEMASUKAN</button>
                                <button type="button" onClick={() => setType('expense')} className={`flex-1 py-3 rounded-lg font-bold text-sm ${type === 'expense' ? 'bg-red-600 text-white' : 'text-gray-500'}`}>PENGELUARAN</button>
                            </div>

                            <div>
                                <input 
                                    autoFocus={!editingTxId}
                                    type="text" 
                                    inputMode="numeric"
                                    value={amountRaw}
                                    onChange={(e) => setAmountRaw(formatCurrencyInput(e.target.value))}
                                    placeholder="0"
                                    className="w-full bg-transparent text-center text-4xl font-mono font-bold text-white focus:outline-none placeholder-gray-700 py-4"
                                />
                                <div className="flex justify-center gap-2 mt-2">
                                    {quickChips.map(val => (
                                        <button key={val} type="button" onClick={() => { setAmountRaw(formatCurrencyInput((parseCurrencyInput(amountRaw) + val).toString())); vibrate(5); }} className="px-2 py-1 bg-gray-800 text-xs text-emerald-400 font-mono rounded">+{val/1000}k</button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setIsCash(true)} className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs ${isCash ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'border-gray-700 text-gray-500'}`}>
                                    <Banknote size={16}/> TUNAI
                                </button>
                                <button type="button" onClick={() => setIsCash(false)} className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs ${!isCash ? 'bg-purple-900/30 border-purple-500 text-purple-400' : 'border-gray-700 text-gray-500'}`}>
                                    <CreditCard size={16}/> SALDO APP
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold">Kategori</label>
                                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-[#222] text-white p-3 rounded-xl mt-1 font-bold text-sm border-none">
                                        <option value="Trip">Trip / Ongkos</option>
                                        <option value="Tip">Tip Customer</option>
                                        <option value="Fuel">Bensin</option>
                                        <option value="Food">Makan/Minum</option>
                                        <option value="Maintenance">Bengkel</option>
                                        <option value="Parking">Parkir</option>
                                        <option value="TopUp">Top Up Saldo</option>
                                        <option value="Other">Lainnya</option>
                                    </select>
                                </div>
                                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Catatan (Opsional)" className="w-full bg-[#222] text-white p-3 rounded-xl text-sm" />
                            </div>

                            <div className="flex gap-3 pt-2">
                                {editingTxId && <button type="button" onClick={() => setIsDeleteConfirmOpen(true)} className="p-4 bg-red-900/20 text-red-500 rounded-xl"><Trash2/></button>}
                                <button type="submit" className="flex-1 bg-app-primary text-black font-black py-4 rounded-xl text-lg">SIMPAN</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDeleteConfirmOpen && (
                 <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-6">
                     <div className="bg-[#222] p-6 rounded-2xl w-full text-center">
                        <h3 className="text-white font-bold text-lg mb-4">Hapus Transaksi?</h3>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 py-3 bg-gray-800 rounded-xl text-white font-bold">Batal</button>
                            <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 rounded-xl text-white font-bold">Hapus</button>
                        </div>
                     </div>
                 </div>
            )}
        </div>
    );
}

export default WalletView;
