/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Deployment Marker: v12.0 (Official Library Integration)
// Target Endpoint: /api/speak
console.log("[API/SPEAK] v12.0 (OFFICIAL LIBRARY) Initializing...");

import * as GoogleAI from "@google/generative-ai";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

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
    const encodedText = encodeURIComponent(text.substring(0, 200));
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
    const ttsKey = process.env.GOOGLE_TTS_API_KEY;

    if (req.method === 'GET') {
        return res.status(200).json({ status: 'ok', version: '12.0', keyDetected: !!geminiKey });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    console.log(`[API/SPEAK] v12.0 Execution Started.`);
    
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
            console.log("[API/SPEAK] v12.0 Translation OK.");
        } catch (err) {
            console.warn("[API/SPEAK] v12.0 Translation failed, using original.");
            translatedText = text.trim();
        }

        // ---------------------------------------------------------
        // STEP 2: TTS (OFFICIAL LIBRARY with FALLBACK)
        // ---------------------------------------------------------
        let audioData = null;
        let mimeType = null;
        let ttsSuccess = false;

        // Try Official Library if Key is present
        if (ttsKey) {
            try {
                console.log("[API/SPEAK] v12.0 Trying Official Google TTS Library...");
                const client = new TextToSpeechClient({ apiKey: ttsKey });
                const [result] = await client.synthesizeSpeech({
                    input: { text: translatedText },
                    voice: { languageCode: selectedLang === 'vi' ? 'vi-VN' : (selectedLang === 'de' ? 'de-DE' : 'en-US'), ssmlGender: 'NEUTRAL' },
                    audioConfig: { audioEncoding: 'MP3' },
                });
                audioData = result.audioContent.toString('base64');
                mimeType = 'audio/mpeg';
                ttsSuccess = true;
                console.log("[API/SPEAK] v12.0 Official Library Success.");
            } catch (err) {
                console.warn("[API/SPEAK] v12.0 Official Library failed:", err.message);
            }
        }

        // Try Gemini Audio Fallback
        if (!ttsSuccess) {
            console.log("[API/SPEAK] v12.0 Trying Gemini Audio Fallback...");
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash-8b", 
                generationConfig: { 
                    responseModalities: ["AUDIO"],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedConfigs[0]?.base || "Chime" } } }
                } 
            }, { apiVersion: "v1beta" });
            
            try {
                const result = await model.generateContent(`Read this: ${translatedText}`);
                const part = result.response.candidates[0].content.parts.find(p => p.inlineData?.data);
                if (part) {
                    audioData = part.inlineData.data;
                    mimeType = part.inlineData.mimeType;
                    ttsSuccess = true;
                    console.log("[API/SPEAK] v12.0 Gemini Audio Success.");
                }
            } catch (err) {
                console.warn("[API/SPEAK] v12.0 Gemini Audio failed.");
            }
        }

        // FINAL RESORT: Google Translate TTS
        if (!ttsSuccess) {
            try {
                const fallback = await fetchTranslateTTSFallback(translatedText, selectedLang);
                audioData = fallback.audioData;
                mimeType = fallback.mimeType;
                ttsSuccess = true;
                console.log("[API/SPEAK] v12.0 Translate TTS Fallback Success.");
            } catch (err) {
                console.error("[API/SPEAK] All TTS methods failed.");
            }
        }

        if (!ttsSuccess) throw new Error("Audio generation failed on all pipelines.");

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
