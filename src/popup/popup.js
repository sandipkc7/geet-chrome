/**
 * GeetKosh Harvester Popup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const elStatus = document.getElementById('conn-status');
  const elSettingsPanel = document.getElementById('settings-panel');
  const btnToggleSettings = document.getElementById('btn-toggle-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const btnTestConn = document.getElementById('btn-test-conn');
  const cfgBackendUrl = document.getElementById('cfg-backend-url');
  const cfgBearerToken = document.getElementById('cfg-bearer-token');
  const btnToggleTokenVis = document.getElementById('btn-toggle-token-vis');
  const settingsFeedback = document.getElementById('settings-feedback');

  const stateNotYt = document.getElementById('state-not-youtube');
  const stateLoading = document.getElementById('state-loading');
  const stateReady = document.getElementById('state-ready');
  const stateSuccess = document.getElementById('state-success');

  const form = document.getElementById('song-harvest-form');
  const btnPublish = document.getElementById('btn-publish');
  const prevThumbnail = document.getElementById('prev-thumbnail');
  const prevDuration = document.getElementById('prev-duration');
  const prevYtId = document.getElementById('prev-yt-id');
  const prevCaptionsBadge = document.getElementById('prev-captions-badge');
  const lyricsSummaryText = document.getElementById('accordion-summary-text');
  const lyricsList = document.getElementById('lyrics-lines-list');

  const fTitleNp = document.getElementById('f-title-np');
  const fTitleEn = document.getElementById('f-title-en');
  const fArtistName = document.getElementById('f-artist-name');
  const fSingers = document.getElementById('f-singers');
  const fFeaturing = document.getElementById('f-featuring');
  const fLyricists = document.getElementById('f-lyricists');
  const fComposers = document.getElementById('f-composers');
  const fMovieName = document.getElementById('f-movie-name');
  const fGenre = document.getElementById('f-genre');
  const fYear = document.getElementById('f-year');
  const fScale = document.getElementById('f-scale');
  const fBpm = document.getElementById('f-bpm');

  const linkViewSong = document.getElementById('link-view-song');
  const linkOpenStudio = document.getElementById('link-open-studio');
  const btnHarvestAnother = document.getElementById('btn-harvest-another');
  const toast = document.getElementById('toast');

  let currentSongData = null;
  let config = {
    backend_url: 'https://geet-backend.sandipkc.com.np',
    bearer_token: ''
  };

  /**
   * Shows a temporary toast message
   */
  function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    setTimeout(() => toast.classList.add('hidden'), 4000);
  }

  /**
   * Formats seconds into MM:SS
   */
  function formatDuration(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  /**
   * Formats milliseconds into [MM:SS]
   */
  function formatMs(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `[${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}]`;
  }

  /**
   * Loads saved configuration from chrome storage
   */
  async function loadConfig() {
    return new Promise(resolve => {
      chrome.storage.local.get(['backend_url', 'bearer_token'], (res) => {
        if (res.backend_url) config.backend_url = res.backend_url.replace(/\/+$/, '');
        if (res.bearer_token) config.bearer_token = res.bearer_token.trim();

        cfgBackendUrl.value = config.backend_url;
        cfgBearerToken.value = config.bearer_token;
        resolve(config);
      });
    });
  }

  /**
   * Verifies backend connectivity and admin authorization
   */
  async function verifyConnection() {
    elStatus.textContent = '● Checking';
    elStatus.className = 'status-pill status-checking';

    if (!config.bearer_token) {
      elStatus.textContent = '⚠️ Token Required';
      elStatus.className = 'status-pill status-error';
      return false;
    }

    try {
      const headers = {
        'Accept': 'application/json'
      };
      // Support both Bearer token and direct Admin Secret
      if (config.bearer_token.length > 40) {
        headers['Authorization'] = `Bearer ${config.bearer_token}`;
      } else {
        headers['X-Admin-Secret'] = config.bearer_token;
        headers['Authorization'] = `Bearer ${config.bearer_token}`;
      }

      const res = await fetch(`${config.backend_url}/api/admin/stats`, { headers });
      if (res.ok) {
        elStatus.textContent = '● Connected';
        elStatus.className = 'status-pill status-connected';
        return true;
      } else {
        elStatus.textContent = '⚠️ Auth Failed';
        elStatus.className = 'status-pill status-error';
        return false;
      }
    } catch {
      elStatus.textContent = '⚠️ Offline';
      elStatus.className = 'status-pill status-error';
      return false;
    }
  }

  /**
   * Extracts data from the current active YouTube tab
   */
  async function initTabExtraction() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (!activeTab || !activeTab.url || (!activeTab.url.includes('youtube.com/watch') && !activeTab.url.includes('youtube.com/shorts'))) {
      stateLoading.classList.add('hidden');
      stateNotYt.classList.remove('hidden');
      return;
    }

    try {
      chrome.tabs.sendMessage(activeTab.id, { action: 'EXTRACT_SONG_DATA' }, (response) => {
        stateLoading.classList.add('hidden');

        if (chrome.runtime.lastError || !response || !response.success || !response.data) {
          showToast('Could not extract data from page. Please refresh the YouTube tab.', 'error');
          return;
        }

        populateForm(response.data);
      });
    } catch (err) {
      stateLoading.classList.add('hidden');
      showToast('Error communicating with YouTube page.', 'error');
    }
  }

  /**
   * Populates form and preview card with extracted song data
   */
  function populateForm(data) {
    currentSongData = data;

    // Preview Card
    prevThumbnail.src = data.thumbnail_url;
    prevDuration.textContent = formatDuration(data.duration_seconds);
    prevYtId.textContent = `YT ID: ${data.youtube_video_id}`;

    const linesCount = (data.lyrics && data.lyrics.length) || 0;
    prevCaptionsBadge.textContent = linesCount > 0 ? `✓ ${linesCount} synced lines` : 'No captions found';
    prevCaptionsBadge.style.color = linesCount > 0 ? '#34D399' : '#A1A1AA';

    // Inputs
    fTitleNp.value = data.title_np || '';
    fTitleEn.value = data.title_en || '';
    
    // Multiple Artists & Credits
    const singersList = (data.singers && data.singers.length > 0)
      ? data.singers
      : (data.artist_name ? [data.artist_name] : []);
    fSingers.value = singersList.join(', ');
    if (fArtistName) fArtistName.value = data.artist_name || singersList.join(', ');
    fFeaturing.value = (data.featuring || []).join(', ');
    fLyricists.value = (data.lyricists || []).join(', ');
    fComposers.value = (data.composers || []).join(', ');

    fGenre.value = data.genre || 'Adhunik';
    if (fMovieName) fMovieName.value = data.movie_name || '';
    fYear.value = data.release_year || new Date().getFullYear();
    fScale.value = data.scale || 'C Major';
    fBpm.value = data.bpm || '';

    // Lyrics Preview
    lyricsSummaryText.textContent = `Synchronized Lyrics (${linesCount} lines)`;
    lyricsList.innerHTML = '';

    if (linesCount > 0) {
      data.lyrics.slice(0, 15).forEach(line => {
        const row = document.createElement('div');
        row.className = 'line-row';
        row.innerHTML = `
          <span class="line-time">${formatMs(line.time_ms)}</span>
          <span class="line-text">${line.text_np || line.text_en}</span>
        `;
        lyricsList.appendChild(row);
      });

      if (linesCount > 15) {
        const more = document.createElement('div');
        more.className = 'line-row';
        more.innerHTML = `<span class="line-text" style="color: #71717A;">... and ${linesCount - 15} more lines</span>`;
        lyricsList.appendChild(more);
      }
    } else {
      lyricsList.innerHTML = '<div class="line-row" style="background: rgba(200, 30, 30, 0.08); border-radius: 6px; padding: 6px 8px;"><span class="line-text" style="color: #E4E4E7; font-size: 11px;">✨ No YouTube CC subtitles found. Only song metadata will be saved now (lyrics can be generated anytime via 1-click in the Admin Dashboard or Song page).</span></div>';
    }

    stateReady.classList.remove('hidden');
  }

  // Toggle Settings Panel
  btnToggleSettings.addEventListener('click', () => {
    elSettingsPanel.classList.toggle('hidden');
  });

  btnCloseSettings.addEventListener('click', () => {
    elSettingsPanel.classList.add('hidden');
  });

  btnToggleTokenVis.addEventListener('click', () => {
    cfgBearerToken.type = cfgBearerToken.type === 'password' ? 'text' : 'password';
  });

  // Save Settings
  btnSaveSettings.addEventListener('click', async () => {
    config.backend_url = cfgBackendUrl.value.trim().replace(/\/+$/, '');
    config.bearer_token = cfgBearerToken.value.trim();

    await chrome.storage.local.set(config);
    showToast('Settings saved successfully.', 'success');
    elSettingsPanel.classList.add('hidden');
    verifyConnection();
  });

  // Test Connection
  btnTestConn.addEventListener('click', async () => {
    btnTestConn.textContent = 'Testing...';
    config.backend_url = cfgBackendUrl.value.trim().replace(/\/+$/, '');
    config.bearer_token = cfgBearerToken.value.trim();

    const ok = await verifyConnection();
    btnTestConn.textContent = 'Test Connection';

    if (ok) {
      showToast('Connection verified! Admin API authenticated.', 'success');
    } else {
      showToast('Connection failed. Please check URL & Token.', 'error');
    }
  });

  // Publish Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!config.bearer_token) {
      showToast('Please set your Admin Bearer Token in Settings first!', 'error');
      elSettingsPanel.classList.remove('hidden');
      return;
    }

    btnPublish.disabled = true;
    btnPublish.innerHTML = '<span class="spinner" style="width: 14px; height: 14px; border-width: 2px; margin: 0 4px 0 0;"></span> Publishing...';

    // Parse comma/semicolon/ampersand separated multiple artists
    const parseList = (str) => (str || '')
      .split(/[,;&]/)
      .map(s => s.trim())
      .filter(Boolean);

    const singersList = parseList(fSingers.value);
    const featList = parseList(fFeaturing.value);
    const lyricistsList = parseList(fLyricists.value);
    const composersList = parseList(fComposers.value);

    // Build structured credits array
    const credits = [];
    singersList.forEach(name => credits.push({ name, role: 'singer' }));
    featList.forEach(name => credits.push({ name, role: 'featuring' }));
    lyricistsList.forEach(name => credits.push({ name, role: 'lyricist' }));
    composersList.forEach(name => credits.push({ name, role: 'composer' }));

    const primaryArtistDisplay = singersList.join(', ') || fSingers.value.trim();

    const payload = {
      youtube_video_id: currentSongData.youtube_video_id,
      title_np: fTitleNp.value.trim(),
      title_en: fTitleEn.value.trim(),
      artist_name: primaryArtistDisplay,
      movie_name: (fMovieName && fMovieName.value.trim()) || null,
      singers: singersList,
      featuring: featList,
      lyricists: lyricistsList,
      composers: composersList,
      credits: credits,
      genre: fGenre.value,
      release_year: parseInt(fYear.value, 10) || new Date().getFullYear(),
      duration_seconds: currentSongData.duration_seconds || 240,
      scale: fScale.value.trim() || 'C Major',
      bpm: fBpm.value ? parseInt(fBpm.value, 10) : null,
      thumbnail_url: currentSongData.thumbnail_url,
      view_count: currentSongData.view_count || 0,
      sync_status: (currentSongData.lyrics && currentSongData.lyrics.length > 0) ? 'verified' : 'raw',
      lyrics: currentSongData.lyrics || [],
      auto_ai_lyrics: false
    };

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      if (config.bearer_token.length > 40) {
        headers['Authorization'] = `Bearer ${config.bearer_token}`;
      } else {
        headers['X-Admin-Secret'] = config.bearer_token;
        headers['Authorization'] = `Bearer ${config.bearer_token}`;
      }

      const res = await fetch(`${config.backend_url}/api/admin/songs`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || 'Failed to publish song.');
      }

      const newSong = json.data;
      showToast('Song published successfully to GeetKosh!', 'success');

      // Update success screen
      stateReady.classList.add('hidden');
      stateSuccess.classList.remove('hidden');

      const songSlug = newSong.slug || currentSongData.youtube_video_id;
      linkViewSong.href = `https://geet.sandipkc.com.np/song/${songSlug}`;
      linkOpenStudio.href = `https://geet.sandipkc.com.np/studio?id=${newSong.id}`;

    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      btnPublish.disabled = false;
      btnPublish.innerHTML = '<span class="btn-icon">🚀</span><span class="btn-text">Publish to GeetKosh</span>';
    }
  });

  // Harvest Another
  btnHarvestAnother.addEventListener('click', () => {
    stateSuccess.classList.add('hidden');
    stateReady.classList.remove('hidden');
  });

  // Initialization
  await loadConfig();
  verifyConnection();
  initTabExtraction();
});
