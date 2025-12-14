
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root (two levels up from src/config)
const backendRoot = path.join(__dirname, '../../');
dotenv.config({ path: path.join(backendRoot, '.env') });

// Helper to resolve paths relative to backend root if they aren't absolute
const resolvePath = (envPath, defaultPath) => {
    const p = envPath || defaultPath;
    return path.isAbsolute(p) ? p : path.join(backendRoot, p);
};

export const config = {
    PORT: process.env.PORT || 3010,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DB_PATH: resolvePath(process.env.DB_PATH, 'database.sqlite'),
    UPLOAD_DIR: resolvePath(process.env.UPLOAD_DIR, 'uploads'),
    ACOUSTID_CLIENT_ID: process.env.ACOUSTID_CLIENT_ID || '8XaBELgH'
};
