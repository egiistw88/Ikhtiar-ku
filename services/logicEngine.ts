
import { Hotspot, ShiftState, DailyFinancial, Transaction, EngineOutput, ScoredHotspot, UserSettings, GarageData, SystemAlert } from '../types';
import { calculateDistance } from '../utils';

// Konfigurasi Pembobotan (Weighting Config)
const WEIGHTS = {
    DISTANCE_PENALTY_FEEDER: 80, // Feeder benci jarak jauh
    DISTANCE_PENALTY_SNIPER: 30, // Sniper toleransi jarak jauh
    TIME_DECAY: 15, // Seberapa cepat skor turun setelah jam lewat
    STRATEGY_BONUS: 500,
    USER_ENTRY_BONUS: 300,
    DAILY_BONUS: 100
};

// Helper: Hitung selisih menit
const getMinuteDiff = (targetTime: string, now: Date): number => {
    const [h, m] = targetTime.split(':').map(Number);
    const targetMinutes = h * 60 + m;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Handle midnight crossing (23:00 vs 01:00)
    let diff = currentMinutes - targetMinutes;
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    
    return diff; // Negatif = Belum terjadi, Positif = Sudah lewat
};

export const runLogicEngine = (
    hotspots: Hotspot[],
    userLoc: { lat: number, lng: number } | null,
    shift: ShiftState | null,
    financials: DailyFinancial | null,
    transactions: Transaction[],
    settings: UserSettings
): EngineOutput => {
    
    const now = new Date();
    const strategy = shift?.strategy || 'FEEDER';
    
    // 1. HOTSPOT SCORING ALGORITHM
    const scoredHotspots: ScoredHotspot[] = hotspots.map(h => {
        let score = h.baseScore ? (h.baseScore * 10) : 500;
        let reasons: string[] = [];
        let distance = 0;
        let strategyMatch = false;

        // A. Distance Logic
        if (userLoc) {
            distance = calculateDistance(userLoc.lat, userLoc.lng, h.lat, h.lng);
            
            // Sniper toleransi jarak 5km, Feeder cuma 2km
            const penaltyRate = strategy === 'SNIPER' ? WEIGHTS.DISTANCE_PENALTY_SNIPER : WEIGHTS.DISTANCE_PENALTY_FEEDER;
            const distPenalty = Math.pow(distance, 1.2) * penaltyRate; 
            score -= distPenalty;

            if (distance < 0.5) reasons.push("Di Lokasi");
            else if (distance < 2) reasons.push("Dekat");
        }

        // B. Time Logic (Real-time Decay)
        const minuteDiff = getMinuteDiff(h.predicted_hour, now);
        
        // Kurva Bell: Memuncak 15 menit sebelum jam prediksi, menurun drastis setelah 60 menit lewat
        if (minuteDiff >= -30 && minuteDiff <= 15) {
            score += 600; // Peak Time
            reasons.push("🔥 Sedang Panas");
        } else if (minuteDiff > 15 && minuteDiff <= 60) {
            score += 300 - (minuteDiff * 2); // Cooling down
            reasons.push("Sisa Orderan");
        } else if (minuteDiff < -30 && minuteDiff >= -90) {
            score += 200; // Warming up
            reasons.push("Siap-siap");
        } else {
            score -= 500; // Irrelevant time
        }

        // C. Strategy Matching
        if (strategy === 'SNIPER') {
            if (['Transport Hub', 'Mall/Lifestyle', 'Culinary Night', 'Logistics'].includes(h.category)) {
                score += WEIGHTS.STRATEGY_BONUS;
                strategyMatch = true;
                reasons.unshift("Target Kakap");
            }
            if (['School', 'Residential'].includes(h.category)) {
                score -= 1000; // Noise reduction for Sniper
            }
        } else {
            // Feeder
            if (['Residential', 'School', 'Education', 'Residential/Shop'].includes(h.category)) {
                score += WEIGHTS.STRATEGY_BONUS;
                strategyMatch = true;
                reasons.unshift("Fast Track");
            }
        }

        // D. Day Matching
        const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][now.getDay()];
        if (h.day === dayName || h.isDaily) {
            score += WEIGHTS.DAILY_BONUS;
        } else {
            score = -9999; // Wrong day
        }

        // Priority Leveling
        let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
        if (score > 1000) priority = 'HIGH';
        else if (score > 500) priority = 'MEDIUM';

        return {
            ...h,
            distance,
            score: Math.round(score),
            matchReason: reasons[0] || "Valid",
            priorityLevel: priority,
            strategyMatch
        };
    }).filter(h => h.score > 0).sort((a, b) => b.score - a.score);


    // 2. MOMENTUM CALCULATOR (The Heartbeat)
    const recentTx = transactions.filter(t => (now.getTime() - t.timestamp) < (2 * 60 * 60 * 1000)); // Last 2 hours
    let momScore = 0;
    
    if (strategy === 'SNIPER') {
        // Sniper: Quality over Quantity
        const bigOrders = recentTx.filter(t => t.amount >= 25000).length;
        const smallOrders = recentTx.filter(t => t.amount < 25000).length;
        momScore = (bigOrders * 40) + (smallOrders * 10);
    } else {
        // Feeder: Quantity is King
        momScore = recentTx.length * 25;
    }

    // Decay momentum based on idle time (since last transaction)
    if (recentTx.length > 0) {
        const lastTxTime = recentTx[0].timestamp;
        const idleMinutes = (now.getTime() - lastTxTime) / 60000;
        if (idleMinutes > 30) momScore -= (idleMinutes * 0.5); // Lose momentum if idle
    }

    momScore = Math.max(0, Math.min(100, momScore));
    
    let momLabel = 'DINGIN';
    let momAdvice = '';
    
    if (momScore >= 75) {
        momLabel = 'GACOR 🔥';
        momAdvice = "Server lagi sayang sama akun lu. JANGAN BERHENTI! Sikat terus sampai target tembus.";
    } else if (momScore >= 40) {
        momLabel = 'HANGAT ☕';
        momAdvice = "Ritme sudah dapet. Jaga konsistensi, jangan terlalu lama ngetem/istirahat.";
    } else {
        momLabel = 'DINGIN ❄️';
        momAdvice = strategy === 'SNIPER' 
            ? "Sniper butuh kesabaran. Tunggu satu tarikan besar untuk memecah es."
            : "Akun beku? Cocol manual orderan pendek (pancingan) buat manasin mesin server.";
    }

    // 3. FINANCIAL AWARENESS LOGIC
    // Menentukan prioritas tindakan berdasarkan kondisi dompet
    let finPriority: 'TOPUP_SALDO' | 'CARI_TUNAI' | 'AMAN' = 'AMAN';
    let finMessage = '';
    const startBalance = shift?.startBalance || 0;
    const currentBalance = startBalance + (financials?.nonCashIncome || 0); // Simplifikasi saldo (belum dikurangi potongan app, but good enough for estimation)

    // Ambang batas saldo minimal (Topup jika dibawah ini)
    const MIN_BALANCE = strategy === 'SNIPER' ? 30000 : 15000;
    
    if (currentBalance < MIN_BALANCE) {
        finPriority = 'TOPUP_SALDO';
        finMessage = 'Saldo kritis! Segera Top Up agar akun tidak gagu.';
    } else if ((financials?.netCash || 0) < 20000) {
        finPriority = 'CARI_TUNAI';
        finMessage = 'Uang pegangan menipis. Prioritaskan orderan Food/Mart (Tunai).';
    }

    // 4. TACTICAL ADVICE (The Coach)
    // Cek apakah driver "Stagnan" di lokasi yang salah
    let tactical: EngineOutput['tacticalAdvice'] = {
        title: 'STANDBY',
        message: 'Menunggu sinyal GPS...',
        action: 'Pastikan GPS Aktif',
        type: 'INFO'
    };

    // Override Advice based on Financial Emergency
    if (finPriority === 'TOPUP_SALDO') {
        tactical = {
            title: 'DARURAT SALDO',
            message: 'Saldo Anda di bawah batas aman.',
            action: 'Cari Alfamart/ATM terdekat, Top Up dulu baru nge-bid lagi.',
            type: 'URGENT'
        };
    } else if (scoredHotspots.length > 0) {
        const topSpot = scoredHotspots[0];
        
        // Jika top spot dekat (< 500m) tapi skor tinggi
        if (topSpot.distance < 0.5) {
            tactical = {
                title: 'POSISI IDEAL',
                message: `Anda di zona ${topSpot.origin}.`,
                action: 'Matikan mesin, hemat bensin, tunggu orderan masuk.',
                type: 'SUCCESS'
            };
        } 
        // Jika top spot jauh (> 2km) dan skor sangat tinggi
        else if (topSpot.score > 1200) {
            tactical = {
                title: 'PELUANG TERDETEKSI',
                message: `${topSpot.origin} sedang memanas (${topSpot.distance}km).`,
                action: `Geser sekarang ke arah ${topSpot.zone}. Potensi ${topSpot.matchReason}.`,
                type: 'URGENT'
            };
        }
        else {
             tactical = {
                title: 'JELAJAH',
                message: 'Area sekitar mulai mendingin.',
                action: 'Coba bergerak perlahan ke arah pusat keramaian terdekat.',
                type: 'INFO'
            };
        }
    } else {
        // Zona Anyep Logic
         tactical = {
            title: 'ZONA ANYEP',
            message: 'Tidak ada sinyal kuat di radius dekat.',
            action: strategy === 'SNIPER' ? 'Geser ke Stasiun/Mall besar.' : 'Geser ke Perumahan padat penduduk.',
            type: 'URGENT'
        };
    }

    // 5. GOLDEN TIME CHECKER
    const hour = now.getHours();
    let gtActive = false;
    let gtLabel = 'JAM NORMAL';

    if (strategy === 'SNIPER') {
        if (hour >= 22 || hour < 4) { gtActive = true; gtLabel = 'GOLDEN TIME: NGALONG'; }
        else if (hour >= 17 && hour < 22) { gtActive = false; gtLabel = 'WARMING UP'; }
    } else {
        if ((hour >= 6 && hour < 9) || (hour >= 11 && hour < 13) || (hour >= 16 && hour < 19)) {
            gtActive = true;
            gtLabel = 'GOLDEN TIME: RUSH HOUR';
        }
    }


    return {
        scoredHotspots,
        momentum: { score: momScore, label: momLabel, advice: momAdvice },
        tacticalAdvice: tactical,
        goldenTime: { isActive: gtActive, label: gtLabel },
        financialAdvice: { priority: finPriority, message: finMessage }
    };
};

