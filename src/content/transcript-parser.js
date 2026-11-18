/**
 * GeetKosh Transcript & Synchronized Lyrics Parser
 * Handles YouTube timed text formats (JSON3 and XML) and converts to GeetKosh lyric lines.
 */

class TranscriptParser {
  /**
   * Fetches and parses a YouTube timed text track URL
   * @param {string} baseUrl - Base URL from captionTracks
   * @returns {Promise<Array<{line_order: number, time_ms: number, duration_ms: number, text_np: string, text_en: string}>>}
   */
  static async fetchAndParse(baseUrl) {
    if (!baseUrl) return [];

    try {
      // Prefer JSON3 format for cleaner structure
      const fetchUrl = baseUrl.includes('fmt=json3') ? baseUrl : `${baseUrl}&fmt=json3`;
      const res = await fetch(fetchUrl);
      
      if (!res.ok) {
        // Fallback to raw XML fetch if json3 is rejected
        const xmlRes = await fetch(baseUrl);
        const xmlText = await xmlRes.text();
        return this.parseXml(xmlText);
      }

      const text = await res.text();
      try {
        const json = JSON.parse(text);
        return this.parseJson3(json);
      } catch {
        return this.parseXml(text);
      }
    } catch (err) {
      console.warn('[GeetKosh] Failed to fetch or parse transcript:', err);
      return [];
    }
  }

  /**
   * Parses YouTube JSON3 timed text response
   */
  static parseJson3(data) {
    if (!data || !Array.isArray(data.events)) return [];

    const lines = [];
    let order = 1;

    for (const event of data.events) {
      if (!event.segs || !Array.isArray(event.segs)) continue;

      const rawLine = event.segs
        .map(s => s.utf8 || '')
        .join('')
        .replace(/\n+/g, ' ')
        .trim();

      // Ignore empty or whitespace-only lines
      if (!rawLine || rawLine === '\n') continue;

      const timeMs = Math.round(Number(event.tStartMs) || 0);
      const durationMs = Math.round(Number(event.dDurationMs) || 3000);

      const isDev = /[\u0900-\u097F]/.test(rawLine);

      lines.push({
        line_order: order++,
        time_ms: timeMs,
        duration_ms: durationMs,
        text_np: isDev ? rawLine : '',
        text_en: !isDev ? rawLine : ''
      });
    }

    return lines;
  }

  /**
   * Parses YouTube XML timed text format (<text start="12.34" dur="4.5">...</text>)
   */
  static parseXml(xmlString) {
    if (!xmlString) return [];

    const lines = [];
    let order = 1;

    // Use DOMParser if available in browser context
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlString, 'text/xml');
      const textNodes = doc.querySelectorAll('text');

      textNodes.forEach(node => {
        const rawText = (node.textContent || '').replace(/\n+/g, ' ').trim();
        if (!rawText) return;

        const startSec = parseFloat(node.getAttribute('start') || '0');
        const durSec = parseFloat(node.getAttribute('dur') || '3');

        const timeMs = Math.round(startSec * 1000);
        const durationMs = Math.round(durSec * 1000);
        const isDev = /[\u0900-\u097F]/.test(rawText);

        lines.push({
          line_order: order++,
          time_ms: timeMs,
          duration_ms: durationMs,
          text_np: isDev ? rawText : '',
          text_en: !isDev ? rawLine : ''
        });
      });

      return lines;
    }

    // Fallback regex parser
    const regex = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/gi;
    let match;
    while ((match = regex.exec(xmlString)) !== null) {
      const startSec = parseFloat(match[1]);
      const durSec = parseFloat(match[2] || '3');
      const rawText = match[3]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

      if (!rawText) continue;

      const isDev = /[\u0900-\u097F]/.test(rawText);
      lines.push({
        line_order: order++,
        time_ms: Math.round(startSec * 1000),
        duration_ms: Math.round(durSec * 1000),
        text_np: isDev ? rawText : '',
        text_en: !isDev ? rawText : ''
      });
    }

    return lines;
  }

  /**
   * Parses standard LRC text string into line objects
   */
  static parseLrc(lrcContent) {
    if (!lrcContent) return [];
    const lines = [];
    let order = 1;

    const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/g;
    let match;

    while ((match = regex.exec(lrcContent)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const frac = match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10);
      const timeMs = min * 60000 + sec * 1000 + frac;
      const text = match[4].trim();

      if (!text) continue;

      const isDev = /[\u0900-\u097F]/.test(text);
      lines.push({
        line_order: order++,
        time_ms: timeMs,
        duration_ms: 3000,
        text_np: isDev ? text : '',
        text_en: !isDev ? text : ''
      });
    }

    return lines;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TranscriptParser };
}
