/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Deployment Marker: v11.0 (AI Studio Multi-Stage Fallback)
// Target Endpoint: /api/speak
console.log("[API/SPEAK] v11.0 (ULTRA-STABLE) Initializing...");

import * as GoogleAI from "@google/generative-ai";
const GoogleGenerativeAI = GoogleAI.GoogleGenerativeAI;

/**
 * Robust Raw Fetch for Gemini Translation
 */
async function fetchGeminiTranslation(model, version, key, prompt) {
    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${key}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini Error ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/**
 * Google Translate TTS (Free, Reliable Fallback)
 */
async function fetchTranslateTTSFallback(text, lang) {
    console.log(`[API/SPEAK] Triggering Google Translate TTS Fallback for: ${lang}`);
    const encodedText = encodeURIComponent(text.substring(0, 200)); // Limit length for stability
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${lang}&client=tw-ob`;
    
    const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) {
        throw new Error("Translate TTS Fallback failed.");
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return { audioData: base64, mimeType: 'audio/mpeg' };
}

export default async function DocThoSpeakHandler(req, res) {
    const geminiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (req.method === 'GET') {
        return res.status(200).json({ status: 'ok', version: '11.0', keyDetected: !!geminiKey });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    console.log(`[API/SPEAK] v11.1 Refresh Started.`);
    
    if (!geminiKey) {
        return res.status(401).json({ error: "Gemini API Key missing." });
    }

    try {
        const { text, selectedLang, selectedConfigs } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        const langNames = { 'vi': 'Vietnamese', 'de': 'German', 'en': 'English' };
        const targetLang = langNames[selectedLang] || 'Vietnamese';

        // ---------------------------------------------------------
        // STEP 1: TRANSLATION (GEMINI)
        // ---------------------------------------------------------
        const translationPrompt = `Translate to ${targetLang}. Return ONLY translated text: ${text.trim()}`;
        let translatedText = text.trim();
        
        try {
            translatedText = await fetchGeminiTranslation("gemini-1.5-flash", "v1beta", geminiKey, translationPrompt);
            console.log("[API/SPEAK] Translation OK.");
        } catch (err) {
            console.warn("[API/SPEAK] Translation failed, using original.");
            translatedText = text.trim();
        }

        // ---------------------------------------------------------
        // STEP 2: TTS (GEMINI AUDIO with FALLBACK)
        // ---------------------------------------------------------
        let audioData = null;
        let mimeType = null;
        let ttsSuccess = false;

        const genAI = new GoogleGenerativeAI(geminiKey);
        const generationConfig = {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedConfigs[0]?.base || "Chime" } },
            },
        };

        // Try Gemini Audio first (The Soulful Way)
        const ttsModels = ["gemini-1.5-flash-8b", "gemini-1.5-flash"];
        for (const modelName of ttsModels) {
            try {
                console.log(`[API/SPEAK] Trying Gemini Audio with ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName, generationConfig }, { apiVersion: "v1beta" });
                const result = await model.generateContent(`Read this: ${translatedText}`);
                const part = result.response.candidates[0].content.parts.find(p => p.inlineData?.data);
                if (part) {
                    audioData = part.inlineData.data;
                    mimeType = part.inlineData.mimeType;
                    ttsSuccess = true;
                    console.log(`[API/SPEAK] Gemini Audio Success: ${modelName}`);
                    break;
                }
            } catch (err) {
                console.warn(`[API/SPEAK] Gemini Audio ${modelName} failed: ${err.message}`);
                continue;
            }
        }

        // LAST RESORT: Google Translate TTS (The Stable Way)
        if (!ttsSuccess) {
            try {
                const fallback = await fetchTranslateTTSFallback(translatedText, selectedLang);
                audioData = fallback.audioData;
                mimeType = fallback.mimeType;
                ttsSuccess = true;
                console.log("[API/SPEAK] Final Fallback SUCCESS.");
            } catch (err) {
                console.error("[API/SPEAK] All TTS methods failed.");
            }
        }

        if (!ttsSuccess) throw new Error("Could not generate audio.");

        return res.status(200).json({
            text: translatedText,
            audioData: audioData,
            mimeType: mimeType
        });

    } catch (error) {
        console.error('[API/SPEAK] FATAL ERROR:', error);
        return res.status(500).json({ error: error.message });
    }
}
