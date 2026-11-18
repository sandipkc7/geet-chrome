/**
 * GeetKosh YouTube Content Script
 * Injected on youtube.com/watch* and youtube.com/shorts*
 * Extracts metadata, injects harvest button, and parses player captions.
 */

(function () {
  'use strict';

  let currentCaptionTracks = [];
  let isButtonInjected = false;

  /**
   * Injects a main-world bridge to extract ytInitialPlayerResponse.captions
   */
  function injectCaptionBridge() {
    try {
      const script = document.createElement('script');
      script.id = 'geetkosh-caption-bridge';
      script.textContent = `
        (function() {
          function sendPlayerState() {
            try {
              const resp = window.ytInitialPlayerResponse || (window.ytplayer && window.ytplayer.config && window.ytplayer.config.args && JSON.parse(window.ytplayer.config.args.raw_player_response));
              const captionTracks = resp?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
              const videoDetails = resp?.videoDetails || {};
              window.postMessage({
                source: 'GEETKOSH_BRIDGE',
                captionTracks: captionTracks,
                videoDetails: {
                  title: videoDetails.title,
                  author: videoDetails.author,
                  lengthSeconds: videoDetails.lengthSeconds,
                  viewCount: videoDetails.viewCount,
                  videoId: videoDetails.videoId,
                  shortDescription: videoDetails.shortDescription
                }
              }, '*');
            } catch (e) {}
          }
          sendPlayerState();
          window.addEventListener('yt-navigate-finish', sendPlayerState);
        })();
      `;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (e) {
      console.warn('[GeetKosh] Bridge injection warning:', e);
    }
  }

  // Listen for data from the injected bridge
  window.addEventListener('message', (event) => {
    if (event.data && event.data.source === 'GEETKOSH_BRIDGE') {
      currentCaptionTracks = event.data.captionTracks || [];
      if (event.data.videoDetails && event.data.videoDetails.videoId) {
        window.__geetkosh_videoDetails = event.data.videoDetails;
      }
    }
  });

  /**
   * Resolves current YouTube Video ID
   */
  function getVideoId() {
    const url = new URL(window.location.href);
    if (url.pathname.startsWith('/shorts/')) {
      return url.pathname.replace('/shorts/', '').split('/')[0];
    }
    return url.searchParams.get('v') || '';
  }

  /**
   * Scrapes structured "Music in this video" credits from YouTube DOM
   */
  function parseMusicCreditBox() {
    const credits = {
      song: '',
      artist: '',
      album: '',
      composers: '',
      lyricists: '',
      label: ''
    };

    const rows = document.querySelectorAll('ytd-metadata-row-renderer, ytd-rich-metadata-renderer');
    rows.forEach(row => {
      const titleElem = row.querySelector('#title, .title, yt-formatted-string.ytd-metadata-row-renderer');
      const contentElem = row.querySelector('#content, .content, #contents, #text');
      if (!titleElem || !contentElem) return;

      const t = titleElem.innerText.trim().toLowerCase();
      const val = contentElem.innerText.trim();

      if (t.includes('song')) credits.song = val;
      else if (t.includes('artist') || t.includes('singer')) credits.artist = val;
      else if (t.includes('album')) credits.album = val;
      else if (t.includes('composer') || t.includes('music')) credits.composers = val;
      else if (t.includes('lyric') || t.includes('writer')) credits.lyricists = val;
      else if (t.includes('license') || t.includes('label')) credits.label = val;
    });

    return credits;
  }

  /**
   * Extracts pinned comment text if present (often has lyrics)
   */
  function getPinnedComment() {
    const pinnedBadge = document.querySelector('ytd-pinned-comment-badge-renderer');
    if (!pinnedBadge) return '';

    const commentThread = pinnedBadge.closest('ytd-comment-thread-renderer');
    const textNode = commentThread ? commentThread.querySelector('#content-text') : null;
    return textNode ? textNode.innerText.trim() : '';
  }

  /**
   * Gathers full song data from the current active tab
   */
  async function extractSongData() {
    const videoId = getVideoId();
    if (!videoId) return null;

    // Grab raw title
    const titleElem = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title yt-formatted-string, h1.ytd-video-primary-info-renderer');
    const rawTitle = titleElem ? titleElem.innerText.trim() : (document.title.replace(/\s*-\s*YouTube$/i, '') || '');

    // Grab channel / uploader
    const channelElem = document.querySelector('#channel-name #text, #upload-info #text, .ytd-channel-name yt-formatted-string');
    const channelName = channelElem ? channelElem.innerText.trim() : '';

    // Smart title cleaning & Devanagari separation
    const parsedTitle = parseYouTubeTitle(rawTitle, channelName);

    // Audio credits box
    const credits = parseMusicCreditBox();

    // Prefer structured artist from credits if available
    const finalArtist = credits.artist || parsedTitle.artist_name || channelName;

    // Duration extraction
    let durationSeconds = 0;
    const videoElem = document.querySelector('video.html5-main-video');
    if (videoElem && !isNaN(videoElem.duration) && videoElem.duration > 0) {
      durationSeconds = Math.round(videoElem.duration);
    } else if (window.__geetkosh_videoDetails && window.__geetkosh_videoDetails.lengthSeconds) {
      durationSeconds = parseInt(window.__geetkosh_videoDetails.lengthSeconds, 10);
    }

    // Release year extraction
    let releaseYear = new Date().getFullYear();
    const infoText = document.querySelector('#info-container #info, #description-inline-expander')?.innerText || '';
    const yearMatch = infoText.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) {
      releaseYear = parseInt(yearMatch[1], 10);
    }

    // View count
    let viewCount = 0;
    const viewsMatch = infoText.replace(/,/g, '').match(/(\d+)\s+views/i);
    if (viewsMatch) {
      viewCount = parseInt(viewsMatch[1], 10);
    }

    // Captions & Synced Lyrics
    let lyricLines = [];
    let selectedCaptionTrack = null;

    if (currentCaptionTracks && currentCaptionTracks.length > 0) {
      // Find Nepali track first, then any other language
      selectedCaptionTrack = currentCaptionTracks.find(t => t.languageCode === 'ne')
        || currentCaptionTracks.find(t => (t.name?.simpleText || '').toLowerCase().includes('nepali'))
        || currentCaptionTracks[0];

      if (selectedCaptionTrack && selectedCaptionTrack.baseUrl) {
        lyricLines = await TranscriptParser.fetchAndParse(selectedCaptionTrack.baseUrl);
      }
    }

    // If no captions found, check pinned comment for LRC or raw text
    const pinnedComment = getPinnedComment();
    if (lyricLines.length === 0 && pinnedComment) {
      if (pinnedComment.includes('[00:') || pinnedComment.includes('[01:')) {
        lyricLines = TranscriptParser.parseLrc(pinnedComment);
      }
    }

    return {
      youtube_video_id: videoId,
      title_np: parsedTitle.title_np || credits.song || rawTitle,
      title_en: parsedTitle.title_en || rawTitle,
      artist_name: finalArtist,
      credits: credits,
      genre: 'Adhunik',
      release_year: releaseYear,
      duration_seconds: durationSeconds || 240,
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      view_count: viewCount,
      sync_status: lyricLines.length > 0 ? 'verified' : 'raw',
      lyrics: lyricLines,
      pinned_comment: pinnedComment,
      caption_tracks_count: currentCaptionTracks.length
    };
  }

  /**
   * Injects the GeetKosh Harvest Button into YouTube's native action bar
   */
  function injectHarvesterButton() {
    if (document.getElementById('geetkosh-yt-harvest-btn')) return;

    // YouTube action toolbar selectors
    const actionsBar = document.querySelector(
      '#actions #top-level-buttons-computed, #top-level-buttons, #menu-container #top-level-buttons-computed, .ytd-watch-metadata #actions-inner #actions'
    );

    if (!actionsBar) return;

    const btn = document.createElement('button');
    btn.id = 'geetkosh-yt-harvest-btn';
    btn.className = 'geetkosh-harvest-btn';
    btn.title = 'Import song directly to GeetKosh';
    btn.innerHTML = `
      <svg class="geetkosh-btn-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
      </svg>
      <span>GeetKosh</span>
    `;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Send message to extension background/popup
      chrome.runtime.sendMessage({ action: 'OPEN_HARVEST_DRAWER' });
      
      // Visual click feedback
      btn.classList.add('geetkosh-btn-clicked');
      setTimeout(() => btn.classList.remove('geetkosh-btn-clicked'), 1000);
    });

    actionsBar.prepend(btn);
    isButtonInjected = true;
  }

  // Inject initial bridge and button
  injectCaptionBridge();
  setTimeout(injectHarvesterButton, 1500);

  // Re-inject on YouTube SPA navigation
  window.addEventListener('yt-navigate-finish', () => {
    injectCaptionBridge();
    setTimeout(injectHarvesterButton, 1200);
  });

  // Listen for requests from popup or background worker
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_SONG_DATA') {
      extractSongData().then(data => {
        sendResponse({ success: true, data });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true; // Keep message channel open for async response
    }
  });

})();
