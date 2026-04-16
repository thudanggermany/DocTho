/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Deployment Marker: v14.0 (Identity Restoration)
// Target Endpoint: /api/chat
console.log("[API/CHAT] v14.0 (RESTORED) Initializing...");

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

export default async function DocThoChatHandler(req, res) {
    // Explicitly using GEMINI_API_KEY as requested
    const apiKey = process.env.GEMINI_API_KEY;

    if (req.method === 'GET') {
        return res.status(200).json({ status: 'ok', version: '14.0', service: 'chat', keyDetected: !!apiKey });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    console.log(`[API/CHAT] v14.0 Translation Request Received.`);
    
    if (!apiKey) {
        console.error("[API/CHAT] GEMINI_API_KEY is missing.");
        return res.status(401).json({ error: "GEMINI_API_KEY missing on server." });
    }

    try {
        const { text, selectedLang } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        const langNames = { 'vi': 'Vietnamese', 'de': 'German', 'en': 'English' };
        const targetLang = langNames[selectedLang] || 'Vietnamese';

        // Translation logic (Gemini)
        const translationPrompt = `Translate to ${targetLang}. Return ONLY the translated text: ${text.trim()}`;
        let translatedText = text.trim();
        
        try {
            translatedText = await fetchGeminiTranslation("gemini-1.5-flash", "v1beta", apiKey, translationPrompt);
            console.log("[API/CHAT] v14.0 Translation SUCCESS.");
        } catch (err) {
            console.warn("[API/CHAT] v14.0 Translation fallback.");
            translatedText = text.trim();
        }

        // Return translated text. Audio handled by Web Speech API in frontend.
        return res.status(200).json({
            text: translatedText,
            source: 'v14.0-Chat'
        });

    } catch (error) {
        console.error('[API/CHAT] FATAL ERROR:', error);
        return res.status(500).json({ error: error.message });
    }
}
