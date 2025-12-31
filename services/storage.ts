
import { Hotspot, Transaction, DailyFinancial, GarageData, UserSettings, ShiftState } from '../types';
import { INITIAL_DATA } from '../constants';
import { getLocalDateString, calculateDistance, getTimeDifference } from '../utils';

const STORAGE_KEY = 'ikhtiar_ku_data_v1';
const SHIFT_STATE_KEY = 'ikhtiar_ku_shift_state_v2'; 
const FINANCE_KEY = 'ikhtiar_ku_finance_v1';
const SETTINGS_KEY = 'ikhtiar_ku_settings_v1';
const GARAGE_KEY = 'ikhtiar_ku_garage_v1';

// --- UTILITY: SAFE JSON PARSER (ANTI CRASH) ---
const safeParse = <T>(jsonString: string | null, fallback: T): T => {
    if (!jsonString) return fallback;
    try {
        return JSON.parse(jsonString) as T;
    } catch (e) {
        console.warn("Data corruption detected. Resetting to fallback.", e);
        return fallback;
    }
};

const safeSetItem = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            runDataHousekeeping(true); // Emergency cleanup
            try {
                localStorage.setItem(key, value);
            } catch (retryError) {
                // Fail silently in prod, critical error log only
            }
        }
    }
};

export const runDataHousekeeping = (forceAggressive: boolean = false): void => {
    try {
        const now = new Date();
        const txRetentionDays = forceAggressive ? 3 : 14; 
        const hotspotRetentionDays = forceAggressive ? 14 : 30; // Simpan history hotspot lebih lama (30 hari)

        const limitDateTx = new Date(now.setDate(now.getDate() - txRetentionDays)).getTime();
        const limitDateSpot = new Date(now.setDate(now.getDate() - hotspotRetentionDays)).getTime();
        
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

        if (currentTxs.length !== validTxs.length) {
            localStorage.setItem(FINANCE_KEY, JSON.stringify(validTxs));
        }

        // 2. CLEAN HOTSPOTS
        const currentHotspots = getHotspots();
        const validHotspots = currentHotspots.filter(h => {
            if (!h.isUserEntry || h.isDaily) return true; // Always keep seed/daily data
            const entryDate = new Date(h.date).getTime();
            if (isNaN(entryDate)) return false;
            if (entryDate > futureLimitTime) return false;
            if (entryDate < limitDateSpot) return false;
            return true;
        });

        if (currentHotspots.length !== validHotspots.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(validHotspots));
        }
    } catch (e) {
        // Ignore errors during cleanup
    }
};

export const performFactoryReset = () => {
    localStorage.clear();
    window.location.reload();
}

export const getHotspots = (): Hotspot[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        safeSetItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
        return INITIAL_DATA;
    }
    
    const parsed = safeParse<Hotspot[]>(stored, INITIAL_DATA);
    // Data Migration/Sanitizer on the fly
    return parsed.map((h: any) => ({
        ...h,
        isDaily: h.isDaily ?? false,
        visitCount: h.visitCount ?? (h.isUserEntry ? 1 : 0), // Init visitCount
        baseScore: h.baseScore ?? (h.isUserEntry ? 100 : 50)
    }));
};

// NEW: SMART MERGING LOGIC
// Jika ada hotspot user lain dalam radius 100m di jam yang sama (+- 1 jam), jangan buat baru.
// Update yang lama: Tambah Score & VisitCount.
export const mergeOrAddHotspot = (newSpot: Hotspot): void => {
    const current = getHotspots();
    
    if (!newSpot.isUserEntry) {
        addHotspot(newSpot);
        return;
    }

    const nearbyIndex = current.findIndex(h => {
        if (!h.isUserEntry) return false;
        const dist = calculateDistance(h.lat, h.lng, newSpot.lat, newSpot.lng);
        const timeDiff = getTimeDifference(h.predicted_hour, newSpot.predicted_hour);
        return dist < 0.1 && timeDiff <= 60; // < 100 meter & < 1 jam beda
    });

    if (nearbyIndex !== -1) {
        // MERGE / UPDATE EXISTING
        const existing = current[nearbyIndex];
        const newCount = (existing.visitCount || 1) + 1;
        const newScore = Math.min((existing.baseScore || 100) + 20, 300); // Cap max score 300
        
        const updatedSpot: Hotspot = {
            ...existing,
            date: newSpot.date, // Update last visited date
            visitCount: newCount,
            baseScore: newScore,
            notes: `${newCount}x Riwayat Gacor disini. (Update: ${getLocalDateString()})`
        };
        
        current[nearbyIndex] = updatedSpot;
        safeSetItem(STORAGE_KEY, JSON.stringify(current));
    } else {
        // ADD NEW
        newSpot.visitCount = 1;
        safeSetItem(STORAGE_KEY, JSON.stringify([newSpot, ...current]));
    }
};

export const addHotspot = (hotspot: Hotspot): void => {
    const current = getHotspots();
    safeSetItem(STORAGE_KEY, JSON.stringify([hotspot, ...current]));
};

