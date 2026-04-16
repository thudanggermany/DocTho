/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from "@google/genai";
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// Serve static files from the React app build folder
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY is not defined in the environment.');
}

const genAI = new GoogleGenAI({ apiKey });

// Helper for Base64 to Blob conversion if needed, 
// but here we just pass the data back to the frontend.

app.post('/api/generate', async (req, res) => {
    try {
        const { text, selectedLang, voiceCount, selectedVoiceIds, selectedConfigs, isPoetryVoice } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const langNames = {
            'vi': 'Vietnamese',
            'de': 'German',
            'en': 'English'
        };

        const targetLang = langNames[selectedLang] || 'Vietnamese';
        let textToRead = text.trim();

        // Step 1: Translate / Script
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

        // Step 2: Generate TTS
        const ttsModelName = "gemini-2.0-flash-exp"; // Using a stable flash model or experimental TTS
        const model = genAI.getGenerativeModel({ model: ttsModelName });

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

        const result = await model.generateContent([promptText], { generationConfig });
        
        const response = result.response;
        const audioPart = response.candidates[0].content.parts.find(p => p.inlineData?.data);
        
        if (audioPart) {
            res.json({
                text: textToRead,
                audioData: audioPart.inlineData.data,
                mimeType: audioPart.inlineData.mimeType
            });
        } else {
            res.status(500).json({ error: 'Failed to generate audio content' });
        }

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', apiConnected: !!apiKey });
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
