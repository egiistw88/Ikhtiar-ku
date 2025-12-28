
import { Hotspot, Transaction, DailyFinancial, GarageData, UserSettings, ShiftState } from '../types';
import { INITIAL_DATA } from '../constants';
import { getLocalDateString } from '../utils';

const STORAGE_KEY = 'ikhtiar_ku_data_v1';
const SHIFT_STATE_KEY = 'ikhtiar_ku_shift_state_v2'; 
const FINANCE_KEY = 'ikhtiar_ku_finance_v1';
const SETTINGS_KEY = 'ikhtiar_ku_settings_v1';
const GARAGE_KEY = 'ikhtiar_ku_garage_v1';

// Wrapper untuk menangani QuotaExceededError jika HP kentang / memori penuh
const safeSetItem = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.warn("Storage Penuh! Menjalankan Emergency Cleanup...");
            runDataHousekeeping(true); 
            try {
                localStorage.setItem(key, value);
            } catch (retryError) {
                console.error("Critical Storage Failure: Data tidak tersimpan.", retryError);
            }
        } else {
            console.error("Storage Error:", e);
        }
    }
};

// OPTIMASI RADIKAL: Driver butuh kecepatan. History terlalu lama bikin HP lemot.
// Default Retention diperpendek: Transaksi 7 Hari, Hotspot 14 Hari.
export const runDataHousekeeping = (forceAggressive: boolean = false): { cleanedHotspots: number, cleanedTxs: number, status: string } => {
    try {
        const now = new Date();
        // Aggressive by default for field performance
        const txRetentionDays = forceAggressive ? 3 : 7; 
        const hotspotRetentionDays = forceAggressive ? 7 : 14;

        const limitDateTx = new Date(now.setDate(now.getDate() - txRetentionDays)).getTime();
        const limitDateSpot = new Date(now.setDate(now.getDate() - hotspotRetentionDays)).getTime();
        
        // Hapus juga data masa depan yang aneh (tanggal hp ngaco)
        const futureLimit = new Date();
        futureLimit.setDate(futureLimit.getDate() + 1); 
        const futureLimitTime = futureLimit.getTime();

        // 1. CLEAN TRANSACTIONS
        const currentTxs = getTransactions();
        const validTxs = currentTxs.filter(tx => {
            if (!tx.timestamp) return false; 
            if (tx.timestamp > futureLimitTime) return false; 
            if (tx.timestamp < limitDateTx) return false; 
            return true;
        });
        const removedTxsCount = currentTxs.length - validTxs.length;

        if (removedTxsCount > 0) {
            localStorage.setItem(FINANCE_KEY, JSON.stringify(validTxs));
        }

        // 2. CLEAN HOTSPOTS
        const currentHotspots = getHotspots();
        const validHotspots = currentHotspots.filter(h => {
            // Keep Seed Data / Recurring Data FOREVER
            if (!h.isUserEntry || h.isDaily) return true;

            const entryDate = new Date(h.date).getTime();
            if (isNaN(entryDate)) return false;
            if (entryDate > futureLimitTime) return false;
            if (entryDate < limitDateSpot) return false;

            return true;
        });

        const removedHotspotsCount = currentHotspots.length - validHotspots.length;
        if (removedHotspotsCount > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(validHotspots));
        }

        return { 
            cleanedHotspots: removedHotspotsCount, 
            cleanedTxs: removedTxsCount,
            status: 'SUCCESS'
        };

    } catch (e) {
        return { cleanedHotspots: 0, cleanedTxs: 0, status: 'ERROR' };
    }
};

export const performFactoryReset = () => {
    localStorage.clear();
    window.location.reload();
}

export const getHotspots = (): Hotspot[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // DATA SANITIZER / MIGRATION
        // Memastikan data lama kompatibel dengan logika baru (isDaily, baseScore)
        return parsed.map((h: any) => ({
            ...h,
            // Defaulting new fields if missing
            isDaily: h.isDaily !== undefined ? h.isDaily : false,
            baseScore: h.baseScore !== undefined ? h.baseScore : (h.isUserEntry ? 100 : 50)
        }));
      }
    }
    // Jika kosong, muat seed data baru
    safeSetItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
    return INITIAL_DATA;
  } catch (error) {
    console.error("Storage error", error);
    return INITIAL_DATA;
  }
};

export const addHotspot = (hotspot: Hotspot): void => {
  try {
    const current = getHotspots();
    const updated = [hotspot, ...current]; 
    safeSetItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save hotspot", error);
  }
};

export const deleteHotspot = (id: string): void => {
    try {
        const current = getHotspots();
        const updated = current.filter(h => h.id !== id);
        safeSetItem(STORAGE_KEY, JSON.stringify(updated));
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
                const filtered = validations.filter(v => v.date !== today);
                return {
                    ...h,
                    validations: [...filtered, { date: today, isAccurate }]
                };
            }
            return h;
        });
        safeSetItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error("Failed to update validation", error);
    }
}

