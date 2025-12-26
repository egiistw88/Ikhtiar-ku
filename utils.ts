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

/**
 * CRITICAL FIX: Get local date string (YYYY-MM-DD) respecting device timezone (WIB/WITA/WIT).
 * Previous `toISOString()` used UTC, causing day shifts at 7 AM WIB.
 */
export const getLocalDateString = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Checks if the hotspot time is within +/- 60 minutes (1 hour) of current time
 */
export const isWithinTimeWindow = (targetTime: string, currentTime: string): boolean => {
  const [tH, tM] = targetTime.split(':').map(Number);
  const [cH, cM] = currentTime.split(':').map(Number);

  const targetMinutes = tH * 60 + tM;
  const currentMinutes = cH * 60 + cM;

  const diff = Math.abs(currentMinutes - targetMinutes);

  // 60 minutes window as per request
  return diff <= 60; 
};

/**
 * Helper to get the minutes difference for sorting precision
 */
export const getTimeDifference = (targetTime: string, currentTime: string): number => {
    const [tH, tM] = targetTime.split(':').map(Number);
    const [cH, cM] = currentTime.split(':').map(Number);
    return Math.abs((cH * 60 + cM) - (tH * 60 + tM));
}

/**
 * Determines broad time window for display
 */
export const getTimeWindow = (hours: number): string => {
  if (hours >= 2 && hours < 10) return 'Pagi';
  if (hours >= 10 && hours < 14) return 'Siang';
  if (hours >= 14 && hours < 18) return 'Sore';
  return 'Malam';
};

/**
 * Check for Night Mode (18:00 - 06:00) strictly
 */
export const isNightTime = (date: Date): boolean => {
    const hour = date.getHours();
    return hour >= 18 || hour < 6;
}

/**
 * Calculates distance between two coordinates in Kilometers
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Number(d.toFixed(1)); // Return to 1 decimal place
};

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}