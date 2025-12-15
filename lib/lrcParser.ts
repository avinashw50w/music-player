
export interface LrcLine {
  time: number; // Time in seconds
  text: string;
}

/**
 * Parses an LRC string into an array of LrcLine objects.
 * Format: [mm:ss.xx]Text or [mm:ss:xx]Text or [mm:ss]Text
 */
export function parseLrc(lrc: string): LrcLine[] {
  if (!lrc) return [];

  const lines = lrc.split('\n');
  // Regex matches:
  // Group 1: Minutes
  // Group 2: Seconds
  // Group 3: Milliseconds (optional, without separator)
  // The separator can be . or :
  const regex = /^\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))?\](.*)$/;
  const result: LrcLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisecondsStr = match[3];
      const text = match[4].trim();

      let milliseconds = 0;
      if (millisecondsStr) {
          milliseconds = parseInt(millisecondsStr, 10);
          // Normalize milliseconds (can be 2 or 3 digits)
          // If 2 digits (e.g. 50), it usually means 500ms (centiseconds)
          if (millisecondsStr.length === 2) milliseconds *= 10;
      }

      const totalTime = minutes * 60 + seconds + milliseconds / 1000;

      result.push({
        time: totalTime,
        text
      });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}
