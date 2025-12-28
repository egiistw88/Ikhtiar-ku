
import React, { useState, useEffect, useMemo } from 'react';
import { GarageData } from '../types';
import { getGarageData, saveGarageData } from '../services/storage';
import { vibrate, playSound } from '../utils';
import { Shield, Wrench, Save, Disc, CalendarClock, Settings, Activity, Thermometer, AlertOctagon, RefreshCw, Phone, AlertTriangle, CheckCircle2 } from 'lucide-react';
import CustomDialog from './CustomDialog';

const HealthGauge = ({ percentage, label, icon, colorClass, status, subStatus }: { percentage: number, label: string, icon: React.ReactNode, colorClass: string, status: string, subStatus?: string }) => {
    const safePercent = Math.min(Math.max(percentage, 0), 100);
    
    const size = 80;
    const strokeWidth = 8;
    const center = size / 2;
    const radius = (size - strokeWidth) / 2; 
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (safePercent / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center w-full h-full py-2">
            <div className="relative flex items-center justify-center">
                <div className={`absolute inset-0 rounded-full blur-xl opacity-20 ${colorClass.replace('text-', 'bg-')}`}></div>

                <svg width={size} height={size} className="transform -rotate-90 overflow-visible relative z-10">
                    <circle 
                        cx={center} cy={center} r={radius} 
                        stroke="#2a2a2a" 
                        strokeWidth={strokeWidth} 
                        fill="transparent" 
                        strokeLinecap="round"
                    />
                    <circle 
                        cx={center} cy={center} r={radius} 
                        stroke="currentColor" 
                        strokeWidth={strokeWidth} 
                        fill="transparent" 
                        strokeDasharray={circumference} 
                        strokeDashoffset={strokeDashoffset} 
                        strokeLinecap="round"
                        className={`${colorClass} transition-all duration-1000 ease-out`}
                    />
                </svg>
                
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 z-20">
                    {icon}
                </div>
            </div>

            <div className="mt-3 text-center w-full relative z-10">
                <span className={`text-[10px] font-black uppercase tracking-wider block ${colorClass}`}>{label}</span>
                <span className="text-xs text-white font-mono font-bold block mt-0.5">{status}</span>
                {subStatus && <span className="text-[9px] text-gray-500 font-mono block leading-tight scale-90">{subStatus}</span>}
            </div>
        </div>
    );
};

