/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Deployment Marker: v16.0 (CapCut Poetic Engine)
// Target Endpoint: /api/chat
console.log("[API/CHAT] v16.0 (POETIC ENGINE) Initializing...");

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
        throw new Error(`Gemini Translation Error ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/**
 * Poetic Word-by-Word Processor
 * Injects pauses (commas) between words to create a rhythmic "recital" effect.
 */
function processPoeticText(text) {
    // Split by whitespace and rejoin with commas and spaces
    // This forces the TTS engine to pause briefly between each word.
    return text.trim().split(/\s+/).join(", ") + ".";
}

export default async function DocThoChatHandler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (req.method === 'GET') {
        return res.status(200).json({ status: 'ok', version: '16.0', specialized: 'CapCut Poetic' });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    if (!apiKey) {
        return res.status(401).json({ error: "GEMINI_API_KEY missing." });
    }

    try {
        const { text, selectedLang } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        const langNames = { 'vi': 'Vietnamese', 'de': 'German', 'en': 'English' };
        const targetLang = langNames[selectedLang] || 'Vietnamese';

        // ---------------------------------------------------------
        // STEP 1: TRANSLATION
        // ---------------------------------------------------------
        const translationPrompt = `Translate to ${targetLang}. Return ONLY the translated text: ${text.trim()}`;
        let translatedText = text.trim();
        
        try {
            translatedText = await fetchGeminiTranslation("gemini-1.5-flash", "v1beta", apiKey, translationPrompt);
            console.log("[API/CHAT] Translation Success.");
        } catch (err) {
            console.warn("[API/CHAT] Translation fallback.");
            translatedText = text.trim();
        }

        // ---------------------------------------------------------
        // STEP 2: POETIC TTS (GEMINI AUDIO)
        // ---------------------------------------------------------
        const rhythmicText = processPoeticText(translatedText);
        console.log(`[API/CHAT] Rhythmic Processing: ${rhythmicText.substring(0, 50)}...`);

        const genAI = new GoogleGenerativeAI(apiKey);
        const generationConfig = {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } }, // High quality female voice
            },
        };

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig }, { apiVersion: "v1beta" });
        const result = await model.generateContent(`Read this text naturally with a poetic rhythm: ${rhythmicText}`);
        
        const part = result.response.candidates[0].content.parts.find(p => p.inlineData?.data);
        if (!part) throw new Error("Could not generate audio content.");

        // Return both text and the binary audio for CapCut usage
        return res.status(200).json({
            text: translatedText,
            audioData: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
            engine: 'Gemini-Poetic-v16'
        });

    } catch (error) {
        console.error('[API/CHAT] FATAL ERROR:', error);
        return res.status(500).json({ error: `v16.0 Error: ${error.message}` });
    }
}
