
import { GoogleGenAI } from "@google/genai";
import { Hotspot, DailyFinancial, ShiftState } from '../types';

const API_STORAGE_KEY = 'ikhtiar_ku_api_key';

const getAiClient = () => {
    let key = '';
    if (typeof localStorage !== 'undefined') {
        key = localStorage.getItem(API_STORAGE_KEY) || '';
    }
    if (!key) {
        key = process.env.API_KEY || '';
    }
    if (!key) return null;
    return new GoogleGenAI({ apiKey: key });
};

export const saveUserApiKey = (key: string) => {
    localStorage.setItem(API_STORAGE_KEY, key);
}

export const getUserApiKey = (): string => {
    return localStorage.getItem(API_STORAGE_KEY) || '';
}

export const validateApiKey = async (key: string): Promise<{ success: boolean; message: string }> => {
    try {
        const ai = new GoogleGenAI({ apiKey: key });
        await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: 'Ping',
        });
        return { success: true, message: "Koneksi Berhasil! API Key Valid." };
    } catch (error: any) {
        console.error("API Validation Error:", error);
        return { success: false, message: "Koneksi Gagal. Cek API Key." };
    }
}

// STRATEGI LOKAL BANDUNG (FALLBACK - No AI)
const generateLocalStrategy = (
    hotspots: Hotspot[], 
    financials: DailyFinancial | null,
    shift: ShiftState | null
): string => {
    const now = new Date();
    const hour = now.getHours();
    const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][now.getDay()];
    const strategy = shift?.strategy || 'FEEDER';
    const bensin = shift?.startFuel || 100;
    const income = financials?.grossIncome || 0;
    const target = financials?.target || 150000;
    const progress = Math.round((income / target) * 100);

    // CRITICAL ALERTS
    if (bensin < 15) return "BENSIN KRITIS! Isi dulu sekarang Ndan, jangan sampai mogok di tengah jalan. Cari SPBU terdekat (Pasteur/Soekarno Hatta). Keamanan dulu, cuan kemudian.";
    if (hour >= 23 || hour < 4) return "Udah larut banget Ndan. Bahaya angin duduk & kecelakaan. Kalau belum dapat orderan kakap, mending pulang. Istirahat lebih penting dari cuan semalam.";

    // WEEKEND SPECIFIC
    if (dayName === 'Minggu' && hour >= 6 && hour < 10) return "MINGGU PAGI CFD! Geser ke Gasibu/Dago sekarang. Banyak yang olahraga & butuh jemputan. Golden time weekend, jangan sia-siain!";
    if (dayName === 'Sabtu' && hour >= 19) return "SABTU MALAM! Braga, Cihampelas, PVJ lagi rame. Malam minggu orderan pendek tapi banyak & harga naik. Feeder bisa panen receh premium.";

    // SNIPER STRATEGY
    if (strategy === 'SNIPER') {
        if (hour >= 22 || hour < 4) return "Mode Sniper Prime Time! Stasiun Bandung tunggu kereta malam. Cimahi/Lembang/Dago Atas adalah target. Jangan ambil orderan <25rb. Mental baja, tunggu yang kakap!";
        if (hour >= 18 && hour < 22) return "Sniper warming up. Geser ke TSM/PVJ/Stasiun sekarang. Posisikan diri buat orderan malam yang jauh. Ini investasi, jangan ambil receh!";
        if (dayName === 'Jumat' && hour >= 16) return "JUMAT SORE = SNIPER HEAVEN! Mahasiswa ITB/Unpad pulang kampung. Target: Stasiun, Terminal, Travel. Orderan kakap jarak jauh, ini waktunya Ndan!";
        return "Sniper istirahat aja siang. Golden time lu jam 22:00-02:00. Jaga stamina, tidur dulu biar malam fokus. Atau switch ke mode Feeder sementara.";
    }

    // FEEDER STRATEGY (GOLDEN TIMES)
    if (hour >= 6 && hour < 9) {
        const zones = hotspots.filter(h => h.time_window === 'Pagi').slice(0, 2).map(h => h.zone).join('/');
        return `GOLDEN TIME PAGI! ${zones || 'Antapani/Buah Batu'} lagi gacor. Sikat semua orderan anak sekolah & karyawan. Jarak pendek OK, yang penting volume. Feeding Server dimulai sekarang!`;
    }
    if (hour >= 11 && hour < 13) {
        return "GOLDEN TIME SIANG! Dipatiukur (Gacoan/McD) atau Gatot Subroto food lagi deras. Jangan pilih-pilih, ambil semua. 15-20 orderan di jam ini = smooth seharian!";
    }
    if (hour >= 16 && hour < 19) {
        return "GOLDEN TIME SORE! Pasteur/Gatot Subroto macet parah = orderan beruntun. Stasiun/Terminal juga gacor. Ini jam terakhir panen feeder, gas pol Ndan!";
    }

    // PROGRESS-BASED ADVICE
    if (hour >= 15 && progress < 50) return "Sore udah masuk tapi baru dapet " + progress + "%. Evaluasi: Zona lu gacor? Coba pindah ke Stasiun/Dipatiukur/TSM. Atau cocol manual buat pancingan.";
    if (progress >= 100 && hour < 18) return "TARGET TEMBUS! Lu udah aman Ndan. Lanjut buat bonus atau pulang istirahat? Denger badan lu, jangan dipaksa.";

    // GENERAL ADVICE
    if (income === 0 && hour > 8) return "Belum dapet orderan sama sekali? Akun lagi dingin. COCOL MANUAL 1 orderan terdekat sekarang (Pancingan). Jangan cancel! Ini kunci buka server.";
    
    return "Zona anyep? Coba geser ke Stasiun Bandung, Dipatiukur, atau TSM. Tunggu 30 menit konsisten di 1 zona sebelum pindah. Konsistensi adalah kunci. Jangan nomaden!";
};

