
import db from '../config/database.js';
import { config } from '../config/env.js';

export async function getSetting(key) {
    // Try DB first
    try {
        const setting = await db('system_settings').where({ key }).first();
        if (setting && setting.value) return setting.value;
    } catch (e) {
        // console.warn('DB setting fetch failed', e);
    }
    
    // Fallback to env config
    return config[key];
}

export async function setSetting(key, value) {
    await db('system_settings')
        .insert({ key, value })
        .onConflict('key')
        .merge();
}
