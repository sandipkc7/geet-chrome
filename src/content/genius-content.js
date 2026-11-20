/**
 * GeetKosh (गीतकोश) — Genius.com Scraper & Bilingual Lyrics Harvester
 * Extracts song title, artist, zero-quota YouTube video ID, release date,
 * and section-aligned bilingual (Romanized + Devanagari) lyrics.
 */

(function () {
  'use strict';

  function isSongPage() {
    return window.location.pathname.includes('-lyrics') || !!document.querySelector('div[data-lyrics-container="true"]');
  }

  function containsDevanagari(str) {
    return /[\u0900-\u097F]/.test(str || '');
  }

  /**
   * C-style escape unescaping for Genius JSON.parse('...') script contents
   */
  function stripcslashes(str) {
    if (!str) return '';
    return str.replace(/\\([nrtvf0'"]|x[0-9a-fA-F]{2}|[0-7]{1,3}|\\)/g, (match, p1) => {
      switch (p1) {
        case 'n': return '\n';
        case 'r': return '\r';
        case 't': return '\t';
        case 'v': return '\v';
        case 'f': return '\f';
        case '0': return '\0';
        case "'": return "'";
        case '"': return '"';
        case '\\': return '\\';
        default:
          if (p1.startsWith('x')) return String.fromCharCode(parseInt(p1.slice(1), 16));
          if (/^[0-7]+$/.test(p1)) return String.fromCharCode(parseInt(p1, 8));
          return p1;
      }
    });
  }

  /**
   * Extract and parse Genius window.__PRELOADED_STATE__ from script tags
   */
  function getPreloadedState() {
    const scripts = document.querySelectorAll('script');
    for (const s of scripts) {
      const text = s.textContent || '';
      if (text.includes('__PRELOADED_STATE__')) {
        const match = text.match(/window\.__PRELOADED_STATE__\s*=\s*JSON\.parse\('([\s\S]+?)'\);/);
        if (match) {
          try {
            const decoded = stripcslashes(match[1]);
            return JSON.parse(decoded);
          } catch (e) {
            console.warn('[GeetKosh Genius] Failed to parse __PRELOADED_STATE__:', e);
          }
        }
      }
    }
    return null;
  }

  /**
   * Extract cleaned lyric lines from Genius DOM containers
   */
  function extractLyricsFromDoc(doc) {
    const containers = doc.querySelectorAll('div[data-lyrics-container="true"]');
    const lines = [];

    containers.forEach(container => {
      const clone = container.cloneNode(true);
      // Remove header banners, translation chips, buttons, annotations
      clone.querySelectorAll('div[class*="LyricsHeader"], button, sup, a[class*="ReferentFragment"]').forEach(el => {
        // If referent fragment, unwrap its text rather than deleting
        if (el.tagName === 'A') {
          el.replaceWith(...el.childNodes);
        } else {
          el.remove();
        }
      });

      // Convert <br> tags to standard newlines
      clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

      const text = clone.textContent || '';
      text.split('\n').forEach(raw => {
        // Remove zero-width spaces and clean
        const trimmed = raw.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
        if (trimmed) {
          lines.push(trimmed);
        }
      });
    });

    return lines;
  }

  /**
   * Group flat lines into sections based on [Verse 1], [Chorus], etc.
   */
  function groupIntoSections(lines) {
    const sections = [];
    let current = { name: 'Lyrics', lines: [] };

    for (const l of lines) {
      if (/^\[.+\]$/.test(l.trim())) {
        if (current.lines.length > 0 || current.name !== 'Lyrics') {
          sections.push(current);
        }
        current = { name: l.replace(/[\[\]]/g, '').trim(), lines: [] };
      } else {
        current.lines.push(l);
      }
    }
    if (current.lines.length > 0 || sections.length === 0) {
      sections.push(current);
    }
    return sections;
  }

  /**
   * Align Romanized and Devanagari lines section by section
   */
  function alignBilingualLyrics(romanLines, devLines) {
    const hasRom = romanLines && romanLines.length > 0;
    const hasDev = devLines && devLines.length > 0;

    if (!hasDev && hasRom) {
      return romanLines.map((line, idx) => ({
        line_order: idx + 1,
        text_roman: line.startsWith('[') ? '' : line,
        text_en: line.startsWith('[') ? '' : line,
        text_np: '',
        chords: '',
        section_name: line.startsWith('[') ? line.replace(/[\[\]]/g, '').trim() : ''
      })).filter(l => l.text_roman || l.section_name);
    }

    if (!hasRom && hasDev) {
      return devLines.map((line, idx) => ({
        line_order: idx + 1,
        text_roman: '',
        text_en: '',
        text_np: line.startsWith('[') ? '' : line,
        chords: '',
        section_name: line.startsWith('[') ? line.replace(/[\[\]]/g, '').trim() : ''
      })).filter(l => l.text_np || l.section_name);
    }

    if (!hasRom && !hasDev) return [];

    const romSections = groupIntoSections(romanLines);
    const devSections = groupIntoSections(devLines);

    const aligned = [];
    let order = 1;

    const maxSec = Math.max(romSections.length, devSections.length);
    for (let s = 0; s < maxSec; s++) {
      const rSec = romSections[s] || { name: '', lines: [] };
      const dSec = devSections[s] || { name: '', lines: [] };
      const secName = rSec.name || dSec.name || '';
      const maxLines = Math.max(rSec.lines.length, dSec.lines.length);

      for (let i = 0; i < maxLines; i++) {
        const rLine = rSec.lines[i] || '';
        const dLine = dSec.lines[i] || '';
        if (rLine || dLine) {
          aligned.push({
            line_order: order++,
            text_roman: rLine,
            text_en: rLine,
            text_np: dLine,
            chords: '',
            section_name: i === 0 ? secName : ''
          });
        }
      }
    }

    return aligned;
  }

  /**
   * Main async extractor for Genius page
   */
  async function extractGeniusPage() {
    const state = getPreloadedState();
    const songsInState = state?.entities?.songs || {};

    let canonicalSong = null;
    let romanizedSong = null;
    let fallbackPrimarySong = null;

    for (const [id, s] of Object.entries(songsInState)) {
      const title = (s.title || '').toLowerCase();
      const path = (s.path || '').toLowerCase();
      const artist = (s.artistNames || s.primaryArtist?.name || '').toLowerCase();

      const isRoman = title.includes('romanized') || path.includes('romanized') || artist.includes('romanization');
      const isEnglish = title.includes('english') || path.includes('english') || artist.includes('english translation');

      if (isRoman) {
        romanizedSong = s;
      } else if (!isEnglish && !artist.startsWith('genius')) {
        canonicalSong = s;
      } else if (!isEnglish) {
        fallbackPrimarySong = s;
      }
    }

    if (!canonicalSong && fallbackPrimarySong) {
      canonicalSong = fallbackPrimarySong;
    }

    // Determine current page characteristics
    const currentUrl = window.location.href;
    const isCurrentRomanized = currentUrl.toLowerCase().includes('romanized');
    const primarySong = isCurrentRomanized ? (canonicalSong || romanizedSong) : (canonicalSong || romanizedSong);

    // 1. Song Title & Artist
    let titleEn = '';
    let titleNp = '';
    let artistName = '';

    if (canonicalSong) {
      titleEn = (canonicalSong.title || '').trim();
      artistName = (canonicalSong.artistNames || canonicalSong.primaryArtist?.name || '').trim();
    }

    if (!artistName && romanizedSong) {
      artistName = (romanizedSong.artistNames || romanizedSong.primaryArtist?.name || '').trim();
    }

    // DOM Fallback for Title & Artist
    if (!titleEn || !artistName || artistName.toLowerCase().startsWith('genius')) {
      const h1 = document.querySelector('h1');
      if (h1) {
        const rawH1 = h1.textContent.trim();
        // Match "Artist - Title (Romanized)" format
        const titleMatch = rawH1.match(/^(.+?)\s*[-–—]\s*(.+?)(?:\s*\((?:Romanized|Nepali|Devanagari)\))?$/i);
        if (titleMatch) {
          if (!artistName || artistName.toLowerCase().startsWith('genius')) {
            artistName = titleMatch[1].trim();
          }
          if (!titleEn) {
            titleEn = titleMatch[2].trim();
          }
        } else {
          titleEn = rawH1.replace(/\s*\(Romanized\)\s*/i, '').trim();
        }
      }
    }

    // Clean artist name if still stuck on "Genius Romanizations"
    if (artistName.toLowerCase().startsWith('genius')) {
      const metaTitle = document.title || '';
      const parts = metaTitle.split('–').join('-').split('-');
      if (parts.length >= 2) {
        artistName = parts[0].trim();
        if (!titleEn) {
          titleEn = parts[1].replace(/lyrics|romanized|\(.*?\)|\|.*/gi, '').trim();
        }
      }
    }

    if (containsDevanagari(titleEn)) {
      titleNp = titleEn;
    }

    // 2. YouTube Video ID (Zero Quota)
    let youtubeId = null;
    const mediaList = romanizedSong?.media || canonicalSong?.media || [];
    for (const m of mediaList) {
      if (m.provider === 'youtube' && m.url) {
        const mMatch = m.url.match(/(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (mMatch) {
          youtubeId = mMatch[1];
          break;
        }
      }
    }

    if (!youtubeId) {
      const scripts = document.querySelectorAll('script');
      for (const s of scripts) {
        const content = s.textContent || '';
        const match = content.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (match) {
          youtubeId = match[1];
          break;
        }
      }
    }

    // 3. Metadata: Cover Art, Release Year, Writers & Composers
    const targetMetaSong = romanizedSong || canonicalSong || {};
    const thumbnailUrl = targetMetaSong.songArtImageUrl ||
                         targetMetaSong.songArtImageThumbnailUrl ||
                         targetMetaSong.headerImageUrl ||
                         document.querySelector('meta[property="og:image"]')?.content ||
                         null;

    let releaseYear = targetMetaSong.releaseDateComponents?.year || null;
    if (!releaseYear && targetMetaSong.releaseDate) {
      const yMatch = targetMetaSong.releaseDate.match(/^(\d{4})/);
      if (yMatch) releaseYear = parseInt(yMatch[1], 10);
    }

    const lyricists = (targetMetaSong.writerArtists || []).map(w => w.name).filter(Boolean);
    const composers = (targetMetaSong.producerArtists || []).map(p => p.name).filter(Boolean);

    // 4. Lyrics Extraction & Bilingual Pairing
    const localLines = extractLyricsFromDoc(document);
    let romanLines = [];
    let devLines = [];

    let counterpartUrl = null;
    if (isCurrentRomanized) {
      romanLines = localLines;
      if (canonicalSong?.path) {
        counterpartUrl = canonicalSong.url || `https://genius.com${canonicalSong.path}`;
      }
    } else {
      devLines = localLines;
      if (romanizedSong?.path) {
        counterpartUrl = romanizedSong.url || `https://genius.com${romanizedSong.path}`;
      }
    }

    // If counterpart link not in state, inspect DOM translation links
    if (!counterpartUrl) {
      const transLinks = document.querySelectorAll('a[href*="-lyrics"]');
      for (const a of transLinks) {
        const text = a.textContent.trim().toLowerCase();
        if (isCurrentRomanized && (text.includes('नेपाली') || text.includes('nepali') || text.includes('original'))) {
          counterpartUrl = a.href;
          break;
        } else if (!isCurrentRomanized && (text.includes('romaniz') || text.includes('english'))) {
          counterpartUrl = a.href;
          break;
        }
      }
    }

    // If counterpart URL is available and on same origin, attempt fetch for bilingual pairing
    if (counterpartUrl && counterpartUrl !== currentUrl && counterpartUrl.startsWith('https://genius.com')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2800);

        const resp = await fetch(counterpartUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const htmlText = await resp.text();
          const parser = new DOMParser();
          const docB = parser.parseFromString(htmlText, 'text/html');
          const fetchedLines = extractLyricsFromDoc(docB);

          if (fetchedLines.length > 0) {
            if (isCurrentRomanized) {
              devLines = fetchedLines;
              const h1B = docB.querySelector('h1');
              if (h1B && containsDevanagari(h1B.textContent)) {
                titleNp = h1B.textContent.trim();
              }
            } else {
              romanLines = fetchedLines;
            }
          }
        }
      } catch (fetchErr) {
        console.warn('[GeetKosh Genius] Bilingual counterpart fetch bypassed:', fetchErr.message);
      }
    }

    // Align lines into bilingual objects
    const alignedLines = alignBilingualLyrics(romanLines, devLines);

    // Format sheet text for Chord Sheet Editor
    const sheetText = alignedLines.map(l => {
      const text = (l.text_roman || l.text_np || '').trim();
      return text;
    }).filter(Boolean).join('\n');

    return {
      type: 'GENIUS_SONG',
      source_name: 'Genius',
      source_url: currentUrl,
      title: titleEn,
      title_en: titleEn,
      title_np: titleNp,
      artist_name: artistName,
      singers: artistName ? [artistName] : [],
      youtube_video_id: youtubeId,
      thumbnail_url: thumbnailUrl,
      release_year: releaseYear,
      lyricists: lyricists,
      composers: composers,
      counterpart_url: counterpartUrl,
      has_devanagari: devLines.length > 0,
      has_romanized: romanLines.length > 0,
      lyrics_lines: alignedLines,
      lines_count: alignedLines.length,
      sheet_text: sheetText,
      raw_lyrics: sheetText
    };
  }

  // Message listener for extension popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_SONG_DATA') {
      if (!isSongPage()) {
        sendResponse({ success: false, error: 'Not a recognized Genius lyrics page.' });
        return false;
      }

      extractGeniusPage()
        .then(data => {
          sendResponse({ success: true, source: 'GENIUS', data: data });
        })
        .catch(err => {
          console.error('[GeetKosh Genius] Extraction error:', err);
          sendResponse({ success: false, error: err.message || 'Error extracting lyrics from Genius.' });
        });

      return true; // Keep message channel open for asynchronous sendResponse
    }
    return false;
  });

})();
