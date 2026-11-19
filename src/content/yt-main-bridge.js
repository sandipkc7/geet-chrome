/**
 * GeetKosh YouTube Main-World Bridge Script
 * Runs in the page's MAIN world context via Chrome Manifest V3 ("world": "MAIN").
 * Provides zero-CSP, zero-latency access to YouTube's internal player response and caption tracks.
 */
(function () {
  'use strict';

  function extractPlayerState() {
    try {
      let captionTracks = [];
      let videoDetails = {};

      // 1. Direct Movie Player element (most accurate on active YouTube watch page)
      const moviePlayer = document.getElementById('movie_player');
      if (moviePlayer && typeof moviePlayer.getPlayerResponse === 'function') {
        const resp = moviePlayer.getPlayerResponse();
        captionTracks = resp?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        videoDetails = resp?.videoDetails || {};
      }

      // 1b. Movie Player getOption tracklist
      if ((!captionTracks || !captionTracks.length) && moviePlayer && typeof moviePlayer.getOption === 'function') {
        try {
          const tracklist = moviePlayer.getOption('captions', 'tracklist');
          if (Array.isArray(tracklist) && tracklist.length > 0) {
            captionTracks = tracklist;
          }
        } catch (e) {}
      }

      // 2. Global ytInitialPlayerResponse
      if ((!captionTracks || !captionTracks.length) && window.ytInitialPlayerResponse) {
        captionTracks = window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        if (!videoDetails.videoId) {
          videoDetails = window.ytInitialPlayerResponse?.videoDetails || {};
        }
      }

      // 3. Fallback to ytplayer config args
      if ((!captionTracks || !captionTracks.length) && window.ytplayer?.config?.args) {
        try {
          const raw = JSON.parse(window.ytplayer.config.args.raw_player_response);
          captionTracks = raw?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
          if (!videoDetails.videoId) {
            videoDetails = raw?.videoDetails || {};
          }
        } catch (e) {}
      }

      const payload = {
        source: 'GEETKOSH_MAIN_BRIDGE',
        captionTracks: captionTracks,
        videoDetails: {
          title: videoDetails.title || '',
          author: videoDetails.author || '',
          lengthSeconds: videoDetails.lengthSeconds || 0,
          viewCount: videoDetails.viewCount || 0,
          videoId: videoDetails.videoId || '',
          shortDescription: videoDetails.shortDescription || ''
        }
      };

      // Dispatch CustomEvent on document (fast, reliable cross-world bridge in Manifest V3)
      document.dispatchEvent(new CustomEvent('GEETKOSH_MAIN_EVENT', {
        detail: JSON.stringify(payload)
      }));

      // Also postMessage as cross-world backup
      window.postMessage(payload, '*');
    } catch (err) {
      console.warn('[GeetKosh Main Bridge] Error extracting player state:', err);
    }
  }

  // Initial broadcast
  extractPlayerState();

  // Broadcast when YouTube finishes client-side SPA navigation
  window.addEventListener('yt-navigate-finish', () => {
    setTimeout(extractPlayerState, 300);
    setTimeout(extractPlayerState, 1000);
  });

  // Broadcast when content script explicitly requests data
  document.addEventListener('GEETKOSH_REQUEST_DATA', extractPlayerState);
  window.addEventListener('GEETKOSH_REQUEST_PLAYER_STATE', extractPlayerState);
  window.addEventListener('message', (e) => {
    if (e.data && (e.data.action === 'GEETKOSH_REQUEST_PLAYER_STATE' || e.data.action === 'GEETKOSH_REQUEST_DATA')) {
      extractPlayerState();
    }
  });
})();
