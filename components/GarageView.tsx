
import React, { useState, useEffect } from 'react';
import { GarageData } from '../types';
import { getGarageData, saveGarageData } from '../services/storage';
import { Shield, Smartphone, PenTool, AlertCircle, Save, Settings, AlertTriangle, User, Phone } from 'lucide-react';

const GarageView: React.FC = () => {
    const [data, setData] = useState<GarageData>(getGarageData());
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<GarageData>(getGarageData());

    useEffect(() => {
        const d = getGarageData(); setData(d); setFormData(d);
    }, []);

    const handleSave = () => {
        const processed = { ...formData, currentOdometer: Number(formData.currentOdometer), lastOilChangeKm: Number(formData.lastOilChangeKm), serviceInterval: Number(formData.serviceInterval) || 2000 };
        saveGarageData(processed); setData(processed); setIsEditing(false);
    };

    const interval = data.serviceInterval || 2000;
    const kmSinceOil = data.currentOdometer - data.lastOilChangeKm;
    const oilHealth = Math.max(0, 100 - (kmSinceOil / interval * 100));
    
    return (
        <div className="pt-6 px-4 space-y-6 pb-24">
            
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Garasi<span className="text-app-primary">.</span></h1>
                <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className={`p-2 rounded-full border ${isEditing ? 'bg-app-primary border-app-primary text-black' : 'bg-transparent border-gray-700 text-gray-400'}`}>
                    {isEditing ? <Save size={20} /> : <PenTool size={20} />}
                </button>
            </div>

            {/* 1. HEALTH MONITOR */}
            <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Kesehatan Mesin</h3>
                
                <div className="flex items-end justify-between mb-2">
                    <span className="text-4xl font-mono font-bold text-white">{Math.round(oilHealth)}%</span>
                    <span className="text-xs text-gray-400 mb-1">Kualitas Oli</span>
                </div>
                
                <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden mb-4">
                    <div className={`h-full transition-all duration-1000 ${oilHealth < 30 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${oilHealth}%` }}></div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                        <span className="block text-gray-500 mb-1">Odometer</span>
                        {isEditing ? (
                            <input type="number" value={formData.currentOdometer} onChange={e => setFormData({...formData, currentOdometer: Number(e.target.value)})} className="bg-transparent border-b border-gray-500 w-full text-white font-mono"/>
                        ) : (
                            <span className="font-mono text-white text-lg">{data.currentOdometer.toLocaleString()}</span>
                        )}
                        <span className="text-[9px] text-gray-600 block">KM Total</span>
                    </div>
                    <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                        <span className="block text-gray-500 mb-1">Pemakaian</span>
                        <span className="font-mono text-white text-lg">{kmSinceOil}</span>
                        <span className="text-[9px] text-gray-600 block">KM sejak ganti</span>
                    </div>
                </div>

                {isEditing && (
                    <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-2 gap-3">
                         <div>
                            <label className="text-[9px] text-gray-500 uppercase">KM Ganti Terakhir</label>
                            <input type="number" value={formData.lastOilChangeKm} onChange={e => setFormData({...formData, lastOilChangeKm: Number(e.target.value)})} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono text-sm"/>
                         </div>
                         <div>
                            <label className="text-[9px] text-gray-500 uppercase">Interval Service</label>
                            <input type="number" value={formData.serviceInterval} onChange={e => setFormData({...formData, serviceInterval: Number(e.target.value)})} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono text-sm"/>
                         </div>
                    </div>
                )}
            </div>

            {/* 2. EMERGENCY CONTACT */}
            <div className="glass-panel p-5 rounded-3xl border-l-4 border-l-red-500">
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertTriangle size={14}/> Kontak Darurat (SOS)
                </h3>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center text-red-500">
                        <Phone size={24} />
                    </div>
                    <div className="flex-1">
                        {isEditing ? (
                            <input 
                                placeholder="08xxxxxxxx"
                                value={formData.emergencyContact}
                                onChange={e => setFormData({...formData, emergencyContact: e.target.value})}
                                className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-white font-mono"
                            />
                        ) : (
                            <>
                                <p className="text-xl font-mono font-bold text-white">{data.emergencyContact || "BELUM DISET"}</p>
                                <p className="text-[10px] text-gray-500">Akan dihubungi otomatis saat tombol SOS digeser.</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
            
        </div>
    );
};

export default GarageView;