// --- NEW SYSTEM: HEALTH CHECK & ALERT GENERATOR ---
export const evaluateSystemHealth = (
    financials: DailyFinancial | null,
    garage: GarageData,
    shift: ShiftState | null
): SystemAlert[] => {
    const alerts: SystemAlert[] = [];
    const now = Date.now();

    // 1. FINANCIAL ALERTS
    if (financials) {
        const progress = (financials.grossIncome / financials.target) * 100;
        if (progress >= 100) {
            alerts.push({ id: 'target_hit', priority: 'HIGH', title: 'TARGET TEMBUS! 🎉', message: 'Alhamdulillah target harian tercapai. Sisa waktu adalah bonus!', category: 'FINANCE', timestamp: now });
        } else if (progress >= 50) {
            alerts.push({ id: 'target_half', priority: 'LOW', title: 'Separuh Jalan', message: 'Target 50% tercapai. Jaga ritme, istirahat sejenak boleh.', category: 'FINANCE', timestamp: now });
        }
    }

    // 2. MAINTENANCE ALERTS
    if (garage) {
        const kmSinceOil = garage.currentOdometer - garage.lastOilChangeKm;
        const oilLeft = garage.serviceInterval - kmSinceOil;
        
        if (oilLeft <= 0) {
            alerts.push({ id: 'oil_crit', priority: 'HIGH', title: 'BAHAYA MESIN! ⚠️', message: `Oli sudah lewat ${Math.abs(oilLeft)} km. Segera ganti sebelum turun mesin!`, category: 'MAINTENANCE', timestamp: now });
        } else if (oilLeft < 200) {
            alerts.push({ id: 'oil_warn', priority: 'MEDIUM', title: 'Siapkan Oli', message: `Jatah oli tinggal ${oilLeft} km lagi. Sisihkan uang hari ini.`, category: 'MAINTENANCE', timestamp: now });
        }
        
        // Ban Alert
        if (garage.lastTireChangeKm) {
             const kmSinceTire = garage.currentOdometer - garage.lastTireChangeKm;
             if (kmSinceTire > (garage.tireInterval || 12000)) {
                 alerts.push({ id: 'tire_warn', priority: 'MEDIUM', title: 'Cek Ban', message: 'Ban sudah menempuh jarak jauh. Cek ketipisan/botak.', category: 'MAINTENANCE', timestamp: now });
             }
        }
    }

    // 3. DRIVER HEALTH ALERTS (Smart Fatigue)
    // Logika Lama: Hanya cek shift.startTime -> Salah, karena driver bisa ngetem.
    // Logika Baru: Gunakan activeMinutes yang dihitung dari pergerakan GPS.
    if (shift && !shift.restData?.isActive) {
        // Asumsi: Jika activeMinutes > 4 jam (240 menit), wajib istirahat.
        const effectiveHours = (shift.activeMinutes || 0) / 60;
        
        if (effectiveHours > 4) {
             alerts.push({ id: 'rest_warn', priority: 'HIGH', title: 'AWAS MIKROSLEEP! 😴', message: 'Terdeteksi aktif bergerak >4 jam. Refleks menurun. Wajib minggir ngopi 15 menit!', category: 'HEALTH', timestamp: now });
        } else if (effectiveHours > 2.5) {
             alerts.push({ id: 'stretch_warn', priority: 'LOW', title: 'Peregangan', message: 'Sudah 2.5 jam di jalan. Luruskan pinggang sebentar saat nunggu orderan.', category: 'HEALTH', timestamp: now });
        }
    }

    return alerts;
};
