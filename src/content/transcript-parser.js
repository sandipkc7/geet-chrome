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
   * Fetches authentic caption tracks directly via YouTube's Android InnerTube API.
   * Completely bypasses WEB client's exp=xpe / PoToken anti-bot blocks that cause 0-byte responses.
   * @param {string} videoId - YouTube Video ID
   * @returns {Promise<Array<{id: number, name: string, languageCode: string, baseUrl: string, isAsr: boolean}>>}
   */
  static async fetchInnertubeTracks(videoId) {
    if (!videoId) return [];

    // 1. Try background service worker first (has elevated extension host permissions & in-memory caching)
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        const bgRes = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: 'FETCH_YOUTUBE_INNERTUBE_TRACKS', videoId }, (res) => {
            if (chrome.runtime.lastError || !res?.success) resolve(null);
            else resolve(res.tracks);
          });
        });
        if (Array.isArray(bgRes) && bgRes.length > 0) return bgRes;
      } catch (e) {}
    }

    // 2. Direct fetch fallback
    try {
      let apiKey = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
      if (typeof window !== 'undefined' && window.ytcfg?.get) {
        const key = window.ytcfg.get('INNERTUBE_API_KEY');
        if (key) apiKey = key;
      }

      const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '20.10.38'
            }
          },
          videoId: videoId
        })
      });

      if (!res.ok) return [];
      const data = await res.json();
      const rawTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

      return rawTracks.map((t, idx) => {
        let displayName = '';
        if (Array.isArray(t.name?.runs) && t.name.runs.length > 0) {
          displayName = t.name.runs.map(r => r.text || '').join('');
        } else if (t.name?.simpleText) {
          displayName = t.name.simpleText;
        } else {
          displayName = t.languageCode ? t.languageCode.toUpperCase() : `Track ${idx + 1}`;
        }

        return {
          id: idx,
          name: displayName,
          languageCode: t.languageCode || '',
          baseUrl: t.baseUrl || '',
          isAsr: t.kind === 'asr'
        };
      });
    } catch (err) {
      console.warn('[GeetKosh] InnerTube caption fetch error:', err);
      return [];
    }
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

      // Try fetching as-is first (handles XML format 3, SRV3, and raw timedtext directly)
      try {
        const rawRes = await fetch(fetchUrl);
        if (rawRes.ok) {
          const text = await rawRes.text();
          if (text && text.trim().length > 0) {
            if (text.startsWith('WEBVTT')) {
              return this.parseVtt(text);
            }
            if (text.startsWith('{')) {
              try {
                const json = JSON.parse(text);
                const parsed = this.parseJson3(json);
                if (parsed && parsed.length > 0) return parsed;
              } catch (e) {}
            }
            const parsed = this.parseXml(text);
            if (parsed && parsed.length > 0) return parsed;
          }
        }
      } catch (e) {}

      // Fallback 1: Try JSON3 format
      const json3Url = fetchUrl.includes('fmt=json3') ? fetchUrl : `${fetchUrl}&fmt=json3`;
      try {
        const res = await fetch(json3Url);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().length > 0) {
            const json = JSON.parse(text);
            const parsed = this.parseJson3(json);
            if (parsed && parsed.length > 0) return parsed;
          }
        }
      } catch (e) {}

      // Fallback 2: Fetch WebVTT format explicitly
      const vttUrl = fetchUrl.includes('fmt=vtt') ? fetchUrl : `${fetchUrl}&fmt=vtt`;
      try {
        const vttRes = await fetch(vttUrl);
        if (vttRes.ok) {
          const text = await vttRes.text();
          if (text && text.startsWith('WEBVTT')) {
            const parsed = this.parseVtt(text);
            if (parsed && parsed.length > 0) return parsed;
          }
        }
      } catch (e) {}

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

      const startSec = Math.round((timeMs / 1000) * 100) / 100;
      const endSec = Math.round(((timeMs + durationMs) / 1000) * 100) / 100;

      lines.push({
        line_order: order++,
        time_ms: timeMs,
        duration_ms: durationMs,
        start_time: startSec,
        end_time: endSec,
        text_np: isDev ? rawLine : '',
        text_en: !isDev ? rawLine : ''
      });
    }

    return lines;
  }

  /**
   * Parses YouTube XML timed text formats:
   * 1. Modern SRV3 format (<timedtext format="3"> <body> <p t="1234" d="5678">...</p> )
   * 2. Classic XML format (<transcript> <text start="12.34" dur="4.5">...</text> )
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

        // Check for <p t="..." d="..."> format (SRV3 format, millisecond timestamps)
        const pNodes = doc.querySelectorAll('p');
        if (pNodes && pNodes.length > 0) {
          pNodes.forEach(node => {
            const rawText = this.decodeHtml((node.textContent || '').replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').trim());
            if (!rawText || /^\[(?:music|applause|cheering)\]$/i.test(rawText) || rawText === '♪') return;

            const timeMs = parseInt(node.getAttribute('t') || '0', 10);
            const durationMs = parseInt(node.getAttribute('d') || '3000', 10);
            const isDev = /[\u0900-\u097F]/.test(rawText);

            const startValSec = Math.round((timeMs / 1000) * 100) / 100;
            const endValSec = Math.round(((timeMs + durationMs) / 1000) * 100) / 100;

            lines.push({
              line_order: order++,
              time_ms: timeMs,
              duration_ms: durationMs,
              start_time: startValSec,
              end_time: endValSec,
              text_np: isDev ? rawText : '',
              text_en: !isDev ? rawText : ''
            });
          });

          if (lines.length > 0) return lines;
        }

        // Check for <text start="..." dur="..."> format (standard seconds format)
        const textNodes = doc.querySelectorAll('text');
        if (textNodes && textNodes.length > 0) {
          textNodes.forEach(node => {
            const rawText = this.decodeHtml((node.textContent || '').replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').trim());
            if (!rawText || /^\[(?:music|applause|cheering)\]$/i.test(rawText) || rawText === '♪') return;

            const startSec = parseFloat(node.getAttribute('start') || '0');
            const durSec = parseFloat(node.getAttribute('dur') || '3');

            const timeMs = Math.round(startSec * 1000);
            const durationMs = Math.round(durSec * 1000);
            const isDev = /[\u0900-\u097F]/.test(rawText);

            const startValSec = Math.round(startSec * 100) / 100;
            const endValSec = Math.round((startSec + durSec) * 100) / 100;

            lines.push({
              line_order: order++,
              time_ms: timeMs,
              duration_ms: durationMs,
              start_time: startValSec,
              end_time: endValSec,
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

    // Fallback regex parser for <p t="..." d="..."> format
    const pRegex = /<p\s+t="(\d+)"(?:\s+d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/gi;
    let pMatch;
    while ((pMatch = pRegex.exec(xmlString)) !== null) {
      const timeMs = parseInt(pMatch[1], 10);
      const durationMs = parseInt(pMatch[2] || '3000', 10);
      const rawText = this.decodeHtml(pMatch[3].replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').trim());

      if (!rawText || /^\[(?:music|applause|cheering)\]$/i.test(rawText) || rawText === '♪') continue;

      const isDev = /[\u0900-\u097F]/.test(rawText);
      const startValSec = Math.round((timeMs / 1000) * 100) / 100;
      const endValSec = Math.round(((timeMs + durationMs) / 1000) * 100) / 100;

      lines.push({
        line_order: order++,
        time_ms: timeMs,
        duration_ms: durationMs,
        start_time: startValSec,
        end_time: endValSec,
        text_np: isDev ? rawText : '',
        text_en: !isDev ? rawText : ''
      });
    }

    if (lines.length > 0) return lines;

    // Fallback regex parser for <text start="..."> format
    const regex = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/gi;
    let match;
    while ((match = regex.exec(xmlString)) !== null) {
      const startSec = parseFloat(match[1]);
      const durSec = parseFloat(match[2] || '3');
      const rawText = this.decodeHtml(match[3].replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').trim());

      if (!rawText || /^\[(?:music|applause|cheering)\]$/i.test(rawText) || rawText === '♪') continue;

      const isDev = /[\u0900-\u097F]/.test(rawText);
      const timeMs = Math.round(startSec * 1000);
      const durationMs = Math.round(durSec * 1000);
      lines.push({
        line_order: order++,
        time_ms: timeMs,
        duration_ms: durationMs,
        start_time: Math.round(startSec * 100) / 100,
        end_time: Math.round((startSec + durSec) * 100) / 100,
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
      const durationMs = Math.max(1000, endTime - startTime);
      lines.push({
        line_order: order++,
        time_ms: startTime,
        duration_ms: durationMs,
        start_time: Math.round((startTime / 1000) * 100) / 100,
        end_time: Math.round(((startTime + durationMs) / 1000) * 100) / 100,
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
        start_time: Math.round((timeMs / 1000) * 100) / 100,
        end_time: Math.round(((timeMs + 3000) / 1000) * 100) / 100,
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