export const getShiftState = (): ShiftState | null => {
    const stored = localStorage.getItem(SHIFT_STATE_KEY);
    if (!stored) return null;
    
    try {
        const parsed: ShiftState = JSON.parse(stored);
        const today = getLocalDateString();

        if (parsed.date !== today) {
            localStorage.removeItem(SHIFT_STATE_KEY);
            return null;
        }
        
        return parsed;
    } catch (e) {
        localStorage.removeItem(SHIFT_STATE_KEY);
        return null;
    }
}

export const saveShiftState = (state: ShiftState): void => {
    safeSetItem(SHIFT_STATE_KEY, JSON.stringify(state));
}

export const clearShiftState = (): void => {
    localStorage.removeItem(SHIFT_STATE_KEY);
}

export const getUserSettings = (): UserSettings => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
    
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
    safeSetItem(SETTINGS_KEY, JSON.stringify(settings));
}

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
    safeSetItem(FINANCE_KEY, JSON.stringify(updated));

    if (tx.distanceKm && tx.distanceKm > 0) {
        const garage = getGarageData();
        garage.currentOdometer = (garage.currentOdometer || 0) + tx.distanceKm;
        saveGarageData(garage);
    }
}

export const updateTransaction = (updatedTx: Transaction): void => {
    const current = getTransactions();
    const updated = current.map(tx => tx.id === updatedTx.id ? updatedTx : tx);
    safeSetItem(FINANCE_KEY, JSON.stringify(updated));
}

export const deleteTransaction = (id: string): void => {
    const current = getTransactions();
    const updated = current.filter(tx => String(tx.id) !== String(id));
    safeSetItem(FINANCE_KEY, JSON.stringify(updated));
}

export const getTodayFinancials = (): DailyFinancial => {
    const todayStr = getLocalDateString();
    const txs = getTransactions().filter(t => t.date === todayStr);
    const settings = getUserSettings();
    const shift = getShiftState();
    const startCash = shift ? shift.startCash : 0;
    
    let grossIncome = 0;
    let cashIncome = 0;
    let nonCashIncome = 0;
    let realOpsCost = 0; // Only Cash Expenses affect Net Cash

    txs.forEach(t => {
        if (t.type === 'income') {
            grossIncome += t.amount;
            // Default to Cash if undefined (backward compatibility)
            if (t.isCash !== false) {
                cashIncome += t.amount;
            } else {
                nonCashIncome += t.amount;
            }
        } else if (t.type === 'expense') {
            // Assume expenses marked as Cash reduce Wallet
            // If isCash is false (e.g. Pulsa via Bank), it doesn't reduce Wallet Cash
            if (t.isCash !== false) {
                realOpsCost += t.amount;
            }
        }
    });

    // Uang di Tangan = Modal Awal + Pendapatan Tunai - Pengeluaran Tunai
    const netCash = startCash + cashIncome - realOpsCost;
    
    // Dana Maintenance tetap dihitung dari Gross (Semua pendapatan)
    const maintenanceFund = Math.round(grossIncome * 0.10);
    
    // Uang Dapur = Sisa Uang di Tangan - Dana Maintenance
    // Kalau non-tunai banyak, Uang Dapur mungkin "virtual" (ada di saldo), tapi ini hitungan aman cash.
    // Kita set kitchen berdasarkan NetCash real agar driver tidak boncos ambil cash.
    let kitchen = netCash - maintenanceFund - startCash;
    
    return {
        date: todayStr,
        grossIncome,
        cashIncome,
        nonCashIncome,
        operationalCost: realOpsCost,
        netCash, 
        maintenanceFund,
        kitchen, 
        target: settings.targetRevenue
    };
}

export const getGarageData = (): GarageData => {
    const defaultData: GarageData = {
        bikeName: 'Kuda Besi',
        plateNumber: '',
        emergencyContact: '',
        currentOdometer: 0,
        lastOilChangeKm: 0,
        serviceInterval: 2000, 
        lastTireChangeKm: 0,
        tireInterval: 12000,
        lastPartChangeKm: 0,
        partInterval: 20000,
        stnkExpiryDate: '',
        simExpiryDate: ''
    };

    try {
        const stored = localStorage.getItem(GARAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge dengan default untuk properti baru yang mungkin belum ada di user lama
            return { ...defaultData, ...parsed };
        }
        return defaultData;
    } catch (e) {
        return defaultData;
    }
}

export const saveGarageData = (data: GarageData): void => {
    safeSetItem(GARAGE_KEY, JSON.stringify(data));
}

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
        if (data.hotspots) safeSetItem(STORAGE_KEY, JSON.stringify(data.hotspots));
        if (data.transactions) safeSetItem(FINANCE_KEY, JSON.stringify(data.transactions));
        if (data.garage) safeSetItem(GARAGE_KEY, JSON.stringify(data.garage));
        if (data.settings) safeSetItem(SETTINGS_KEY, JSON.stringify(data.settings));
        return true;
    } catch (e) {
        console.error("Restore failed", e);
        return false;
    }
}
