/**
 * GeetKosh Transcript & Synchronized Lyrics Parser
 * Handles YouTube timed text formats (JSON3, XML, VTT) and converts to GeetKosh lyric lines.
 */

class TranscriptParser {
  /**
   * Decodes HTML character entities often found in subtitle files
   */
  static decodeHtml(html) {
    if (!html) return '';
    return html
      .replace(/&amp;#39;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  /**
   * Fetches and parses a YouTube timed text track URL
   * @param {string} baseUrl - Base URL from captionTracks
   * @param {string} [translationLang] - Optional translation language code (e.g. 'en' or 'ne')
   * @returns {Promise<Array<{line_order: number, time_ms: number, duration_ms: number, text_np: string, text_en: string}>>}
   */
  static async fetchAndParse(baseUrl, translationLang = '') {
    if (!baseUrl) return [];

    try {
      let fetchUrl = baseUrl;
      if (translationLang) {
        fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + `tlang=${translationLang}`;
      }

      // Try JSON3 format first (fastest, cleanest structure)
      const json3Url = fetchUrl.includes('fmt=json3') ? fetchUrl : `${fetchUrl}&fmt=json3`;
      try {
        const res = await fetch(json3Url, { credentials: 'omit' });
        if (res.ok) {
          const text = await res.text();
          const json = JSON.parse(text);
          const parsed = this.parseJson3(json);
          if (parsed && parsed.length > 0) return parsed;
        }
      } catch (e) {
        // Fallback to XML / raw format
      }

      // Fallback 1: Fetch raw / XML
      const rawRes = await fetch(fetchUrl, { credentials: 'omit' });
      if (rawRes.ok) {
        const text = await rawRes.text();
        if (text.startsWith('WEBVTT')) {
          return this.parseVtt(text);
        }
        return this.parseXml(text);
      }

      return [];
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

      const rawLine = this.decodeHtml(
        event.segs
          .map(s => s.utf8 || '')
          .join('')
          .replace(/\n+/g, ' ')
          .trim()
      );

      // Ignore empty or whitespace-only lines or audio bracket cues like [Music] / ♪
      if (!rawLine || rawLine === '\n' || /^\[(?:music|applause|cheering)\]$/i.test(rawLine) || rawLine === '♪') continue;

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
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');
        const textNodes = doc.querySelectorAll('text');

        if (textNodes && textNodes.length > 0) {
          textNodes.forEach(node => {
            const rawText = this.decodeHtml((node.textContent || '').replace(/\n+/g, ' ').trim());
            if (!rawText || /^\[(?:music|applause|cheering)\]$/i.test(rawText) || rawText === '♪') return;

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
              text_en: !isDev ? rawText : ''
            });
          });

          if (lines.length > 0) return lines;
        }
      } catch (domErr) {
        // Fall back to regex parser
      }
    }

    // Fallback regex parser
    const regex = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/gi;
    let match;
    while ((match = regex.exec(xmlString)) !== null) {
      const startSec = parseFloat(match[1]);
      const durSec = parseFloat(match[2] || '3');
      const rawText = this.decodeHtml(match[3]).replace(/\n+/g, ' ').trim();

      if (!rawText || /^\[(?:music|applause|cheering)\]$/i.test(rawText) || rawText === '♪') continue;

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
   * Parses WebVTT subtitle format
   */
  static parseVtt(vttString) {
    if (!vttString) return [];
    const lines = [];
    let order = 1;

    const blockRegex = /(?:(\d{2}:)?(\d{2}):(\d{2})[.,](\d{3}))\s*-->\s*(?:(\d{2}:)?(\d{2}):(\d{2})[.,](\d{3}))\s*\r?\n([\s\S]*?)(?=\r?\n\r?\n|$)/gi;
    let match;

    while ((match = blockRegex.exec(vttString)) !== null) {
      const startH = match[1] ? parseInt(match[1].replace(':', ''), 10) : 0;
      const startM = parseInt(match[2], 10);
      const startS = parseInt(match[3], 10);
      const startMs = parseInt(match[4], 10);
      const startTime = startH * 3600000 + startM * 60000 + startS * 1000 + startMs;

      const endH = match[5] ? parseInt(match[5].replace(':', ''), 10) : 0;
      const endM = parseInt(match[6], 10);
      const endS = parseInt(match[7], 10);
      const endMs = parseInt(match[8], 10);
      const endTime = endH * 3600000 + endM * 60000 + endS * 1000 + endMs;

      const rawText = this.decodeHtml(match[9].replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').trim());
      if (!rawText || /^\[(?:music|applause|cheering)\]$/i.test(rawText) || rawText === '♪') continue;

      const isDev = /[\u0900-\u097F]/.test(rawText);
      lines.push({
        line_order: order++,
        time_ms: startTime,
        duration_ms: Math.max(1000, endTime - startTime),
        text_np: isDev ? rawText : '',
        text_en: !isDev ? rawText : ''
      });
    }

    return lines;
  }

  /**
   * Merges primary and secondary caption tracks by timestamp alignment
   * Combines Devanagari (text_np) and Romanized/English (text_en) into single synchronized lyric objects
   */
  static mergeCaptionTracks(primaryLines, secondaryLines) {
    if (!secondaryLines || secondaryLines.length === 0) return primaryLines || [];
    if (!primaryLines || primaryLines.length === 0) return secondaryLines || [];

    return primaryLines.map(line => {
      // Find closest matching line in secondary track within 1.5 seconds (1500ms)
      const match = secondaryLines.find(sec => Math.abs(sec.time_ms - line.time_ms) <= 1500);
      if (!match) return line;

      return {
        ...line,
        text_np: line.text_np || match.text_np || '',
        text_en: line.text_en || match.text_en || ''
      };
    });
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
      const text = this.decodeHtml(match[4].trim());

      if (!text || /^\[(?:music|applause)\]$/i.test(text) || text === '♪') continue;

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
