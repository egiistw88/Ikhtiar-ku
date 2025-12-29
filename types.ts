
export interface Hotspot {
  id: string;
  date: string; // ISO Date "YYYY-MM-DD" (Untuk user entry). Untuk Seed data, ini bisa diabaikan jika isDaily=true
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
  isUserEntry?: boolean; // True jika ini inputan manual driver
  isDaily?: boolean; // NEW: True jika ini pola harian (Stasiun, Mall, Pasar) yang tidak peduli hari apa
  baseScore?: number; // NEW: Nilai popularitas bawaan (0-100)
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

export type StrategyType = 'FEEDER' | 'SNIPER';

// Modal Awal & Kesiapan (New Feature)
export interface ShiftState {
    date: string; // ISO Date "YYYY-MM-DD"
    startBalance: number; // Saldo Aplikator
    startFuel: number; // 0 - 100 (Percentage)
    startCash: number; // Uang Tunai di Dompet
    startTime: number; // Timestamp ms
    status: 'CRITICAL' | 'WARNING' | 'SAFE';
    recommendation: string;
    strategy: StrategyType; // NEW: Pilihan strategi main hari ini
    
    // NEW: Rest Mode Data
    restData?: {
        isActive: boolean;
        startTime: number;
        type: 'SHOLAT' | 'MAKAN' | 'ISTIRAHAT';
    };
}

// Financial Types
export interface Transaction {
  id: string;
  date: string; // ISO Date String
  timestamp: number;
  amount: number;
  type: 'income' | 'expense';
  // Updated Categories for Detailed Tracking
  category: 'Trip' | 'Tip' | 'Bonus' | 'Other' | 'Fuel' | 'Food' | 'Maintenance' | 'TopUp' | 'Parking' | 'Data' | 'Installment';
  distanceKm?: number; // For depreciation calc
  note?: string;
  isCash?: boolean; // NEW: Distinguish Cash vs Non-Cash (Saldo/Transfer)
}

export interface DailyFinancial {
  date: string;
  grossIncome: number; // Total Pendapatan (Semua metode)
  cashIncome: number; // Pendapatan Tunai (Real Cash)
  nonCashIncome: number; // Pendapatan Saldo/App
  operationalCost: number; // Total Pengeluaran
  netCash: number; // Uang di Tangan Real (StartCash + CashIncome - CashExpense)
  
  // Smart Allocations (Kecerdasan Finansial)
  maintenanceFund: number; // 10% dari Gross (Penyusutan Mesin - Virtual)
  kitchen: number; // Uang Dapur (NetCash - MaintenanceFund) -> Aman dibawa pulang
  
  target: number;
}

// Perisai Driver (Garage & Safety)
export interface GarageData {
  bikeName?: string; // NEW: Nama motor (e.g. "Si Merah")
  plateNumber?: string; // NEW: Plat Nomor
  emergencyContact: string; // WhatsApp Number
  
  currentOdometer: number; // Total KM Motor
  
  // Maintenance Trackers
  lastOilChangeKm: number; // KM saat ganti oli terakhir
  serviceInterval: number; // Default 2000
  
  lastTireChangeKm?: number; // NEW: KM ganti ban terakhir
  tireInterval?: number; // NEW: Default 12000
  
  lastPartChangeKm?: number; // NEW: KM ganti V-Belt/Rantai
  partInterval?: number; // NEW: Default 20000

  // Legal Trackers
  stnkExpiryDate: string; // ISO Date
  simExpiryDate: string; // ISO Date
}
