import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { getUserSettings, saveUserSettings, clearShiftState, createBackupString, restoreFromBackup, performFactoryReset, runDataHousekeeping } from '../services/storage';
import { saveUserApiKey, getUserApiKey } from '../services/ai';
import { Settings, Save, Coffee, Bike, Package, ShoppingBag, Target, ArrowLeft, RefreshCw, AlertTriangle, Edit3, Download, Upload, CheckCircle, Key, Trash2, Database, ShieldCheck } from 'lucide-react';
import CustomDialog from './CustomDialog';

interface SettingsViewProps {
    onBack: () => void;
    onUpdateCondition: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onBack, onUpdateCondition }) => {
    const [settings, setSettings] = useState<UserSettings>(getUserSettings());
    const [targetInput, setTargetInput] = useState<string>('');
    const [apiKeyInput, setApiKeyInput] = useState<string>('');
    const [restoreStatus, setRestoreStatus] = useState<string>('');
    
    // Dialog State
    const [dialogConfig, setDialogConfig] = useState<{isOpen: boolean, type: 'confirm'|'alert'|'info', title: string, msg: string, action?: () => void}>({
        isOpen: false, type: 'info', title: '', msg: ''
    });

    useEffect(() => {
        setTargetInput(settings.targetRevenue.toString());
        setApiKeyInput(getUserApiKey());
    }, []);

    const handleSave = () => {
        const newSettings = {
            ...settings,
            targetRevenue: parseInt(targetInput) || 150000
        };
        saveUserSettings(newSettings);
        saveUserApiKey(apiKeyInput.trim());
        
        setDialogConfig({
            isOpen: true,
            type: 'info',
            title: 'Berhasil',
            msg: 'Pengaturan dan API Key berhasil disimpan!',
            action: onBack
        });
    };

    const confirmResetShift = () => {
        setDialogConfig({
            isOpen: true,
            type: 'confirm',
            title: 'Reset Total?',
            msg: 'Anda akan menghapus data shift (Saldo/Bensin) saat ini. Anda harus input ulang dari nol.',
            action: performReset
        });
    };

    const performReset = () => {
        clearShiftState();
        window.location.reload();
    };
    
    const confirmFactoryReset = () => {
        setDialogConfig({
            isOpen: true,
            type: 'confirm',
            title: 'HAPUS SEMUA DATA?',
            msg: 'PERINGATAN: Semua riwayat order, dompet, dan setelan akan dihapus permanen. Aplikasi akan kembali seperti baru diinstall. Lanjutkan?',
            action: performFactoryReset
        });
    }

    const handleManualHousekeeping = () => {
        const result = runDataHousekeeping();
        setDialogConfig({
            isOpen: true,
            type: 'info',
            title: 'Database Optimizer',
            msg: `Hasil Scan & Pembersihan:\n- ${result.cleanedTxs} transaksi lawas/error dihapus.\n- ${result.cleanedHotspots} titik radar non-aktif dihapus.\n\nDatabase kini lebih ringan dan cepat!`,
        });
    }

    const togglePref = (key: keyof UserSettings['preferences']) => {
        setSettings(prev => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                [key]: !prev.preferences[key]
            }
        }));
    };

    // BACKUP LOGIC
    const handleBackup = () => {
        const backupData = createBackupString();
        const blob = new Blob([backupData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().split('T')[0];
        link.download = `ikhtiarku_backup_${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // RESTORE LOGIC
    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            if (content) {
                const success = restoreFromBackup(content);
                if (success) {
                    setRestoreStatus('Berhasil! Reloading...');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    setRestoreStatus('Gagal: File korup/salah format.');
                }
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="pb-24 pt-4 px-4 space-y-6">
            
            <CustomDialog 
                isOpen={dialogConfig.isOpen}
                type={dialogConfig.type}
                title={dialogConfig.title}
                message={dialogConfig.msg}
                onConfirm={() => {
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                    if (dialogConfig.action) dialogConfig.action();
                }}
                onCancel={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
                confirmText={dialogConfig.type === 'confirm' ? 'Ya, Lanjutkan' : 'Oke'}
            />

            <div className="flex items-center gap-3 mb-6">
                <button onClick={onBack} className="p-2 rounded-full bg-gray-800 text-white">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-white">Pengaturan Akun</h2>
            </div>

            {/* API KEY SETTING (NEW) */}
            <div className="bg-[#1e1e1e] p-5 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-purple-400">
                    <Key size={20} />
                    <h3 className="font-bold uppercase text-sm">Google AI Studio Key</h3>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                    Agar "Strategi AI" berjalan lancar & gratis, masukkan API Key Anda sendiri dari 
                    <span className="text-purple-400 font-bold"> aistudio.google.com</span>.
                </p>
                <input 
                    type="text" 
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Tempel API Key disini..."
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white text-xs font-mono focus:border-purple-500 focus:outline-none"
                />
            </div>

            {/* Target Setting */}
            <div className="bg-[#1e1e1e] p-5 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-emerald-400">
                    <Target size={20} />
                    <h3 className="font-bold uppercase text-sm">Target Harian (Rp)</h3>
                </div>
                <input 
                    type="number" 
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white text-xl font-bold font-mono focus:border-emerald-500 focus:outline-none"
                />
            </div>

            {/* Service Filters */}
            <div className="bg-[#1e1e1e] p-5 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-cyan-400">
                    <Settings size={20} />
                    <h3 className="font-bold uppercase text-sm">Filter Layanan</h3>
                </div>
                
                <div className="space-y-3">
                    <ToggleRow 
                        icon={<Bike size={18} />} 
                        label="Penumpang (Bike)" 
                        active={settings.preferences.showBike} 
                        onClick={() => togglePref('showBike')} 
                    />
                    <ToggleRow 
                        icon={<Coffee size={18} />} 
                        label="Makanan (Food)" 
                        active={settings.preferences.showFood} 
                        onClick={() => togglePref('showFood')} 
                    />
                    <ToggleRow 
                        icon={<Package size={18} />} 
                        label="Barang (Send)" 
                        active={settings.preferences.showSend} 
                        onClick={() => togglePref('showSend')} 
                    />
                     <ToggleRow 
                        icon={<ShoppingBag size={18} />} 
                        label="Belanja (Shop/Mart)" 
                        active={settings.preferences.showShop} 
                        onClick={() => togglePref('showShop')} 
                    />
                </div>
            </div>

            {/* DATA BACKUP & RESTORE */}
            <div className="bg-[#1e1e1e] p-5 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-app-accent">
                    <Download size={20} />
                    <h3 className="font-bold uppercase text-sm">Backup & Restore Data</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={handleBackup}
                        className="py-3 bg-gray-800 border border-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-1 text-xs"
                    >
                        <Download size={20} className="text-emerald-500" />
                        BACKUP
                    </button>
                    
                    <label className="py-3 bg-gray-800 border border-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-1 text-xs cursor-pointer relative overflow-hidden">
                        <Upload size={20} className="text-cyan-500" />
                        RESTORE
                        <input type="file" accept=".json" onChange={handleRestore} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </label>
                </div>
                {restoreStatus && (
                    <div className="mt-3 text-center text-xs font-bold text-emerald-400 flex items-center justify-center gap-2">
                         {restoreStatus.includes('Berhasil') && <CheckCircle size={14} />} {restoreStatus}
                    </div>
                )}
            </div>

            {/* ERROR CORRECTION FEATURE */}
            <div className="bg-[#1e1e1e] p-5 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-app-primary">
                    <ShieldCheck size={20} />
                    <h3 className="font-bold uppercase text-sm">Perawatan Data</h3>
                </div>
                
                <div className="space-y-3">
                     <button 
                        onClick={handleManualHousekeeping}
                        className="w-full py-3 bg-blue-900/20 border border-blue-800 hover:bg-blue-900/30 text-blue-400 font-bold rounded-xl flex justify-center items-center gap-2 text-sm"
                    >
                        <Database size={16} />
                        DATABASE OPTIMIZER (Manual Scan)
                    </button>

                    <button 
                        onClick={() => { onBack(); onUpdateCondition(); }}
                        className="w-full py-3 bg-gray-800 border border-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 text-sm"
                    >
                        <Edit3 size={16} />
                        UPDATE SALDO / BENSIN
                    </button>
                    
                    <button 
                        onClick={confirmResetShift}
                        className="w-full py-3 bg-gray-800 border border-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 text-sm"
                    >
                        <AlertTriangle size={16} className="text-amber-500"/>
                        RESET SHIFT HARI INI
                    </button>

                    <button 
                        onClick={confirmFactoryReset}
                        className="w-full py-3 bg-red-900/20 border border-red-800 hover:bg-red-900/30 text-red-500 font-bold rounded-xl flex justify-center items-center gap-2 text-sm"
                    >
                        <Trash2 size={16} />
                        HAPUS SEMUA DATA (RESET PABRIK)
                    </button>
                </div>
            </div>

            <button 
                onClick={handleSave}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2"
            >
                <Save size={20} />
                SIMPAN PENGATURAN
            </button>
        </div>
    );
};

const ToggleRow: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
    <div onClick={onClick} className="flex justify-between items-center p-3 bg-gray-900 rounded-lg cursor-pointer active:scale-[0.98] transition-all border border-transparent hover:border-gray-600">
        <div className="flex items-center gap-3 text-gray-300">
            {icon}
            <span className="text-sm font-medium">{label}</span>
        </div>
        <div className={`w-12 h-6 rounded-full relative transition-colors ${active ? 'bg-emerald-500' : 'bg-gray-700'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${active ? 'left-7' : 'left-1'}`}></div>
        </div>
    </div>
);

export default SettingsView;