export const generateDriverStrategy = async (
    hotspots: any[], 
    financials: DailyFinancial | null,
    shift: ShiftState | null,
    userLocation: { lat: number, lng: number } | null 
): Promise<string> => {
    try {
        const ai = getAiClient();
        if (!ai) return generateLocalStrategy(hotspots, financials, shift);

        const model = 'gemini-3-flash-preview'; 
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes()}`;
        const strategy = shift?.strategy || 'FEEDER';

        // Data Cleaning
        const topSpots = hotspots.slice(0, 3).map(h => 
            `${h.origin} (${h.category})`
        ).join(', ');

        const saldo = shift ? shift.startBalance : 0;
        const bensin = shift ? shift.startFuel : 0;
        const income = financials ? financials.grossIncome : 0;
        const target = financials ? financials.target : 150000;

        const prompt = `
            Bertindaklah sebagai "Suhu Ojol Bandung" yang expert di algoritma server Maxim & pola traffic Bandung.
            Gaya bahasa: SARKAS, LUGAS, TEGAS, TAPI PEDULI (Tough Love). Panggil "Ndan".

            DATA DRIVER REAL-TIME:
            - Lokasi: Bandung
            - Strategi Hari Ini: ${strategy} (${strategy === 'SNIPER' ? 'Fokus Kualitas/Jarak Jauh/Malam' : 'Fokus Kuantitas/Jarak Pendek/Pagi-Sore'})
            - Jam Sekarang: ${timeStr}
            - Saldo Aplikator: Rp${saldo.toLocaleString()}
            - Bensin: ${bensin}%
            - Pendapatan Sejauh Ini: Rp${income.toLocaleString()}
            - Target Shift: Rp${target.toLocaleString()}
            - Radar Terdekat: ${topSpots || "Kosong"}

            PENGETAHUAN BANDUNG YANG HARUS KAMU TAHU:
            - Zona Macet Parah (16-19): Pasteur, Gatot Subroto, Buah Batu (Feeder heaven!)
            - Zona Sniper: Stasiun Bandung, Terminal Cicaheum/Leuwi Panjang, Kampus (Jumat sore)
            - Golden Time Feeder: 06-09 (Sekolah/Kantor), 11-13 (Food rush), 16-19 (Pulang kerja)
            - Golden Time Sniper: 22-02 (Kereta malam, orderan jauh)
            - Zona Food: Dipatiukur (Gacoan/McD), Sudirman, Paskal Food Market
            
            RAHASIA ALGORITMA MAXIM (Landasan saran):
            1. "Feeding Server" (Golden Time): Ambil SEMUA orderan pendek untuk bangun riwayat (Snowball Effect). 10 orderan pendek > 3 orderan sedang.
            2. "Cocol Manual": Jika anyep (>30 menit ga dapet), ambil manual 1 orderan terdekat untuk "Pancingan" tapi JANGAN CANCEL apapun. Ini kunci buka keran server.
            3. "Sniper Mindset": Jika strategi SNIPER, TAHAN NAFSU orderan receh. Tunggu 1-2 orderan kakap (>30rb, jarak >5km) yang nutup target. Mental baja penting!
            4. "Konsistensi Lokasi": Jangan nomaden acak. Pilih 1 zona gacor, tunggu min 30-45 menit baru pindah. Server prioritaskan driver "resident" zona itu.
            5. "Traffic = Opportunity": Macet Pasteur/Gatot Subroto = Feeder heaven. Banyak orderan pendek beruntun.

            INSTRUKSI OUTPUT:
            1. Berikan saran SPESIFIK & ACTIONABLE berdasarkan Strategi, Jam, dan Lokasi Radar.
            2. Sebutkan zona spesifik Bandung jika perlu (misal: "Geser ke Stasiun" atau "Merapat Dipatiukur").
            3. Jika bensin <25%, ingatkan isi bensin dulu.
            4. Jika pendapatan jauh dari target dan waktu sudah sore, suruh evaluasi strategi.
            5. Maksimal 3-4 kalimat pendek, padat, to the point.

            Contoh Output FEEDER (Jam 07:00):
            "Woy Ndan, sekarang jam Golden Time Pagi! Lu di radar Antapani/Buah Batu? Sikat orderan anak sekolah & kantor jarak pendek. Jangan pilih-pilih, asal ga cancel. Ini saatnya 'Feeding Server' buat buka keran orderan seharian. Gas pol!"
            
            Contoh Output SNIPER (Jam 23:00):
            "Jam segini mode Sniper baru mulai. Geser ke Stasiun Bandung, tunggu kereta malam tiba. Tahan nafsu liat orderan 10-15rb, fokus tunggu yang arah Cimahi/Dago Atas minimal 30rb. Satu tarikan gede nutup 5 orderan receh. Mental baja, Ndan!"
            
            Contoh Output (Anyep):
            "Akun anyep lebih 30 menit? Server lagi lupa sama lu. Cocol manual 1 orderan terdekat sekarang juga (Pancingan). Jangan cancel apapun! 1 orderan manual ini kunci buat buka keran otomatis lagi. Trust the process!"

            JAWAB SEKARANG (Sesuaikan dengan kondisi real-time driver):
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                temperature: 0.85, 
                maxOutputTokens: 1000, 
            }
        });

        if (response && response.text) {
             const cleanText = response.text.trim();
             if (cleanText.length > 0) return cleanText;
        }

        throw new Error("Empty Response");

    } catch (error: any) {
        console.error("AI Error:", error);
        return generateLocalStrategy(hotspots, financials, shift);
    }
};

export const analyzeHotspotTrend = async (hotspots: Hotspot[]): Promise<string> => {
    return "Trend analysis disabled.";
}
