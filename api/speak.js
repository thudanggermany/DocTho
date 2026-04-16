/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Deployment Marker: v10.0 (Google Cloud TTS Integration)
// Target Endpoint: /api/speak
console.log("[API/SPEAK] v10.0 (GOOGLE CLOUD TTS) Initializing...");

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
        const errorBody = await response.text();
        console.error(`[API/SPEAK] Gemini Translation ERROR (${response.status}):`, errorBody);
        throw new Error(errorBody);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/**
 * Google Cloud Text-to-Speech REST Call
 */
async function fetchGoogleTTS(text, lang, gender, apiKey) {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    
    // Map languages to Google Cloud TTS codes
    const langMap = { 'vi': 'vi-VN', 'de': 'de-DE', 'en': 'en-US' };
    const languageCode = langMap[lang] || 'vi-VN';
    
    // Select a standard voice based on gender
    let voiceName = `${languageCode}-Wavenet-A`; // Default Female
    if (gender === 'male') {
        voiceName = `${languageCode}-Wavenet-B`;
    }
    
    // Special handling for the high-quality Neural2 if available (Optional, but Wavenet is safe)
    if (languageCode === 'vi-VN' && gender === 'female') voiceName = 'vi-VN-Wavenet-A';
    if (languageCode === 'vi-VN' && gender === 'male') voiceName = 'vi-VN-Wavenet-B';

    const body = {
        input: { text },
        voice: { languageCode, name: voiceName },
        audioConfig: { audioEncoding: 'MP3' }
    };

    console.log(`[API/SPEAK] Google TTS Call: ${languageCode} (${voiceName})`);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[API/SPEAK] Google TTS ERROR (${response.status}):`, errorBody);
        throw new Error(`Google TTS Error: ${errorBody}`);
    }

    const data = await response.json();
    return { audioContent: data.audioContent, mimeType: 'audio/mpeg' };
}

export default async function DocThoSpeakHandler(req, res) {
    const geminiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    const ttsKey = process.env.GOOGLE_TTS_API_KEY;

    if (req.method === 'GET') {
        return res.status(200).json({ 
            status: 'ok', 
            version: '10.0 (GOOGLE TTS)', 
            geminiKeyDetected: !!geminiKey,
            ttsKeyDetected: !!ttsKey 
        });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    console.log(`[API/SPEAK] v10.0 Request Started.`);
    
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
        const translationPrompt = `Translate the following to ${targetLang}. Return ONLY translated text: ${text.trim()}`;
        let translatedText = text.trim();
        
        try {
            console.log("[API/SPEAK] Step 1: Translating with Gemini...");
            translatedText = await fetchGeminiTranslation("gemini-1.5-flash", "v1beta", geminiKey, translationPrompt);
            console.log("[API/SPEAK] Step 1 Success.");
        } catch (err) {
            console.warn("[API/SPEAK] Step 1 Failed, using original text.");
            translatedText = text.trim();
        }

        // ---------------------------------------------------------
        // STEP 2: TTS (GOOGLE CLOUD TTS)
        // ---------------------------------------------------------
        if (!ttsKey) {
            throw new Error("Google Cloud TTS API Key (GOOGLE_TTS_API_KEY) is missing. This is required for Step 2 in v10.0.");
        }

        console.log("[API/SPEAK] Step 2: Generating Audio with Google Cloud TTS...");
        const mainVoiceConfig = selectedConfigs[0];
        const { audioContent, mimeType } = await fetchGoogleTTS(
            translatedText, 
            selectedLang, 
            mainVoiceConfig?.gender || 'female', 
            ttsKey
        );
        console.log("[API/SPEAK] Step 2 Success.");

        return res.status(200).json({
            text: translatedText,
            audioData: audioContent,
            mimeType: mimeType
        });

    } catch (error) {
        console.error('[API/SPEAK] FATAL ERROR:', error);
        return res.status(500).json({ error: `v10.0 Error: ${error.message}` });
    }
}
