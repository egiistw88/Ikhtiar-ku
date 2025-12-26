import { Hotspot, Transaction, DailyFinancial, GarageData, UserSettings, ShiftState } from '../types';
import { INITIAL_DATA } from '../constants';
import { getLocalDateString } from '../utils';

const STORAGE_KEY = 'ikhtiar_ku_data_v1';
const SHIFT_STATE_KEY = 'ikhtiar_ku_shift_state_v2'; 
const FINANCE_KEY = 'ikhtiar_ku_finance_v1';
const SETTINGS_KEY = 'ikhtiar_ku_settings_v1';
const GARAGE_KEY = 'ikhtiar_ku_garage_v1';

export const getHotspots = (): Hotspot[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Initialize
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
    return INITIAL_DATA;
  } catch (error) {
    console.error("Storage error", error);
    return INITIAL_DATA;
  }
};

export const addHotspot = (hotspot: Hotspot): void => {
  try {
    const current = getHotspots();
    const updated = [hotspot, ...current]; // Newest first
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save hotspot", error);
  }
};

export const deleteHotspot = (id: string): void => {
    try {
        const current = getHotspots();
        const updated = current.filter(h => h.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error("Failed to delete", error);
    }
}

export const toggleValidation = (id: string, isAccurate: boolean): void => {
    try {
        const current = getHotspots();
        const updated = current.map(h => {
            if (h.id === id) {
                const today = getLocalDateString();
                const validations = h.validations || [];
                // Remove existing validation for today if any
                const filtered = validations.filter(v => v.date !== today);
                return {
                    ...h,
                    validations: [...filtered, { date: today, isAccurate }]
                };
            }
            return h;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error("Failed to update validation", error);
    }
}

// ==========================================
// NEW: SHIFT STATE (MODAL AWAL)
// ==========================================
export const getShiftState = (): ShiftState | null => {
    const stored = localStorage.getItem(SHIFT_STATE_KEY);
    if (!stored) return null;
    
    try {
        const parsed: ShiftState = JSON.parse(stored);
        const today = getLocalDateString();

        // If stored data is from previous day, reset it
        if (parsed.date !== today) {
            localStorage.removeItem(SHIFT_STATE_KEY);
            return null;
        }
        
        return parsed;
    } catch (e) {
        // Corrupt data fallback
        localStorage.removeItem(SHIFT_STATE_KEY);
        return null;
    }
}

export const saveShiftState = (state: ShiftState): void => {
    localStorage.setItem(SHIFT_STATE_KEY, JSON.stringify(state));
}

export const clearShiftState = (): void => {
    localStorage.removeItem(SHIFT_STATE_KEY);
}

// ==========================================
// PENGATURAN (SETTINGS)
// ==========================================
export const getUserSettings = (): UserSettings => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
    
    // Default Settings
    return {
        targetRevenue: 150000,
        preferences: {
            showFood: true,
            showBike: true,
            showSend: true,
            showShop: true
        },
        autoRainMode: false
    };
}

export const saveUserSettings = (settings: UserSettings): void => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ==========================================
// FITUR DOMPET BERKAH (Financial Manager)
// ==========================================

export const getTransactions = (): Transaction[] => {
    try {
        const stored = localStorage.getItem(FINANCE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

export const addTransaction = (tx: Transaction): void => {
    const current = getTransactions();
    const updated = [tx, ...current];
    localStorage.setItem(FINANCE_KEY, JSON.stringify(updated));

    // Integration: Update Odometer automatically if distance is provided
    if (tx.distanceKm && tx.distanceKm > 0) {
        const garage = getGarageData();
        garage.currentOdometer = (garage.currentOdometer || 0) + tx.distanceKm;
        saveGarageData(garage);
    }
}

export const updateTransaction = (updatedTx: Transaction): void => {
    const current = getTransactions();
    const updated = current.map(tx => tx.id === updatedTx.id ? updatedTx : tx);
    localStorage.setItem(FINANCE_KEY, JSON.stringify(updated));
}

export const deleteTransaction = (id: string): void => {
    const current = getTransactions();
    // Use String comparison to be safe
    const updated = current.filter(tx => String(tx.id) !== String(id));
    localStorage.setItem(FINANCE_KEY, JSON.stringify(updated));
}

export const getTodayFinancials = (): DailyFinancial => {
    const todayStr = getLocalDateString();
    const txs = getTransactions().filter(t => t.date === todayStr);
    const settings = getUserSettings();
    
    let grossIncome = 0;
    let realOpsCost = 0;

    txs.forEach(t => {
        if (t.type === 'income') {
            grossIncome += t.amount;
        } else if (t.type === 'expense') {
            realOpsCost += t.amount;
        }
    });

    // LOGIKA REAL CASH FLOW
    // Net Cash = Uang yang dipegang tangan saat ini
    const netCash = grossIncome - realOpsCost;

    // KECERDASAN FINANSIAL:
    // 1. Maintenance Fund (Tabungan Wajib): 10% dari Gross.
    //    Alasannya: Mesin menyusut berdasarkan pemakaian, bukan berdasarkan profit bersih.
    //    Driver profesional harus menyisihkan ini di awal.
    const maintenanceFund = Math.round(grossIncome * 0.10);

    // 2. Kitchen Fund (Dana Dapur):
    //    Ini adalah uang yang BENAR-BENAR bersih dan boleh dibelanjakan untuk keluarga.
    //    Rumusnya: Net Cash (Uang di tangan) - Tabungan Wajib.
    const kitchen = netCash - maintenanceFund;

    return {
        date: todayStr,
        grossIncome,
        operationalCost: realOpsCost,
        netCash,
        maintenanceFund,
        kitchen, // Bisa negatif jika operational cost tinggi!
        target: settings.targetRevenue
    };
}

// ==========================================
// FITUR PERISAI DRIVER (Garage & SOS)
// ==========================================

export const getGarageData = (): GarageData => {
    try {
        const stored = localStorage.getItem(GARAGE_KEY);
        if (stored) return JSON.parse(stored);
        return {
            emergencyContact: '',
            currentOdometer: 0,
            lastOilChangeKm: 0,
            serviceInterval: 2000, // Default 2000km
            lastTireChangeDate: '',
            stnkExpiryDate: '',
            simExpiryDate: ''
        };
    } catch (e) {
        return {
             emergencyContact: '',
             currentOdometer: 0,
             lastOilChangeKm: 0,
             serviceInterval: 2000,
             lastTireChangeDate: '',
             stnkExpiryDate: '',
             simExpiryDate: ''
        };
    }
}

export const saveGarageData = (data: GarageData): void => {
    localStorage.setItem(GARAGE_KEY, JSON.stringify(data));
}

// ==========================================
// BACKUP & RESTORE UTILS
// ==========================================
export const createBackupString = (): string => {
    const backup = {
        hotspots: getHotspots(),
        transactions: getTransactions(),
        garage: getGarageData(),
        settings: getUserSettings(),
        shift: getShiftState(),
        version: "1.0",
        timestamp: new Date().toISOString()
    };
    return JSON.stringify(backup);
}

export const restoreFromBackup = (jsonString: string): boolean => {
    try {
        const data = JSON.parse(jsonString);
        if (data.hotspots) localStorage.setItem(STORAGE_KEY, JSON.stringify(data.hotspots));
        if (data.transactions) localStorage.setItem(FINANCE_KEY, JSON.stringify(data.transactions));
        if (data.garage) localStorage.setItem(GARAGE_KEY, JSON.stringify(data.garage));
        if (data.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
        return true;
    } catch (e) {
        console.error("Restore failed", e);
        return false;
    }
}