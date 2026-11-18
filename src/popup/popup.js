/**
 * GeetKosh Harvester & Catalog Hub — Popup Controller
 * Multi-source support: YouTube CC, Blogger Chords, NepaliSongChord, and Universal Catalog Editor.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements - Header & Settings
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

  // DOM Elements - Search Bar
  const searchInput = document.getElementById('catalog-search-input');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const searchDropdown = document.getElementById('search-dropdown');
  const searchLoading = document.getElementById('search-loading');
  const searchResultsList = document.getElementById('search-results-list');

  // DOM Elements - Source Indicator
  const sourceBadge = document.getElementById('source-badge');
  const sourceDetailsText = document.getElementById('source-details-text');
  const btnRefreshTab = document.getElementById('btn-refresh-tab');

  // DOM Elements - State Views
  const stateNotSupported = document.getElementById('state-not-supported');
  const stateLoading = document.getElementById('state-loading');
  const stateLabelView = document.getElementById('state-label-view');
  const stateReady = document.getElementById('state-ready');
  const stateSuccess = document.getElementById('state-success');

  // DOM Elements - Label Discography View
  const labelArtistName = document.getElementById('label-artist-name');
  const labelSongCount = document.getElementById('label-song-count');
  const labelSongsList = document.getElementById('label-songs-list');
  const labelPaginationRow = document.getElementById('label-pagination-row');
  const btnOlderPosts = document.getElementById('btn-older-posts');

  // DOM Elements - Song Form & Catalog Target Banner
  const catalogTargetBanner = document.getElementById('catalog-target-banner');
  const targetSongTitle = document.getElementById('target-song-title');
  const btnUnlinkTarget = document.getElementById('btn-unlink-target');
  const form = document.getElementById('song-harvest-form');
  const btnPublish = document.getElementById('btn-publish');
  const btnPublishText = document.getElementById('btn-publish-text');
  const btnMatchCatalog = document.getElementById('btn-match-catalog');

  const prevThumbnail = document.getElementById('prev-thumbnail');
  const prevDuration = document.getElementById('prev-duration');
  const prevYtId = document.getElementById('prev-yt-id');
  const prevCaptionsBadge = document.getElementById('prev-captions-badge');

  const fTitleEn = document.getElementById('f-title-en');
  const fTitleNp = document.getElementById('f-title-np');
  const fSingers = document.getElementById('f-singers');
  const fArtistName = document.getElementById('f-artist-name');
  const fFeaturing = document.getElementById('f-featuring');
  const fLyricists = document.getElementById('f-lyricists');
  const fComposers = document.getElementById('f-composers');
  const fMovieName = document.getElementById('f-movie-name');
  const fChords = document.getElementById('f-chords');
  const fGenre = document.getElementById('f-genre');
  const fYear = document.getElementById('f-year');
  const fScale = document.getElementById('f-scale');
  const fBpm = document.getElementById('f-bpm');
  const fYoutubeId = document.getElementById('f-youtube-id');

  // Lyrics Section
  const lyricsSummaryText = document.getElementById('accordion-summary-text');
  const subSourcePill = document.getElementById('sub-source-pill');
  const subTrackContainer = document.getElementById('sub-track-container');
  const fSubTrack = document.getElementById('f-sub-track');
  const btnModeLines = document.getElementById('btn-mode-lines');
  const btnModeRaw = document.getElementById('btn-mode-raw');
  const lyricsList = document.getElementById('lyrics-lines-list');
  const lyricsRawContainer = document.getElementById('lyrics-raw-container');
  const fLyricsRaw = document.getElementById('f-lyrics-raw');

  // Success Screen Links
  const successTitle = document.getElementById('success-title');
  const successMessage = document.getElementById('success-message');
  const linkViewSong = document.getElementById('link-view-song');
  const linkOpenStudio = document.getElementById('link-open-studio');
  const btnHarvestAnother = document.getElementById('btn-harvest-another');
  const toast = document.getElementById('toast');

  // App State Variables
  let currentSongData = null;
  let targetCatalogSong = null; // Set when editing or merging into an existing catalog song
  let searchDebounceTimer = null;
  let config = {
    backend_url: 'https://geet-backend.sandipkc.com.np',
    bearer_token: ''
  };

  /**
   * Shows a temporary toast message
   */
  function showToast(message, type = 'info') {
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3500);
  }

  /**
   * Helper: Formats seconds to mm:ss
   */
  function formatDuration(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  /**
   * Helper: Formats milliseconds to [mm:ss.xx]
   */
  function formatMs(ms) {
    if (isNaN(ms)) return '00:00.00';
    const totalSec = ms / 1000;
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${hundredths < 10 ? '0' : ''}${hundredths}`;
  }

  /**
   * Loads saved settings from chrome storage
   */
  async function loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['backend_url', 'bearer_token'], (res) => {
        if (res.backend_url) config.backend_url = res.backend_url.replace(/\/+$/, '');
        if (res.bearer_token) config.bearer_token = res.bearer_token;
        cfgBackendUrl.value = config.backend_url;
        cfgBearerToken.value = config.bearer_token;
        resolve();
      });
    });
  }

  /**
   * Verifies backend connectivity
   */
  async function verifyConnection() {
    elStatus.textContent = '● Checking';
    elStatus.className = 'status-pill status-checking';
    try {
      const res = await fetch(`${config.backend_url}/api/songs?limit=1`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        elStatus.textContent = '● Connected';
        elStatus.className = 'status-pill status-ok';
      } else {
        elStatus.textContent = '● API Error';
        elStatus.className = 'status-pill status-error';
      }
    } catch (e) {
      elStatus.textContent = '● Offline';
      elStatus.className = 'status-pill status-error';
    }
  }

  /**
   * Switch Active View State
   */
  function setViewState(viewName) {
    stateNotSupported.classList.add('hidden');
    stateLoading.classList.add('hidden');
    stateLabelView.classList.add('hidden');
    stateReady.classList.add('hidden');
    stateSuccess.classList.add('hidden');

    if (viewName === 'not-supported') stateNotSupported.classList.remove('hidden');
    else if (viewName === 'loading') stateLoading.classList.remove('hidden');
    else if (viewName === 'label-view') stateLabelView.classList.remove('hidden');
    else if (viewName === 'ready') stateReady.classList.remove('hidden');
    else if (viewName === 'success') stateSuccess.classList.remove('hidden');
  }

  /**
   * Updates Source Indicator Pill
   */
  function updateSourceIndicator(sourceType, label) {
    sourceBadge.className = 'badge-source';
    if (sourceType === 'YOUTUBE') {
      sourceBadge.classList.add('badge-source-yt');
      sourceBadge.textContent = 'YouTube';
    } else if (sourceType === 'BLOGGER') {
      sourceBadge.classList.add('badge-source-blogger');
      sourceBadge.textContent = 'Blogger';
    } else if (sourceType === 'NEPALISONGCHORD') {
      sourceBadge.classList.add('badge-source-nsc');
      sourceBadge.textContent = 'NepaliSongChord';
    } else if (sourceType === 'CATALOG') {
      sourceBadge.classList.add('badge-source-catalog');
      sourceBadge.textContent = 'GeetKosh';
    } else {
      sourceBadge.classList.add('badge-source-generic');
      sourceBadge.textContent = 'Web';
    }
    sourceDetailsText.textContent = label || 'Active Page';
  }

  // ========================================================
  // UNIVERSAL CATALOG SEARCH & AUTOCOMPLETE
  // ========================================================

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    if (q.length > 0) {
      btnClearSearch.classList.remove('hidden');
    } else {
      btnClearSearch.classList.add('hidden');
      searchDropdown.classList.add('hidden');
      return;
    }

    clearTimeout(searchDebounceTimer);
    if (q.length < 2) {
      searchDropdown.classList.add('hidden');
      return;
    }

    searchDebounceTimer = setTimeout(() => {
      executeCatalogSearch(q);
    }, 250);
  });

  btnClearSearch.addEventListener('click', () => {
    searchInput.value = '';
    btnClearSearch.classList.add('hidden');
    searchDropdown.classList.add('hidden');
  });

  async function executeCatalogSearch(query) {
    searchDropdown.classList.remove('hidden');
    searchLoading.classList.remove('hidden');
    searchResultsList.innerHTML = '';

    try {
      const res = await fetch(`${config.backend_url}/api/songs?q=${encodeURIComponent(query)}&limit=10`, {
        headers: { 'Accept': 'application/json' }
      });
      const json = await res.json();
      searchLoading.classList.add('hidden');

      const songs = (json && json.data) ? json.data : (Array.isArray(json) ? json : []);

      if (songs.length === 0) {
        searchResultsList.innerHTML = '<div class="search-state">No songs found matching "' + escapeHtml(query) + '"</div>';
        return;
      }

      songs.forEach(s => {
        const item = document.createElement('div');
        item.className = 'search-result-item';

        const artistLabel = s.artist_display || (s.credits?.singers?.map(c => c.name_en).join(', ') || 'Various');
        const syncBadgeClass = s.sync_status === 'verified'
          ? 'badge-sync-verified'
          : (s.sync_status === 'lrclib' ? 'badge-sync-lrclib' : 'badge-sync-raw');

        item.innerHTML = `
          <div class="search-item-info">
            <span class="search-item-title">${escapeHtml(s.title_en)}${s.title_np ? ' <span style="font-weight:normal; opacity:0.8;">(' + escapeHtml(s.title_np) + ')</span>' : ''}</span>
            <span class="search-item-artist">${escapeHtml(artistLabel)}</span>
          </div>
          <div class="search-item-badges">
            <span class="badge-sync ${syncBadgeClass}">${s.sync_status || 'raw'}</span>
            ${s.youtube_video_id ? '<span style="color:#EF4444; font-size:10px;">▶ YT</span>' : '<span style="color:#71717A; font-size:10px;">No YT</span>'}
          </div>
        `;

        item.addEventListener('click', () => {
          searchDropdown.classList.add('hidden');
          loadCatalogSong(s);
        });

        searchResultsList.appendChild(item);
      });
    } catch (err) {
      searchLoading.classList.add('hidden');
      searchResultsList.innerHTML = '<div class="search-state" style="color:#F87171;">Search failed: ' + escapeHtml(err.message) + '</div>';
    }
  }

  /**
   * Loads an existing song from GeetKosh catalog into editor mode
   */
  async function loadCatalogSong(songHeader) {
    setViewState('loading');
    document.getElementById('loading-title').textContent = 'Loading Catalog Song...';
    document.getElementById('loading-desc').textContent = `Fetching full details and lyrics for "${songHeader.title_en}"`;

    try {
      const res = await fetch(`${config.backend_url}/api/songs/${songHeader.slug || songHeader.id}`, {
        headers: { 'Accept': 'application/json' }
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message || 'Song details could not be loaded.');
      }

      const song = json.data;
      targetCatalogSong = song;

      // Update Catalog Banner
      catalogTargetBanner.classList.remove('hidden');
      targetSongTitle.textContent = `${song.title_en} (#${song.id})`;
      btnPublishText.textContent = 'Save Changes to Song';

      updateSourceIndicator('CATALOG', `Catalog Song: ${song.title_en}`);

      // Merge / Populate into Form
      populateFormFromCatalog(song);
      setViewState('ready');
      showToast(`Loaded "${song.title_en}" from GeetKosh catalog.`, 'info');

    } catch (err) {
      setViewState('not-supported');
      showToast(`Error: ${err.message}`, 'error');
    }
  }

  /**
   * Unlinks target catalog song to revert to create/harvest mode
   */
  btnUnlinkTarget.addEventListener('click', () => {
    targetCatalogSong = null;
    catalogTargetBanner.classList.add('hidden');
    btnPublishText.textContent = 'Publish to GeetKosh';
    showToast('Unlinked from catalog song. Ready to publish as new.', 'info');
  });

  // ========================================================
  // ACTIVE TAB DISCOVERY & EXTRACTION ROUTER
  // ========================================================

  async function initTabExtraction() {
    setViewState('loading');
    document.getElementById('loading-title').textContent = 'Detecting Music Page...';
    document.getElementById('loading-desc').textContent = 'Reading page DOM, chord sheets, and timed subtitles.';

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (!activeTab || !activeTab.url) {
      updateSourceIndicator('GENERIC', 'No Active Tab');
      setViewState('not-supported');
      return;
    }

    const url = activeTab.url;

    // 1. YouTube Detection
    if (url.includes('youtube.com/watch') || url.includes('youtube.com/shorts')) {
      updateSourceIndicator('YOUTUBE', activeTab.title || 'YouTube Music Video');
      sendExtractMessage(activeTab.id, 'YOUTUBE');
      return;
    }

    // 2. Blogger Detection (nepali-songs-chords.blogspot.com)
    if (url.includes('.blogspot.com/')) {
      updateSourceIndicator('BLOGGER', activeTab.title || 'Blogger Chords Archive');
      sendExtractMessage(activeTab.id, 'BLOGGER');
      return;
    }

    // 3. NepaliSongChord Detection (nepalisongchord.com)
    if (url.includes('nepalisongchord.com/')) {
      updateSourceIndicator('NEPALISONGCHORD', activeTab.title || 'NepaliSongChord.com');
      sendExtractMessage(activeTab.id, 'NEPALISONGCHORD');
      return;
    }

    // 4. Fallback: Generic Tab
    updateSourceIndicator('GENERIC', activeTab.title || 'Web Page');
    setViewState('not-supported');
  }

  function sendExtractMessage(tabId, sourceKind) {
    try {
      chrome.tabs.sendMessage(tabId, { action: 'EXTRACT_SONG_DATA' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success || !response.data) {
          setViewState('not-supported');
          showToast('Could not extract music data from page. Please refresh the tab.', 'info');
          return;
        }

        const data = response.data;
        if (data.type === 'BLOGGER_LABEL' || data.type === 'NSC_ARTIST') {
          renderLabelView(data);
        } else {
          populateFormFromScraped(data, sourceKind);
        }
      });
    } catch (err) {
      setViewState('not-supported');
      showToast('Error communicating with active page script.', 'error');
    }
  }

  btnRefreshTab.addEventListener('click', () => {
    initTabExtraction();
  });

  // ========================================================
  // RENDER LABEL / DISCOGRAPHY VIEW
  // ========================================================

  function renderLabelView(data) {
    setViewState('label-view');
    labelArtistName.textContent = data.artist_name || 'Nepali Artist';
    labelSongCount.textContent = `${data.songs?.length || 0} songs found on this page`;

    labelSongsList.innerHTML = '';
    const songs = data.songs || [];

    if (songs.length === 0) {
      labelSongsList.innerHTML = '<div class="label-song-row"><span class="song-name">No songs detected on this page.</span></div>';
    } else {
      songs.forEach(s => {
        const row = document.createElement('div');
        row.className = 'label-song-row';
        row.innerHTML = `
          <span class="song-name" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</span>
          <button class="btn-open-scrape" type="button">Open & Scrape ↗</button>
        `;

        row.querySelector('.btn-open-scrape').addEventListener('click', () => {
          chrome.tabs.create({ url: s.url, active: true });
        });

        labelSongsList.appendChild(row);
      });
    }

    if (data.older_page_url) {
      labelPaginationRow.classList.remove('hidden');
      btnOlderPosts.href = data.older_page_url;
    } else {
      labelPaginationRow.classList.add('hidden');
    }
  }

  // ========================================================
  // POPULATE FORM: FROM SCRAPED PAGE DATA
  // ========================================================

  function populateFormFromScraped(data, sourceKind) {
    currentSongData = data;
    targetCatalogSong = null;
    catalogTargetBanner.classList.add('hidden');
    btnPublishText.textContent = 'Publish to GeetKosh';

    // Preview Card
    const thumb = data.thumbnail_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80';
    prevThumbnail.src = thumb;
    prevDuration.textContent = formatDuration(data.duration_seconds || 0);
    prevYtId.textContent = data.youtube_video_id ? `YT ID: ${data.youtube_video_id}` : 'YT ID: None';

    // Inputs
    fTitleEn.value = data.title_en || '';
    fTitleNp.value = data.title_np || '';

    const singersList = (data.singers && data.singers.length > 0)
      ? data.singers
      : (data.artist_name ? [data.artist_name] : []);
    fSingers.value = singersList.join(', ');
    if (fArtistName) fArtistName.value = data.artist_name || singersList.join(', ');

    fFeaturing.value = (data.featuring || []).join(', ');
    fLyricists.value = (data.lyricists || []).join(', ');
    fComposers.value = (data.composers || []).join(', ');
    fMovieName.value = data.movie_name || '';

    // Chords & Scale
    fChords.value = data.chords_progression || (data.chords ? data.chords.join(', ') : '');
    fScale.value = data.scale || 'C Major';
    fBpm.value = data.bpm || '';
    fGenre.value = data.genre || 'Pop/Rock';
    fYear.value = data.release_year || new Date().getFullYear();
    fYoutubeId.value = data.youtube_video_id || '';

    // Subtitle Tracks Setup (YouTube)
    const tracks = data.caption_tracks || [];
    if (tracks.length > 0) {
      subTrackContainer.classList.remove('hidden');
      fSubTrack.innerHTML = '';
      tracks.forEach((track, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        const asrTag = track.isAsr ? ' (Auto)' : '';
        opt.textContent = `${track.name || track.languageCode}${asrTag}`;
        if (track.languageCode === 'ne' || track.languageCode === 'ne-NP') opt.selected = true;
        fSubTrack.appendChild(opt);
      });
    } else {
      subTrackContainer.classList.add('hidden');
    }

    // Lyrics Setup (CC vs Plain Chords/Lyrics)
    renderLyricsPreview(data.lyrics || data.lyrics_lines || []);
    if (data.lyrics_raw) {
      fLyricsRaw.value = data.lyrics_raw;
    } else if (Array.isArray(data.lyrics_lines)) {
      fLyricsRaw.value = data.lyrics_lines.join('\n');
    }

    setViewState('ready');
  }

  // ========================================================
  // POPULATE FORM: FROM CATALOG SONG (EDIT MODE)
  // ========================================================

  function populateFormFromCatalog(song) {
    const thumb = song.thumbnail_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80';
    prevThumbnail.src = thumb;
    prevDuration.textContent = formatDuration(song.duration_seconds || 0);
    prevYtId.textContent = song.youtube_video_id ? `YT ID: ${song.youtube_video_id}` : 'YT ID: None';

    fTitleEn.value = song.title_en || '';
    fTitleNp.value = song.title_np || '';

    const singers = song.credits?.singers?.map(c => c.name_en) || [];
    const featuring = song.credits?.featuring?.map(c => c.name_en) || [];
    const lyricists = song.credits?.lyricists?.map(c => c.name_en) || [];
    const composers = song.credits?.composers?.map(c => c.name_en) || [];

    fSingers.value = singers.join(', ');
    fFeaturing.value = featuring.join(', ');
    fLyricists.value = lyricists.join(', ');
    fComposers.value = composers.join(', ');
    fMovieName.value = song.movie_name || '';

    fChords.value = song.chords_progression || '';
    fScale.value = song.scale || 'C Major';
    fBpm.value = song.bpm || '';
    fGenre.value = song.genre || 'Pop/Rock';
    fYear.value = song.release_year || new Date().getFullYear();
    fYoutubeId.value = song.youtube_video_id || '';

    subTrackContainer.classList.add('hidden');

    const lines = song.lyric_lines || [];
    renderLyricsPreview(lines);
    const plainLines = lines.map(l => l.text_np || l.text_roman).filter(Boolean);
    fLyricsRaw.value = plainLines.join('\n');
  }

  // ========================================================
  // RENDER LYRICS PREVIEW & EDIT MODES
  // ========================================================

  function renderLyricsPreview(lines) {
    const count = (lines && lines.length) || 0;
    lyricsSummaryText.textContent = `Lyrics Lines (${count} lines)`;
    prevCaptionsBadge.textContent = count > 0 ? `✓ ${count} lyrics lines` : 'No lyrics saved';
    prevCaptionsBadge.style.color = count > 0 ? '#34D399' : '#A1A1AA';

    if (count > 0 && subSourcePill) {
      subSourcePill.classList.remove('hidden');
      subSourcePill.textContent = '✓ Lyrics Loaded';
    } else if (subSourcePill) {
      subSourcePill.classList.add('hidden');
    }

    lyricsList.innerHTML = '';
    if (count > 0) {
      lines.slice(0, 25).forEach((line, idx) => {
        const row = document.createElement('div');
        row.className = 'line-row';

        let timeStr = `${idx + 1}`;
        if (typeof line.time_ms === 'number') {
          timeStr = formatMs(line.time_ms);
        } else if (typeof line.start_time === 'number') {
          timeStr = `${Math.floor(line.start_time / 60)}:${Math.floor(line.start_time % 60).toString().padStart(2, '0')}`;
        }

        const textStr = line.text_np || line.text_roman || line.text_en || (typeof line === 'string' ? line : '');
        row.innerHTML = `
          <span class="line-time">${timeStr}</span>
          <span class="line-text">${escapeHtml(textStr)}</span>
        `;
        lyricsList.appendChild(row);
      });

      if (count > 25) {
        const more = document.createElement('div');
        more.className = 'line-row';
        more.innerHTML = `<span class="line-text" style="color: #71717A;">... and ${count - 25} more lines</span>`;
        lyricsList.appendChild(more);
      }
    } else {
      lyricsList.innerHTML = '<div class="line-row" style="background: rgba(200, 30, 30, 0.08); border-radius: 6px; padding: 6px 8px;"><span class="line-text" style="color: #E4E4E7; font-size: 11px;">⚠️ No lyrics lines parsed yet. You can paste plain lyrics in the "Plain Text Editor" tab.</span></div>';
    }
  }

  btnModeLines.addEventListener('click', () => {
    btnModeLines.classList.add('active');
    btnModeRaw.classList.remove('active');
    lyricsList.classList.remove('hidden');
    lyricsRawContainer.classList.add('hidden');
  });

  btnModeRaw.addEventListener('click', () => {
    btnModeRaw.classList.add('active');
    btnModeLines.classList.remove('active');
    lyricsList.classList.add('hidden');
    lyricsRawContainer.classList.remove('hidden');
  });

  // ========================================================
  // MERGE INTO EXISTING CATALOG SONG ACTION
  // ========================================================

  btnMatchCatalog.addEventListener('click', () => {
    // Focus search input with current title pre-filled to pick target song
    const currentTitle = fTitleEn.value || '';
    searchInput.value = currentTitle;
    searchInput.focus();
    btnClearSearch.classList.remove('hidden');
    executeCatalogSearch(currentTitle);
    showToast('Select an existing catalog song from the dropdown to merge into.', 'info');
  });

  // ========================================================
  // SUBMIT / PUBLISH / UPDATE HANDLER
  // ========================================================

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!config.bearer_token) {
      showToast('Admin Token is required to save songs. Please open Settings (⚙️).', 'error');
      elSettingsPanel.classList.remove('hidden');
      return;
    }

    btnPublish.disabled = true;
    btnPublish.innerHTML = '<div class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></div> Saving...';

    // Parse lyrics lines: priority to raw editor if modified, else structured
    let payloadLyrics = [];
    const rawVal = fLyricsRaw.value.trim();
    if (rawVal) {
      const splitLines = rawVal.split('\n').map(l => l.trim()).filter(Boolean);
      payloadLyrics = splitLines.map((line, idx) => ({
        time_ms: (idx * 3000),
        duration_ms: 3000,
        text_np: line,
        text_en: line
      }));
    } else if (currentSongData && currentSongData.lyrics && currentSongData.lyrics.length > 0) {
      payloadLyrics = currentSongData.lyrics;
    }

    const payload = {
      title_en: fTitleEn.value.trim(),
      title_np: fTitleNp.value.trim() || fTitleEn.value.trim(),
      movie_name: fMovieName.value.trim() || null,
      youtube_video_id: fYoutubeId.value.trim() || (currentSongData?.youtube_video_id ?? null),
      genre: fGenre.value,
      release_year: parseInt(fYear.value, 10) || new Date().getFullYear(),
      scale: fScale.value.trim() || 'C Major',
      bpm: parseInt(fBpm.value, 10) || null,
      chords_progression: fChords.value.trim() || null,
      singers: fSingers.value.split(',').map(s => s.trim()).filter(Boolean),
      featuring: fFeaturing.value.split(',').map(s => s.trim()).filter(Boolean),
      lyricists: fLyricists.value.split(',').map(s => s.trim()).filter(Boolean),
      composers: fComposers.value.split(',').map(s => s.trim()).filter(Boolean),
      lyrics: payloadLyrics
    };

    const isUpdate = !!targetCatalogSong;
    const url = isUpdate
      ? `${config.backend_url}/api/admin/songs/${targetCatalogSong.id}`
      : `${config.backend_url}/api/admin/songs`;
    const method = isUpdate ? 'PUT' : 'POST';

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

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || (json.success === false && !json.id && !json.data)) {
        throw new Error(json.error?.message || json.message || 'Failed to save song.');
      }

      const savedSong = json.data || json;
      const successText = isUpdate ? 'Song successfully updated in GeetKosh!' : 'New song published to GeetKosh!';
      showToast(successText, 'success');

      setViewState('success');
      successTitle.textContent = isUpdate ? 'Song Updated Successfully!' : 'Published Successfully!';
      successMessage.textContent = `"${payload.title_en}" is live in the GeetKosh database with chords and lyrics.`;

      const songSlug = savedSong.slug || targetCatalogSong?.slug || payload.title_en.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      linkViewSong.href = `https://geet.sandipkc.com.np/song/${songSlug}`;
      linkOpenStudio.href = `https://geet.sandipkc.com.np/studio?id=${savedSong.id || targetCatalogSong?.id}`;

    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      btnPublish.disabled = false;
      btnPublish.innerHTML = `<span class="btn-icon">🚀</span><span id="btn-publish-text" class="btn-text">${isUpdate ? 'Save Changes to Song' : 'Publish to GeetKosh'}</span>`;
    }
  });

  btnHarvestAnother.addEventListener('click', () => {
    targetCatalogSong = null;
    catalogTargetBanner.classList.add('hidden');
    initTabExtraction();
  });

  // ========================================================
  // SETTINGS PANEL HANDLERS
  // ========================================================

  btnToggleSettings.addEventListener('click', () => {
    elSettingsPanel.classList.toggle('hidden');
  });

  btnCloseSettings.addEventListener('click', () => {
    elSettingsPanel.classList.add('hidden');
  });

  btnToggleTokenVis.addEventListener('click', () => {
    cfgBearerToken.type = cfgBearerToken.type === 'password' ? 'text' : 'password';
  });

  btnSaveSettings.addEventListener('click', () => {
    const newUrl = cfgBackendUrl.value.trim().replace(/\/+$/, '');
    const newToken = cfgBearerToken.value.trim();

    if (!newUrl) {
      showToast('Backend URL cannot be empty.', 'error');
      return;
    }

    config.backend_url = newUrl;
    config.bearer_token = newToken;

    chrome.storage.local.set({ backend_url: newUrl, bearer_token: newToken }, () => {
      showToast('Settings saved successfully.', 'success');
      elSettingsPanel.classList.add('hidden');
      verifyConnection();
    });
  });

  btnTestConn.addEventListener('click', async () => {
    settingsFeedback.textContent = 'Testing connection...';
    settingsFeedback.className = 'feedback-msg info';
    settingsFeedback.classList.remove('hidden');

    const testUrl = cfgBackendUrl.value.trim().replace(/\/+$/, '');
    try {
      const res = await fetch(`${testUrl}/api/songs?limit=1`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        settingsFeedback.textContent = '✓ Connection successful! GeetKosh API is responsive.';
        settingsFeedback.className = 'feedback-msg success';
      } else {
        settingsFeedback.textContent = `✗ Connected but returned status ${res.status}.`;
        settingsFeedback.className = 'feedback-msg error';
      }
    } catch (err) {
      settingsFeedback.textContent = `✗ Connection failed: ${err.message}`;
      settingsFeedback.className = 'feedback-msg error';
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ========================================================
  // INITIALIZATION
  // ========================================================
  await loadConfig();
  verifyConnection();
  initTabExtraction();
});
