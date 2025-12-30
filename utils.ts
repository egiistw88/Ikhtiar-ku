
import { DAYS_INDONESIA } from './constants';

export const getCurrentTimeInfo = () => {
  const now = new Date();
  const dayIndex = now.getDay(); // 0 = Sunday
  const dayName = DAYS_INDONESIA[dayIndex];
  
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const timeString = `${hours}:${minutes}`;

  return {
    dayName,
    timeString,
    fullDate: now
  };
};

export const getLocalDateString = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// NEW: Friendly Date Format (e.g., "Senin, 25 Des 2025")
export const formatFriendlyDate = (dateStr: string): string => {
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date);
    } catch (e) {
        return dateStr;
    }
};

// NEW: Haptic Feedback Helper
export const vibrate = (pattern: number | number[] = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

// NEW: Audio Feedback Helper (Synthesized Beeps)
export const playSound = (type: 'success' | 'error' | 'click') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'success') {
            // High pitch rising (Coin sound)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } else if (type === 'error') {
            // Low pitch buzz
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        } else {
            // Click
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        }
    } catch (e) {
        // Ignore audio errors (silent mode fallback)
    }
};

// NEW: Currency Input Formatter (returns string with dots)
export const formatCurrencyInput = (value: string): string => {
    const numberString = value.replace(/[^,\d]/g, '').toString();
    const split = numberString.split(',');
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);
    
    if (ribuan) {
        const separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }
    
    return split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
};

// NEW: Clean Currency to Number
export const parseCurrencyInput = (value: string): number => {
    return parseInt(value.replace(/\./g, '')) || 0;
};

export const isWithinTimeWindow = (targetTime: string, currentTime: string): boolean => {
  const [tH, tM] = targetTime.split(':').map(Number);
  const [cH, cM] = currentTime.split(':').map(Number);

  const targetMinutes = tH * 60 + tM;
  const currentMinutes = cH * 60 + cM;
  const diff = Math.abs(currentMinutes - targetMinutes);
  return diff <= 60; 
};

export const getTimeDifference = (targetTime: string, currentTime: string): number => {
    const [tH, tM] = targetTime.split(':').map(Number);
    const [cH, cM] = currentTime.split(':').map(Number);
    return Math.abs((cH * 60 + cM) - (tH * 60 + tM));
}

export const getTimeWindow = (hours: number): string => {
  if (hours >= 2 && hours < 10) return 'Pagi';
  if (hours >= 10 && hours < 14) return 'Siang';
  if (hours >= 14 && hours < 18) return 'Sore';
  return 'Malam';
};

export const isNightTime = (date: Date): boolean => {
    const hour = date.getHours();
    return hour >= 18 || hour < 6;
}

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; 
  return Number(d.toFixed(1)); 
};

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// NEW: Rest Advice Generator based on Time
export const getRestAdvice = (hour: number) => {
    // Sholat Times (Approximation)
    if (hour >= 4 && hour < 5) return { type: 'SHOLAT', text: 'Waktunya Subuh Ndan. Pejuang subuh rezekinya ampuh.', icon: 'moon' };
    if (hour >= 11 && hour <= 12) return { type: 'SHOLAT', text: 'Adzan Dzuhur berkumandang. Rehat sejenak, sujud dulu biar berkah.', icon: 'sun' };
    if (hour >= 15 && hour < 16) return { type: 'SHOLAT', text: 'Waktunya Ashar. Istirahatkan punggung dan hati.', icon: 'cloud-sun' };
    if (hour >= 17 && hour < 19) return { type: 'SHOLAT', text: 'Maghrib tiba. Matikan aplikasi, waktunya pulang kepada-Nya.', icon: 'sunset' };
    if (hour >= 19 && hour < 20) return { type: 'SHOLAT', text: 'Isya dulu Ndan. Biar hati tenang narik lagi.', icon: 'moon-stars' };

    // Meals & Rest
    if (hour >= 12 && hour < 14) return { type: 'MAKAN', text: 'Jangan lupa makan siang! Mesin aja butuh bensin, apalagi badan.', icon: 'coffee' };
    if (hour >= 23 || hour < 4) return { type: 'ISTIRAHAT', text: 'Sudah larut malam. Bahaya angin duduk, mending pulang Ndan.', icon: 'bed' };
    
    // General
    return { type: 'ISTIRAHAT', text: 'Otot tegang butuh peregangan. Ngopi dulu 15 menit biar fokus lagi.', icon: 'coffee' };
};

