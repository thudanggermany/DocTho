/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Deployment Marker: v13.0 (Web Speech Engine)
// Target Endpoint: /api/speak
console.log("[API/SPEAK] v13.0 (TRANSLATION ONLY) Initializing...");

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

export default async function DocThoSpeakHandler(req, res) {
    // Standardizing to GEMINI_API_KEY as requested
    const apiKey = process.env.GEMINI_API_KEY;

    if (req.method === 'GET') {
        return res.status(200).json({ status: 'ok', version: '13.0', keyDetected: !!apiKey });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    console.log(`[API/SPEAK] v13.0 Translation Request Received.`);
    
    if (!apiKey) {
        console.error("[API/SPEAK] GEMINI_API_KEY is missing in environment variables.");
        return res.status(401).json({ error: "GEMINI_API_KEY is missing on server. Check Vercel Dashboard." });
    }

    try {
        const { text, selectedLang } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        const langNames = { 'vi': 'Vietnamese', 'de': 'German', 'en': 'English' };
        const targetLang = langNames[selectedLang] || 'Vietnamese';

        // Perform Translation only
        const translationPrompt = `Translate the following to ${targetLang}. Return ONLY the translated text: ${text.trim()}`;
        let translatedText = text.trim();
        
        try {
            translatedText = await fetchGeminiTranslation("gemini-1.5-flash", "v1beta", apiKey, translationPrompt);
            console.log("[API/SPEAK] v13.0 Translation SUCCESS.");
        } catch (err) {
            console.warn("[API/SPEAK] v13.0 Translation failed, returning original.");
            translatedText = text.trim();
        }

        // Return only the text. Frontend will handle the speaking.
        return res.status(200).json({
            text: translatedText,
            mode: 'WebSpeechAPI'
        });

    } catch (error) {
        console.error('[API/SPEAK] FATAL ERROR:', error);
        return res.status(500).json({ error: error.message });
    }
}
