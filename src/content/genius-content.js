/**
 * GeetKosh (गीतकोश) — Genius.com Scraper Content Script
 * Extracts song title, artist, YouTube video link, bilingual translation links,
 * and clean lyrics from genius.com song pages.
 */

(function () {
  'use strict';

  function isSongPage() {
    return window.location.pathname.includes('-lyrics') || !!document.querySelector('div[data-lyrics-container="true"]');
  }

  function extractGeniusPage() {
    // 1. Song Title & Artist
    let title = '';
    let artist = '';
    const h1 = document.querySelector('h1');
    if (h1) {
      title = h1.textContent.trim().replace(/\s*\(Romanized\)\s*/i, '');
    }

    const artistLink = document.querySelector('a[class*="ArtistList__PrimaryArtist"]') || 
                       document.querySelector('a[href*="/artists/"]');
    if (artistLink) {
      artist = artistLink.textContent.trim();
    }

    if (!title) {
      title = document.title.replace(/\s*\|\s*Genius.*$/i, '').trim();
    }

    // 2. YouTube Video Detection
    let youtubeId = null;
    const scripts = document.querySelectorAll('script');
    for (const s of scripts) {
      const content = s.textContent || '';
      const match = content.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (match) {
        youtubeId = match[1];
        break;
      }
    }

    // 3. Lyrics Containers
    const containers = document.querySelectorAll('div[data-lyrics-container="true"]');
    const lines = [];

    containers.forEach(container => {
      // Clone to avoid mutating live page
      const clone = container.cloneNode(true);
      // Remove header elements
      const headers = clone.querySelectorAll('div[class*="LyricsHeader"]');
      headers.forEach(h => h.remove());

      // Replace <br> with newline
      const brs = clone.querySelectorAll('br');
      brs.forEach(br => br.replaceWith('\n'));

      const text = clone.textContent || '';
      text.split('\n').forEach(raw => {
        const trimmed = raw.trim();
        if (trimmed) {
          lines.push(trimmed);
        }
      });
    });

    // 4. Check for Translation Link (Romanized <-> Devanagari)
    let counterpartUrl = null;
    const transLinks = document.querySelectorAll('a[href*="-lyrics"]');
    for (const a of transLinks) {
      const text = a.textContent.trim().toLowerCase();
      const href = a.href;
      if (text.includes('नेपाली') || text.includes('nepali') || text.includes('romaniz')) {
        counterpartUrl = href;
        break;
      }
    }

    return {
      type: 'GENIUS_SONG',
      source_name: 'Genius',
      source_url: window.location.href,
      title: title,
      artist_name: artist,
      youtube_video_id: youtubeId,
      counterpart_url: counterpartUrl,
      lyrics_lines: lines,
      lines_count: lines.length,
      raw_lyrics: lines.join('\n')
    };
  }

  // Message listener for extension popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_SONG_DATA') {
      try {
        if (isSongPage()) {
          const data = extractGeniusPage();
          sendResponse({ success: true, source: 'GENIUS', data: data });
        } else {
          sendResponse({ success: false, error: 'Not a recognized Genius lyrics page.' });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }
    return true;
  });

})();
