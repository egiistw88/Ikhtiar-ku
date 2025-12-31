
import { Hotspot, ShiftState, DailyFinancial, Transaction, EngineOutput, ScoredHotspot, UserSettings, GarageData, SystemAlert } from '../types';
import { calculateDistance } from '../utils';

// Konfigurasi Pembobotan (Weighting Config)
const WEIGHTS = {
    DISTANCE_PENALTY_FEEDER: 80, 
    DISTANCE_PENALTY_SNIPER: 30, 
    TIME_DECAY: 15, 
    STRATEGY_BONUS: 500,
    USER_ENTRY_BONUS: 800, // BOOST BESAR untuk riwayat user sendiri
    DAILY_BONUS: 100,
    RAIN_BOOST: 600, // Bonus besar untuk Food/Car saat hujan
    RAIN_PENALTY: 400 // Penalti untuk Bike saat hujan
};

// Helper: Hitung selisih menit
const getMinuteDiff = (targetTime: string, now: Date): number => {
    const [h, m] = targetTime.split(':').map(Number);
    const targetMinutes = h * 60 + m;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    let diff = currentMinutes - targetMinutes;
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    
    return diff; 
};

export const runLogicEngine = (
    hotspots: Hotspot[],
    userLoc: { lat: number, lng: number } | null,
    shift: ShiftState | null,
    financials: DailyFinancial | null,
    transactions: Transaction[],
    settings: UserSettings,
    isRainMode: boolean = false // NEW Parameter
): EngineOutput => {
    
    const now = new Date();
    const strategy = shift?.strategy || 'FEEDER';
    
    // --- 0. CONTEXTUAL AWARENESS (MEMBACA SITUASI) ---
    // Apakah sudah balik modal? (StartCash + Bensin + Makan tertutup?)
    const modalHarian = (shift?.startCash || 0) + 20000; // Asumsi bensin/makan min 20rb
    const isBalikModal = (financials?.grossIncome || 0) >= modalHarian;
    const isTargetTembus = (financials?.grossIncome || 0) >= settings.targetRevenue;
    
    // --- 1. HOTSPOT SCORING ALGORITHM ---
    const scoredHotspots: ScoredHotspot[] = hotspots.map(h => {
        // Base score: User Entry (Pengalaman Pribadi) > Seed Data
        let score = h.baseScore ? (h.baseScore * 10) : 500;
        if (h.isUserEntry) {
            score += WEIGHTS.USER_ENTRY_BONUS;
            // Add bonus for visit frequency
            if (h.visitCount && h.visitCount > 1) {
                score += (h.visitCount * 100); // Semakin sering dikunjungi, semakin prioritas
            }
        }

        let reasons: string[] = [];
        let distance = 0;
        let strategyMatch = false;

        // A. Weather Logic (RAIN MODE)
        if (isRainMode) {
            const isFoodOrCar = ['Culinary', 'Culinary Night', 'Mall/Lifestyle', 'Residential/Shop', 'Logistics'].includes(h.category) || h.type.includes('Food') || h.type.includes('Send') || h.type.includes('Car');
            const isBike = h.type === 'Bike' || h.type === 'Ride';

            if (isFoodOrCar) {
                score += WEIGHTS.RAIN_BOOST;
                reasons.push("☔ Orderan Hujan");
            } else if (isBike) {
                score -= WEIGHTS.RAIN_PENALTY;
            }
        }

        // B. Distance Logic
        if (userLoc) {
            distance = calculateDistance(userLoc.lat, userLoc.lng, h.lat, h.lng);
            
            const penaltyRate = strategy === 'SNIPER' ? WEIGHTS.DISTANCE_PENALTY_SNIPER : WEIGHTS.DISTANCE_PENALTY_FEEDER;
            const distPenalty = Math.pow(distance, 1.2) * penaltyRate; 
            score -= distPenalty;

            if (distance < 0.2) reasons.push("🎯 Titik Spot Anda");
            else if (distance < 1.0) reasons.push("📍 Dekat Sekali");
        }

        // C. Time Logic (Real-time Decay)
        const minuteDiff = getMinuteDiff(h.predicted_hour, now);
        
        if (minuteDiff >= -30 && minuteDiff <= 15) {
            score += 600; 
            reasons.push("🔥 Sedang Panas");
        } else if (minuteDiff > 15 && minuteDiff <= 60) {
            score += 300 - (minuteDiff * 2); 
            reasons.push("Sisa Orderan");
        } else if (minuteDiff < -30 && minuteDiff >= -90) {
            score += 200; 
            reasons.push("Siap-siap");
        } else {
            score -= 500; 
        }

        // D. Strategy & Category Matching
        const isSniperSpot = ['Transport Hub', 'Mall/Lifestyle', 'Culinary Night', 'Logistics'].includes(h.category);
        const isFeederSpot = ['Residential', 'School', 'Education', 'Residential/Shop', 'Service'].includes(h.category);

        if (strategy === 'SNIPER') {
            if (isSniperSpot) { score += WEIGHTS.STRATEGY_BONUS; strategyMatch = true; reasons.unshift("Target Kakap"); }
            if (['School'].includes(h.category)) score -= 1000; // Sniper anti jemput anak sekolah (macet & murah)
        } else {
            if (isFeederSpot) { score += WEIGHTS.STRATEGY_BONUS; strategyMatch = true; reasons.unshift("Fast Track"); }
        }

        // E. Day Matching
        const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][now.getDay()];
        if (h.day === dayName || h.isDaily) {
            score += WEIGHTS.DAILY_BONUS;
        } else {
            score = -9999; // Salah hari
        }

        // Priority Leveling
        let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
        if (score > 1200) priority = 'HIGH';
        else if (score > 600) priority = 'MEDIUM';

        return {
            ...h,
            distance,
            score: Math.round(score),
            matchReason: reasons[0] || "Valid",
            priorityLevel: priority,
            strategyMatch
        };
    }).filter(h => h.score > 0).sort((a, b) => b.score - a.score);


    // --- 2. MOMENTUM & PERSONA ENGINE (THE "SUHU" VOICE) ---
    const recentTx = transactions.filter(t => (now.getTime() - t.timestamp) < (2 * 60 * 60 * 1000)); 
    let momScore = 0;
    
    if (strategy === 'SNIPER') {
        const bigOrders = recentTx.filter(t => t.amount >= 25000).length;
        const smallOrders = recentTx.filter(t => t.amount < 25000).length;
        momScore = (bigOrders * 40) + (smallOrders * 10);
    } else {
        momScore = recentTx.length * 25;
    }

    // Decay logic
    if (recentTx.length > 0) {
        const lastTxTime = recentTx[0].timestamp;
        const idleMinutes = (now.getTime() - lastTxTime) / 60000;
        if (idleMinutes > 30) momScore -= (idleMinutes * 0.5); 
    }

    momScore = Math.max(0, Math.min(100, momScore));
    
    let momLabel = 'DINGIN ❄️';
    let momAdvice = '';

    // LOGIKA PERCAKAPAN DINAMIS
    if (isRainMode) {
        momLabel = 'HUJAN CUAN ☔';
        momAdvice = "Hujan turun = Saingan berkurang! Matikan 'Bike', fokus Gofood/Gosend. Jaket dipakai, HP diamankan, sikat semua orderan masuk!";
    } else if (isTargetTembus) {
        momLabel = 'TUPO 🎉';
        momAdvice = "Target jebol Ndan! Sisa waktu ini adalah 'Uang Rokok'. Mau pulang santai atau gaspol cari bonus?";
    } else if (momScore >= 75) {
        momLabel = 'GACOR PARAH 🔥';
        momAdvice = "Server lagi 'jatuh cinta' sama akun lu. JANGAN MATIKAN APLIKASI! Hajar terus mumpung prioritas.";
    } else if (momScore >= 40) {
        momLabel = 'HANGAT ☕';
        momAdvice = isBalikModal 
            ? "Modal udah balik. Sekarang kita cari cuan bersih. Fokus orderan yang efisien aja."
            : "Ritme bagus. Dikit lagi balik modal. Jaga konsistensi, jangan ngetem di satu titik > 20 menit.";
    } else {
        // Kondisi Dingin/Anyep
        momLabel = 'DINGIN 🧊';
        if (strategy === 'SNIPER') {
            momAdvice = "Sniper itu soal mental. Sunyi itu wajar. Cek radar, geser ke Spot 'Target Kakap' terdekat. Jangan panik ambil receh.";
        } else {
            momAdvice = "Akun beku? Jangan diem! Geser minimal 500m atau ambil 1 orderan manual (pancingan) buat 'nyapa' server.";
        }
    }

    // --- 3. FINANCIAL AWARENESS ---
    let finPriority: 'TOPUP_SALDO' | 'CARI_TUNAI' | 'AMAN' = 'AMAN';
    let finMessage = '';
    const startBalance = shift?.startBalance || 0;
    const currentBalance = startBalance + (financials?.nonCashIncome || 0); 
    const minBal = strategy === 'SNIPER' ? 30000 : 15000;
    
    if (currentBalance < minBal) {
        finPriority = 'TOPUP_SALDO';
        finMessage = `Saldo ${currentBalance < 0 ? 'MINUS' : 'MEPET'}! Server bakal skip kasih orderan ke lu. Topup sekarang biar 'Gagu' hilang.`;
    } else if ((financials?.netCash || 0) < 15000) {
        finPriority = 'CARI_TUNAI';
        finMessage = 'Dompet fisik kosong. Prioritaskan Food/Mart tunai buat beli bensin/makan.';
    }

    // --- 4. TACTICAL ADVICE (THE COACH) ---
    let tactical: EngineOutput['tacticalAdvice'] = {
        title: 'STANDBY',
        message: 'Menunggu sinyal GPS...',
        action: 'Pastikan GPS Aktif',
        type: 'INFO'
    };

    if (finPriority === 'TOPUP_SALDO') {
        tactical = {
            title: 'DARURAT SALDO',
            message: 'Akun Anda dalam bahaya diskip server.',
            action: 'Cari Alfamart/ATM terdekat. Top Up adalah investasi nyawa saat ini.',
            type: 'URGENT'
        };
    } else if (scoredHotspots.length > 0) {
        const topSpot = scoredHotspots[0];
        const isUserFavorite = topSpot.isUserEntry;

        if (topSpot.distance < 0.3) {
            tactical = {
                title: 'POSISI STRATEGIS',
                message: isUserFavorite 
                    ? `Ini kandang macan Anda (${topSpot.origin}).` 
                    : `Anda di zona merah ${topSpot.origin}.`,
                action: 'Matikan mesin. Hemat energi. Pasang kuping, orderan masuk sebentar lagi.',
                type: 'SUCCESS'
            };
        } else if (topSpot.score > 1200) {
            tactical = {
                title: 'PELUANG EMAS',
                message: `${topSpot.origin} lagi 'bakar uang' (${topSpot.distance}km).`,
                action: `Geser ke ${topSpot.zone} sekarang! ${topSpot.matchReason} menanti.`,
                type: 'URGENT'
            };
        } else {
             tactical = {
                title: 'PATROLI',
                message: 'Area ini mulai mendingin.',
                action: 'Bergerak perlahan (20km/j) ke arah pusat keramaian. Jangan diem!',
                type: 'INFO'
            };
        }
    } else {
         tactical = {
            title: 'ZONA MATI',
            message: 'Radar kosong. Tidak ada data historis di sini.',
            action: 'Jangan buang waktu. Geser ke jalan protokol atau pusat perbelanjaan.',
            type: 'URGENT'
        };
    }

    // --- 5. GOLDEN TIME CHECKER ---
    const hour = now.getHours();
    let gtActive = false;
    let gtLabel = 'JAM NORMAL';

    if (strategy === 'SNIPER') {
        if (hour >= 21 || hour < 4) { gtActive = true; gtLabel = '🌙 GOLDEN TIME: NGALONG'; }
        else if (hour >= 17 && hour < 21) { gtActive = false; gtLabel = '🕓 WARMING UP'; }
    } else {
        if ((hour >= 6 && hour < 9) || (hour >= 11 && hour < 14) || (hour >= 16 && hour < 19)) {
            gtActive = true;
            gtLabel = '⚡ GOLDEN TIME: RUSH HOUR';
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

// --- SYSTEM ALERT (NOTIFICATION ENGINE) ---
export const evaluateSystemHealth = (
    financials: DailyFinancial | null,
    garage: GarageData,
    shift: ShiftState | null
): SystemAlert[] => {
    const alerts: SystemAlert[] = [];
    const now = Date.now();

    // 1. FINANCIAL MOTIVATION
    if (financials) {
        const progress = (financials.grossIncome / financials.target) * 100;
        if (progress >= 100) {
            alerts.push({ id: 'target_hit', priority: 'HIGH', title: 'TUPO! ALHAMDULILLAH 🎉', message: 'Target harian lunas! Pulang bangga atau lanjut cari bonus?', category: 'FINANCE', timestamp: now });
        } else if (progress >= 50 && progress < 60) {
            alerts.push({ id: 'target_half', priority: 'LOW', title: 'Separuh Jalan', message: 'Udah 50% Ndan. Istirahat rokok sebat dulu biar nggak stress.', category: 'FINANCE', timestamp: now });
        }
    }

    // 2. MAINTENANCE (Bahasa Bengkel)
    if (garage) {
        const kmSinceOil = garage.currentOdometer - garage.lastOilChangeKm;
        const oilLeft = garage.serviceInterval - kmSinceOil;
        
        if (oilLeft <= 0) {
            alerts.push({ id: 'oil_crit', priority: 'HIGH', title: 'MESIN MENJERIT! ⚠️', message: `Oli telat ${Math.abs(oilLeft)} km. Ganti SEKARANG atau siap-siap turun mesin!`, category: 'MAINTENANCE', timestamp: now });
        } else if (oilLeft < 150) {
            alerts.push({ id: 'oil_warn', priority: 'MEDIUM', title: 'Siapin Duit Oli', message: `Tinggal ${oilLeft} km lagi. Sisihkan 50rb hari ini buat ke bengkel besok.`, category: 'MAINTENANCE', timestamp: now });
        }
    }

    // 3. PHYSICAL (Smart Fatigue)
    if (shift && !shift.restData?.isActive) {
        const effectiveHours = (shift.activeMinutes || 0) / 60;
        if (effectiveHours > 4) {
             alerts.push({ id: 'rest_warn', priority: 'HIGH', title: 'BAHAYA MICROSLEEP 😴', message: 'Mata udah berat Ndan? Udah 4 jam non-stop. Minggir, ngopi 15 menit, cuci muka!', category: 'HEALTH', timestamp: now });
        }
    }

    return alerts;
};