const DocCard = ({ title, dateStr, icon }: { title: string, dateStr: string, icon: React.ReactNode }) => {
    const calculation = useMemo(() => {
        if (!dateStr) return { days: null, status: 'UNSET', color: 'bg-gray-800 border-gray-700' };
        
        const target = new Date(dateStr);
        if (isNaN(target.getTime())) return { days: null, status: 'ERROR', color: 'bg-gray-800 border-gray-700' };

        const now = new Date();
        const diff = target.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));

        let color = "bg-gray-800 border-gray-700";
        let statusText = "AMAN";

        if (days < 0) { color = "bg-red-900/20 border-red-500/50 animate-pulse"; statusText = "MATI"; }
        else if (days < 30) { color = "bg-amber-900/20 border-amber-500/50"; statusText = "KRITIS"; }
        else if (days < 90) { color = "bg-blue-900/20 border-blue-500/50"; statusText = "DEKAT"; }
        else { color = "bg-emerald-900/10 border-emerald-500/30"; statusText = "AMAN"; }

        return { days, status: statusText, color };
    }, [dateStr]);

    return (
        <div className={`p-3 rounded-2xl border ${calculation.color} relative overflow-hidden group transition-all`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase">
                    {icon} {title}
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded text-white ${calculation.status === 'MATI' ? 'bg-red-600' : 'bg-black/50'}`}>
                    {calculation.status}
                </span>
            </div>
            
            <div className="text-right">
                {calculation.days !== null ? (
                    <>
                        <span className={`text-2xl font-black ${calculation.days < 30 ? 'text-red-400' : 'text-white'}`}>
                            {Math.abs(calculation.days)}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase ml-1">
                            {calculation.days < 0 ? 'Hari Lewat' : 'Hari Lagi'}
                        </span>
                        <p className="text-[9px] text-gray-600 mt-1 font-mono">{dateStr}</p>
                    </>
                ) : (
                    <span className="text-xs text-gray-500 italic flex items-center justify-end gap-1 h-8">
                        <AlertTriangle size={12}/> Belum Diset
                    </span>
                )}
            </div>
        </div>
    );
}

const GarageView: React.FC = () => {
    const [data, setData] = useState<GarageData>(getGarageData());
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<GarageData>(getGarageData());
    
    const [resetType, setResetType] = useState<'OIL' | 'TIRE' | 'PART' | null>(null);

    useEffect(() => {
        const d = getGarageData(); 
        setData(d); 
        setFormData(d);
    }, []);

    const handleSave = () => {
        vibrate(20);
        playSound('success');
        
        const processed: GarageData = { 
            ...formData, 
            currentOdometer: Math.max(0, Number(formData.currentOdometer) || 0), 
            lastOilChangeKm: Math.max(0, Number(formData.lastOilChangeKm) || 0), 
            serviceInterval: Math.max(500, Number(formData.serviceInterval) || 2000),
            lastTireChangeKm: Math.max(0, Number(formData.lastTireChangeKm) || 0),
            tireInterval: Math.max(1000, Number(formData.tireInterval) || 12000),
            lastPartChangeKm: Math.max(0, Number(formData.lastPartChangeKm) || 0),
            partInterval: Math.max(1000, Number(formData.partInterval) || 20000)
        };
        
        saveGarageData(processed); 
        setData(processed); 
        setIsEditing(false);
    };

    const handleQuickReset = (type: 'OIL' | 'TIRE' | 'PART') => {
        vibrate(50);
        playSound('success');

        const currentKm = data.currentOdometer;
        let update = { ...data };
        
        if (type === 'OIL') update.lastOilChangeKm = currentKm;
        if (type === 'TIRE') update.lastTireChangeKm = currentKm;
        if (type === 'PART') update.lastPartChangeKm = currentKm;
        
        saveGarageData(update);
        setData(update);
        setFormData(update); 
        setResetType(null);
    };

    const kmSinceOil = Math.max(0, data.currentOdometer - data.lastOilChangeKm);
    const oilLife = Math.max(0, 100 - (kmSinceOil / (data.serviceInterval || 2000) * 100));
    
    const kmSinceTire = Math.max(0, data.currentOdometer - (data.lastTireChangeKm || 0));
    const tireLife = Math.max(0, 100 - (kmSinceTire / (data.tireInterval || 12000) * 100));
    
    const kmSincePart = Math.max(0, data.currentOdometer - (data.lastPartChangeKm || 0));
    const partLife = Math.max(0, 100 - (kmSincePart / (data.partInterval || 20000) * 100));

    const getHealthColor = (val: number) => {
        if (val <= 0) return "text-red-600 animate-pulse";
        if (val < 25) return "text-red-500";
        if (val < 50) return "text-amber-500";
        return "text-emerald-500";
    };

    const nextServiceKm = data.lastOilChangeKm + data.serviceInterval;
    const kmToService = nextServiceKm - data.currentOdometer;
    const estCost = (kmToService < 200 ? 150000 : 0) + (tireLife < 10 ? 300000 : 0) + (partLife < 10 ? 250000 : 0);

    return (
        <div className="pt-4 px-4 pb-32 space-y-6">
            
            <CustomDialog 
                isOpen={!!resetType} 
                type="confirm" 
                title="Konfirmasi Servis" 
                message={`Yakin sudah ganti ${resetType === 'OIL' ? 'Oli' : resetType === 'TIRE' ? 'Ban' : 'Sparepart'}? Indikator akan direset ke 100%.`}
                confirmText="Ya, Reset"
                onConfirm={() => resetType && handleQuickReset(resetType)}
                onCancel={() => setResetType(null)}
            />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                        <Wrench size={24} className="text-app-primary" /> BENGKEL VIRTUAL
                    </h1>
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <input 
                                type="text" 
                                value={formData.bikeName || ''} 
                                onChange={e => setFormData({...formData, bikeName: e.target.value})}
                                placeholder="Nama Motor..." 
                                className="bg-black/50 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                            />
                        ) : (
                            <p className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-widest">{data.bikeName || 'MOTOR BELUM DISET'}</p>
                        )}
                        {!isEditing && data.plateNumber && <span className="text-[10px] bg-gray-800 text-white px-2 py-0.5 rounded font-bold">{data.plateNumber}</span>}
                    </div>
                </div>
                <button 
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)} 
                    className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all active:scale-95 ${isEditing ? 'bg-app-primary border-app-primary text-black shadow-glow' : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:text-white'}`}
                >
                    {isEditing ? <Save size={16} /> : <Settings size={16} />}
                    {isEditing ? 'SIMPAN' : 'EDIT'}
                </button>
            </div>

            <div className="relative bg-[#1a1a1a] rounded-3xl p-6 border border-gray-800 overflow-hidden shadow-2xl group">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] opacity-50 pointer-events-none"></div>
                
                <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[80px] opacity-20 transition-colors duration-1000 ${kmToService < 0 ? 'bg-red-500' : estCost > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>

                <div className="relative z-10 text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mb-2 flex items-center justify-center gap-2">
                        <Activity size={12}/> ODOMETER REAL-TIME
                    </p>
                    
                    {isEditing ? (
                        <div className="flex flex-col items-center animate-in fade-in">
                            <input 
                                type="number" 
                                value={formData.currentOdometer} 
                                onChange={e => setFormData({...formData, currentOdometer: Number(e.target.value)})} 
                                className="bg-black/50 border-2 border-app-primary rounded-xl text-4xl font-mono text-center text-white w-full py-3 focus:outline-none focus:ring-4 focus:ring-app-primary/20"
                            />
                            <p className="text-[10px] text-gray-500 mt-2">*Masukkan angka Odometer di Speedometer motor</p>
                        </div>
                    ) : (
                        <h2 className="text-5xl font-mono font-black text-white tracking-widest drop-shadow-lg tabular-nums">
                            {data.currentOdometer.toLocaleString()}
                            <span className="text-sm text-gray-600 ml-2 font-sans tracking-normal font-bold">KM</span>
                        </h2>
                    )}
                    
                    <div className="mt-8 grid grid-cols-2 gap-4">
                        <div className={`px-4 py-3 rounded-2xl border backdrop-blur-sm transition-colors ${kmToService < 200 ? 'bg-red-900/20 border-red-500/50' : 'bg-black/40 border-white/5'}`}>
                            <span className="block text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-1">Servis Berikutnya</span>
                            <span className={`text-sm font-bold font-mono ${kmToService < 0 ? 'text-red-400' : 'text-white'}`}>
                                {kmToService < 0 ? `TELAT ${Math.abs(kmToService).toLocaleString()} KM` : `${kmToService.toLocaleString()} KM LAGI`}
                            </span>
                        </div>
                         <div className={`px-4 py-3 rounded-2xl border backdrop-blur-sm transition-colors ${estCost > 0 ? 'bg-amber-900/20 border-amber-500/50' : 'bg-black/40 border-white/5'}`}>
                            <span className="block text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-1">Estimasi Biaya</span>
                            <span className="text-sm font-bold font-mono text-white">
                                Rp{new Intl.NumberFormat('id-ID').format(estCost)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                
                <div className="aspect-[3/4] bg-[#1a1a1a] rounded-3xl p-3 border border-gray-800 relative group transition-colors hover:border-gray-700">
                    <HealthGauge 
                        percentage={oilLife} 
                        label="Oli Mesin" 
                        icon={<Thermometer size={18}/>} 
                        colorClass={getHealthColor(oilLife)} 
                        status={`${kmSinceOil} km`}
                        subStatus="digunakan"
                    />
                    {!isEditing && oilLife < 95 && (
                        <button onClick={() => setResetType('OIL')} className="absolute top-2 right-2 p-1.5 bg-gray-800/80 rounded-full text-emerald-500 hover:bg-emerald-900/50 transition-colors z-30 border border-gray-700">
                            <RefreshCw size={10}/>
                        </button>
                    )}
                </div>

                <div className="aspect-[3/4] bg-[#1a1a1a] rounded-3xl p-3 border border-gray-800 relative group transition-colors hover:border-gray-700">
                    <HealthGauge 
                        percentage={tireLife} 
                        label="Kondisi Ban" 
                        icon={<Disc size={18}/>} 
                        colorClass={getHealthColor(tireLife)} 
                        status={`${Math.round(tireLife)}%`}
                        subStatus="Est. Sisa"
                    />
                    {!isEditing && tireLife < 95 && (
                        <button onClick={() => setResetType('TIRE')} className="absolute top-2 right-2 p-1.5 bg-gray-800/80 rounded-full text-emerald-500 hover:bg-emerald-900/50 transition-colors z-30 border border-gray-700">
                            <RefreshCw size={10}/>
                        </button>
                    )}
                </div>

                <div className="aspect-[3/4] bg-[#1a1a1a] rounded-3xl p-3 border border-gray-800 relative group transition-colors hover:border-gray-700">
                    <HealthGauge 
                        percentage={partLife} 
                        label="Belt/Rantai" 
                        icon={<Activity size={18}/>} 
                        colorClass={getHealthColor(partLife)} 
                        status={partLife < 25 ? 'PERIKSA' : 'OK'}
                        subStatus={`${kmSincePart} km`}
                    />
                     {!isEditing && partLife < 95 && (
                        <button onClick={() => setResetType('PART')} className="absolute top-2 right-2 p-1.5 bg-gray-800/80 rounded-full text-emerald-500 hover:bg-emerald-900/50 transition-colors z-30 border border-gray-700">
                            <RefreshCw size={10}/>
                        </button>
                    )}
                </div>
            </div>

            {isEditing && (
                 <div className="bg-[#1a1a1a] p-5 rounded-3xl border border-gray-800 space-y-4 animate-in fade-in">
                    <h3 className="text-xs font-bold text-app-primary uppercase tracking-widest mb-2 flex items-center gap-2"><Settings size={14}/> Setup Interval Servis</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                             <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Oli (KM)</label>
                             <input type="number" value={formData.serviceInterval} onChange={e => setFormData({...formData, serviceInterval: Number(e.target.value)})} className="w-full bg-black border border-gray-700 rounded p-2 text-white text-xs text-center font-mono"/>
                        </div>
                        <div>
                             <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Ban (KM)</label>
                             <input type="number" value={formData.tireInterval} onChange={e => setFormData({...formData, tireInterval: Number(e.target.value)})} className="w-full bg-black border border-gray-700 rounded p-2 text-white text-xs text-center font-mono"/>
                        </div>
                        <div>
                             <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Part (KM)</label>
                             <input type="number" value={formData.partInterval} onChange={e => setFormData({...formData, partInterval: Number(e.target.value)})} className="w-full bg-black border border-gray-700 rounded p-2 text-white text-xs text-center font-mono"/>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Shield size={14} /> Dokumen & Legalitas
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {isEditing ? (
                        <div className="bg-[#1a1a1a] p-4 rounded-2xl space-y-2 border border-gray-700">
                             <label className="text-[10px] text-gray-500 uppercase font-bold text-red-400">Exp. STNK</label>
                             <input type="date" value={formData.stnkExpiryDate} onChange={e => setFormData({...formData, stnkExpiryDate: e.target.value})} className="w-full bg-black border border-gray-600 rounded p-2 text-white text-xs"/>
                        </div>
                    ) : (
                        <DocCard title="Pajak STNK" dateStr={data.stnkExpiryDate} icon={<CalendarClock size={14}/>} />
                    )}

                    {isEditing ? (
                        <div className="bg-[#1a1a1a] p-4 rounded-2xl space-y-2 border border-gray-700">
                             <label className="text-[10px] text-gray-500 uppercase font-bold text-blue-400">Exp. SIM</label>
                             <input type="date" value={formData.simExpiryDate} onChange={e => setFormData({...formData, simExpiryDate: e.target.value})} className="w-full bg-black border border-gray-600 rounded p-2 text-white text-xs"/>
                        </div>
                    ) : (
                        <DocCard title="Lisensi SIM" dateStr={data.simExpiryDate} icon={<Shield size={14}/>} />
                    )}
                </div>
            </div>

            <div className={`p-5 rounded-3xl border-l-4 transition-colors ${isEditing ? 'bg-gray-900 border-gray-600' : !data.emergencyContact ? 'bg-red-900/10 border-red-500' : 'bg-[#1a1a1a] border-emerald-500'}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className={`text-xs font-bold uppercase tracking-widest mb-1 ${!data.emergencyContact ? 'text-red-500' : 'text-emerald-500'}`}>
                            Emergency SOS
                        </h3>
                        <p className="text-[10px] text-gray-500">Nomor ini akan dihubungi otomatis saat tombol SOS digeser.</p>
                    </div>
                    <div className={`p-2 rounded-full ${!data.emergencyContact ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                        {data.emergencyContact ? <CheckCircle2 size={20}/> : <AlertOctagon size={20} />}
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center text-gray-400">
                        <Phone size={18} />
                    </div>
                    {isEditing ? (
                        <input 
                            type="tel"
                            placeholder="08xxxxxxxx"
                            value={formData.emergencyContact}
                            onChange={e => setFormData({...formData, emergencyContact: e.target.value})}
                            className="flex-1 bg-black border border-gray-700 p-2 rounded-xl text-white font-mono"
                        />
                    ) : (
                        <p className="text-xl font-mono font-bold text-white tracking-widest">
                            {data.emergencyContact || "BELUM DISET"}
                        </p>
                    )}
                </div>
            </div>
            
        </div>
    );
};

export default GarageView;
