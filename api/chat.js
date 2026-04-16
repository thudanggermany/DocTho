/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    const apiKey = process.env.VITE_GEMINI_API_KEY;

    // Handle Health Check
    if (req.method === 'GET') {
        return res.status(200).json({ 
            status: 'ok', 
            apiConnected: !!apiKey 
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // DEBUG: Log incoming request body
    console.log("[API/CHAT] Incoming POST request. Body:", JSON.stringify(req.body));

    try {
        const { text, selectedLang, voiceCount, selectedVoiceIds, selectedConfigs, isPoetryVoice } = req.body;

        if (!text) {
            console.warn("[API/CHAT] Missing text in request body.");
            return res.status(400).json({ error: 'Text is required' });
        }

        if (!apiKey) {
            console.error("[API/CHAT] VITE_GEMINI_API_KEY is missing from environment.");
            return res.status(500).json({ error: 'VITE_GEMINI_API_KEY is not defined in the environment.' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        const langNames = {
            'vi': 'Vietnamese',
            'de': 'German',
            'en': 'English'
        };

        const targetLang = langNames[selectedLang] || 'Vietnamese';
        let textToRead = text.trim();

        // Step 1: Translate / Script
        console.log(`[API/CHAT] Step 1: Translating to ${targetLang}...`);
        let translationPrompt = `You are a professional translator. 
        Target Language: ${targetLang}
        
        Task: 
        1. If the input text is already in ${targetLang}, return it exactly as is.
        2. If the input text is in a different language, translate it to ${targetLang}.
        3. Return ONLY the ${targetLang} text. No explanations, no notes.
        
        Input Text: ${text.trim()}`;
        
        if (voiceCount > 1) {
            const numSpeakers = voiceCount;
            translationPrompt = `You are a script writer and translator.
            Target Language: ${targetLang}
            
            Task:
            1. Translate the input text to ${targetLang} (if not already).
            2. Format it as a natural conversation between ${numSpeakers} speakers named ${Array.from({length: numSpeakers}, (_, i) => `Speaker ${i+1}`).join(', ')}.
            3. Format the output EXACTLY like this:
            ${Array.from({length: numSpeakers}, (_, i) => `Speaker ${i+1}: [text]`).join('\n            ')}
            
            Return ONLY the formatted conversation in ${targetLang}. No explanations.
            
            Input Text: ${text.trim()}`;
        }

        const translationModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const translationResponse = await translationModel.generateContent(translationPrompt);
        textToRead = translationResponse.response.text().trim();
        console.log("[API/CHAT] Translation/Scripting complete.");

        // Step 2: Generate TTS
        const ttsModelName = "gemini-2.0-flash-exp"; 
        
        let promptText = `Read the following ${targetLang} ${isPoetryVoice ? 'poetry' : 'text'} clearly: ${textToRead}`;
        if (isPoetryVoice) {
            promptText = `Read the following ${targetLang} poetry with a rhythmic, emotional, and soul-stirring tone: ${textToRead}`;
        }

        let generationConfig = {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: selectedConfigs[0].base },
                },
            },
        };

        if (voiceCount > 1) {
            const effectiveConfigs = selectedConfigs.slice(0, 2);
            promptText = `Read the following ${targetLang} conversation between ${effectiveConfigs.map((_, i) => `Speaker ${i + 1}`).join(' and ')}:
            ${textToRead}`;
            
            generationConfig = {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: effectiveConfigs.map((config, i) => ({
                            speaker: `Speaker ${i + 1}`,
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: config.base }
                            }
                        }))
                    }
                }
            };
        }

        console.log(`[API/CHAT] Step 2: Generating Audio with model ${ttsModelName}...`);
        const ttsModel = genAI.getGenerativeModel({ model: ttsModelName, generationConfig });
        const result = await ttsModel.generateContent(promptText);
        const response = result.response;
        const audioPart = response.candidates[0].content.parts.find(p => p.inlineData?.data);
        
        if (audioPart) {
            console.log("[API/CHAT] Audio generated successfully.");
            return res.status(200).json({
                text: textToRead,
                audioData: audioPart.inlineData.data,
                mimeType: audioPart.inlineData.mimeType
            });
        } else {
            console.error("[API/CHAT] No audio data found in AI response.");
            return res.status(500).json({ error: 'Failed to generate audio content' });
        }

    } catch (error) {
        // DETAILED ERROR LOGGING
        console.error('[API/CHAT] DETAILED ERROR:', error);
        console.error('[API/CHAT] Error Stack:', error.stack);
        return res.status(500).json({ error: error.message || 'Unknown Server Error' });
    }
}
