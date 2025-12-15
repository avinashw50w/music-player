
export interface LrcLine {
  time: number; // Time in seconds
  text: string;
}

/**
 * Parses an LRC string into an array of LrcLine objects.
 * Format: [mm:ss.xx]Text
 */
export function parseLrc(lrc: string): LrcLine[] {
  if (!lrc) return [];

  const lines = lrc.split('\n');
  const regex = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/;
  const result: LrcLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3], 10);
      const text = match[4].trim();

      // Normalize milliseconds (can be 2 or 3 digits)
      const msNormalized = match[3].length === 2 ? milliseconds * 10 : milliseconds;

      const totalTime = minutes * 60 + seconds + msNormalized / 1000;

      result.push({
        time: totalTime,
        text
      });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}
