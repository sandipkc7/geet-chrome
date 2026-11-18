/**
 * GeetKosh (गीतकोश) — NepaliSongChord.com Scraper Content Script
 * Extracts song chords, lyrics, artist/band profiles, musical scales,
 * and embedded YouTube video links from nepalisongchord.com.
 */

(function () {
  'use strict';

  function isSongPage() {
    const path = window.location.pathname;
    return path.includes('/song/') || path.includes('/viewsong/') || !!document.querySelector('.song_profile, .mainsong');
  }

  function isArtistPage() {
    const path = window.location.pathname;
    return path.includes('/viewband/') || path.includes('/viewsinger/');
  }

  /**
   * Scrapes a NepaliSongChord song page
   */
  function extractSongPage() {
    // 1. Song Title
    let rawTitle = '';
    const h1 = document.querySelector('.song_profile h1, h1');
    if (h1 && !h1.textContent.includes('SEARCH SONG')) {
      rawTitle = h1.textContent.trim();
    } else {
      const breadcumSpan = document.querySelector('.breadcum span, .breadcum');
      if (breadcumSpan) {
        rawTitle = breadcumSpan.textContent.split('»').pop().trim();
      } else {
        rawTitle = document.title.replace(/^NepaliSongChord::/i, '').replace(/\s+by\s+.*$/i, '').trim();
      }
    }

    const cleanTitle = (typeof toTitleCase === 'function')
      ? toTitleCase(rawTitle)
      : rawTitle;

    // 2. Credits from .song_profile table
    let artistName = '';
    let lyricists = [];
    let composers = [];

    const profileTable = document.querySelector('.song_profile table');
    if (profileTable) {
      const rows = profileTable.querySelectorAll('tr');
      rows.forEach(tr => {
        const text = tr.textContent.trim();
        if (/Band|Singer/i.test(text)) {
          const parts = text.split(':');
          if (parts.length > 1) {
            const val = parts[1].trim();
            artistName = (typeof toTitleCase === 'function') ? toTitleCase(val) : val;
          }
        } else if (/Lyricist/i.test(text)) {
          const parts = text.split(':');
          if (parts.length > 1 && parts[1].trim()) {
            const val = (typeof toTitleCase === 'function') ? toTitleCase(parts[1].trim()) : parts[1].trim();
            lyricists.push(val);
          }
        } else if (/Musician|Music/i.test(text)) {
          const parts = text.split(':');
          if (parts.length > 1 && parts[1].trim()) {
            const val = (typeof toTitleCase === 'function') ? toTitleCase(parts[1].trim()) : parts[1].trim();
            composers.push(val);
          }
        }
      });
    }

    // Fallback artist from title: "NepaliSongChord::Song by Artist"
    if (!artistName && document.title.includes(' by ')) {
      const val = document.title.split(' by ').pop().trim();
      artistName = (typeof toTitleCase === 'function') ? toTitleCase(val) : val;
    }

    // 3. Scale / Key Notes from .song_desc
    const descEl = document.querySelector('.song_desc');
    let scale = 'C Major';
    if (descEl) {
      const descText = descEl.textContent;
      const keyMatch = descText.match(/originally in\s+([A-G][#b]?(?:m)?)|tried in\s+([A-G][#b]?(?:m)?)|in\s+([A-G][#b]?(?:m)?)/i);
      if (keyMatch) {
        const matchedKey = (keyMatch[1] || keyMatch[2] || keyMatch[3]).trim();
        scale = matchedKey.endsWith('m') ? `${matchedKey.slice(0, -1)} Minor` : `${matchedKey} Major`;
      }
    }

    // 4. Main Chords & Lyrics from .mainsong
    const mainsongEl = document.querySelector('.mainsong');
    let parsed = {
      chords: [],
      chords_progression: '',
      scale: scale,
      lyrics_lines: [],
      raw_text: ''
    };

    if (mainsongEl && typeof ChordParser !== 'undefined') {
      parsed = ChordParser.parseSheet(mainsongEl.innerHTML);
      if (scale === 'C Major' && parsed.scale) {
        scale = parsed.scale;
      }
    }

    // 5. Embedded YouTube Video ID if present
    let youtubeVideoId = null;
    let thumbnailUrl = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80';

    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      const src = iframe.src || iframe.getAttribute('src') || '';
      const ytMatch = src.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
      if (ytMatch) {
        youtubeVideoId = ytMatch[1];
        thumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;
      }
    });

    return {
      type: 'NSC_SONG',
      source_name: 'NepaliSongChord',
      source_url: window.location.href,
      title_en: cleanTitle,
      title_np: '',
      artist_name: artistName,
      singers: artistName ? [artistName] : [],
      lyricists: lyricists,
      composers: composers,
      chords: parsed.chords,
      chords_progression: parsed.chords_progression,
      scale: scale,
      lyrics_lines: parsed.lyrics_lines,
      lyrics_raw: parsed.raw_text,
      youtube_video_id: youtubeVideoId,
      thumbnail_url: thumbnailUrl,
      duration_seconds: 0,
      genre: 'Pop/Rock'
    };
  }

  /**
   * Scrapes an artist/band page on NepaliSongChord
   */
  function extractArtistPage() {
    let artistName = document.title.replace(/^NepaliSongChord::/i, '').trim();
    if (typeof toTitleCase === 'function') {
      artistName = toTitleCase(artistName);
    }
    const songs = [];

    const songLinks = document.querySelectorAll('a[href*="viewsong"], a[href*="/song/"]');
    songLinks.forEach(a => {
      let title = a.textContent.trim();
      if (typeof toTitleCase === 'function') {
        title = toTitleCase(title);
      }
      const href = a.href;
      if (title && href && !songs.some(p => p.url === href)) {
        songs.push({
          title: title,
          url: href
        });
      }
    });

    return {
      type: 'NSC_ARTIST',
      source_name: 'NepaliSongChord',
      source_url: window.location.href,
      artist_name: artistName,
      songs: songs,
      total_on_page: songs.length
    };
  }

  // Message listener for popup communication
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_SONG_DATA') {
      try {
        if (isSongPage()) {
          const data = extractSongPage();
          sendResponse({ success: true, source: 'NEPALISONGCHORD', data });
        } else if (isArtistPage()) {
          const data = extractArtistPage();
          sendResponse({ success: true, source: 'NEPALISONGCHORD', data });
        } else {
          sendResponse({ success: false, error: 'Not a recognized NepaliSongChord page.' });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }
    return true;
  });

})();
