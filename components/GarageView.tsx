import React, { useState, useEffect } from 'react';
import { GarageData } from '../types';
import { getGarageData, saveGarageData } from '../services/storage';
import { Shield, Smartphone, PenTool, AlertCircle, Save } from 'lucide-react';

const GarageView: React.FC = () => {
    const [data, setData] = useState<GarageData>(getGarageData());
    const [isEditing, setIsEditing] = useState(false);
    
    // Form Inputs
    const [formData, setFormData] = useState<GarageData>(getGarageData());

    useEffect(() => {
        const d = getGarageData();
        setData(d);
        setFormData(d);
    }, []);

    const handleChange = (key: keyof GarageData, val: any) => {
        setFormData(prev => ({ ...prev, [key]: val }));
    }

    const handleSave = () => {
        // Convert strings to nums where needed
        const processed = {
            ...formData,
            currentOdometer: Number(formData.currentOdometer),
            lastOilChangeKm: Number(formData.lastOilChangeKm)
        };
        saveGarageData(processed);
        setData(processed);
        setIsEditing(false);
    };

    const kmSinceOil = data.currentOdometer - data.lastOilChangeKm;
    const oilHealth = Math.max(0, 100 - (kmSinceOil / 2000 * 100));
    
    return (
        <div className="pt-4 px-4 space-y-6 pb-24">
            
            <div className="flex items-center gap-3">
                <div className="p-3 bg-app-card border border-app-border rounded-xl">
                    <Shield size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white">Akun & Garasi</h1>
                    <p className="text-xs text-gray-500">Profil & Kesehatan Kendaraan</p>
                </div>
            </div>

            {/* 1. SOS SETTING */}
            <div className="bg-app-danger/10 border border-app-danger/30 p-5 rounded-2xl">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-app-danger font-bold flex items-center gap-2"><Smartphone size={18}/> Kontak Darurat</h3>
                </div>
                {isEditing ? (
                    <input 
                        className="w-full bg-black border border-app-danger/50 p-3 rounded-xl text-white font-mono"
                        placeholder="08xxxxx"
                        value={formData.emergencyContact}
                        onChange={e => handleChange('emergencyContact', e.target.value)}
                    />
                ) : (
                    <p className="text-2xl font-mono font-bold text-white tracking-widest">{data.emergencyContact || "BELUM DISET"}</p>
                )}
                <p className="text-[10px] text-gray-400 mt-2">Nomor ini akan dihubungi saat tombol SOS ditekan.</p>
            </div>

            {/* 2. VEHICLE HEALTH */}
            <div className="bg-app-card border border-app-border p-5 rounded-2xl space-y-5">
                
                {/* Odometer */}
                <div>
                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Odometer (KM)</p>
                    {isEditing ? (
                         <input 
                            type="number"
                            className="w-full bg-gray-900 border border-gray-700 p-3 rounded-xl text-white font-mono text-lg"
                            value={formData.currentOdometer}
                            onChange={e => handleChange('currentOdometer', e.target.value)}
                        />
                    ) : (
                        <p className="text-3xl font-mono font-bold text-white">{data.currentOdometer.toLocaleString()}</p>
                    )}
                </div>

                {/* Oil Health Bar */}
                <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-gray-400">Kesehatan Oli</span>
                        <span className={oilHealth < 20 ? 'text-app-danger' : 'text-app-accent'}>{Math.round(oilHealth)}%</span>
                    </div>
                    <div className="h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                        <div 
                            className={`h-full transition-all duration-500 ${oilHealth < 20 ? 'bg-app-danger' : 'bg-app-accent'}`} 
                            style={{ width: `${oilHealth}%` }}
                        ></div>
                    </div>
                    {isEditing && (
                        <div className="mt-2">
                            <label className="text-[10px] text-gray-500">KM Terakhir Ganti Oli</label>
                            <input 
                                type="number"
                                className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg text-white font-mono text-sm"
                                value={formData.lastOilChangeKm}
                                onChange={e => handleChange('lastOilChangeKm', e.target.value)}
                            />
                        </div>
                    )}
                    {kmSinceOil > 2000 && !isEditing && (
                        <div className="mt-2 flex items-center gap-2 text-app-danger text-xs font-bold bg-app-danger/10 p-2 rounded">
                            <AlertCircle size={14} /> WAKTUNYA GANTI OLI!
                        </div>
                    )}
                </div>
            </div>

            {/* EDIT BUTTON */}
            {isEditing ? (
                <button onClick={handleSave} className="w-full py-4 bg-app-primary text-black font-black rounded-xl flex justify-center items-center gap-2 shadow-glow">
                    <Save size={20} /> SIMPAN DATA
                </button>
            ) : (
                <button onClick={() => setIsEditing(true)} className="w-full py-4 bg-gray-800 text-gray-300 font-bold rounded-xl flex justify-center items-center gap-2 border border-gray-700 hover:bg-gray-700">
                    <PenTool size={18} /> EDIT PROFIL
                </button>
            )}
        </div>
    );
};

export default GarageView;