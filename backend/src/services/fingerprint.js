
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

/**
 * Runs fpcalc on a file and parses the output
 * @param {string} filePath 
 */
async function runFpcalc(filePath) {
    // Run fpcalc with -json flag if supported, but text output is more universally compatible with older versions
    const { stdout } = await execFileAsync('fpcalc', [filePath]);
    
    const lines = stdout.split('\n');
    const durationLine = lines.find(l => l.startsWith('DURATION='));
    const fingerprintLine = lines.find(l => l.startsWith('FINGERPRINT='));

    if (!durationLine || !fingerprintLine) {
        throw new Error('Invalid output from fpcalc');
    }

    return {
        duration: parseInt(durationLine.split('=')[1], 10),
        fingerprint: fingerprintLine.split('=')[1].trim()
    };
}

/**
 * Generates an audio fingerprint using fpcalc
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<{duration: number, fingerprint: string}>}
 */
export async function getFingerprint(filePath) {
    try {
        return await runFpcalc(filePath);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error('fpcalc not found in PATH');
            throw new Error('Audio fingerprinting tool (fpcalc) is not installed on the server.');
        }

        // Attempt to fix MP3 files if fpcalc fails
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.mp3') {
            try {
                console.warn(`fpcalc failed for ${path.basename(filePath)}. Attempting repair with mp3val...`);
                // Run mp3val to fix the file: mp3val <filepath> -f
                await execFileAsync('mp3val', [filePath, '-f']);
                
                console.log(`mp3val finished for ${path.basename(filePath)}. Retrying fpcalc...`);
                return await runFpcalc(filePath);
            } catch (fixError) {
                // If mp3val is missing or repair fails, just log and throw original error
                if (fixError.code === 'ENOENT') {
                    console.warn('mp3val not found. Cannot repair MP3 file. Please install mp3val.');
                } else {
                    console.warn('Failed to repair MP3 or retry fingerprint:', fixError.message);
                }
            }
        }
        
        throw error;
    }
}
