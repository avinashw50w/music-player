
import { GoogleGenAI } from "@google/genai";
import { config } from '../config/env.js';
import { getSetting } from '../utils/settings.js';

/**
 * Uses Gemini to extract clean Title and Artist from filename and messy metadata.
 * @param {string} filename 
 * @param {string} currentTitle 
 * @param {string} currentArtist 
 * @param {string} currentAlbum
 * @returns {Promise<{title: string, artist: string}|null>}
 */
export async function refineMetadataWithGemini(filename, currentTitle, currentArtist, currentAlbum) {
    const apiKey = await getSetting('GEMINI_API_KEY');

    if (!apiKey) {
        console.warn("Gemini API Key missing in Settings, skipping metadata refinement.");
        return null;
    }
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Construct context part of prompt
    let context = `Song Title: "${currentTitle || ''}"
`;
    
    if (currentArtist && currentArtist !== 'Unknown Artist') {
        context += `Artist Name: "${currentArtist}"
    `;
    }
    
    if (currentAlbum && currentAlbum !== 'Unknown Album') {
        context += `Song Album: "${currentAlbum}"
    `;
    }
    const prompt = `Identify a song based on the input text. Return the song details in a JSON format.
**Instructions**
1. If a particular field is not available then return Unknown Artist or Unknown Album.
2. If genre is not available then return empty array
3. Don't include coverUrl in output json if not found.
**Input Text (Song Data):**
${context}

**Required JSON Format:**
\`\`\`json
{
  "title": "Clean Title",
  "artist": "Clean Artist",
  "album": "Album Name",
  "genre": ["Genre1", "Genre2"],
  "year": 2000,
  "coverUrl": "https://cover_url.jpg"
}
\`\`\`
`;
    // console.log({currentTitle, currentArtist, currentAlbum, prompt})

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        const text = response.text;
        if (!text) return null;
        // console.log(JSON.parse(text))
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini refinement failed:", error);
        return null;
    }
}
