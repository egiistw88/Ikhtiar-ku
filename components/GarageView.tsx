import React, { useState, useEffect } from 'react';
import { GarageData } from '../types';
import { getGarageData, saveGarageData } from '../services/storage';
import { Shield, Smartphone, PenTool, Calendar, AlertCircle, Save, Gauge } from 'lucide-react';

const GarageView: React.FC = () => {
    const [data, setData] = useState<GarageData>(getGarageData());
    const [isEditing, setIsEditing] = useState(false);

    // Form states
    const [contact, setContact] = useState('');
    const [odometer, setOdometer] = useState('');
    const [lastOil, setLastOil] = useState('');
    const [stnk, setStnk] = useState('');
    const [sim, setSim] = useState('');

    useEffect(() => {
        const garage = getGarageData();
        setData(garage);
        setContact(garage.emergencyContact);
        setOdometer(garage.currentOdometer.toString());
        setLastOil(garage.lastOilChangeKm.toString());
        setStnk(garage.stnkExpiryDate);
        setSim(garage.simExpiryDate);
    }, []);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const newData: GarageData = {
            ...data,
            emergencyContact: contact,
            currentOdometer: parseInt(odometer) || 0,
            lastOilChangeKm: parseInt(lastOil) || 0,
            stnkExpiryDate: stnk,
            simExpiryDate: sim
        };
        saveGarageData(newData);
        setData(newData);
        setIsEditing(false);
    };

    // Logic for Alerts
    const kmSinceOil = data.currentOdometer - data.lastOilChangeKm;
    const isOilDue = kmSinceOil >= 2000;
    
    const getDaysUntil = (dateStr: string) => {
        if (!dateStr) return 999;
        const target = new Date(dateStr);
        const today = new Date();
        const diff = target.getTime() - today.getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };

    const daysStnk = getDaysUntil(data.stnkExpiryDate);
    const daysSim = getDaysUntil(data.simExpiryDate);

    return (
        <div className="pb-24 pt-4 px-4 space-y-6">
            
            <div className="bg-[#1e1e1e] p-6 rounded-2xl border border-gray-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Shield size={100} />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Perisai Driver</h2>
                <p className="text-gray-400 text-sm">Manajemen aset & keselamatan.</p>
            </div>

            {/* Emergency Contact Section */}
            <div className="bg-red-900/20 border border-red-900/50 p-5 rounded-xl">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-600 rounded-lg text-white">
                        <Smartphone size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-red-200">Kontak Darurat (SOS)</h3>
                        <p className="text-xs text-gray-400 mt-1 mb-2">
                            Nomor yang akan dihubungi otomatis saat tombol SOS ditekan.
                        </p>
                        {isEditing ? (
                            <input 
                                type="tel" 
                                value={contact}
                                onChange={e => setContact(e.target.value)}
                                placeholder="08xxxxxxxx"
                                className="w-full p-2 bg-black border border-red-800 rounded text-white"
                            />
                        ) : (
                            <p className="text-xl font-mono font-bold text-white tracking-wider">
                                {data.emergencyContact || "BELUM DISET!"}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Maintenance Section */}
            <div className="bg-gray-800/50 border border-gray-700 p-5 rounded-xl space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <PenTool size={18} className="text-cyan-400" />
                    <h3 className="font-bold text-gray-200">Kesehatan Motor</h3>
                </div>

                {/* Odometer & Oil */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#121212] p-3 rounded-lg border border-gray-700">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Odometer Saat Ini</p>
                         {isEditing ? (
                            <input type="number" value={odometer} onChange={e => setOdometer(e.target.value)} className="w-full bg-transparent text-white border-b border-gray-600 focus:outline-none font-mono" />
                        ) : (
                            <p className="text-lg font-mono text-white">{data.currentOdometer} <span className="text-xs">km</span></p>
                        )}
                    </div>
                    <div className={`p-3 rounded-lg border ${isOilDue ? 'bg-red-900/20 border-red-500' : 'bg-[#121212] border-gray-700'}`}>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Status Oli</p>
                         {isEditing ? (
                            <div className="flex flex-col">
                                <label className="text-[8px]">KM Terakhir Ganti</label>
                                <input type="number" value={lastOil} onChange={e => setLastOil(e.target.value)} className="w-full bg-transparent text-white border-b border-gray-600 focus:outline-none font-mono" />
                            </div>
                        ) : (
                            <>
                                <p className={`text-lg font-bold ${isOilDue ? 'text-red-400' : 'text-green-400'}`}>
                                    {isOilDue ? 'GANTI!' : 'AMAN'}
                                </p>
                                <p className="text-[10px] text-gray-500">Pakai: {kmSinceOil} km</p>
                            </>
                        )}
                    </div>
                </div>

                {isOilDue && !isEditing && (
                    <div className="flex items-center gap-2 text-xs text-red-300 bg-red-900/30 p-2 rounded">
                        <AlertCircle size={14} />
                        <span>Mesin panas! Sudah lewat {kmSinceOil} KM.</span>
                    </div>
                )}
            </div>

            {/* Documents Section */}
            <div className="bg-gray-800/50 border border-gray-700 p-5 rounded-xl space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Calendar size={18} className="text-amber-400" />
                    <h3 className="font-bold text-gray-200">Dokumen</h3>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                        <span className="text-sm text-gray-400">Pajak STNK</span>
                        {isEditing ? (
                            <input type="date" value={stnk} onChange={e => setStnk(e.target.value)} className="bg-black text-white p-1 rounded text-xs" />
                        ) : (
                            <div className="text-right">
                                <p className="text-sm font-bold text-white">{data.stnkExpiryDate || "-"}</p>
                                {data.stnkExpiryDate && daysStnk <= 7 && (
                                    <p className="text-[10px] text-red-400 font-bold">{daysStnk < 0 ? 'KADALUARSA' : `${daysStnk} HARI LAGI`}</p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Masa Berlaku SIM</span>
                        {isEditing ? (
                            <input type="date" value={sim} onChange={e => setSim(e.target.value)} className="bg-black text-white p-1 rounded text-xs" />
                        ) : (
                             <div className="text-right">
                                <p className="text-sm font-bold text-white">{data.simExpiryDate || "-"}</p>
                                {data.simExpiryDate && daysSim <= 30 && (
                                    <p className="text-[10px] text-amber-400 font-bold">{daysSim < 0 ? 'KADALUARSA' : `${daysSim} HARI LAGI`}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <button 
                onClick={() => isEditing ? document.dispatchEvent(new Event('submitGarage')) : setIsEditing(true)}
                className={`w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg transition-all ${isEditing ? 'hidden' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
            >
                <PenTool size={18} />
                EDIT DATA GARASI
            </button>

            {isEditing && (
                 <button 
                    onClick={handleSave}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg"
                >
                    <Save size={18} />
                    SIMPAN PERUBAHAN
                </button>
            )}

            <div className="text-center text-[10px] text-gray-600 mt-8">
                <p>Ikhtiar-Ku v1.0 • Perisai Driver</p>
                <p>Data tersimpan lokal di perangkat Anda.</p>
            </div>
        </div>
    );
};

export default GarageView;