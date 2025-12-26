export interface Hotspot {
  id: string;
  date: string;
  day: string; // Senin, Selasa, etc.
  time_window: string; // Pagi, Siang, Sore, Malam
  predicted_hour: string; // HH:mm
  origin: string;
  type: string; // Bike, Bike Delivery, etc.
  category: 'Culinary' | 'Commercial' | 'Health/Office' | 'Logistics' | 'Residential' | 'Service' | 'Service/Hangout' | 'Culinary Night' | 'Health' | 'Residential/Shop' | 'Market' | 'Industrial/Office' | 'Health/Emergency' | 'Education' | 'Education/Office' | 'Gov/Facility' | 'Transport Hub' | 'Mall/Lifestyle' | 'Other';
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

export type ViewState = 'radar' | 'map' | 'journal' | 'wallet' | 'garage';

export interface TimeState {
  dayName: string;
  timeString: string; // HH:mm
  fullDate: Date;
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
  grossIncome: number; // Omzet
  operationalCost: number; // Bensin/Makan (Real)
  maintenanceFund: number; // Tabungan Servis (Virtual 10%)
  netProfit: number; // Bersih (Real)
  allocations: { // Virtual Allocations based on Gross
    kitchen: number; // 60%
    operational: number; // 30%
    service: number; // 10%
  };
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