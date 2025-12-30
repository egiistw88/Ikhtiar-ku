
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

// NEW: Format number to Indonesian Currency
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

// NEW: Format number with thousand separator
export const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('id-ID').format(num);
};

// NEW: Relative time formatting (e.g., "2 jam yang lalu")
export const getRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} hari lalu`;
    if (hours > 0) return `${hours} jam lalu`;
    if (minutes > 0) return `${minutes} menit lalu`;
    return 'Baru saja';
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