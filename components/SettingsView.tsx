import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { getUserSettings, saveUserSettings, clearShiftState } from '../services/storage';
import { Settings, Save, Coffee, Bike, Package, ShoppingBag, Target, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';

interface SettingsViewProps {
    onBack: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
    const [settings, setSettings] = useState<UserSettings>(getUserSettings());
    const [targetInput, setTargetInput] = useState<string>('');

    useEffect(() => {
        setTargetInput(settings.targetRevenue.toString());
    }, []);

    const handleSave = () => {
        const newSettings = {
            ...settings,
            targetRevenue: parseInt(targetInput) || 150000
        };
        saveUserSettings(newSettings);
        onBack();
    };

    const handleResetShift = () => {
        if (confirm("Reset kondisi tempur (Saldo/Bensin)? Anda harus input ulang dari awal.")) {
            clearShiftState();
            // Force reload page to trigger PreRideSetup again logic in App.tsx
            window.location.reload();
        }
    };

    const togglePref = (key: keyof UserSettings['preferences']) => {
        setSettings(prev => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                [key]: !prev.preferences[key]
            }
        }));
    };

    return (
        <div className="pb-24 pt-4 px-4 space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={onBack} className="p-2 rounded-full bg-gray-800 text-white">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-white">Pengaturan Akun</h2>
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
                <p className="text-xs text-gray-500 mt-2">Target ini digunakan untuk menghitung progres performa harian Anda.</p>
            </div>

            {/* Service Filters */}
            <div className="bg-[#1e1e1e] p-5 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-cyan-400">
                    <Settings size={20} />
                    <h3 className="font-bold uppercase text-sm">Filter Layanan</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">Pilih layanan yang Anda jalankan. Radar hanya akan menampilkan spot yang relevan.</p>
                
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

            {/* ERROR CORRECTION FEATURE */}
            <div className="bg-[#1e1e1e] p-5 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-app-primary">
                    <RefreshCw size={20} />
                    <h3 className="font-bold uppercase text-sm">Koreksi Data</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">Salah input saldo/bensin di awal? Reset kondisi tempur disini.</p>
                <button 
                    onClick={handleResetShift}
                    className="w-full py-3 bg-gray-800 border border-gray-600 hover:bg-gray-700 text-gray-300 font-bold rounded-xl flex justify-center items-center gap-2 text-sm"
                >
                    <AlertTriangle size={16} className="text-yellow-500" />
                    EDIT KONDISI AWAL (RESET)
                </button>
            </div>

            <button 
                onClick={handleSave}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2"
            >
                <Save size={20} />
                SIMPAN PENGATURAN
            </button>

             <div className="text-center mt-8">
                <p className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">Ikhtiar-Ku Pro v1.2</p>
            </div>
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