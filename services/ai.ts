
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

    if (shift) {
        if (shift.startBalance < 20000) return "Duh Ndan, saldo segitu mau narik apa mau sedekah? 😅 Topup dulu gih minimal ceban, biar akun gak gagu! Jangan lupa Bismillah.";
        if (shift.startFuel < 15) return "Bensin kedip-kedip kok masih nekat? Isi dulu full tank Ndan. Rezeki gak bakal lari, tapi motor lu bisa mogok! ⛽";
    }

    if (hour >= 5 && hour < 10) return "Masih pagi jangan bengong! Geser ke Perumahan sekarang. Orang berangkat kerja butuh tumpangan, bukan driver yang ngetem doang! 🚀";
    if (hour >= 11 && hour < 14) return "Perut orang kantoran udah bunyi tuh. Merapat ke Pusat Kuliner/Mall sekarang! Orderan Food lagi deres, sikat Ndan! 🍔";
    if (hour >= 16 && hour < 20) return "Jam pulang kerja Ndan! Standby di Stasiun atau Halte. Karyawan capek butuh tumpangan cepet, jangan kasih kendor! 🌧️";
    if (hour >= 20) return "Malam minggu kelabu? Geser ke Kuliner Malam. Masih ada harapan orderan martabak atau mahasiswa laper. Gas! 🌙";

    return "Anyep ya? Jangan diem aja kayak patung. Geser 500m ke arah keramaian. Rezeki harus dijemput, bukan ditungguin doang!";
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

        // Data Cleaning
        const topSpots = hotspots.slice(0, 3).map(h => 
            `${h.origin} (${h.category})`
        ).join(', ');

        const saldo = shift ? shift.startBalance : 0;
        const bensin = shift ? shift.startFuel : 0;
        const income = financials ? financials.grossIncome : 0;
        const target = financials ? financials.target : 150000;

        const prompt = `
            Bertindaklah sebagai "Korlap Ojol Senior" yang SARKAS, LUGAS, CEPLAS-CEPLOS, tapi SEBENARNYA PEDULI (Tough Love).

            DATA LAPANGAN:
            - Jam: ${timeStr}
            - Saldo: Rp${saldo} (Aman > 30rb)
            - Bensin: ${bensin}%
            - Pendapatan: Rp${income} (Target Rp${target})
            - Radar: ${topSpots || "Kosong"}

            INSTRUKSI JAWABAN (WAJIB):
            1. Buat hanya 2-3 kalimat pendek.
            2. Kalimat 1: Sindir kondisinya (saldo tipis/pendapatan nol/bensin sekarat/masih ngetem).
            3. Kalimat 2: Perintah tegas suruh geser ke lokasi spesifik (pilih dari data Radar atau logika jam).
            4. Kalimat 3: Kalimat penutup penuh semangat/doa singkat.
            5. GAYA BAHASA: Tongkrongan driver ("Ndan", "Lu", "Gass"). Jangan kaku.
            6. PASTIKAN KALIMAT SELESAI (JANGAN TERPOTONG).

            Contoh Output Bagus:
            "Woy Ndan, ngopi mulu kapan kayanya? Saldo lu memprihatinkan tuh. Geser ke Mall PVJ sekarang, orderan Food lagi banjir disana. Sikat sebelum disamber orang, Gass! 🔥"
            
            JAWAB SEKARANG:
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                temperature: 0.85, 
                maxOutputTokens: 1000, // NAIKKAN JAUH AGAR TIDAK TERPOTONG
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
