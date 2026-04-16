/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Deployment Marker: v5.0 (Deep Diagnostic & Ultra-Stable Fallback)
console.log("[API/CHAT] v5.0 Starting Deep Diagnostic Mode...");

import * as GoogleAI from "@google/generative-ai";
const GoogleGenerativeAI = GoogleAI.GoogleGenerativeAI;

export default async function DocThoHandler(req, res) {
    // ---------------------------------------------------------
    // DIAGNOSTIC 1: API KEY ANALYSIS
    // ---------------------------------------------------------
    const rawKey = process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    const apiKey = rawKey ? rawKey.trim() : null;

    if (req.method === 'GET') {
        const keyStatus = apiKey ? `FOUND (Len: ${apiKey.length}, Start: ${apiKey.substring(0, 4)}... End: ...${apiKey.slice(-4)})` : "NOT FOUND";
        console.log(`[API/CHAT] Health Check. API Key Status: ${keyStatus}`);
        return res.status(200).json({ status: 'ok', version: '5.0', keyStatus });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    console.log(`[API/CHAT] POST Request. API Key check: ${apiKey ? 'PRESENT' : 'MISSING'}`);
    
    if (!apiKey) {
        return res.status(401).json({ error: "API Key is missing on Vercel. Please check ENVIRONMENT VARIABLES." });
    }

    try {
        const { text, selectedLang, voiceCount, selectedConfigs } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        const genAI = new GoogleGenerativeAI(apiKey);
        const langNames = { 'vi': 'Vietnamese', 'de': 'German', 'en': 'English' };
        const targetLang = langNames[selectedLang] || 'Vietnamese';

        // ---------------------------------------------------------
        // STEP 1: TRANSLATION (Ultra-Robust Loop)
        // ---------------------------------------------------------
        const translationPrompt = `Translate the following to ${targetLang}. Return ONLY translated text: ${text.trim()}`;
        
        const models = ["gemini-1.5-flash", "models/gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-1.0-pro"];
        const versions = ["v1beta", "v1"];
        
        let translatedText = text.trim();
        let step1Success = false;

        console.log("[API/CHAT] Step 1: Starting Ultra-Robust Translation...");

        outer: for (const ver of versions) {
            for (const name of models) {
                try {
                    console.log(`[API/CHAT] Trying ${name} on ${ver}...`);
                    const model = genAI.getGenerativeModel({ model: name }, { apiVersion: ver });
                    const result = await model.generateContent(translationPrompt);
                    translatedText = result.response.text().trim();
                    step1Success = true;
                    console.log(`[API/CHAT] SUCCESS with ${name} (${ver})`);
                    break outer;
                } catch (err) {
                    // console.warn(`[API/CHAT] ${name} (${ver}) failed: ${err.message}`);
                }
            }
        }

        if (!step1Success) throw new Error("CRITICAL: All translation model combinations failed. This strongly suggests an invalid API Key or project restriction.");

        // ---------------------------------------------------------
        // STEP 2: TTS (Ultra-Robust Loop)
        // ---------------------------------------------------------
        console.log("[API/CHAT] Step 2: Starting Ultra-Robust TTS...");
        
        const ttsModels = ["gemini-2.0-flash", "models/gemini-2.0-flash", "gemini-2.0-flash-exp"];
        let step2Success = false;
        let audioData = null;
        let mimeType = null;

        const generationConfig = {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedConfigs[0]?.base || "Chime" } },
            },
        };

        outerTTS: for (const ver of versions) {
            for (const name of ttsModels) {
                try {
                    console.log(`[API/CHAT] Trying TTS with ${name} on ${ver}...`);
                    const model = genAI.getGenerativeModel({ model: name, generationConfig }, { apiVersion: ver });
                    const result = await model.generateContent(`Read this Vietnamese text: ${translatedText}`);
                    const part = result.response.candidates[0].content.parts.find(p => p.inlineData?.data);
                    if (part) {
                        audioData = part.inlineData.data;
                        mimeType = part.inlineData.mimeType;
                        step2Success = true;
                        console.log(`[API/CHAT] TTS SUCCESS with ${name} (${ver})`);
                        break outerTTS;
                    }
                } catch (err) {
                    // console.warn(`[API/CHAT] TTS ${name} (${ver}) failed: ${err.message}`);
                }
            }
        }

        if (!step2Success) throw new Error("CRITICAL: All TTS model combinations failed.");

        return res.status(200).json({
            text: translatedText,
            audioData: audioData,
            mimeType: mimeType
        });

    } catch (error) {
        console.error('[API/CHAT] FATAL ERROR:', error);
        return res.status(500).json({ error: `Server Error: ${error.message}` });
    }
}
