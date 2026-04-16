/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Deployment Marker: v9.0 (NEW ROUTE)
// Target Endpoint: /api/speak
console.log("[API/SPEAK] v9.0 (NEW ROUTE) Initializing...");

import * as GoogleAI from "@google/generative-ai";
const GoogleGenerativeAI = GoogleAI.GoogleGenerativeAI;

/**
 * Robust Raw Fetch to bypass SDK issues and get deep error logs
 */
async function fetchGemini(model, version, key, prompt) {
    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${key}`;
    console.log(`[API/SPEAK] Fetching: ${version}/models/${model}`);
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[API/SPEAK] Google API ERROR (${response.status}):`, errorBody);
        throw new Error(`Google API Error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export default async function DocThoSpeakHandler(req, res) {
    // Robust API key retrieval
    const rawKey = process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    const apiKey = rawKey ? rawKey.trim() : null;

    if (req.method === 'GET') {
        return res.status(200).json({ status: 'ok', version: '9.0 (NEW ROUTE)', keyDetected: !!apiKey });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    console.log(`[API/SPEAK] v9.0 Request Started.`);
    
    if (!apiKey) {
        return res.status(401).json({ error: "v9.0 Error: API Key missing. Check Vercel Environment Variables." });
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
            translatedText = await fetchGemini("gemini-1.5-flash", "v1beta", apiKey, translationPrompt);
            console.log("[API/SPEAK] Translation SUCCESS.");
        } catch (err) {
            console.warn("[API/SPEAK] Translation fallback to original.");
            translatedText = text.trim();
        }

        // ---------------------------------------------------------
        // STEP 2: TTS (SDK)
        // ---------------------------------------------------------
        const genAI = new GoogleGenerativeAI(apiKey);
        let audioData = null;
        let mimeType = null;
        let ttsSuccess = false;

        const generationConfig = {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedConfigs[0]?.base || "Chime" } },
            },
        };

        // Standard 1.5-flash is the most stable for Audio modality
        const ttsModels = ["gemini-1.5-flash", "gemini-2.0-flash-exp"];

        for (const modelName of ttsModels) {
            try {
                console.log(`[API/SPEAK] Trying TTS with ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName, generationConfig }, { apiVersion: "v1beta" });
                const result = await model.generateContent(`Read this text: ${translatedText}`);
                const part = result.response.candidates[0].content.parts.find(p => p.inlineData?.data);
                if (part) {
                    audioData = part.inlineData.data;
                    mimeType = part.inlineData.mimeType;
                    ttsSuccess = true;
                    console.log(`[API/SPEAK] TTS SUCCESS with ${modelName}!`);
                    break;
                }
            } catch (err) {
                console.warn(`[API/SPEAK] TTS ${modelName} failed: ${err.message}`);
            }
        }

        if (!ttsSuccess) throw new Error("TTS failed on all models.");

        return res.status(200).json({
            text: translatedText,
            audioData: audioData,
            mimeType: mimeType
        });

    } catch (error) {
        console.error('[API/SPEAK] FATAL ERROR:', error);
        return res.status(500).json({ error: `v9.0 Error: ${error.message}` });
    }
}
