/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Deployment Marker: v7.0 (FORCE)
// Build Timestamp: 2026-04-16T10:15:00Z
console.log("[API/CHAT] v7.0 (FORCE) Initializing forced clean deployment...");

import * as GoogleAI from "@google/generative-ai";
const GoogleGenerativeAI = GoogleAI.GoogleGenerativeAI;

/**
 * Robust Raw Fetch to bypass SDK issues and get deep error logs
 */
async function fetchGemini(model, version, key, prompt) {
    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${key}`;
    console.log(`[API/CHAT] v7.0 FETCHING: ${version}/models/${model}`);
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[API/CHAT] v7.0 ERROR RESPONSE OBJ (${response.status}):`, errorBody);
        throw new Error(`Google API Error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export default async function DocThoFinalHandler(req, res) {
    // Robust API key retrieval (Trying all common names)
    const rawKey = process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    const apiKey = rawKey ? rawKey.trim() : null;

    if (req.method === 'GET') {
        const keyStatus = apiKey ? `FOUND (Len: ${apiKey.length}, ${apiKey.substring(0, 4)}...${apiKey.slice(-4)})` : "NOT FOUND";
        console.log(`[API/CHAT] v7.0 Health Check. Key: ${keyStatus}`);
        return res.status(200).json({ status: 'ok', version: '7.0 (FORCE)', keyStatus });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    console.log(`[API/CHAT] v7.0 (FORCE) EXECUTION STARTED. Key Check: ${apiKey ? 'OK' : 'MISSING'}`);
    
    if (!apiKey) {
        return res.status(401).json({ error: "v7.0 Error: API Key is missing on Vercel. Please check ENVIRONMENT VARIABLES." });
    }

    try {
        const { text, selectedLang, selectedConfigs } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        const langNames = { 'vi': 'Vietnamese', 'de': 'German', 'en': 'English' };
        const targetLang = langNames[selectedLang] || 'Vietnamese';

        // ---------------------------------------------------------
        // STEP 1: TRANSLATION (RAW FETCH)
        // ---------------------------------------------------------
        const translationPrompt = `Translate to ${targetLang}. Return ONLY translated text: ${text.trim()}`;
        let translatedText = text.trim();
        
        try {
            console.log("[API/CHAT] v7.0 Action: Running Raw Fetch Translation...");
            translatedText = await fetchGemini("gemini-1.5-flash", "v1beta", apiKey, translationPrompt);
            console.log("[API/CHAT] v7.0 Translation SUCCESS.");
        } catch (err) {
            console.warn("[API/CHAT] v7.0 Primary failed. Attempting fallback gemini-1.0-pro...");
            try {
                translatedText = await fetchGemini("gemini-1.0-pro", "v1beta", apiKey, translationPrompt);
                console.log("[API/CHAT] v7.0 Fallback SUCCESS.");
            } catch (err2) {
                console.error("[API/CHAT] v7.0 CRITICAL: Translation failed completely. Using original text.");
                translatedText = text.trim();
            }
        }

        // ---------------------------------------------------------
        // STEP 2: TTS (SDK)
        // ---------------------------------------------------------
        console.log("[API/CHAT] v7.0 Step 2: TTS with SDK...");
        const genAI = new GoogleGenerativeAI(apiKey);
        
        let audioData = null;
        let mimeType = null;

        const generationConfig = {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedConfigs[0]?.base || "Chime" } },
            },
        };

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig }, { apiVersion: "v1beta" });
            const result = await model.generateContent(`Read this text: ${translatedText}`);
            const part = result.response.candidates[0].content.parts.find(p => p.inlineData?.data);
            if (part) {
                audioData = part.inlineData.data;
                mimeType = part.inlineData.mimeType;
                console.log("[API/CHAT] v7.0 TTS SUCCESS.");
            }
        } catch (err) {
            console.error("[API/CHAT] v7.0 TTS FAILED:", err.message);
            throw new Error(`TTS Failed: ${err.message}`);
        }

        return res.status(200).json({
            text: translatedText,
            audioData: audioData,
            mimeType: mimeType
        });

    } catch (error) {
        console.error('[API/CHAT] [v7.0] FATAL ERROR:', error);
        return res.status(500).json({ error: `v7.0 Server Error: ${error.message}` });
    }
}
