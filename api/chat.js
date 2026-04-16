/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Deployment Marker: v4.0 (Robust Fallback System)
console.log("[API/CHAT] Initializing DocTho Backend v4.0 with Fallback Support...");

import * as GoogleAI from "@google/generative-ai";

const GoogleGenerativeAI = GoogleAI.GoogleGenerativeAI;

export default async function DocThoHandler(req, res) {
    // Robust API key retrieval (Trying all common names)
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (req.method === 'GET') {
        return res.status(200).json({ 
            status: 'ok', 
            version: '4.0',
            apiConnected: !!apiKey 
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    console.log("[API/CHAT] v4.0 Request Received.");

    try {
        const { text, selectedLang, voiceCount, selectedVoiceIds, selectedConfigs, isPoetryVoice } = req.body;

        if (!text || !apiKey) {
            return res.status(400).json({ error: 'Missing Required Fields (text or API key)' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const langNames = { 'vi': 'Vietnamese', 'de': 'German', 'en': 'English' };
        const targetLang = langNames[selectedLang] || 'Vietnamese';
        let textToRead = text.trim();

        // ---------------------------------------------------------
        // STEP 1: TRANSLATION / SCRIPTING (with Fallbacks)
        // ---------------------------------------------------------
        console.log(`[API/CHAT] Step 1: Starting Translation/Scripting...`);
        
        let translationPrompt = `You are a professional translator. 
        Target Language: ${targetLang}
        Task: Translate the following text to ${targetLang} (if not already ${targetLang}). Return ONLY the translated text.
        Input Text: ${text.trim()}`;
        
        if (voiceCount > 1) {
            translationPrompt = `Format the following text as a ${targetLang} conversation between ${voiceCount} speakers named Speaker 1, Speaker 2, etc. Format: Speaker X: [text]. 
            Input Text: ${text.trim()}`;
        }

        const translationModelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-1.0-pro"];
        let translationSuccess = false;

        for (const modelName of translationModelsToTry) {
            try {
                console.log(`[API/CHAT] Attempting translation with ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: "v1beta" });
                const result = await model.generateContent(translationPrompt);
                textToRead = result.response.text().trim();
                translationSuccess = true;
                console.log(`[API/CHAT] Success with ${modelName}!`);
                break;
            } catch (err) {
                console.warn(`[API/CHAT] ${modelName} failed or not found. Error: ${err.message}`);
                continue;
            }
        }

        if (!translationSuccess) throw new Error("All translation models failed. Check API Key and Quota.");

        // ---------------------------------------------------------
        // STEP 2: TTS GENERATION (with Fallbacks)
        // ---------------------------------------------------------
        console.log(`[API/CHAT] Step 2: Starting TTS Generation...`);

        const ttsModelsToTry = ["gemini-2.0-flash", "gemini-2.0-flash-exp"];
        let ttsSuccess = false;
        let audioData = null;
        let mimeType = null;

        let promptText = `Read following ${targetLang} ${isPoetryVoice ? 'poetry' : 'text'}: ${textToRead}`;
        let generationConfig = {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedConfigs[0].base } },
            },
        };

        if (voiceCount > 1) {
            const effectiveConfigs = selectedConfigs.slice(0, 2);
            promptText = `Read conversation: ${textToRead}`;
            generationConfig.speechConfig = {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: effectiveConfigs.map((config, i) => ({
                        speaker: `Speaker ${i + 1}`,
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: config.base } }
                    }))
                }
            };
        }

        for (const modelName of ttsModelsToTry) {
            try {
                console.log(`[API/CHAT] Attempting TTS with ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName, generationConfig }, { apiVersion: "v1beta" });
                const result = await model.generateContent(promptText);
                const audioPart = result.response.candidates[0].content.parts.find(p => p.inlineData?.data);
                if (audioPart) {
                    audioData = audioPart.inlineData.data;
                    mimeType = audioPart.inlineData.mimeType;
                    ttsSuccess = true;
                    console.log(`[API/CHAT] TTS Success with ${modelName}!`);
                    break;
                }
            } catch (err) {
                console.warn(`[API/CHAT] TTS ${modelName} failed. Error: ${err.message}`);
                continue;
            }
        }

        if (!ttsSuccess) throw new Error("TTS Generation failed on all available models.");

        return res.status(200).json({
            text: textToRead,
            audioData: audioData,
            mimeType: mimeType
        });

    } catch (error) {
        console.error('[API/CHAT] FATAL ERROR:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
