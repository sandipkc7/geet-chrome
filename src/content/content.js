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
   * Injects a main-world bridge to extract live ytInitialPlayerResponse.captions and movie_player
   */
  function injectCaptionBridge() {
    try {
      if (document.getElementById('geetkosh-caption-bridge')) return;

      const script = document.createElement('script');
      script.id = 'geetkosh-caption-bridge';
      script.textContent = `
        (function() {
          function sendPlayerState() {
            try {
              let captionTracks = [];
              let videoDetails = {};

              // 1. Direct Movie Player element (most accurate on live YouTube watch pages)
              const moviePlayer = document.getElementById('movie_player');
              if (moviePlayer && typeof moviePlayer.getPlayerResponse === 'function') {
                const resp = moviePlayer.getPlayerResponse();
                captionTracks = resp?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
                videoDetails = resp?.videoDetails || {};
              }

              // 2. Global ytInitialPlayerResponse
              if ((!captionTracks || !captionTracks.length) && window.ytInitialPlayerResponse) {
                captionTracks = window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
                if (!videoDetails.videoId) videoDetails = window.ytInitialPlayerResponse?.videoDetails || {};
              }

              // 3. Fallback to ytplayer config args
              if ((!captionTracks || !captionTracks.length) && window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
                try {
                  const raw = JSON.parse(window.ytplayer.config.args.raw_player_response);
                  captionTracks = raw?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
                  if (!videoDetails.videoId) videoDetails = raw?.videoDetails || {};
                } catch (e) {}
              }

              window.postMessage({
                source: 'GEETKOSH_BRIDGE',
                captionTracks: captionTracks,
                videoDetails: {
                  title: videoDetails.title || '',
                  author: videoDetails.author || '',
                  lengthSeconds: videoDetails.lengthSeconds || 0,
                  viewCount: videoDetails.viewCount || 0,
                  videoId: videoDetails.videoId || '',
                  shortDescription: videoDetails.shortDescription || ''
                }
              }, '*');
            } catch (e) {}
          }

          sendPlayerState();
          window.addEventListener('yt-navigate-finish', sendPlayerState);
          window.addEventListener('GEETKOSH_REQUEST_PLAYER_STATE', sendPlayerState);
          window.addEventListener('message', (e) => {
            if (e.data && e.data.action === 'GEETKOSH_REQUEST_PLAYER_STATE') {
              sendPlayerState();
            }
          });
        })();
      `;
      (document.head || document.documentElement).appendChild(script);
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
   * Synchronously extracts caption tracks from YouTube DOM script tags (zero race condition fallback)
   */
  function getCaptionTracksFromDom() {
    try {
      const scripts = document.querySelectorAll('script');
      for (const s of scripts) {
        const text = s.textContent || '';
        if (text.includes('captionTracks')) {
          const match = text.match(/"captionTracks":\s*(\[[\s\S]*?\])(?:,\s*"|\})/);
          if (match) {
            try {
              const tracks = JSON.parse(match[1]);
              if (Array.isArray(tracks) && tracks.length > 0) return tracks;
            } catch {}
          }
        }
      }
    } catch (e) {}
    return [];
  }

  /**
   * Intelligently parses raw lyrics from YouTube video description or pinned comments (like on Blogspot)
   * when Closed Captions (CC) are not available
   */
  function parseDescriptionLyrics(descText, pinnedText = '') {
    const textToSearch = descText || pinnedText;
    if (!textToSearch) return [];

    const lines = textToSearch.split(/\r?\n/);
    const resultLines = [];
    let inLyricsSection = false;

    // Boundary markers that signal the end of the lyrics block
    const endBoundaryRegex = /^(?:audio\s*credits?|video\s*credits?|credits?|special\s*thanks|cast|starring|singer|singers|lyrics|music|composer|arranged|mixed|mastered|direction|director|producer|camera|editor|choreographer|connect\s*with|social|follow|subscribe|warning|copyright|©|all\s*rights\s*reserved|important\s*notice|unauthorized|download|streaming|available\s*on|tiktok|instagram|facebook)\s*[:\-–]/i;

    // Header markers that signal start of lyrics
    const startBoundaryRegex = /^(?:lyrics|बोल|गीत(?:का\s*बोल)?|शब्द|गीतका\s*हरफहरु|lyrics\s*in\s*nepali|lyrics\s*in\s*english|गीतको\s*बोल)\s*[:\-–]?\s*$/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        if (inLyricsSection && resultLines.length > 0) {
          continue;
        }
        continue;
      }

      // Check if this line starts a lyrics block
      if (startBoundaryRegex.test(line) || /^(?:\[|\()(?:lyrics|बोल|गीत)(?:\]|\))\s*$/i.test(line)) {
        inLyricsSection = true;
        continue;
      }

      // Also check inline header e.g. "Lyrics: line 1 text"
      const inlineMatch = line.match(/^(?:lyrics|बोल|गीत(?:का\s*बोल)?|शब्द)\s*[:\-–]\s*(.+)$/i);
      if (inlineMatch && !inLyricsSection) {
        inLyricsSection = true;
        const firstLine = inlineMatch[1].trim();
        if (firstLine.length > 1) {
          resultLines.push(firstLine);
        }
        continue;
      }

      if (inLyricsSection) {
        // Check if we hit an end boundary (credit section, disclaimer, etc.)
        if (endBoundaryRegex.test(line) || line.startsWith('http://') || line.startsWith('https://') || line.startsWith('#')) {
          if (resultLines.length >= 2) {
            break; // Finished lyrics block
          } else {
            // False positive start, reset
            inLyricsSection = false;
            resultLines.length = 0;
            continue;
          }
        }

        // Filter out short bracket cues, disclaimers, or hashtags
        if (line.startsWith('#') || line.startsWith('©') || /^(?:verse|chorus|antara|sthayi)\s*\d*\s*[:\-–]?$/i.test(line)) {
          continue;
        }

        resultLines.push(line);
      }
    }

    // Fallback: check pinned comment for a pure lyrics block
    if (resultLines.length < 2 && pinnedText) {
      const pinLines = pinnedText.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('http') && !l.startsWith('#'));
      if (pinLines.length >= 4 && !pinLines.some(l => endBoundaryRegex.test(l))) {
        return pinLines.map((text, idx) => ({
          line_order: idx + 1,
          time_ms: 0,
          duration_ms: 3000,
          start_time: 0,
          end_time: null,
          text_np: /[\u0900-\u097F]/.test(text) ? text : '',
          text_en: !/[\u0900-\u097F]/.test(text) ? text : '',
          chords: ''
        }));
      }
    }

    if (resultLines.length < 2) return [];

    return resultLines.map((text, idx) => {
      const isDev = /[\u0900-\u097F]/.test(text);
      return {
        line_order: idx + 1,
        time_ms: 0,
        duration_ms: 3000,
        start_time: 0,
        end_time: null,
        text_np: isDev ? text : '',
        text_en: !isDev ? text : '',
        chords: ''
      };
    });
  }

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
   * Parses Nepali/English music credits from YouTube description
   */
  function parseDescriptionCredits(descText) {
    const result = {
      singers: [],
      featuring: [],
      lyricists: [],
      composers: [],
      movie_name: ''
    };
    if (!descText) return result;

    const lines = descText.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Match Movie / Film / चलचित्र / फिल्म
      const movieMatch = line.match(/^(?:movie|film|cinema|चलचित्र|फिल्म)\s*[:\-–]\s*(.+)$/i);
      if (movieMatch && !result.movie_name) {
        result.movie_name = movieMatch[1].replace(/["'“]/g, '').trim();
        continue;
      }

      // Match Singer / Vocals / स्वर
      const singerMatch = line.match(/^(?:vocal|vocals|singer|singers|स्वर)\s*[:\-–]\s*(.+)$/i);
      if (singerMatch) {
        if (typeof splitArtistList === 'function') {
          splitArtistList(singerMatch[1]).forEach(s => result.singers.push(s));
        } else {
          result.singers.push(singerMatch[1].trim());
        }
        continue;
      }

      // Match Featuring / Feat
      const featMatch = line.match(/^(?:featuring|feat\.?|ft\.?)\s*[:\-–]\s*(.+)$/i);
      if (featMatch) {
        if (typeof splitArtistList === 'function') {
          splitArtistList(featMatch[1]).forEach(f => result.featuring.push(f));
        } else {
          result.featuring.push(featMatch[1].trim());
        }
        continue;
      }

      // Match Lyrics / Lyricist / शब्द / रचना
      const lyricMatch = line.match(/^(?:lyrics|lyricist|words|गीत|शब्द|रचना)\s*[:\-–]\s*(.+)$/i);
      if (lyricMatch) {
        if (typeof splitArtistList === 'function') {
          splitArtistList(lyricMatch[1]).forEach(l => result.lyricists.push(l));
        } else {
          result.lyricists.push(lyricMatch[1].trim());
        }
        continue;
      }

      // Match Music / Composer / Composition / संगीत
      const compMatch = line.match(/^(?:music|composer|composition|संगीत)\s*[:\-–]\s*(.+)$/i);
      if (compMatch) {
        if (typeof splitArtistList === 'function') {
          splitArtistList(compMatch[1]).forEach(c => result.composers.push(c));
        } else {
          result.composers.push(compMatch[1].trim());
        }
        continue;
      }
    }

    return result;
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

    // Description credits extraction
    const descText = document.querySelector('#description-inline-expander, #description')?.innerText
      || (window.__geetkosh_videoDetails && window.__geetkosh_videoDetails.shortDescription) || '';
    const descCredits = parseDescriptionCredits(descText);

    // Merge singers (deduplicated)
    const singersSet = new Set();
    if (parsedTitle.singers && parsedTitle.singers.length > 0) {
      parsedTitle.singers.forEach(s => singersSet.add(s));
    }
    if (credits.artist) {
      if (typeof splitArtistList === 'function') {
        splitArtistList(credits.artist).forEach(s => singersSet.add(s));
      } else {
        singersSet.add(credits.artist);
      }
    }
    if (descCredits.singers && descCredits.singers.length > 0) {
      descCredits.singers.forEach(s => singersSet.add(s));
    }
    if (singersSet.size === 0 && finalArtist) {
      singersSet.add(finalArtist);
    }

    // Merge featuring artists
    const featuringSet = new Set();
    if (parsedTitle.featuring && parsedTitle.featuring.length > 0) {
      parsedTitle.featuring.forEach(f => featuringSet.add(f));
    }
    if (descCredits.featuring && descCredits.featuring.length > 0) {
      descCredits.featuring.forEach(f => featuringSet.add(f));
    }

    // Merge lyricists
    const lyricistsSet = new Set();
    if (credits.lyricists) {
      if (typeof splitArtistList === 'function') {
        splitArtistList(credits.lyricists).forEach(l => lyricistsSet.add(l));
      } else {
        lyricistsSet.add(credits.lyricists);
      }
    }
    if (descCredits.lyricists) descCredits.lyricists.forEach(l => lyricistsSet.add(l));

    // Merge composers
    const composersSet = new Set();
    if (credits.composers) {
      if (typeof splitArtistList === 'function') {
        splitArtistList(credits.composers).forEach(c => composersSet.add(c));
      } else {
        composersSet.add(credits.composers);
      }
    }
    if (descCredits.composers) descCredits.composers.forEach(c => composersSet.add(c));

    const singers = Array.from(singersSet);
    const featuring = Array.from(featuringSet).filter(f => !singersSet.has(f));
    const lyricists = Array.from(lyricistsSet);
    const composers = Array.from(composersSet);
    const movieName = descCredits.movie_name || parsedTitle.movie_name || credits.album || '';

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

    // Captions & Synced Subtitles Extraction from YouTube CC
    // Fallback directly to script tags if bridge tracks are not yet populated
    if (!currentCaptionTracks || currentCaptionTracks.length === 0) {
      currentCaptionTracks = getCaptionTracksFromDom();
    }

    let lyricLines = [];
    const formattedTracks = (currentCaptionTracks || []).map((t, idx) => ({
      id: idx,
      name: t.name?.simpleText || (t.languageCode ? t.languageCode.toUpperCase() : `Track ${idx + 1}`),
      languageCode: t.languageCode || '',
      baseUrl: t.baseUrl || '',
      isAsr: t.kind === 'asr'
    }));

    if (currentCaptionTracks && currentCaptionTracks.length > 0) {
      // Find Nepali track first, then English track, then any
      const nepaliTrack = currentCaptionTracks.find(t => t.languageCode === 'ne' || (t.name?.simpleText || '').toLowerCase().includes('nepali'));
      const englishTrack = currentCaptionTracks.find(t => t.languageCode === 'en' || (t.name?.simpleText || '').toLowerCase().includes('english'));

      if (nepaliTrack && nepaliTrack.baseUrl) {
        const nepaliLines = await TranscriptParser.fetchAndParse(nepaliTrack.baseUrl);
        if (englishTrack && englishTrack.baseUrl) {
          const englishLines = await TranscriptParser.fetchAndParse(englishTrack.baseUrl);
          lyricLines = TranscriptParser.mergeCaptionTracks(nepaliLines, englishLines);
        } else {
          // Attempt YouTube auto-translation to Roman/English for full bilingual subtitles
          try {
            const englishLines = await TranscriptParser.fetchAndParse(nepaliTrack.baseUrl, 'en');
            lyricLines = (englishLines && englishLines.length > 0)
              ? TranscriptParser.mergeCaptionTracks(nepaliLines, englishLines)
              : nepaliLines;
          } catch {
            lyricLines = nepaliLines;
          }
        }
      } else if (englishTrack && englishTrack.baseUrl) {
        const englishLines = await TranscriptParser.fetchAndParse(englishTrack.baseUrl);
        try {
          const nepaliLines = await TranscriptParser.fetchAndParse(englishTrack.baseUrl, 'ne');
          lyricLines = (nepaliLines && nepaliLines.length > 0)
            ? TranscriptParser.mergeCaptionTracks(nepaliLines, englishLines)
            : englishLines;
        } catch {
          lyricLines = englishLines;
        }
      } else if (currentCaptionTracks[0] && currentCaptionTracks[0].baseUrl) {
        lyricLines = await TranscriptParser.fetchAndParse(currentCaptionTracks[0].baseUrl);
      }
    }

    const hasRealTimestamps = Array.isArray(lyricLines) && lyricLines.length > 0;

    // If no CC subtitles found, check pinned comment for LRC, or fallback to description lyrics (like on Blogspot)
    const pinnedComment = getPinnedComment();
    if (lyricLines.length === 0 && pinnedComment) {
      if (pinnedComment.includes('[00:') || pinnedComment.includes('[01:')) {
        lyricLines = TranscriptParser.parseLrc(pinnedComment);
      }
    }

    if (lyricLines.length === 0) {
      lyricLines = parseDescriptionLyrics(descText, pinnedComment);
    }

    return {
      youtube_video_id: videoId,
      title_np: parsedTitle.title_np || credits.song || rawTitle,
      title_en: parsedTitle.title_en || rawTitle,
      artist_name: singers.join(', ') || finalArtist,
      movie_name: movieName,
      singers: singers,
      featuring: featuring,
      lyricists: lyricists,
      composers: composers,
      credits: credits,
      genre: 'Adhunik',
      release_year: releaseYear,
      duration_seconds: durationSeconds || 240,
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      view_count: viewCount,
      has_real_timestamps: hasRealTimestamps,
      sync_status: hasRealTimestamps ? 'verified' : 'raw',
      lyrics: lyricLines,
      caption_tracks: formattedTracks,
      caption_tracks_count: (currentCaptionTracks || []).length,
      pinned_comment: pinnedComment
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
      window.dispatchEvent(new CustomEvent('GEETKOSH_REQUEST_PLAYER_STATE'));
      window.postMessage({ source: 'GEETKOSH_EXTENSION', action: 'GEETKOSH_REQUEST_PLAYER_STATE' }, '*');
      setTimeout(() => {
        extractSongData().then(data => {
          sendResponse({ success: true, data });
        }).catch(err => {
          sendResponse({ success: false, error: err.message });
        });
      }, 150);
      return true; // Keep message channel open for async response
    }

    if (request.action === 'FETCH_SUBTITLE_TRACK') {
      TranscriptParser.fetchAndParse(request.baseUrl).then(lines => {
        sendResponse({ success: true, lines, has_real_timestamps: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }
  });

})();
