/**
 * GeetKosh (गीतकोश) — Blogger Music Scraper Content Script
 * Supports nepali-songs-chords.blogspot.com and standard Blogger chord blogs.
 * Handles both Label/Artist category pages and Single Song post pages.
 */

(function () {
  'use strict';

  function isPostPage() {
    const path = window.location.pathname;
    // Blogger single post pattern is ALWAYS /YYYY/MM/post-title.html
    if (/\/\d{4}\/\d{2}\/.*\.html/i.test(path)) {
      return true;
    }
    // Also true if there is a .post-body and we are NOT on a /search/label/ page
    if (!path.includes('/search/label/') && document.querySelector('.post-body, .entry-content')) {
      return true;
    }
    return false;
  }

  function isLabelPage() {
    const path = window.location.pathname;
    // Single post URLs with .html can NEVER be label archive pages
    if (/\/\d{4}\/\d{2}\/.*\.html/i.test(path)) {
      return false;
    }
    if (path.includes('/search/label/')) {
      return true;
    }
    const posts = document.querySelectorAll('.blog-posts .post-outer, .blog-posts .post, #main .post');
    return posts.length > 1;
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
    // 1. Post Body (detect early to help extract credits if title is missing)
    const bodyEl = document.querySelector('.post-body, .entry-content, .post-content, #post-body, div[itemprop="articleBody"], .post-outer .post-body, .post .entry-content');
    const rawHtml = bodyEl ? bodyEl.innerHTML : '';
    const rawText = bodyEl ? bodyEl.innerText : '';

    // 2. Artist Detection from body
    let artistName = '';
    const artistMatch = rawText.match(/^(?:Artist|Singer|Singers|Vocal|Vocals|Band)\s*[:\-–]\s*([^\n\r]+)/im);
    if (artistMatch) {
      artistName = artistMatch[1].replace(/["'“]/g, '').trim();
    }

    // Fallback: Label tags at bottom of post
    if (!artistName) {
      const tagEls = document.querySelectorAll('.post-labels a, a[rel="tag"]');
      if (tagEls.length > 0) {
        artistName = tagEls[0].textContent.trim();
      }
    }

    // 3. Post Title
    const titleEl = document.querySelector('.post-title, h1.entry-title, h2.entry-title, h1.post-title, h2.post-title, .entry-header h1, header.entry-header h1, .post h1, h3.post-title');
    let rawTitle = titleEl ? titleEl.textContent.trim() : document.title;
    rawTitle = rawTitle
      .replace(/^Nepali\s+Songs\s+(?:and|&)\s+chords\s*:\s*/i, '')
      .replace(/^(?:guitar\s+chords\s*&?\s*lyrics|chords\s*&?\s*lyrics)\s*[:\-–]\s*/i, '')
      .replace(/\s*\((?:chords|lyrics|guitar\s+chords).*\)$/i, '')
      .trim();

    let cleanTitle = rawTitle;
    if (rawTitle.includes(' - ')) {
      const parts = rawTitle.split(' - ');
      cleanTitle = parts[0].trim();
      if (!artistName && parts[1]) {
        artistName = parts[1].replace(/chords?|lyrics?/gi, '').trim();
      }
    } else if (/\s+by\s+/i.test(rawTitle)) {
      const parts = rawTitle.split(/\s+by\s+/i);
      cleanTitle = parts[0].trim();
      if (!artistName && parts[1]) {
        artistName = parts[1].replace(/chords?|lyrics?/gi, '').trim();
      }
    }

    if (typeof toTitleCase === 'function') {
      cleanTitle = toTitleCase(cleanTitle);
      if (artistName) artistName = toTitleCase(artistName);
    }

    // 4. Parse Chords & Lyrics using ChordParser
    let parsed = {
      chords: [],
      chords_progression: '',
      scale: 'C Major',
      lyrics_lines: [],
      raw_text: '',
      sheet_text: ''
    };

    if (typeof ChordParser !== 'undefined') {
      parsed = ChordParser.parseSheet(rawHtml);
    }

    // Check Scale/Key in body
    const scaleMatch = rawText.match(/^(?:Scale|Key)\s*[:\-–]\s*([^\n\r]+)/im);
    if (scaleMatch && (!parsed.scale || parsed.scale === 'C Major')) {
      parsed.scale = scaleMatch[1].trim();
    }

    return {
      type: 'BLOGGER_POST',
      source_name: 'Blogger Chords',
      source_url: window.location.href,
      title_en: cleanTitle,
      title_np: '', // Devanagari to be filled or auto-transliterated
      artist_name: artistName,
      singers: artistName ? [artistName] : [],
      chords: parsed.chords,
      chords_progression: parsed.chords_progression,
      scale: parsed.scale,
      lyrics_lines: parsed.lyrics_lines,
      lyrics_raw: parsed.raw_text,
      sheet_text: parsed.sheet_text,
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
        if (isPostPage()) {
          const data = extractPostPage();
          sendResponse({ success: true, source: 'BLOGGER', data });
        } else if (isLabelPage()) {
          const data = extractLabelPage();
          sendResponse({ success: true, source: 'BLOGGER', data });
        } else {
          sendResponse({ success: false, error: 'Not a recognized Blogger music page.' });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }
    return false;
  });

})();
