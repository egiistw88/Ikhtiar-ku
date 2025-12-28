
import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { getUserSettings, saveUserSettings, clearShiftState, createBackupString, restoreFromBackup, performFactoryReset, runDataHousekeeping } from '../services/storage';
import { saveUserApiKey, getUserApiKey } from '../services/ai';
import { ArrowLeft, Bike, Package, ShoppingBag, Coffee, Database, Trash2, Download, Upload, AlertTriangle, Key, Save } from 'lucide-react';
import CustomDialog from './CustomDialog';

interface SettingsViewProps { onBack: () => void; onUpdateCondition: () => void; }

const SettingsView: React.FC<SettingsViewProps> = ({ onBack, onUpdateCondition }) => {
    const [settings, setSettings] = useState<UserSettings>(getUserSettings());
    const [targetInput, setTargetInput] = useState<string>('');
    const [apiKeyInput, setApiKeyInput] = useState<string>('');
    const [dialog, setDialog] = useState<{isOpen: boolean, type: 'confirm'|'alert'|'info', title: string, msg: string, action?: () => void}>({ isOpen: false, type: 'info', title: '', msg: '' });

    useEffect(() => { setTargetInput(settings.targetRevenue.toString()); setApiKeyInput(getUserApiKey()); }, []);

    const handleSave = () => {
        saveUserSettings({ ...settings, targetRevenue: parseInt(targetInput) || 150000 });
        saveUserApiKey(apiKeyInput.trim());
        setDialog({ isOpen: true, type: 'info', title: 'Tersimpan', msg: 'Pengaturan berhasil diperbarui.', action: onBack });
    };

    const togglePref = (key: keyof UserSettings['preferences']) => {
        setSettings(prev => ({ ...prev, preferences: { ...prev.preferences, [key]: !prev.preferences[key] } }));
    };

    return (
        <div className="pb-24 pt-6 px-4 space-y-6">
            <CustomDialog isOpen={dialog.isOpen} type={dialog.type} title={dialog.title} message={dialog.msg} onConfirm={() => { setDialog(p => ({...p, isOpen: false})); if(dialog.action) dialog.action(); }} onCancel={() => setDialog(p => ({...p, isOpen: false}))} />
            
            <div className="flex items-center gap-4 mb-2">
                <button onClick={onBack} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-white active:scale-95"><ArrowLeft size={20}/></button>
                <h1 className="text-2xl font-black text-white uppercase">Pengaturan</h1>
            </div>

            {/* AI KEY */}
            <div className="glass-panel p-5 rounded-3xl">
                <div className="flex items-center gap-2 mb-3 text-purple-400 font-bold text-xs uppercase tracking-widest"><Key size={14}/> Google AI Studio Key</div>
                <input type="text" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} placeholder="Paste API Key..." className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-mono mb-2" />
                <p className="text-[10px] text-gray-500">Diperlukan untuk fitur "Strategi AI" yang akurat.</p>
            </div>

            {/* TARGET */}
            <div className="glass-panel p-5 rounded-3xl">
                <div className="flex items-center gap-2 mb-3 text-emerald-400 font-bold text-xs uppercase tracking-widest">Target Harian (Rp)</div>
                <input type="number" value={targetInput} onChange={e => setTargetInput(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-2xl font-black font-mono" />
            </div>

            {/* FILTERS */}
            <div className="glass-panel p-5 rounded-3xl space-y-2">
                <div className="mb-3 text-gray-400 font-bold text-xs uppercase tracking-widest">Filter Radar</div>
                <Toggle icon={<Bike size={16}/>} label="Bike" active={settings.preferences.showBike} onClick={() => togglePref('showBike')} />
                <Toggle icon={<Coffee size={16}/>} label="Food" active={settings.preferences.showFood} onClick={() => togglePref('showFood')} />
                <Toggle icon={<Package size={16}/>} label="Send" active={settings.preferences.showSend} onClick={() => togglePref('showSend')} />
                <Toggle icon={<ShoppingBag size={16}/>} label="Shop" active={settings.preferences.showShop} onClick={() => togglePref('showShop')} />
            </div>

            {/* ACTIONS */}
            <div className="glass-panel p-5 rounded-3xl space-y-3">
                <div className="mb-2 text-app-primary font-bold text-xs uppercase tracking-widest">Maintenance Data</div>
                <button onClick={() => { runDataHousekeeping(); setDialog({isOpen:true, type:'info', title:'Sukses', msg:'Sampah data dibersihkan.'}); }} className="w-full py-3 rounded-xl bg-blue-900/20 text-blue-400 text-xs font-bold border border-blue-800/50 flex items-center justify-center gap-2"><Database size={14}/> BERSIHKAN CACHE</button>
                <button onClick={() => setDialog({isOpen:true, type:'confirm', title:'Reset Total?', msg:'Semua data akan hilang.', action: performFactoryReset})} className="w-full py-3 rounded-xl bg-red-900/20 text-red-500 text-xs font-bold border border-red-800/50 flex items-center justify-center gap-2"><Trash2 size={14}/> RESET PABRIK</button>
            </div>

            <button onClick={handleSave} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg flex justify-center items-center gap-2"><Save size={20}/> SIMPAN</button>
        </div>
    );
};

const Toggle = ({ icon, label, active, onClick }: any) => (
    <div onClick={onClick} className={`flex justify-between items-center p-3 rounded-xl cursor-pointer transition-colors ${active ? 'bg-white/10' : 'bg-transparent hover:bg-white/5'}`}>
        <div className="flex items-center gap-3 text-gray-300">{icon} <span className="text-sm font-bold">{label}</span></div>
        <div className={`w-10 h-5 rounded-full relative transition-colors ${active ? 'bg-emerald-500' : 'bg-gray-700'}`}>
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${active ? 'left-6' : 'left-1'}`}></div>
        </div>
    </div>
);

export default SettingsView;
