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
            return "Kunci API (API Key) belum dipasang Ndan. Kontak developer.";
        }

        const model = 'gemini-3-flash-preview';
        
        // Prepare context data cleaning (Minimize tokens)
        const cleanHotspots = hotspots.slice(0, 8).map(h => ({
            loc: h.origin,
            time: h.predicted_hour,
            cat: h.category,
        }));

        const contextData = {
            performance: financials ? {
                gross: financials.grossIncome,
                net: financials.netCash,
            } : "Nihil",
            condition: shift ? {
                fuel: shift.startFuel,
            } : "Nihil",
            radar: cleanHotspots
        };

        const prompt = `
            Role: Ketua Komunitas Ojol Bandung. Senior, bijak, bahasa gaul sopan (panggil "Ndan").
            Data: ${JSON.stringify(contextData)}
            Tugas:
            1. Analisis singkat kondisi modal/bensin.
            2. Rekomendasikan 1 lokasi dari data radar untuk dituju sekarang.
            
            Jawab dalam 1 paragraf narasi pendek saja. Jangan pakai list/poin.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                temperature: 0.6,
                maxOutputTokens: 150,
            }
        });

        // ROBUST EXTRACTION STRATEGY
        // Level 1: Standard Getter
        if (typeof response.text === 'string') {
            return response.text;
        }

        // Level 2: Manual Candidate Extraction (Fallback)
        const candidate = response.candidates?.[0];
        if (candidate?.content?.parts?.[0]?.text) {
            return candidate.content.parts[0].text;
        }

        // Level 3: Handle Safety/Blocked response
        if (candidate?.finishReason) {
            return `AI terhenti (Status: ${candidate.finishReason}). Coba lagi.`;
        }
        
        return "Sinyal AI diterima tapi kosong. Coba lagi Ndan.";

    } catch (error: any) {
        console.error("AI Error:", error);
        
        // Defensive Error Message Handling
        const msg = typeof error === 'object' && error?.message ? error.message : String(error);

        if (msg.includes('429')) return "Server AI lagi sibuk parah (Overload). Tunggu bentar.";
        if (msg.includes('API key')) return "Masalah izin akses (API Key Error).";
        
        return "Gagal terhubung ke Markas Pusat (AI Error). Cek sinyal internet.";
    }
};

export const analyzeHotspotTrend = async (hotspots: Hotspot[]): Promise<string> => {
    try {
        if (!process.env.API_KEY) return "API Key Missing";

         const prompt = `
            Data Orderan: ${JSON.stringify(hotspots.slice(0, 10).map(h => h.category))}
            Pola apa yang mendominasi? Jawab 1 frasa saja (Contoh: "Dominan Kuliner Malam").
         `;
         
         const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
         });

         if (typeof response.text === 'string') return response.text;
         return "-";
    } catch (e) {
        return "Analisis Tertunda";
    }
}
