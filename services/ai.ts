
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

// STRATEGI LOKAL (FALLBACK)
const generateLocalStrategy = (
    hotspots: Hotspot[], 
    financials: DailyFinancial | null,
    shift: ShiftState | null
): string => {
    const now = new Date();
    const hour = now.getHours();
    const strategy = shift?.strategy || 'FEEDER';

    // LOGIKA SNIPER (MALAM)
    if (strategy === 'SNIPER') {
        if (hour >= 22 || hour < 4) return "Mode Sniper Aktif. Incar orderan jarak jauh/kakap. Jangan ambil receh bikin capek. Sabar, satu order kakap nutup 3 orderan teri.";
        if (hour >= 18 && hour < 22) return "Pemanasan Ngalong. Geser ke area Mall atau Perkantoran lembur. Cari yang pulang jauh.";
        return "Siang istirahat aja Ndan. Sniper mainnya malam saat jalanan kosong & harga bersahabat.";
    }

    // LOGIKA FEEDER (PAGI/SORE)
    if (hour >= 6 && hour < 9) return "GOLDEN TIME PAGI! Waktunya 'Feeding Server'. Ambil semua orderan pendek anak sekolah/kantor. Jangan pilih-pilih, bangun riwayat akun!";
    if (hour >= 11 && hour < 13) return "GOLDEN TIME SIANG! Orang lapar galak. Merapat ke Gacoan/McD/Pusat Kuliner. Food lagi deras.";
    if (hour >= 16 && hour < 19) return "GOLDEN TIME SORE! Macet = Cuan. Standby di Stasiun/Halte. Sikat orderan pendek estafet.";

    return "Akun Anyep? Lakukan 'Cocol' Manual orderan terdekat untuk memancing server (Pancingan). Jangan cancel! Satu order manual membuka keran order otomatis.";
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
            Bertindaklah sebagai "Suhu Ojol Jalanan" yang paham algoritma server (Feeding Server, Golden Time, Snowball Effect).
            Gaya bahasa: SARKAS, LUGAS, TEGAS, TAPI PEDULI (Tough Love). Panggil "Ndan".

            DATA DRIVER:
            - Strategi Hari Ini: ${strategy} (${strategy === 'SNIPER' ? 'Fokus Kualitas/Jarak Jauh/Malam' : 'Fokus Kuantitas/Jarak Pendek/Pagi-Sore'})
            - Jam Sekarang: ${timeStr}
            - Saldo: Rp${saldo}
            - Bensin: ${bensin}%
            - Radar Terdekat: ${topSpots || "Kosong"}

            RAHASIA ALGORITMA (Jadikan landasan saran):
            1. "Feeding Server" (06-09, 11-13, 16-19): Ambil semua orderan pendek untuk bangun riwayat (Snowball).
            2. "Cocol Manual": Jika anyep, sarankan ambil manual orderan terdekat (Pancingan) tapi JANGAN CANCEL.
            3. "Sniper/Ngalong": Jika strategi SNIPER, suruh sabar tunggu kakap, jangan ambil receh.
            4. "Konsistensi": Jangan pindah-pindah tempat acak.

            INSTRUKSI OUTPUT:
            1. Berikan saran spesifik berdasarkan Strategi (${strategy}) dan Jam (${timeStr}).
            2. Jika jam Golden Time dan strategi FEEDER: Suruh sikat semua orderan pendek.
            3. Jika akun anyep: Sarankan Cocol Manual buat pancingan.
            4. Maksimal 3 kalimat pendek.

            Contoh Output (FEEDER):
            "Woy Ndan, ini jam Golden Time (06-09)! Jangan ngetem doang. Sikat orderan anak sekolah jarak pendek buat 'Feeding Server'. Biar akun lu enteng seharian!"
            
            Contoh Output (SNIPER):
            "Mode Sniper aktif kan? Tahan nafsu liat orderan receh. Geser ke Stasiun, tunggu yang arah luar kota. Satu kakap nutup target seharian. Sabar!"

            JAWAB SEKARANG:
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
