
import express from 'express';
import { getSetting, setSetting } from '../utils/settings.js';

const router = express.Router();

const ALLOWED_KEYS = [
    'ACOUSTID_CLIENT_ID',
    'SPOTIFY_CLIENT_ID',
    'SPOTIFY_CLIENT_SECRET',
    'GEMINI_API_KEY'
];

// GET settings
router.get('/', async (req, res, next) => {
    try {
        const settings = {};
        for (const key of ALLOWED_KEYS) {
            settings[key] = await getSetting(key) || '';
        }
        res.json(settings);
    } catch (err) {
        next(err);
    }
});

// POST update settings
router.post('/', async (req, res, next) => {
    try {
        const updates = req.body;
        for (const [key, value] of Object.entries(updates)) {
            if (ALLOWED_KEYS.includes(key)) {
                await setSetting(key, value);
            }
        }
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;
