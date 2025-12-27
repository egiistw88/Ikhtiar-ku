import { GoogleGenAI } from "@google/genai";
import { Hotspot, DailyFinancial, ShiftState } from '../types';

// Initialize Gemini Client
// Assumption: process.env.API_KEY is injected by the build system/environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateDriverStrategy = async (
    hotspots: Hotspot[], 
    financials: DailyFinancial | null,
    shift: ShiftState | null
): Promise<string> => {
    try {
        if (!process.env.API_KEY) {
            console.warn("AI Service: API Key is missing");
            return "Kunci API (API Key) belum dipasang Ndan. Kontak developer.";
        }

        const model = 'gemini-2.5-flash-latest'; // Use 2.5 Flash for speed/reliability in production
        
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
            Act as "Ketua Komunitas Ojol".
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

        // Strict & Deep Checking
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

        if (msg.includes('429')) return "Server AI Overload. Tunggu 1 menit.";
        if (msg.includes('API key')) return "API Key Bermasalah. Cek Pengaturan.";
        if (msg.includes('fetch')) return "Koneksi Internet Bermasalah.";
        
        return "Sistem AI sedang maintenance. Manual dulu Ndan.";
    }
};

export const analyzeHotspotTrend = async (hotspots: Hotspot[]): Promise<string> => {
    return "Analisis Trend Dimatikan (Hemat Kuota)";
}
