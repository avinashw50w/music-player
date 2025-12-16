
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
            model: 'gemini-2.5-flash-lite',
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
