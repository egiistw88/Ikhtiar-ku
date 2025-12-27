import { GoogleGenAI } from "@google/genai";
import { Hotspot, DailyFinancial, ShiftState } from '../types';

const API_STORAGE_KEY = 'ikhtiar_ku_api_key';

// Defensive initialization: Check localStorage first (User input), then Env (Build time)
const getAiClient = () => {
    // 1. Cek Local Storage (Input manual user)
    let key = '';
    if (typeof localStorage !== 'undefined') {
        key = localStorage.getItem(API_STORAGE_KEY) || '';
    }

    // 2. Jika kosong, cek Environment Variable
    if (!key) {
        key = process.env.API_KEY || '';
    }

    if (!key) return null;
    return new GoogleGenAI({ apiKey: key });
};

// Helper untuk menyimpan key dari SettingsView
export const saveUserApiKey = (key: string) => {
    localStorage.setItem(API_STORAGE_KEY, key);
}

export const getUserApiKey = (): string => {
    return localStorage.getItem(API_STORAGE_KEY) || '';
}

export const generateDriverStrategy = async (
    hotspots: Hotspot[], 
    financials: DailyFinancial | null,
    shift: ShiftState | null
): Promise<string> => {
    try {
        const ai = getAiClient();
        
        if (!ai) {
            console.warn("AI Service: API Key is missing.");
            return "API Key belum diisi Ndan. Masuk ke Pengaturan -> Input API Key (Gratis dari Google).";
        }

        const model = 'gemini-2.5-flash-latest'; 
        
        // Prepare context data cleaning (Minimize tokens)
        const cleanHotspots = hotspots.slice(0, 5).map(h => ({
            loc: h.origin,
            cat: h.category,
            dist: 'Dekat'
        }));

        const contextData = {
            performance: financials ? {
                net: financials.netCash,
            } : "0",
            fuel: shift ? shift.startFuel : "50",
            radar: cleanHotspots
        };

        const prompt = `
            Act as "Ketua Komunitas Ojol Indonesia".
            Context: ${JSON.stringify(contextData)}
            
            Task:
            Give 2 sentences of strategic advice in Indonesian slang (Ndan, Gacor, Anyep).
            1. Comment on modal/fuel.
            2. Pick ONE best location from radar.
            
            Output ONLY text. No markdown formatting.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                temperature: 0.7,
                maxOutputTokens: 100,
            }
        });

        if (response && response.text) {
             const cleanText = response.text.trim();
             if (cleanText.length > 0) return cleanText;
        }

        // Fallback deep inspection
        const fallbackText = response?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (fallbackText) return fallbackText;
        
        return "Sinyal AI terputus. Coba lagi nanti Ndan.";

    } catch (error: any) {
        console.error("AI Service Error:", error);
        
        const msg = String(error?.message || error);

        if (msg.includes('429')) return "Server AI Overload. Tunggu sebentar.";
        if (msg.includes('API key') || msg.includes('403')) return "API Key Salah/Kadaluarsa. Cek Pengaturan.";
        if (msg.includes('fetch')) return "Koneksi Internet Bermasalah.";
        
        return "AI sedang istirahat. Manual dulu Ndan.";
    }
};

export const analyzeHotspotTrend = async (hotspots: Hotspot[]): Promise<string> => {
    return "Analisis Trend Dimatikan (Hemat Kuota)";
}