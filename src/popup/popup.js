/**
 * GeetKosh Harvester & Catalog Hub — Popup Controller
 * Multi-source support: YouTube CC, Blogger Chords, NepaliSongChord, Universal Catalog Editor,
 * and Zero-Quota YouTube Video Search & Linking Sidebar.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements - Header & Settings
  const elStatus = document.getElementById('conn-status');
  const btnExpandWindow = document.getElementById('btn-expand-window');
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

  // DOM Elements - YouTube Matcher Sidebar
  const btnSearchYtFromTitle = document.getElementById('btn-search-yt-from-title');
  const btnTriggerYtSearch = document.getElementById('btn-trigger-yt-search');
  const ytSidebarSearchInput = document.getElementById('yt-sidebar-search-input');
  const btnYtSidebarSearch = document.getElementById('btn-yt-sidebar-search');
  const ytMatchStatusBadge = document.getElementById('yt-match-status-badge');
  const ytSelectedCard = document.getElementById('yt-selected-card');
  const ytSelectedThumb = document.getElementById('yt-selected-thumb');
  const ytSelectedDuration = document.getElementById('yt-selected-duration');
  const ytSelectedTitle = document.getElementById('yt-selected-title');
  const ytSelectedChannel = document.getElementById('yt-selected-channel');
  const btnConfirmYtLink = document.getElementById('btn-confirm-yt-link');
  const btnCancelYtSelect = document.getElementById('btn-cancel-yt-select');
  const ytSidebarLoading = document.getElementById('yt-sidebar-loading');
  const ytSidebarEmpty = document.getElementById('yt-sidebar-empty');
  const ytSidebarResults = document.getElementById('yt-sidebar-results');

  // DOM Elements - Sidebar Tab Switching
  const sidebarTabBtnYt = document.getElementById('sidebar-tab-btn-yt');
  const sidebarTabBtnDetails = document.getElementById('sidebar-tab-btn-details');
  const sidebarPaneYt = document.getElementById('sidebar-pane-yt');
  const sidebarPaneDetails = document.getElementById('sidebar-pane-details');

  function updateYtMatchStatus(isLinked) {
    if (!ytMatchStatusBadge) return;
    if (isLinked) {
      ytMatchStatusBadge.textContent = 'Linked';
      ytMatchStatusBadge.className = 'badge-status-linked';
    } else {
      ytMatchStatusBadge.textContent = 'Unlinked';
      ytMatchStatusBadge.className = 'badge-status-unlinked';
    }
  }

  // Lyrics Tabbed Hub Elements
  const tabLyricsCountBadge = document.getElementById('tab-lyrics-count-badge');
  const subTrackContainer = document.getElementById('sub-track-container');
  const fSubTrack = document.getElementById('f-sub-track');
  const tabBtnSheet = document.getElementById('tab-btn-sheet');
  const tabBtnLines = document.getElementById('tab-btn-lines');
  const tabBtnPreview = document.getElementById('tab-btn-preview');
  const paneSheet = document.getElementById('pane-sheet');
  const paneLines = document.getElementById('pane-lines');
  const panePreview = document.getElementById('pane-preview');
  const fLyricsRaw = document.getElementById('f-lyrics-raw');
  const editableLinesContainer = document.getElementById('editable-lines-container');
  const lyricsList = document.getElementById('lyrics-lines-list');
  const btnReParseSheet = document.getElementById('btn-reparse-sheet');
  const btnAddLine = document.getElementById('btn-add-line');
  const btnDistributeTiming = document.getElementById('btn-distribute-timing');
  const btnSyncToSheet = document.getElementById('btn-sync-to-sheet');
  const btnScriptRoman = document.getElementById('btn-script-roman');
  const btnScriptDevanagari = document.getElementById('btn-script-devanagari');
  const btnToDevanagari = document.getElementById('btn-to-devanagari');
  const btnSheetToDevanagari = document.getElementById('btn-sheet-to-devanagari');

  // Success Screen Links
  const successTitle = document.getElementById('success-title');
  const successMessage = document.getElementById('success-message');
  const linkViewSong = document.getElementById('link-view-song');
  const linkOpenStudio = document.getElementById('link-open-studio');
  const btnHarvestAnother = document.getElementById('btn-harvest-another');
  const toast = document.getElementById('toast');

  // App State Variables
  let currentSongData = null;
  let currentLyricsLines = []; // Reactive store of parsed/editable lyrics lines
  let targetCatalogSong = null; // Set when editing or merging into an existing catalog song
  let searchDebounceTimer = null;
  let pendingSelectedVideo = null; // Staged video in the sidebar before confirmation
  let config = {
    backend_url: 'https://geet-backend.sandipkc.com.np',
    bearer_token: ''
  };

  // Active Lyrics Script Mode: 'roman' | 'devanagari'
  let activeLyricsScript = 'roman';

  // ========================================================
  // NEPALI DEVANAGARI UNICODE TRANSLITERATION ENGINE
  // ========================================================

  function containsDevanagari(str) {
    return /[\u0900-\u097F]/.test(str || '');
  }

  const NEP_DICT = {
    'mero': 'मेरो', 'timro': 'तिम्रो', 'hamro': 'हाम्रो', 'usko': 'उसको',
    'timi': 'तिमी', 'timilai': 'तिमीलाई', 'malai': 'मलाई', 'uslai': 'उसलाई', 'hamilai': 'हामीलाई',
    'ma': 'म', 'ta': 'त', 'ho': 'हो', 'cha': 'छ', 'chha': 'छ', 'chhan': 'छन्', 'chhu': 'छु',
    'thee': 'थी', 'thiyo': 'थियो', 'thiye': 'थिए', 'pani': 'पनि', 'kina': 'किन', 'kasto': 'कस्तो',
    'yo': 'यो', 'tyo': 'त्यो', 'sabai': 'सबै', 'jun': 'जुन', 'tara': 'तारा', 'nepal': 'नेपाल',
    'nepali': 'नेपाली', 'geet': 'गीत', 'dhun': 'धुन', 'sangeet': 'संगीत',
    'phool': 'फूल', 'phoolko': 'फूलको', 'ful': 'फूल', 'fulko': 'फूलको',
    'aankha': 'आँखा', 'aankhama': 'आँखामा', 'aakha': 'आँखा', 'aakhama': 'आँखामा',
    'kaanda': 'काँडा', 'kaandako': 'काँडाको', 'kaandai': 'काँडै', 'phoolai': 'फूलै',
    'sansar': 'संसार', 'sansara': 'संसार', 'jhulkinchhu': 'झुल्किन्छु', 'jhulkinchu': 'झुल्किन्छु',
    'maya': 'माया', 'mayale': 'मायाले', 'mayako': 'मायाको', 'prem': 'प्रेम', 'preeti': 'प्रीति',
    'mutu': 'मुटु', 'mutuma': 'मुटुमा', 'mutuko': 'मुटुको',
    'mann': 'मन', 'man': 'मन', 'manma': 'मनमा', 'mannma': 'मनमा',
    'punya': 'पुण्य', 'paap': 'पाप', 'parayein': 'पराएँ', 'paraye': 'पराएँ',
    'yeti': 'यति', 'uti': 'उति', 'dherai': 'धेरै', 'thorai': 'थोरै', 'diyee': 'दिई', 'diye': 'दिए',
    'sambandha': 'सम्बन्ध', 'sambandhako': 'सम्बन्धको',
    'jiban': 'जीवन', 'jiwan': 'जीवन', 'sapana': 'सपना', 'bipana': 'बिपना',
    'aaja': 'आज', 'bholi': 'भोलि', 'hijo': 'हिजो', 'sadhai': 'सधैं', 'kahile': 'कहिल्यै',
    'sangai': 'संगै', 'sanga': 'संग', 'bata': 'बाट', 'bhitra': 'भित्र', 'baahira': 'बाहिर',
    'din': 'दिन', 'raat': 'रात', 'bhanera': 'भनेर', 'bhanchhu': 'भन्छु',
    'sunana': 'सुनन', 'herana': 'हेरन', 'aau': 'आऊ', 'jaau': 'जाऊ', 'le': 'ले', 'ko': 'को', 'ka': 'का', 'ki': 'की'
  };

  const NEP_VOWELS = {
    'aa': 'आ', 'a': 'अ', 'ii': 'ई', 'ee': 'ई', 'i': 'इ', 'uu': 'ऊ', 'oo': 'ऊ', 'u': 'उ',
    'ri': 'ऋ', 'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ', 'am': 'अं', 'ah': 'अः'
  };

  const NEP_MATRAS = {
    'aa': 'ा', 'a': '', 'ii': 'ी', 'ee': 'ी', 'i': 'ि', 'uu': 'ू', 'oo': 'ू', 'u': 'ु',
    'ri': 'ृ', 'e': 'े', 'ai': 'ै', 'o': 'ो', 'au': 'ौ', 'am': 'ं', 'ah': 'ः'
  };

  const NEP_CONSONANTS = [
    ['kchh', 'क्ष'], ['ksh', 'क्ष'], ['chhy', 'क्ष्य'], ['chha', 'छ'], ['chh', 'छ्'],
    ['kh', 'ख्'], ['gh', 'घ्'], ['ng', 'ङ्'], ['ch', 'च्'], ['jh', 'झ्'],
    ['thh', 'ठ्'], ['tth', 'ठ्'], ['dhh', 'ढ्'], ['ddh', 'ढ्'], ['th', 'थ्'], ['dh', 'ध्'],
    ['ph', 'फ्'], ['bh', 'भ्'], ['shh', 'ष्'], ['sh', 'श्'], ['gy', 'ज्ञ्'], ['tr', 'त्र्'],
    ['k', 'क्'], ['g', 'ग्'], ['j', 'ज्'], ['t', 'त्'], ['d', 'द्'], ['n', 'न्'],
    ['p', 'प्'], ['f', 'फ्'], ['b', 'ब्'], ['m', 'म्'], ['y', 'य्'], ['r', 'र्'],
    ['l', 'ल्'], ['v', 'व्'], ['w', 'व्'], ['s', 'स्'], ['h', 'ह्'],
    ['T', 'ट्'], ['D', 'ड्'], ['N', 'ण्']
  ];

  function transliterateWord(word) {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!clean) return word;
    if (NEP_DICT[clean]) return word.replace(new RegExp(clean, 'i'), NEP_DICT[clean]);

    let i = 0;
    let out = '';
    const len = word.length;

    while (i < len) {
      const ch = word[i];
      if (!/[a-zA-Z]/.test(ch)) {
        out += ch;
        i++;
        continue;
      }

      let matchedConsonant = null;
      let consLen = 0;
      for (const [seq, dev] of NEP_CONSONANTS) {
        if (word.substr(i, seq.length).toLowerCase() === seq.toLowerCase()) {
          matchedConsonant = dev;
          consLen = seq.length;
          break;
        }
      }

      if (matchedConsonant) {
        i += consLen;
        let matchedMatra = null;
        let vowelLen = 0;
        for (const v of ['aa', 'ee', 'ii', 'oo', 'uu', 'ai', 'au', 'ri', 'am', 'ah', 'a', 'e', 'i', 'o', 'u']) {
          if (word.substr(i, v.length).toLowerCase() === v) {
            matchedMatra = NEP_MATRAS[v];
            vowelLen = v.length;
            break;
          }
        }

        const baseChar = matchedConsonant.replace('्', '');
        if (matchedMatra !== null) {
          out += baseChar + matchedMatra;
          i += vowelLen;
        } else {
          if (i >= len || !/[a-zA-Z]/.test(word[i])) {
            out += baseChar;
          } else {
            out += matchedConsonant;
          }
        }
      } else {
        let matchedVowel = null;
        let vLen = 0;
        for (const v of ['aa', 'ee', 'ii', 'oo', 'uu', 'ai', 'au', 'ri', 'am', 'ah', 'a', 'e', 'i', 'o', 'u']) {
          if (word.substr(i, v.length).toLowerCase() === v) {
            matchedVowel = NEP_VOWELS[v];
            vLen = v.length;
            break;
          }
        }
        if (matchedVowel) {
          out += matchedVowel;
          i += vLen;
        } else {
          out += ch;
          i++;
        }
      }
    }

    return out;
  }

  function romanToDevanagari(text) {
    if (!text) return '';
    return text.split(/(\s+|[.,!?;:'"()\[\]{}]+)/).map(token => {
      if (/^[a-zA-Z]+$/.test(token)) {
        return transliterateWord(token);
      }
      return token;
    }).join('');
  }

  /**
   * Shows a temporary toast message in the bottom-right corner
   */
  let toastTimer = null;
  function showToast(message, type = 'info') {
    if (!toast) return;
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.classList.remove('hidden');
    toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  if (toast) {
    toast.addEventListener('click', () => {
      if (toastTimer) clearTimeout(toastTimer);
      toast.classList.add('hidden');
    });
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
   * Helper: Parses mm:ss duration string into seconds
   */
  function parseDurationString(durStr) {
    if (!durStr) return 0;
    const parts = durStr.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2) {
      return (parts[0] * 60) + parts[1];
    } else if (parts.length === 3) {
      return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    }
    return 0;
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
   * Helper: Parses mm:ss or mm:ss.xx string back to milliseconds
   */
  function parseTimeToMs(str) {
    if (!str) return 0;
    const clean = str.replace(/[\[\]]/g, '').trim();
    const parts = clean.split(':');
    if (parts.length === 2) {
      const m = parseFloat(parts[0]) || 0;
      const s = parseFloat(parts[1]) || 0;
      return Math.round((m * 60 + s) * 1000);
    } else if (parts.length === 1) {
      const s = parseFloat(parts[0]) || 0;
      return Math.round(s * 1000);
    }
    return 0;
  }

  /**
   * Distributes lyric lines evenly across the full song length (in seconds)
   * Leaves natural musical intro (~8%) and outro (~7%) buffers
   */
  function distributeLinesEvenly(lines, durationSeconds = 210) {
    if (!Array.isArray(lines) || lines.length === 0) return [];
    const durSec = (typeof durationSeconds === 'number' && durationSeconds > 30) ? durationSeconds : 210;

    const introSec = Math.min(16, Math.max(6, durSec * 0.08));
    const outroSec = Math.min(14, Math.max(5, durSec * 0.07));
    const activeSec = Math.max(20, durSec - introSec - outroSec);

    const count = lines.length;
    const stepSec = activeSec / count;
    const lineDurSec = Math.max(2.5, Math.min(stepSec * 0.9, stepSec - 0.4));

    return lines.map((line, idx) => {
      const startSec = introSec + (idx * stepSec);
      const timeMs = Math.round(startSec * 1000);
      const durMs = Math.round(lineDurSec * 1000);

      const isString = typeof line === 'string';
      const rawText = isString ? line.trim() : (line.text_roman || line.text_en || line.text_np || '').trim();
      const isDev = isString ? containsDevanagari(rawText) : containsDevanagari(line.text_np || rawText);

      const baseObj = isString
        ? {
            text_np: isDev ? rawText : '',
            text_roman: isDev ? '' : rawText,
            text_en: isDev ? '' : rawText,
            chords: ''
          }
        : {
            ...line,
            text_np: line.text_np || (isDev ? rawText : ''),
            text_roman: line.text_roman || (!isDev ? rawText : ''),
            text_en: line.text_en || line.text_roman || (!isDev ? rawText : ''),
            chords: line.chords || line.chord || ''
          };

      return {
        ...baseObj,
        line_order: idx + 1,
        time_ms: (typeof baseObj.time_ms === 'number' && baseObj.time_ms >= 0) ? baseObj.time_ms : timeMs,
        duration_ms: (typeof baseObj.duration_ms === 'number' && baseObj.duration_ms > 0) ? baseObj.duration_ms : durMs
      };
    });
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
    } else if (sourceType === 'GENIUS') {
      sourceBadge.classList.add('badge-source-genius');
      sourceBadge.textContent = 'Genius';
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
  // ZERO-QUOTA YOUTUBE SEARCH & MATCHER SIDEBAR
  // ========================================================

  /**
   * Queries YouTube directly via public search HTML without API quota cost
   */
  async function searchYouTube(query) {
    if (!query || !query.trim()) return [];
    const cleanQ = query.trim();
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQ)}`;
    
    try {
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      const html = await res.text();
      
      const match = html.match(/var ytInitialData\s*=\s*({.+?});<\/script>/) ||
                    html.match(/ytInitialData\s*=\s*({.+?});/);
      if (!match) return [];

      const parsed = JSON.parse(match[1]);
      const videos = [];
      const contents = parsed?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

      for (const section of contents) {
        const items = section?.itemSectionRenderer?.contents || [];
        for (const item of items) {
          const v = item?.videoRenderer;
          if (v && v.videoId) {
            const title = v.title?.runs?.map(r => r.text).join('') || '';
            const channel = v.ownerText?.runs?.map(r => r.text).join('') || '';
            const duration = v.lengthText?.simpleText || '';
            const thumbnails = v.thumbnail?.thumbnails || [];
            const thumb = thumbnails.length > 0
              ? thumbnails[thumbnails.length - 1].url
              : `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`;

            videos.push({
              videoId: v.videoId,
              title,
              channel,
              duration,
              thumbnail: thumb
            });
          }
        }
      }
      return videos;
    } catch (err) {
      console.error('YouTube search error:', err);
      return [];
    }
  }

  /**
   * Executes YouTube sidebar search and displays video cards
   */
  async function triggerYouTubeSidebarSearch(query) {
    if (typeof switchSidebarTab === 'function') {
      switchSidebarTab('sidebar-pane-yt');
    }
    const q = query || ytSidebarSearchInput.value.trim();
    if (!q) {
      showToast('Enter a song title or artist to search YouTube.', 'info');
      return;
    }

    ytSidebarSearchInput.value = q;
    ytSidebarLoading.classList.remove('hidden');
    ytSidebarEmpty.classList.add('hidden');
    ytSidebarResults.classList.add('hidden');
    ytSidebarResults.innerHTML = '';

    const videos = await searchYouTube(q);
    ytSidebarLoading.classList.add('hidden');

    if (videos.length === 0) {
      ytSidebarEmpty.classList.remove('hidden');
      ytSidebarEmpty.innerHTML = `<div class="empty-yt-icon">⚠️</div><p>No YouTube videos found matching "${escapeHtml(q)}". Try different keywords.</p>`;
      return;
    }

    ytSidebarResults.classList.remove('hidden');

    videos.slice(0, 15).forEach(v => {
      const card = document.createElement('div');
      card.className = 'yt-result-card';
      card.dataset.videoId = v.videoId;
      if (fYoutubeId.value === v.videoId) {
        card.classList.add('selected');
      }

      card.innerHTML = `
        <div class="yt-card-thumb">
          <img src="${escapeHtml(v.thumbnail)}" alt="${escapeHtml(v.title)}" loading="lazy" />
          <span class="badge-duration">${escapeHtml(v.duration || '0:00')}</span>
        </div>
        <div class="yt-card-info">
          <span class="yt-card-title" title="${escapeHtml(v.title)}">${escapeHtml(v.title)}</span>
          <span class="yt-card-channel">${escapeHtml(v.channel)}</span>
          <button type="button" class="btn-select-yt">✓ Link This</button>
        </div>
      `;

      card.addEventListener('click', () => {
        selectYouTubeVideoForPreview(v);
      });

      card.querySelector('.btn-select-yt').addEventListener('click', (e) => {
        e.stopPropagation();
        selectYouTubeVideoForPreview(v);
        confirmYouTubeVideoLink(v);
      });

      ytSidebarResults.appendChild(card);
    });
  }

  /**
   * Stages a selected YouTube video into the confirmation card
   */
  function selectYouTubeVideoForPreview(video) {
    pendingSelectedVideo = video;
    ytSelectedCard.classList.remove('hidden');
    ytSelectedThumb.src = video.thumbnail;
    ytSelectedDuration.textContent = video.duration || '0:00';
    ytSelectedTitle.textContent = video.title;
    ytSelectedChannel.textContent = video.channel;

    // Highlight card in results list
    const allCards = ytSidebarResults.querySelectorAll('.yt-result-card');
    allCards.forEach(c => {
      if (c.dataset.videoId === video.videoId) {
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });

    // Auto-scroll the sidebar pane smoothly to the top so the confirmation card is fully visible
    if (sidebarPaneYt) {
      sidebarPaneYt.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Confirms and links the selected YouTube video into the song form
   */
  function confirmYouTubeVideoLink(video) {
    const target = video || pendingSelectedVideo;
    if (!target) return;

    const vid = target.videoId;
    const durSec = parseDurationString(target.duration);
    fYoutubeId.value = vid;
    prevYtId.textContent = `YT ID: ${vid}`;
    prevThumbnail.src = target.thumbnail;
    prevDuration.textContent = target.duration || '0:00';

    if (currentSongData) {
      currentSongData.youtube_video_id = vid;
      currentSongData.thumbnail_url = target.thumbnail;
      currentSongData.duration_seconds = durSec;
    }

    // Automatically redistribute existing lyrics lines across the newly confirmed YouTube duration!
    if (currentLyricsLines && currentLyricsLines.length > 0) {
      currentLyricsLines = distributeLinesEvenly(currentLyricsLines, durSec);
      renderEditableLines(currentLyricsLines);
      renderLyricsPreview(currentLyricsLines);
      showToast(`✓ Linked YouTube Video & spaced lyrics evenly across ${target.duration || 'song'}!`, 'success');
    } else {
      showToast(`✓ Linked YouTube Video: "${target.title}"`, 'success');
    }

    // Update status badge
    updateYtMatchStatus(true);
  }

  btnConfirmYtLink.addEventListener('click', () => {
    confirmYouTubeVideoLink();
  });

  btnCancelYtSelect.addEventListener('click', () => {
    pendingSelectedVideo = null;
    ytSelectedCard.classList.add('hidden');
  });

  // Sidebar search button & enter key
  btnYtSidebarSearch.addEventListener('click', () => {
    triggerYouTubeSidebarSearch();
  });

  ytSidebarSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerYouTubeSidebarSearch();
    }
  });

  // Quick Action: Search from Title
  if (btnSearchYtFromTitle) {
    btnSearchYtFromTitle.addEventListener('click', () => {
      const q = `${fTitleEn.value || ''} ${fSingers.value || ''}`.trim();
      triggerYouTubeSidebarSearch(q);
    });
  }

  // Quick Action: Search from YouTube ID input
  if (btnTriggerYtSearch) {
    btnTriggerYtSearch.addEventListener('click', () => {
      const q = `${fTitleEn.value || ''} ${fSingers.value || ''}`.trim();
      triggerYouTubeSidebarSearch(q);
    });
  }

  // ========================================================
  // SIDEBAR TAB SWITCHER (YouTube Matcher vs Song Details)
  // ========================================================

  function switchSidebarTab(targetPaneId) {
    [sidebarTabBtnYt, sidebarTabBtnDetails].forEach(btn => {
      if (!btn) return;
      if (btn.dataset.tab === targetPaneId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    [sidebarPaneYt, sidebarPaneDetails].forEach(pane => {
      if (!pane) return;
      if (pane.id === targetPaneId) {
        pane.classList.remove('hidden');
        pane.classList.add('active');
      } else {
        pane.classList.add('hidden');
        pane.classList.remove('active');
      }
    });
  }

  if (sidebarTabBtnYt) {
    sidebarTabBtnYt.addEventListener('click', () => switchSidebarTab('sidebar-pane-yt'));
  }
  if (sidebarTabBtnDetails) {
    sidebarTabBtnDetails.addEventListener('click', () => switchSidebarTab('sidebar-pane-details'));
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

      // Auto search YouTube for this song in sidebar
      const ytQuery = `${song.title_en} ${song.artist_display || ''}`.trim();
      triggerYouTubeSidebarSearch(ytQuery);

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
  // WINDOW MODE & POPOUT EXPANDER
  // ========================================================

  const urlParams = new URLSearchParams(window.location.search);
  const isWindowMode = urlParams.get('mode') === 'window' || urlParams.get('mode') === 'tab' || window.innerWidth > 800;
  if (isWindowMode) {
    document.body.classList.add('expanded-mode');
    if (btnExpandWindow) btnExpandWindow.classList.add('hidden');
  }

  if (btnExpandWindow) {
    btnExpandWindow.addEventListener('click', async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        const tabId = activeTab ? activeTab.id : '';
        const tabUrl = activeTab && activeTab.url ? encodeURIComponent(activeTab.url) : '';
        const popoutUrl = chrome.runtime.getURL(`src/popup/popup.html?mode=window&targetTabId=${tabId}&targetUrl=${tabUrl}`);

        if (chrome.windows && chrome.windows.create) {
          chrome.windows.create({
            url: popoutUrl,
            type: 'popup',
            width: 1160,
            height: 820,
            focused: true
          });
        } else {
          chrome.tabs.create({ url: popoutUrl });
        }
      } catch (err) {
        chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/popup.html?mode=tab') });
      }
    });
  }

  // ========================================================
  // ACTIVE TAB DISCOVERY & EXTRACTION ROUTER
  // ========================================================

  async function initTabExtraction() {
    setViewState('loading');
    document.getElementById('loading-title').textContent = 'Detecting Music Page...';
    document.getElementById('loading-desc').textContent = 'Reading page DOM, chord sheets, and timed subtitles.';

    let activeTab = null;
    const targetTabIdParam = urlParams.get('targetTabId');
    if (targetTabIdParam) {
      try {
        activeTab = await chrome.tabs.get(parseInt(targetTabIdParam, 10));
      } catch (e) {
        activeTab = null;
      }
    }

    if (!activeTab || !activeTab.url || activeTab.url.includes(chrome.runtime.id)) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      activeTab = tabs[0];

      // If active tab is extension itself (e.g. popout window or full tab), find the target music tab
      if (activeTab && activeTab.url && activeTab.url.includes(chrome.runtime.id)) {
        const allTabs = await chrome.tabs.query({});
        const webTab = allTabs.find(t => t.url && !t.url.includes(chrome.runtime.id) && (
          t.url.includes('youtube.com') || t.url.includes('.blogspot.com') || t.url.includes('nepalisongchord.com') || t.url.includes('genius.com')
        ));
        if (webTab) {
          activeTab = webTab;
        }
      }
    }

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

    // 4. Genius.com Detection (genius.com)
    if (url.includes('genius.com/')) {
      updateSourceIndicator('GENIUS', activeTab.title || 'Genius.com Lyrics');
      sendExtractMessage(activeTab.id, 'GENIUS');
      return;
    }

    // 5. Fallback: Generic Tab
    updateSourceIndicator('GENERIC', activeTab.title || 'Web Page');
    setViewState('not-supported');
  }

  function sendExtractMessage(tabId, sourceKind) {
    let responded = false;
    const timeoutTimer = setTimeout(() => {
      if (!responded) {
        responded = true;
        setViewState('not-supported');
        showToast('Communication timed out. Please refresh the music webpage and reopen the extension.', 'info');
      }
    }, 6000);

    try {
      chrome.tabs.sendMessage(tabId, { action: 'EXTRACT_SONG_DATA' }, (response) => {
        if (responded) return;
        responded = true;
        clearTimeout(timeoutTimer);

        if (chrome.runtime.lastError || !response || !response.success || !response.data) {
          setViewState('not-supported');
          showToast('Could not extract music data from page. Please refresh the tab.', 'info');
          return;
        }

        const data = response.data;
        try {
          if (data.type === 'BLOGGER_LABEL' || data.type === 'NSC_ARTIST') {
            renderLabelView(data);
          } else {
            populateFormFromScraped(data, sourceKind);
          }
        } catch (renderErr) {
          console.error('Error rendering scraped data:', renderErr);
          setViewState('not-supported');
          showToast('Error rendering scraped data: ' + renderErr.message, 'error');
        }
      });
    } catch (err) {
      if (!responded) {
        responded = true;
        clearTimeout(timeoutTimer);
        setViewState('not-supported');
        showToast('Error communicating with active page script.', 'error');
      }
    }
  }

  btnRefreshTab.addEventListener('click', () => {
    initTabExtraction();
  });

  // ========================================================
  // RENDER LABEL / DISCOGRAPHY VIEW
  // ========================================================

  // Helper for consistent title casing
  const formatCase = (str) => (typeof toTitleCase === 'function' ? toTitleCase(str) : (str || '').trim());

  function renderLabelView(data) {
    setViewState('label-view');
    labelArtistName.textContent = formatCase(data.artist_name || 'Nepali Artist');
    labelSongCount.textContent = `${data.songs?.length || 0} songs found on this page`;

    labelSongsList.innerHTML = '';
    const songs = data.songs || [];

    if (songs.length === 0) {
      labelSongsList.innerHTML = '<div class="label-song-row"><span class="song-name">No songs detected on this page.</span></div>';
    } else {
      songs.forEach(s => {
        const row = document.createElement('div');
        row.className = 'label-song-row';
        const displayTitle = formatCase(s.title);
        row.innerHTML = `
          <span class="song-name" title="${escapeHtml(displayTitle)}">${escapeHtml(displayTitle)}</span>
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
      btnOlderPosts.dataset.url = data.older_page_url;
    } else {
      labelPaginationRow.classList.add('hidden');
      btnOlderPosts.dataset.url = '';
    }
  }

  if (btnOlderPosts) {
    btnOlderPosts.addEventListener('click', async () => {
      const url = btnOlderPosts.dataset.url;
      if (!url) return;
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        await chrome.tabs.update(tabs[0].id, { url });
        window.close();
      }
    });
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
    const thumb = data.thumbnail_url || data.song_art_image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80';
    prevThumbnail.src = thumb;
    prevDuration.textContent = formatDuration(data.duration_seconds || 0);
    prevYtId.textContent = data.youtube_video_id ? `YT ID: ${data.youtube_video_id}` : 'YT ID: None';

    // Inputs (Auto-capitalized first letter of each word)
    const rawTitle = data.title_en || data.title || '';
    fTitleEn.value = formatCase(rawTitle);
    fTitleNp.value = (data.title_np || (containsDevanagari(rawTitle) ? rawTitle : '')).trim();

    const singersList = (data.singers && data.singers.length > 0)
      ? data.singers
      : (data.artist_name ? [data.artist_name] : []);
    const formattedSingers = singersList.map(formatCase);
    fSingers.value = formattedSingers.join(', ');
    if (fArtistName) fArtistName.value = data.artist_name ? formatCase(data.artist_name) : formattedSingers.join(', ');

    fFeaturing.value = (data.featuring || []).map(formatCase).join(', ');
    fLyricists.value = (data.lyricists || []).map(formatCase).join(', ');
    fComposers.value = (data.composers || []).map(formatCase).join(', ');
    fMovieName.value = formatCase(data.movie_name || '');

    // Chords & Scale
    fChords.value = data.chords_progression || (data.chords ? data.chords.join(', ') : '');
    fScale.value = data.scale || 'C Major';
    fBpm.value = data.bpm || '';
    fGenre.value = data.genre || 'Pop/Rock';
    fYear.value = data.release_year || new Date().getFullYear();
    fYoutubeId.value = data.youtube_video_id || '';

    // Status Badge in Sidebar
    updateYtMatchStatus(Boolean(data.youtube_video_id));

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

    // Setup Lyrics in Tabbed Hub
    const songDuration = data.duration_seconds || 210;
    const lines = data.lyrics_lines || data.lyrics || [];
    let parsedLines = Array.isArray(lines) ? [...lines] : [];
    if (parsedLines.length > 0) {
      // If lines don't have custom timestamps or are clamped to first few seconds (dummy 3000ms intervals)
      const hasRealTimestamps = Boolean(data.has_real_timestamps || data.is_synced || data.sync_status === 'verified');
      if (!hasRealTimestamps) {
        const isDummy = parsedLines.every((l, i) => !l.time_ms || Math.abs((l.time_ms ?? 0) - (i * 3000)) < 100);
        if (isDummy) {
          parsedLines = distributeLinesEvenly(parsedLines, songDuration);
        }
      }
    }
    currentLyricsLines = parsedLines;

    if (data.sheet_text) {
      fLyricsRaw.value = data.sheet_text;
    } else if (data.lyrics_raw) {
      fLyricsRaw.value = data.lyrics_raw;
    } else {
      fLyricsRaw.value = generateSheetFromLines(currentLyricsLines);
    }

    // Auto-detect if scraped content is in Nepali Devanagari Unicode
    const hasDevanagari = currentLyricsLines.some(l => containsDevanagari(l.text_np || l.text_roman || l.text_en || (typeof l === 'string' ? l : ''))) || containsDevanagari(data.title_np || '');
    if (hasDevanagari) {
      setLyricsScript('devanagari');
    } else {
      setLyricsScript('roman');
    }

    renderEditableLines(currentLyricsLines);
    renderLyricsPreview(currentLyricsLines);
    updateLyricsCount(currentLyricsLines.length);

    setViewState('ready');

    // Automatically trigger zero-quota YouTube search in sidebar!
    const searchTarget = `${fTitleEn.value} ${fSingers.value}`.trim();
    if (searchTarget) {
      triggerYouTubeSidebarSearch(searchTarget);
    }
  }

  // ========================================================
  // POPULATE FORM: FROM CATALOG SONG (EDIT MODE)
  // ========================================================

  function populateFormFromCatalog(song) {
    const thumb = song.thumbnail_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80';
    prevThumbnail.src = thumb;
    prevDuration.textContent = formatDuration(song.duration_seconds || 0);
    prevYtId.textContent = song.youtube_video_id ? `YT ID: ${song.youtube_video_id}` : 'YT ID: None';

    fTitleEn.value = formatCase(song.title_en || '');
    fTitleNp.value = (song.title_np || '').trim();

    const singers = (song.credits?.singers?.map(c => c.name_en) || []).map(formatCase);
    const featuring = (song.credits?.featuring?.map(c => c.name_en) || []).map(formatCase);
    const lyricists = (song.credits?.lyricists?.map(c => c.name_en) || []).map(formatCase);
    const composers = (song.credits?.composers?.map(c => c.name_en) || []).map(formatCase);

    fSingers.value = singers.join(', ');
    fFeaturing.value = featuring.join(', ');
    fLyricists.value = lyricists.join(', ');
    fComposers.value = composers.join(', ');
    fMovieName.value = formatCase(song.movie_name || '');

    fChords.value = song.chords_progression || '';
    fScale.value = song.scale || 'C Major';
    fBpm.value = song.bpm || '';
    fGenre.value = song.genre || 'Pop/Rock';
    fYear.value = song.release_year || new Date().getFullYear();
    fYoutubeId.value = song.youtube_video_id || '';

    updateYtMatchStatus(Boolean(song.youtube_video_id));

    subTrackContainer.classList.add('hidden');

    const lines = song.lyric_lines || [];
    currentLyricsLines = Array.isArray(lines) ? [...lines] : [];

    // Auto-detect if catalog song is primarily in Nepali Devanagari script
    const hasDevanagari = currentLyricsLines.some(l => containsDevanagari(l.text_np || '')) || containsDevanagari(song.title_np || '');
    if (hasDevanagari) {
      setLyricsScript('devanagari');
    } else {
      setLyricsScript('roman');
    }

    fLyricsRaw.value = generateSheetFromLines(currentLyricsLines);
    renderEditableLines(currentLyricsLines);
    renderLyricsPreview(currentLyricsLines);
    updateLyricsCount(currentLyricsLines.length);
  }

  // Auto-capitalize first letter of each word on blur for manual form fields
  const autoCapitalizeInputs = [fTitleEn, fSingers, fFeaturing, fLyricists, fComposers, fMovieName];
  autoCapitalizeInputs.forEach(inputEl => {
    if (!inputEl) return;
    inputEl.addEventListener('blur', () => {
      if (inputEl.value && typeof toTitleCase === 'function') {
        inputEl.value = toTitleCase(inputEl.value);
      }
    });
  });

  // ========================================================
  // TABBED LYRICS & CHORDS HUB CONTROLLER
  // ========================================================

  /**
   * Switch between Sheet Editor, Line-by-Line Editor, and Synced Preview
   */
  function switchLyricsTab(targetPaneId) {
    [tabBtnSheet, tabBtnLines, tabBtnPreview].forEach(btn => {
      if (!btn) return;
      if (btn.dataset.tab === targetPaneId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    [paneSheet, paneLines, panePreview].forEach(pane => {
      if (!pane) return;
      if (pane.id === targetPaneId) {
        pane.classList.remove('hidden');
        pane.classList.add('active');
      } else {
        pane.classList.add('hidden');
        pane.classList.remove('active');
      }
    });
  }

  if (tabBtnSheet) tabBtnSheet.addEventListener('click', () => switchLyricsTab('pane-sheet'));
  if (tabBtnLines) tabBtnLines.addEventListener('click', () => switchLyricsTab('pane-lines'));
  if (tabBtnPreview) tabBtnPreview.addEventListener('click', () => switchLyricsTab('pane-preview'));

  /**
   * Updates line count badges across the UI
   */
  function updateLyricsCount(count) {
    if (tabLyricsCountBadge) {
      tabLyricsCountBadge.textContent = count > 0 ? `${count} lines` : '0 lines';
    }
    if (prevCaptionsBadge) {
      prevCaptionsBadge.textContent = count > 0 ? `✓ ${count} lyrics lines` : 'No lyrics saved';
      prevCaptionsBadge.style.color = count > 0 ? '#34D399' : '#A1A1AA';
    }
  }

  /**
   * Sets the active lyrics script mode ('roman' or 'devanagari')
   */
  function setLyricsScript(script) {
    activeLyricsScript = script;
    if (btnScriptRoman && btnScriptDevanagari) {
      if (script === 'devanagari') {
        btnScriptDevanagari.classList.add('active');
        btnScriptRoman.classList.remove('active');
      } else {
        btnScriptRoman.classList.add('active');
        btnScriptDevanagari.classList.remove('active');
      }
    }
    if (fLyricsRaw) {
      if (script === 'devanagari') {
        fLyricsRaw.classList.add('devanagari');
      } else {
        fLyricsRaw.classList.remove('devanagari');
      }
    }
    renderEditableLines(currentLyricsLines);
    renderLyricsPreview(currentLyricsLines);
    fLyricsRaw.value = generateSheetFromLines(currentLyricsLines);
  }

  /**
   * Formats structured lines into standard chord sheet text
   */
  function generateSheetFromLines(lines) {
    if (!lines || !lines.length) return '';
    return lines.map(l => {
      const chords = (l.chords || l.chord || '').trim();
      const isDev = activeLyricsScript === 'devanagari';
      const text = (isDev
        ? (l.text_np || l.text_roman || l.text_en || (typeof l === 'string' ? l : ''))
        : (l.text_roman || l.text_en || l.text_np || (typeof l === 'string' ? l : ''))).trim();
      if (chords && text) {
        return `${chords}\n${text}`;
      } else if (chords) {
        return chords;
      } else {
        return text;
      }
    }).filter(Boolean).join('\n\n');
  }

  /**
   * Renders interactive, directly editable line rows (Tab 2)
   */
  function renderEditableLines(lines) {
    if (!editableLinesContainer) return;
    editableLinesContainer.innerHTML = '';
    const list = lines || [];

    if (list.length === 0) {
      editableLinesContainer.innerHTML = `
        <div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 11px;">
          No lines yet. Click "+ Add Line" or paste chord sheet in the Sheet Editor tab.
        </div>
      `;
      return;
    }

    const isDev = activeLyricsScript === 'devanagari';

    list.forEach((line, idx) => {
      const row = document.createElement('div');
      row.className = 'editable-line-row';
      row.dataset.index = idx;

      const chordsVal = line.chords || line.chord || '';
      const textVal = isDev
        ? (line.text_np || (containsDevanagari(line.text_roman || line.text_en || '') ? (line.text_roman || line.text_en) : ''))
        : (line.text_roman || line.text_en || (!containsDevanagari(line.text_np || '') ? line.text_np : ''));

      const placeholder = isDev ? 'नेपाली बोल हरफ...' : 'Lyric line...';
      const textClass = isDev ? 'input-line-text devanagari' : 'input-line-text';

      let timeStr = '';
      if (typeof line.time_ms === 'number' && line.time_ms >= 0) {
        timeStr = formatMs(line.time_ms);
      } else if (typeof line.start_time === 'number' && line.start_time >= 0) {
        timeStr = formatMs(Math.round(line.start_time * 1000));
      }

      row.innerHTML = `
        <span class="editable-line-idx">${idx + 1}</span>
        <input type="text" class="input-line-time font-mono" placeholder="00:00.00" value="${escapeHtml(timeStr)}" title="Start timestamp (mm:ss.ms or mm:ss)" />
        <input type="text" class="input-line-chords font-mono" placeholder="Chords" value="${escapeHtml(chordsVal)}" title="Guitar chords for this line (e.g. F Gm)" />
        <input type="text" class="${textClass}" placeholder="${placeholder}" value="${escapeHtml(textVal || '')}" />
        <button type="button" class="btn-remove-line" title="Delete this line">&times;</button>
      `;

      const timeInp = row.querySelector('.input-line-time');
      const chordInp = row.querySelector('.input-line-chords');
      const textInp = row.querySelector('.input-line-text');
      const btnRemove = row.querySelector('.btn-remove-line');

      const onLineChange = () => {
        const val = timeInp.value.trim();
        if (val) {
          const parsedMs = parseTimeToMs(val);
          line.time_ms = parsedMs;
          line.start_time = parsedMs / 1000;
          if (currentSongData) {
            currentSongData.has_real_timestamps = true;
          }
        }
        line.chords = chordInp.value.trim();
        if (activeLyricsScript === 'devanagari') {
          line.text_np = textInp.value;
          if (!line.text_roman) {
            line.text_roman = '';
          }
        } else {
          line.text_roman = textInp.value;
          line.text_en = textInp.value;
        }
        // Sync to sheet and preview
        fLyricsRaw.value = generateSheetFromLines(currentLyricsLines);
        renderLyricsPreview(currentLyricsLines);
      };

      timeInp.addEventListener('input', onLineChange);
      chordInp.addEventListener('input', onLineChange);
      textInp.addEventListener('input', onLineChange);

      btnRemove.addEventListener('click', () => {
        currentLyricsLines.splice(idx, 1);
        renderEditableLines(currentLyricsLines);
        renderLyricsPreview(currentLyricsLines);
        fLyricsRaw.value = generateSheetFromLines(currentLyricsLines);
        updateLyricsCount(currentLyricsLines.length);
      });

      editableLinesContainer.appendChild(row);
    });
  }

  /**
   * Renders read-only preview cards with chord badges (Tab 3)
   */
  function renderLyricsPreview(lines) {
    if (!lyricsList) return;
    const count = (lines && lines.length) || 0;
    updateLyricsCount(count);

    lyricsList.innerHTML = '';
    if (count > 0) {
      const isDev = activeLyricsScript === 'devanagari';

      lines.forEach((line, idx) => {
        const row = document.createElement('div');
        row.className = 'line-row';

        let timeStr = `${idx + 1}`;
        if (typeof line.time_ms === 'number' && line.time_ms > 0) {
          timeStr = formatMs(line.time_ms);
        }

        const textStr = isDev
          ? (line.text_np || line.text_roman || line.text_en || (typeof line === 'string' ? line : ''))
          : (line.text_roman || line.text_en || line.text_np || (typeof line === 'string' ? line : ''));

        const lineTextClass = isDev ? 'line-text devanagari preview-line-devanagari' : 'line-text';

        const chordHtml = line.chords
          ? `<div class="line-chord-tag">🎸 ${escapeHtml(line.chords)}</div>`
          : '';

        row.innerHTML = `
          <span class="line-time">${timeStr}</span>
          <div class="line-content">
            ${chordHtml}
            <span class="${lineTextClass}">${escapeHtml(textStr)}</span>
          </div>
        `;
        lyricsList.appendChild(row);
      });
    } else {
      lyricsList.innerHTML = '<div class="line-row" style="background: rgba(200, 30, 30, 0.08); border-radius: 6px; padding: 6px 8px;"><span class="line-text" style="color: #E4E4E7; font-size: 11px;">⚠️ No lyrics lines parsed yet. Use the Chord Sheet Editor to paste or edit chords.</span></div>';
    }
  }

  /**
   * Re-parses sheet textarea into lines
   */
  function reparseSheetTextarea(showNotification = false) {
    const raw = fLyricsRaw.value.trim();
    if (!raw) {
      currentLyricsLines = [];
      renderEditableLines([]);
      renderLyricsPreview([]);
      updateLyricsCount(0);
      if (showNotification) showToast('Sheet is empty.', 'info');
      return;
    }

    const songDuration = currentSongData?.duration_seconds || parseDurationString(prevDuration.textContent) || 210;

    if (typeof ChordParser !== 'undefined') {
      const parsed = ChordParser.parseSheet(raw, songDuration);
      currentLyricsLines = parsed.lyrics_lines.map(l => {
        const txt = (l.text_roman || l.text_en || l.text_np || '').trim();
        const isDev = containsDevanagari(txt);
        return {
          ...l,
          text_np: isDev ? txt : (l.text_np || ''),
          text_roman: isDev ? (l.text_roman || '') : txt,
          text_en: isDev ? (l.text_en || '') : txt
        };
      });
      renderEditableLines(currentLyricsLines);
      renderLyricsPreview(currentLyricsLines);
      updateLyricsCount(currentLyricsLines.length);

      if (!fChords.value.trim() && parsed.chords_progression) {
        fChords.value = parsed.chords_progression;
      }
      if (showNotification) {
        showToast(`✓ Sheet parsed into ${currentLyricsLines.length} lines evenly distributed across ${formatDuration(songDuration)}!`, 'info');
      }
    } else {
      const splitLines = raw.split('\n').map(l => l.trim()).filter(Boolean);
      const baseLines = splitLines.map((line) => {
        const isDev = containsDevanagari(line);
        return {
          text_np: isDev ? line : '',
          text_roman: isDev ? '' : line,
          text_en: isDev ? '' : line,
          chords: ''
        };
      });
      currentLyricsLines = distributeLinesEvenly(baseLines, songDuration);
      renderEditableLines(currentLyricsLines);
      renderLyricsPreview(currentLyricsLines);
      updateLyricsCount(currentLyricsLines.length);
    }
  }

  // Re-parse button in Sheet Toolbar
  if (btnReParseSheet) {
    btnReParseSheet.addEventListener('click', () => {
      reparseSheetTextarea(true);
    });
  }

  // Live input on textarea (debounced 350ms)
  let sheetInputDebounce = null;
  fLyricsRaw.addEventListener('input', () => {
    clearTimeout(sheetInputDebounce);
    sheetInputDebounce = setTimeout(() => {
      reparseSheetTextarea(false);
    }, 350);
  });

  // Add Line Button in Line Editor
  if (btnAddLine) {
    btnAddLine.addEventListener('click', () => {
      const songDuration = currentSongData?.duration_seconds || parseDurationString(prevDuration.textContent) || 210;
      const lastLine = currentLyricsLines[currentLyricsLines.length - 1];
      const newTimeMs = lastLine && typeof lastLine.time_ms === 'number' ? lastLine.time_ms + 3000 : 0;
      const newLine = {
        time_ms: newTimeMs,
        start_time: newTimeMs / 1000,
        chords: '',
        text_roman: '',
        text_np: '',
        text_en: ''
      };
      currentLyricsLines.push(newLine);
      if (!currentSongData?.has_real_timestamps) {
        currentLyricsLines = distributeLinesEvenly(currentLyricsLines, songDuration);
      }
      renderEditableLines(currentLyricsLines);
      renderLyricsPreview(currentLyricsLines);
      fLyricsRaw.value = generateSheetFromLines(currentLyricsLines);
      updateLyricsCount(currentLyricsLines.length);

      // Focus the newly added text input
      const rows = editableLinesContainer.querySelectorAll('.editable-line-row');
      const lastRow = rows[rows.length - 1];
      if (lastRow) {
        const txt = lastRow.querySelector('.input-line-text');
        if (txt) txt.focus();
      }
    });
  }

  // CC Subtitle Track Selection Dropdown
  if (fSubTrack) {
    fSubTrack.addEventListener('change', async (e) => {
      const selectedIdx = parseInt(e.target.value, 10);
      const track = currentSongData?.caption_tracks?.[selectedIdx];
      if (!track || !track.baseUrl) return;

      showToast(`Loading "${track.name || track.languageCode}" captions...`, 'info');
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab?.id) return;

        chrome.tabs.sendMessage(activeTab.id, {
          action: 'FETCH_SUBTITLE_TRACK',
          baseUrl: track.baseUrl,
          videoId: currentSongData?.youtube_video_id,
          languageCode: track.languageCode,
          trackId: selectedIdx
        }, (res) => {
          if (chrome.runtime.lastError || !res?.success) {
            showToast(`Failed to load captions: ${res?.error || chrome.runtime.lastError?.message}`, 'error');
            return;
          }

          if (res.lines && res.lines.length > 0) {
            currentLyricsLines = res.lines;
            if (currentSongData) {
              currentSongData.has_real_timestamps = true;
              currentSongData.lyrics_lines = res.lines;
            }
            fLyricsRaw.value = generateSheetFromLines(currentLyricsLines);
            renderEditableLines(currentLyricsLines);
            renderLyricsPreview(currentLyricsLines);
            updateLyricsCount(currentLyricsLines.length);

            const hasDevanagari = currentLyricsLines.some(l => containsDevanagari(l.text_np || l.text_roman || l.text_en || (typeof l === 'string' ? l : '')));
            if (hasDevanagari) {
              setLyricsScript('devanagari');
            }
            showToast(`✓ Loaded ${res.lines.length} timestamped lines from "${track.name || track.languageCode}"!`, 'success');
          } else {
            showToast('Caption track had no readable lines.', 'warning');
          }
        });
      } catch (err) {
        showToast('Error requesting subtitle track: ' + err.message, 'error');
      }
    });
  }

  // Distribute Timing Evenly Button in Line Editor
  if (btnDistributeTiming) {
    btnDistributeTiming.addEventListener('click', () => {
      if (!currentLyricsLines || currentLyricsLines.length === 0) {
        showToast('No lyric lines to distribute.', 'info');
        return;
      }
      const songDuration = currentSongData?.duration_seconds || parseDurationString(prevDuration.textContent) || 210;
      currentLyricsLines = distributeLinesEvenly(currentLyricsLines, songDuration);
      renderEditableLines(currentLyricsLines);
      renderLyricsPreview(currentLyricsLines);
      showToast(`✓ Evenly spaced ${currentLyricsLines.length} lines across ${formatDuration(songDuration)}!`, 'success');
    });
  }

  // Sync to Sheet button in Line Editor
  if (btnSyncToSheet) {
    btnSyncToSheet.addEventListener('click', () => {
      fLyricsRaw.value = generateSheetFromLines(currentLyricsLines);
      switchLyricsTab('pane-sheet');
      showToast('✓ Synced lines into chord sheet!', 'info');
    });
  }

  // Script Mode Switcher Buttons
  if (btnScriptRoman) {
    btnScriptRoman.addEventListener('click', () => {
      setLyricsScript('roman');
    });
  }

  if (btnScriptDevanagari) {
    btnScriptDevanagari.addEventListener('click', () => {
      setLyricsScript('devanagari');
    });
  }

  // Transliterate Line-by-Line to Devanagari Unicode
  if (btnToDevanagari) {
    btnToDevanagari.addEventListener('click', () => {
      if (!currentLyricsLines || currentLyricsLines.length === 0) {
        showToast('No lyrics lines to convert.', 'info');
        return;
      }
      currentLyricsLines.forEach(l => {
        const sourceText = l.text_roman || l.text_en || l.text_np || (typeof l === 'string' ? l : '');
        if (sourceText) {
          if (!containsDevanagari(sourceText)) {
            l.text_np = romanToDevanagari(sourceText);
          } else {
            l.text_np = sourceText;
          }
        }
      });

      // Also auto-transliterate song title if Nepali title is empty or matches Roman title
      if (fTitleEn.value && (!fTitleNp.value.trim() || fTitleNp.value === fTitleEn.value)) {
        fTitleNp.value = romanToDevanagari(fTitleEn.value);
      }

      setLyricsScript('devanagari');
      showToast(`✓ Converted ${currentLyricsLines.length} lines to Nepali Devanagari Unicode!`, 'success');
    });
  }

  // Transliterate Chord Sheet Textarea to Devanagari Unicode
  if (btnSheetToDevanagari) {
    btnSheetToDevanagari.addEventListener('click', () => {
      const raw = fLyricsRaw.value;
      if (!raw.trim()) {
        showToast('Chord sheet is empty.', 'info');
        return;
      }
      const rawLines = raw.split('\n');
      const converted = rawLines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        if (typeof ChordParser !== 'undefined' && ChordParser.isChordLine(trimmed)) {
          return line; // Preserve chord lines
        }
        if (containsDevanagari(trimmed)) {
          return line;
        }
        return romanToDevanagari(line);
      }).join('\n');

      fLyricsRaw.value = converted;
      reparseSheetTextarea(false);
      setLyricsScript('devanagari');
      showToast('✓ Converted chord sheet to Nepali Devanagari Unicode!', 'success');
    });
  }

  // ========================================================
  // MERGE INTO EXISTING CATALOG SONG ACTION
  // ========================================================

  btnMatchCatalog.addEventListener('click', () => {
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

    const songDuration = currentSongData?.duration_seconds || parseDurationString(prevDuration.textContent) || 210;

    // Parse lyrics lines: use currentLyricsLines or re-parse from fLyricsRaw
    let payloadLyrics = currentLyricsLines;
    const rawVal = fLyricsRaw.value.trim();
    if ((!payloadLyrics || payloadLyrics.length === 0) && rawVal) {
      if (typeof ChordParser !== 'undefined') {
        const parsedSheet = ChordParser.parseSheet(rawVal, songDuration);
        payloadLyrics = parsedSheet.lyrics_lines;
        if (!fChords.value.trim() && parsedSheet.chords_progression) {
          fChords.value = parsedSheet.chords_progression;
        }
      } else {
        const splitLines = rawVal.split('\n').map(l => l.trim()).filter(Boolean);
        const base = splitLines.map((line) => ({
          text_np: line,
          text_en: line,
          chords: ''
        }));
        payloadLyrics = distributeLinesEvenly(base, songDuration);
      }
    } else if (currentSongData && currentSongData.lyrics && currentSongData.lyrics.length > 0 && (!payloadLyrics || !payloadLyrics.length)) {
      payloadLyrics = currentSongData.lyrics;
    }

    // Ensure lines are distributed evenly across the song duration only if real timestamps not present
    const hasRealTimestamps = Boolean(
      currentSongData?.has_real_timestamps ||
      currentSongData?.is_synced ||
      (Array.isArray(payloadLyrics) && payloadLyrics.some(l => typeof l.time_ms === 'number' && l.time_ms > 0))
    );
    if (!hasRealTimestamps && Array.isArray(payloadLyrics) && payloadLyrics.length > 2) {
      const lastLineMs = payloadLyrics[payloadLyrics.length - 1]?.time_ms || 0;
      if ((lastLineMs / 1000) < (songDuration * 0.35)) {
        payloadLyrics = distributeLinesEvenly(payloadLyrics, songDuration);
      }
    }

    // Ensure both text_np (Nepali Devanagari Unicode) and text_roman are populated
    if (Array.isArray(payloadLyrics)) {
      payloadLyrics = payloadLyrics.map((l, idx) => {
        const rawNp = (l.text_np || (containsDevanagari(l.text_roman || l.text_en || '') ? (l.text_roman || l.text_en) : '')).trim();
        const rawRo = (l.text_roman || l.text_en || (!containsDevanagari(l.text_np || '') ? l.text_np : '')).trim();
        const npFinal = rawNp || (rawRo ? romanToDevanagari(rawRo) : '');
        const roFinal = rawRo || (rawNp ? rawNp : '');
        return {
          ...l,
          line_order: idx + 1,
          text_np: npFinal,
          text_roman: roFinal,
          text_en: roFinal
        };
      });
    }

    const payload = {
      title_en: fTitleEn.value.trim(),
      title_np: fTitleNp.value.trim() || romanToDevanagari(fTitleEn.value.trim()) || fTitleEn.value.trim(),
      movie_name: fMovieName.value.trim() || null,
      youtube_video_id: fYoutubeId.value.trim() || (currentSongData?.youtube_video_id ?? null),
      duration_seconds: songDuration,
      genre: fGenre.value,
      release_year: parseInt(fYear.value, 10) || new Date().getFullYear(),
      scale: fScale.value.trim() || 'C Major',
      bpm: parseInt(fBpm.value, 10) || null,
      chords_progression: fChords.value.trim() || null,
      singers: fSingers.value.split(',').map(s => s.trim()).filter(Boolean),
      featuring: fFeaturing.value.split(',').map(s => s.trim()).filter(Boolean),
      lyricists: fLyricists.value.split(',').map(s => s.trim()).filter(Boolean),
      composers: fComposers.value.split(',').map(s => s.trim()).filter(Boolean),
      has_real_timestamps: hasRealTimestamps,
      is_synced: hasRealTimestamps,
      sync_status: hasRealTimestamps ? 'verified' : (currentSongData?.sync_status || 'raw'),
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
