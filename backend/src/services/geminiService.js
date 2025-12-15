
import { GoogleGenAI } from "@google/genai";
import { config } from '../config/env.js';

/**
 * Uses Gemini to extract clean Title and Artist from filename and messy metadata.
 * @param {string} filename 
 * @param {string} currentTitle 
 * @param {string} currentArtist 
 * @param {string} currentAlbum
 * @returns {Promise<{title: string, artist: string}|null>}
 */
export async function refineMetadataWithGemini(filename, currentTitle, currentArtist, currentAlbum) {
    if (!config.GEMINI_API_KEY) {
        console.warn("Gemini API Key missing, skipping metadata refinement.");
        return null;
    }
    const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
    let prompt = `Please identify this song.
    Song Title: "${currentTitle || ''}"
    `;
    if (currentArtist !== 'Unknown Artist') prompt += `Artist Name: "${currentArtist || ''}"
    `;
    if (currentAlbum !== 'Unknown Album') prompt += `Song Album: "${currentAlbum || ''}"
    `;

    prompt += `.
    Return JSON format:
    {
      "title": "Clean Title",
      "artist": "Clean Artist"
    }`;
    console.log({currentTitle, currentArtist, currentAlbum, prompt})

    // const prompt = `
    // I have an audio file with potential dirty metadata.
    // Filename: "${filename || ''}"
    // Current Title: "${currentTitle || ''}"
    // Current Artist: "${currentArtist || ''}"
    // Current Album: "${currentAlbum || ''}"

    // Please analyze these inputs to extract the most probable Artist and Song Title. 
    // 1. Remove file extensions (like .mp3, .flac).
    // 2. Remove quality indicators (e.g., [HQ], 320kbps, @username).
    // 3. Remove website URLs or "downloaded from".
    // 4. Infer correct capitalization.
    // 5. If the current title/artist seems correct, return them as is.
    // 6. Use the album information to help verify the song if ambiguous.
    // 7. If you cannot extract confident data, return null values.

    // Return JSON format:
    // {
    //   "title": "Clean Title",
    //   "artist": "Clean Artist"
    // }
    // `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        const text = response.text;
        if (!text) return null;
        console.log(JSON.parse(text))
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini refinement failed:", error);
        return null;
    }
}
