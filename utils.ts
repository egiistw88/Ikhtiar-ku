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