/**
 * GeetKosh (गीतकोश) — Blogger Music Scraper Content Script
 * Supports nepali-songs-chords.blogspot.com and standard Blogger chord blogs.
 * Handles both Label/Artist category pages and Single Song post pages.
 */

(function () {
  'use strict';

  function isLabelPage() {
    const path = window.location.pathname;
    return path.includes('/search/label/') || document.querySelectorAll('.post-title').length > 1;
  }

  function isPostPage() {
    return /\/\d{4}\/\d{2}\/.*\.html/.test(window.location.pathname) || !!document.querySelector('.post-body');
  }

  /**
   * Scrapes a Blogger Label / Category discography page
   */
  function extractLabelPage() {
    let artistName = '';

    // Try extracting from URL: /search/label/{ArtistName}
    const match = window.location.pathname.match(/\/search\/label\/([^/?&#]+)/);
    if (match) {
      artistName = decodeURIComponent(match[1].replace(/\+/g, ' ')).trim();
    }

    // Fallback: page title or header
    if (!artistName) {
      const pageTitle = document.title || '';
      if (pageTitle.includes(':')) {
        artistName = pageTitle.split(':').pop().trim();
      }
    }

    if (artistName && typeof toTitleCase === 'function') {
      artistName = toTitleCase(artistName);
    }

    const posts = [];
    const postTitles = document.querySelectorAll('.post-title a, h2.entry-title a, h3.entry-title a');

    postTitles.forEach(a => {
      let title = a.textContent.trim();
      if (typeof toTitleCase === 'function') {
        title = toTitleCase(title);
      }
      const href = a.href;
      if (title && href && !posts.some(p => p.url === href)) {
        // Date from URL /YYYY/MM/
        const dateMatch = href.match(/\/(\d{4})\/(\d{2})\//);
        const dateStr = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}` : '';
        posts.push({
          title: title,
          url: href,
          date: dateStr
        });
      }
    });

    // Detect pagination
    const olderLink = document.querySelector('a.blog-pager-older-link')?.href || null;

    return {
      type: 'BLOGGER_LABEL',
      source_name: 'Blogger Chords',
      source_url: window.location.href,
      artist_name: artistName,
      songs: posts,
      total_on_page: posts.length,
      older_page_url: olderLink
    };
  }

  /**
   * Scrapes a Blogger Single Song Post page
   */
  function extractPostPage() {
    // 1. Post Title
    const titleEl = document.querySelector('.post-title, h2.entry-title, h1.entry-title, h2.post-title');
    let rawTitle = titleEl ? titleEl.textContent.trim() : document.title.replace(/^Nepali Songs And Chords:\s*/i, '').trim();
    let cleanTitle = (typeof toTitleCase === 'function')
      ? toTitleCase(rawTitle)
      : rawTitle;

    // 2. Post Body
    const bodyEl = document.querySelector('.post-body, .entry-content');
    const rawHtml = bodyEl ? bodyEl.innerHTML : '';
    const rawText = bodyEl ? bodyEl.innerText : '';

    // 3. Artist Detection
    let artistName = '';
    // Check regex in text: "Artist : Narayan Gopal"
    const artistMatch = rawText.match(/Artist\s*:\s*([^\n\r]+)/i);
    if (artistMatch) {
      artistName = artistMatch[1].trim();
    }

    // Fallback: Label tags at bottom of post
    if (!artistName) {
      const tagEls = document.querySelectorAll('.post-labels a, a[rel="tag"]');
      if (tagEls.length > 0) {
        artistName = tagEls[0].textContent.trim();
      }
    }

    if (artistName && typeof toTitleCase === 'function') {
      artistName = toTitleCase(artistName);
    }

    // 4. Parse Chords & Lyrics using ChordParser
    let parsed = {
      chords: [],
      chords_progression: '',
      scale: 'C Major',
      lyrics_lines: [],
      raw_text: ''
    };

    if (typeof ChordParser !== 'undefined') {
      parsed = ChordParser.parseSheet(rawHtml);
    }

    return {
      type: 'BLOGGER_POST',
      source_name: 'Blogger Chords',
      source_url: window.location.href,
      title_en: cleanTitle,
      title_np: '', // Optional Devanagari to be filled or AI generated
      artist_name: artistName,
      singers: artistName ? [artistName] : [],
      chords: parsed.chords,
      chords_progression: parsed.chords_progression,
      scale: parsed.scale,
      lyrics_lines: parsed.lyrics_lines,
      lyrics_raw: parsed.raw_text,
      youtube_video_id: null,
      thumbnail_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
      duration_seconds: 0,
      genre: 'Adhunik'
    };
  }

  // Message listener for popup communication
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_SONG_DATA') {
      try {
        if (isLabelPage()) {
          const data = extractLabelPage();
          sendResponse({ success: true, source: 'BLOGGER', data });
        } else if (isPostPage()) {
          const data = extractPostPage();
          sendResponse({ success: true, source: 'BLOGGER', data });
        } else {
          sendResponse({ success: false, error: 'Not a recognized Blogger music page.' });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }
    return true; // Keep message channel open for async response
  });

})();