// FUEL CALCULATOR: Calculate remaining fuel based on distance traveled
export const calculateFuelConsumption = (distanceKm: number, avgKmPerLiter: number = 35): number => {
    return distanceKm / avgKmPerLiter; // Returns liters consumed
};

export const calculateRemainingFuel = (currentFuelPercent: number, tankCapacity: number = 4.2): number => {
    return (currentFuelPercent / 100) * tankCapacity; // Returns liters
};

export const calculateFuelRange = (currentFuelPercent: number, avgKmPerLiter: number = 35, tankCapacity: number = 4.2): number => {
    const remainingLiters = calculateRemainingFuel(currentFuelPercent, tankCapacity);
    return remainingLiters * avgKmPerLiter; // Returns KM remaining
};

export const shouldRefuel = (currentFuelPercent: number, threshold: number = 25): boolean => {
    return currentFuelPercent <= threshold;
};

// EARNINGS PROJECTION: Project earnings based on current rate
export const projectEarnings = (currentEarnings: number, elapsedMinutes: number, totalShiftMinutes: number = 480): number => {
    if (elapsedMinutes === 0) return 0;
    const ratePerMinute = currentEarnings / elapsedMinutes;
    return Math.round(ratePerMinute * totalShiftMinutes);
};

export const calculateEarningsVelocity = (currentEarnings: number, elapsedMinutes: number): number => {
    if (elapsedMinutes === 0) return 0;
    return Math.round((currentEarnings / elapsedMinutes) * 60); // Earnings per hour
};

// PRAYER TIME CHECKER
export const isWithinPrayerTime = (currentTime: string): { isPrayerTime: boolean, prayer: string | null } => {
    const [hour, minute] = currentTime.split(':').map(Number);
    const currentMinutes = hour * 60 + minute;
    
    const prayerTimes = [
        { name: 'Subuh', start: '04:30', end: '05:45' },
        { name: 'Dzuhur', start: '11:45', end: '12:45' },
        { name: 'Ashar', start: '15:00', end: '16:00' },
        { name: 'Maghrib', start: '17:45', end: '18:30' },
        { name: 'Isya', start: '19:00', end: '20:00' }
    ];
    
    for (const prayer of prayerTimes) {
        const [startH, startM] = prayer.start.split(':').map(Number);
        const [endH, endM] = prayer.end.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        
        if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
            return { isPrayerTime: true, prayer: prayer.name };
        }
    }
    
    return { isPrayerTime: false, prayer: null };
};

// TRAFFIC ZONE INTELLIGENCE
export const getTrafficCondition = (zone: string, hour: number): { status: 'HEAVY' | 'MODERATE' | 'SMOOTH', multiplier: number } => {
    const heavyZones = ['Pasteur', 'Gatot Subroto', 'Soekarno Hatta', 'Cibiru', 'Kopo', 'Buah Batu'];
    const smoothZones = ['Dago Atas', 'Lembang', 'Cihampelas', 'Setiabudhi'];
    
    // Rush hours: 06:00-09:00, 16:00-19:00
    const isRushHour = (hour >= 6 && hour < 9) || (hour >= 16 && hour < 19);
    
    if (heavyZones.includes(zone) && isRushHour) {
        return { status: 'HEAVY', multiplier: 1.5 }; // Boost score karena macet = orderan banyak
    }
    
    if (smoothZones.includes(zone)) {
        return { status: 'SMOOTH', multiplier: 0.8 }; // Slight penalty, area sepi
    }
    
    return { status: 'MODERATE', multiplier: 1.0 };
};

// COMPETITION DENSITY ESTIMATOR (Heuristic based on time & zone)
export const estimateCompetitionDensity = (zone: string, hour: number): { level: 'LOW' | 'MEDIUM' | 'HIGH', description: string } => {
    const popularZones = ['Stasiun Bandung', 'Pusat Kota', 'Gatot Subroto', 'Dipatiukur'];
    const isPeakTime = (hour >= 6 && hour < 9) || (hour >= 11 && hour < 13) || (hour >= 16 && hour < 19);
    
    if (popularZones.includes(zone) && isPeakTime) {
        return { level: 'HIGH', description: 'Banyak driver! Rebutan orderan.' };
    }
    
    if (popularZones.includes(zone) || isPeakTime) {
        return { level: 'MEDIUM', description: 'Kompetisi sedang.' };
    }
    
    return { level: 'LOW', description: 'Zona lengang, peluang besar!' };
};