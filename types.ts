
export interface Hotspot {
  id: string;
  date: string;
  day: string; // Senin, Selasa, etc.
  time_window: string; // Pagi, Siang, Sore, Malam
  predicted_hour: string; // HH:mm
  origin: string;
  type: string; // Bike, Bike Delivery, etc.
  category: 'Culinary' | 'Commercial' | 'Health/Office' | 'Logistics' | 'Residential' | 'Service' | 'Service/Hangout' | 'Culinary Night' | 'Health' | 'Residential/Shop' | 'Market' | 'Industrial/Office' | 'Health/Emergency' | 'Education' | 'Education/Office' | 'Gov/Facility' | 'Transport Hub' | 'Mall/Lifestyle' | 'Other' | 'Bike';
  lat: number;
  lng: number;
  zone: string;
  notes: string;
  isUserEntry?: boolean; // To distinguish user added vs seed data
  validations?: {
    date: string;
    isAccurate: boolean;
  }[];
}

export type ViewState = 'setup' | 'radar' | 'map' | 'journal' | 'wallet' | 'garage' | 'settings' | 'summary';

export interface TimeState {
  dayName: string;
  timeString: string; // HH:mm
  fullDate: Date;
}

export interface UserSettings {
  targetRevenue: number;
  preferences: {
    showFood: boolean;
    showBike: boolean;
    showSend: boolean;
    showShop: boolean;
  };
  autoRainMode: boolean; // Future feature: auto detect weather
}

// Modal Awal & Kesiapan (New Feature)
export interface ShiftState {
    date: string; // ISO Date "YYYY-MM-DD"
    startBalance: number; // Saldo Aplikator
    startFuel: number; // 0 - 100 (Percentage)
    startCash: number; // Uang Tunai di Dompet
    status: 'CRITICAL' | 'WARNING' | 'SAFE';
    recommendation: string;
}

// Financial Types
export interface Transaction {
  id: string;
  date: string; // ISO Date String
  timestamp: number;
  amount: number;
  type: 'income' | 'expense';
  category: 'Trip' | 'Tip' | 'Fuel' | 'Food' | 'Maintenance' | 'Other';
  distanceKm?: number; // For depreciation calc
  note?: string;
}

export interface DailyFinancial {
  date: string;
  grossIncome: number; // Total Pendapatan
  operationalCost: number; // Total Pengeluaran Real (Bensin, Makan)
  netCash: number; // Uang di Tangan (Gross - Cost)
  
  // Virtual Allocations (Saran)
  maintenanceFund: number; // 10% dari Gross (Penyusutan Mesin)
  kitchen: number; // NetCash - MaintenanceFund (Sisa Bersih untuk Rumah)
  
  target: number;
}

// Perisai Driver (Garage & Safety)
export interface GarageData {
  emergencyContact: string; // WhatsApp Number (e.g., 6281xxx)
  currentOdometer: number; // Total KM Motor
  lastOilChangeKm: number; // KM saat ganti oli terakhir
  lastTireChangeDate: string; // ISO Date
  stnkExpiryDate: string; // ISO Date
  simExpiryDate: string; // ISO Date
}
