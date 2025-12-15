
# Myousic Player

Myousic is a modern, dark-themed music player application built with React, Vite, Node.js, and SQLite. It features local file browsing, metadata identification using Audio Fingerprinting and AI, and a sleek visualizer.

## Features

- **Local Music Library**: Scan local folders for audio files (`.mp3`, `.wav`, `.flac`, etc.) and organize them by Artist, Album, and Song.
- **Smart Metadata Identification**:
  - **AcoustID**: Identifies songs via audio fingerprinting.
  - **Spotify Integration**: Fetches high-quality metadata and album art from Spotify.
  - **Gemini AI**: Cleans and refines metadata using Google's Gemini models.
- **Playback Control**: Full playback controls including Shuffle, Repeat, Seek, and Volume.
- **Audio Visualizer**: Real-time audio visualization with multiple presets (Bars, Wave, Circle, Shockwave, etc.).
- **Playlists & Favorites**: Create custom playlists and mark songs/albums/artists as favorites.
- **Search**: Comprehensive search across your local library.
- **Responsive Design**: optimized for desktop and tablet usage.

## Prerequisites

Before running the application, ensure you have the following installed:

1.  **Node.js**: (v18 or higher recommended).
2.  **fpcalc**: Required for audio fingerprinting.
    -   *Windows*: Download from [AcoustID](https://acoustid.org/chromaprint) and add to your system PATH.
    -   *Mac*: `brew install chromaprint`
    -   *Linux*: `sudo apt-get install libchromaprint-tools`
3.  **API Keys** (Optional but recommended for full functionality):
    -   **Gemini API Key**: For metadata refinement.
    -   **Spotify Client ID & Secret**: For fetching metadata from Spotify.

## Setup Instructions

### 1. Environment Setup

Create a `.env` file in the **backend** directory of the project. You can copy the structure below:

```env
# Server Configuration
PORT=3010
NODE_ENV=development

# Database
DB_PATH=backend/database.sqlite
UPLOAD_DIR=backend/uploads

# API Keys
GEMINI_API_KEY=your_gemini_api_key_here
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
ACOUSTID_CLIENT_ID=your_acoustid_client_id_here 
```

### 2. Install Dependencies

Install dependencies for both the frontend and backend.

```bash
# Install root/frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Run the Application

You need to run both the backend server and the frontend client.

**Option A: Run concurrently (if script is set up)**

```bash
npm run dev
```

**Option B: Run separately**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
# Server will start on http://localhost:3010
```

Terminal 2 (Frontend):
```bash
# In the project root
npm run client
# Frontend will start on http://localhost:5173
```

## Usage

1.  Open the app in your browser (usually `http://localhost:5173`).
2.  Go to the **Browse** page.
3.  Enter the full path to your local music folder in the "Scan Local Library" input.
    *   *Windows Example*: `C:\Users\Name\Music`
    *   *Mac/Linux Example*: `/Users/Name/Music`
4.  Click **Start Scan**. The app will index your files.
5.  Go to **Browse** or **Home** to start playing music!
6.  To identify a song with missing metadata, open the song details and use the **Magic Wand** (AcoustID) or **Sparkles** (Spotify) buttons.

