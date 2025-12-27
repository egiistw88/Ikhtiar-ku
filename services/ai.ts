import { GoogleGenAI } from "@google/genai";
import { Hotspot, DailyFinancial, ShiftState } from '../types';
import { getTimeWindow } from '../utils';

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

// ALGORITMA LOKAL (FALLBACK)
// Berjalan ketika API Key kosong atau Error. 
// Menjamin driver selalu dapat saran konkrit.
const generateLocalStrategy = (
    hotspots: Hotspot[], 
    financials: DailyFinancial | null,
    shift: ShiftState | null
): string => {
    const now = new Date();
    const hour = now.getHours();
    const timeWindow = getTimeWindow(hour);
    let advice = "";
    let location = "";

    // 1. Cek Kondisi Kritis (Prioritas Utama)
    if (shift) {
        if (shift.startBalance < 15000) return "⚠️ DARURAT: Saldo minim bikin akun anyep. Topup minimal 20rb biar orderan masuk lancar Ndan!";
        if (shift.startFuel < 20) return "⛽ AWAS MOGOK: Isi bensin dulu Ndan. Jangan ambil orderan jauh sebelum indikator aman.";
    }

    // 2. Analisa Waktu & Lokasi
    const validSpots = hotspots.filter(h => h.time_window === timeWindow);
    if (validSpots.length > 0) {
        location = `Geser ke ${validSpots[0].origin} (${validSpots[0].category})`;
    } else {
        // Fallback lokasi umum berdasarkan jam jika tidak ada data history
        if (hour >= 6 && hour < 10) location = "Ngetem di area Perumahan/Sekolah, banyak orderan berangkat.";
        else if (hour >= 11 && hour < 14) location = "Merapat ke area Resto/Pusat Kuliner, jam makan siang (Food/Delivery).";
        else if (hour >= 16 && hour < 19) location = "Standby di Stasiun atau Perkantoran, jam pulang kerja.";
        else if (hour >= 19) location = "Cari spot Kuliner Malam atau Mall.";
        else location = "Cari area 24 jam atau Pasar Induk.";
    }

    // 3. Analisa Keuangan
    let moneyTalk = "";
    if (financials) {
        if (financials.netCash > 100000) moneyTalk = "Gacor! Target harian aman.";
        else if (financials.netCash < 20000) moneyTalk = "Masih pagi/awal, semangat cari penglaris.";
    }

    return `Strategi Manual: ${location}. ${moneyTalk} Tetap fokus jalan, rezeki gak akan ketukar!`;
};

export const generateDriverStrategy = async (
    hotspots: Hotspot[], 
    financials: DailyFinancial | null,
    shift: ShiftState | null
): Promise<string> => {
    // 1. Coba Generate via AI (Jika Key Ada)
    try {
        const ai = getAiClient();
        
        // Jika tidak ada AI Client (Key kosong), langsung lempar ke Local Strategy
        if (!ai) {
            return generateLocalStrategy(hotspots, financials, shift);
        }

        const model = 'gemini-2.5-flash-latest'; 
        
        const cleanHotspots = hotspots.slice(0, 3).map(h => ({
            loc: h.origin,
            cat: h.category,
            jam: h.predicted_hour
        }));

        const contextData = {
            saldo: shift ? shift.startBalance : "Tidak diketahui",
            bensin: shift ? `${shift.startFuel}%` : "Tidak diketahui",
            pendapatan_hari_ini: financials ? financials.grossIncome : 0,
            jam_sekarang: new Date().getHours(),
            radar_terdekat: cleanHotspots
        };

        const prompt = `
            Act as "Senior Driver Maxim Indonesia".
            Context: ${JSON.stringify(contextData)}
            
            Berikan saran singkat (maksimal 2 kalimat) dengan gaya bahasa driver lapangan (Ndan/Gacor).
            Fokus pada:
            1. Kondisi saldo/bensin (ingatkan topup jika saldo < 30rb).
            2. Rekomendasi 1 lokasi dari radar atau saran umum berdasarkan jam sekarang.
            
            JANGAN menyapa "Halo AI" atau basa-basi. Langsung to the point strategi.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                temperature: 0.7,
                maxOutputTokens: 80,
            }
        });

        if (response && response.text) {
             const cleanText = response.text.trim();
             if (cleanText.length > 0) return cleanText;
        }

        throw new Error("Empty Response");

    } catch (error: any) {
        // 2. Jika AI Gagal (Error/Limit/Sinyal), Gunakan Local Strategy
        console.log("Switching to Local Strategy due to:", error.message);
        return generateLocalStrategy(hotspots, financials, shift);
    }
};

export const analyzeHotspotTrend = async (hotspots: Hotspot[]): Promise<string> => {
    return "Analisis Trend Dimatikan (Hemat Kuota)";
}