export const deleteHotspot = (id: string): void => {
    const current = getHotspots();
    safeSetItem(STORAGE_KEY, JSON.stringify(current.filter(h => h.id !== id)));
};

export const toggleValidation = (id: string, isAccurate: boolean): void => {
    const current = getHotspots();
    const updated = current.map(h => {
        if (h.id === id) {
            const today = getLocalDateString();
            const validations = h.validations || [];
            // Remove existing validation for today if any, then add new one
            const filtered = validations.filter(v => v.date !== today);
            return {
                ...h,
                validations: [...filtered, { date: today, isAccurate }]
            };
        }
        return h;
    });
    safeSetItem(STORAGE_KEY, JSON.stringify(updated));
};

export const getShiftState = (): ShiftState | null => {
    const parsed = safeParse<ShiftState | null>(localStorage.getItem(SHIFT_STATE_KEY), null);
    if (!parsed) return null;

    if (parsed.date !== getLocalDateString()) {
        localStorage.removeItem(SHIFT_STATE_KEY);
        return null;
    }
    return parsed;
};

export const saveShiftState = (state: ShiftState): void => {
    safeSetItem(SHIFT_STATE_KEY, JSON.stringify(state));
};

export const clearShiftState = (): void => {
    localStorage.removeItem(SHIFT_STATE_KEY);
};

export const getUserSettings = (): UserSettings => {
    const defaultSettings: UserSettings = {
        targetRevenue: 150000,
        preferences: { showFood: true, showBike: true, showSend: true, showShop: true },
        autoRainMode: false
    };
    return safeParse<UserSettings>(localStorage.getItem(SETTINGS_KEY), defaultSettings);
};

export const saveUserSettings = (settings: UserSettings): void => {
    safeSetItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const getTransactions = (): Transaction[] => {
    return safeParse<Transaction[]>(localStorage.getItem(FINANCE_KEY), []);
};

export const addTransaction = (tx: Transaction): void => {
    const current = getTransactions();
    safeSetItem(FINANCE_KEY, JSON.stringify([tx, ...current]));
    
    // Auto-update Odometer logic (jika ada input manual jarak)
    if (tx.distanceKm && tx.distanceKm > 0) {
        incrementOdometer(tx.distanceKm);
    }
};

export const updateTransaction = (updatedTx: Transaction): void => {
    const current = getTransactions();
    const updated = current.map(tx => tx.id === updatedTx.id ? updatedTx : tx);
    safeSetItem(FINANCE_KEY, JSON.stringify(updated));
};

export const deleteTransaction = (id: string): void => {
    const current = getTransactions();
    safeSetItem(FINANCE_KEY, JSON.stringify(current.filter(tx => String(tx.id) !== String(id))));
};

export const getTodayFinancials = (): DailyFinancial => {
    const todayStr = getLocalDateString();
    const txs = getTransactions().filter(t => t.date === todayStr);
    const settings = getUserSettings();
    const shift = getShiftState();
    const startCash = shift ? shift.startCash : 0;
    
    let grossIncome = 0;
    let cashIncome = 0;
    let nonCashIncome = 0;
    let realOpsCost = 0; 

    txs.forEach(t => {
        if (t.type === 'income') {
            grossIncome += t.amount;
            if (t.isCash !== false) cashIncome += t.amount;
            else nonCashIncome += t.amount;
        } else if (t.type === 'expense') {
            if (t.isCash !== false) realOpsCost += t.amount;
        }
    });

    const netCash = startCash + cashIncome - realOpsCost;
    const maintenanceFund = Math.round(grossIncome * 0.10);
    const kitchen = netCash - maintenanceFund - startCash;
    
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
};

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
    const parsed = safeParse<GarageData>(localStorage.getItem(GARAGE_KEY), defaultData);
    return { ...defaultData, ...parsed }; // Merge to ensure new fields exists
};

export const saveGarageData = (data: GarageData): void => {
    safeSetItem(GARAGE_KEY, JSON.stringify(data));
};

// NEW: Helper untuk menambah KM secara otomatis
export const incrementOdometer = (distanceKm: number): void => {
    if (distanceKm <= 0) return;
    const garage = getGarageData();
    garage.currentOdometer = (garage.currentOdometer || 0) + distanceKm;
    saveGarageData(garage);
};

export const createBackupString = (): string => {
    const backup = {
        hotspots: getHotspots(),
        transactions: getTransactions(),
        garage: getGarageData(),
        settings: getUserSettings(),
        shift: getShiftState(),
        version: "2.0",
        timestamp: new Date().toISOString()
    };
    return JSON.stringify(backup);
};

export const restoreFromBackup = (jsonString: string): boolean => {
    try {
        const data = JSON.parse(jsonString);
        if (data.hotspots) safeSetItem(STORAGE_KEY, JSON.stringify(data.hotspots));
        if (data.transactions) safeSetItem(FINANCE_KEY, JSON.stringify(data.transactions));
        if (data.garage) safeSetItem(GARAGE_KEY, JSON.stringify(data.garage));
        if (data.settings) safeSetItem(SETTINGS_KEY, JSON.stringify(data.settings));
        return true;
    } catch (e) {
        return false;
    }
};
