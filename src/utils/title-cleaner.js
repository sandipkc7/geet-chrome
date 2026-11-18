/**
 * GeetKosh Title & Metadata Sanitizer
 * Intelligently extracts Devanagari title, Romanized title, Primary Artist(s), and Featuring Artist(s)
 */

const NOISE_PATTERNS = [
  /\[\s*(?:official\s+)?(?:music\s+)?(?:video|audio|lyric\s+video|visualizer|hd|4k|remastered)\s*\]/gi,
  /\(\s*(?:official\s+)?(?:music\s+)?(?:video|audio|lyric\s+video|visualizer|hd|4k|remastered)\s*\)/gi,
  /\b(?:official\s+video|official\s+audio|lyric\s+video|full\s+song|audio\s+song|video\s+song)\b/gi,
  /\b(?:new\s+nepali\s+(?:song|adhunik|lok\s+dohori|movie\s+song))\s*\d{0,4}\b/gi,
  /\b\d{4}\b/g, // Stray 4-digit years at ends
];

/**
 * Extracts movie/film name from title clauses
 * e.g. "Kutu Ma Kutu - From Nepali Movie Dui Rupaiyan", "Maya Luki Luki | Movie: CHAKKA PANJA 2"
 */
function extractMovieName(text) {
  if (!text) return '';
  const patterns = [
    /(?:from\s+(?:the\s+)?(?:nepali\s+)?(?:movie|film|cinema|चलचित्र|फिल्म))\s*["'“]?([^"'”|–—\-()\[\]]+)["'”]?/i,
    /(?:movie|film|cinema|चलचित्र|फिल्म)\s*[:\-–]\s*["'“]?([^"'”|–—\-()\[\]]+)["'”]?/i,
    /\bost\s*[:\-–]?\s*["'“]?([^"'”|–—\-()\[\]]+)["'”]?/i,
  ];
  for (const pat of patterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const name = match[1].replace(/\s*(?:official|song|full\s+video|hd|4k).*$/i, '').trim();
      if (name.length > 1) return name;
    }
  }
  return '';
}

/**
 * Checks if a string contains any Devanagari characters
 */
function hasDevanagari(text) {
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Extracts featuring artists from title clauses (e.g. "feat. Artist", "(ft. Artist)", "featuring Artist")
 */
function extractFeaturingArtists(text) {
  if (!text) return { cleaned: text, featuring: [] };

  const featRegex = /(?:[\(\[]\s*)?(?:ft\.?|feat\.?|featuring)\s+([^\)\]|–—\-]+)(?:\s*[\)\]])?/gi;
  const featuring = [];
  let cleaned = text;

  let match;
  while ((match = featRegex.exec(text)) !== null) {
    if (match[1]) {
      const names = match[1]
        .split(/\s*(?:,|&|\band\b|\bx\b)\s*/i)
        .map(s => s.trim().replace(/^[\(\[]|[\)\]]$/g, '').trim())
        .filter(s => s.length > 0 && !/^(official|video|audio|hd|4k)$/i.test(s));
      featuring.push(...names);
    }
  }

  cleaned = cleaned.replace(featRegex, ' ').trim();
  return {
    cleaned,
    featuring: [...new Set(featuring)]
  };
}

/**
 * Splits multiple artists by delimiters (comma, &, and, x, with)
 */
function splitArtistList(artistStr) {
  if (!artistStr) return [];
  return artistStr
    .split(/\s*(?:,|&|\band\b|\bx\b|\bwith\b)\s*/i)
    .map(s => s.trim().replace(/^[\(\[]|[\)\]]$/g, '').trim())
    .filter(s => s.length > 1 && !/^(official|vevo|audio|video|music|entertainment|films)$/i.test(s));
}

/**
 * Extracts dual-script title if one part contains both Devanagari and Latin in parentheses
 * e.g. "फूलको आँखामा (Phool Ko Aankhama)" or "Phool Ko Aankhama (फूलको आँखामा)"
 */
function extractDualScriptTitle(text) {
  if (!text) return null;
  // Pattern 1: Devanagari (English)
  const devFirst = text.match(/^([\u0900-\u097F\s\p{P}]+?)\s*[\(\[]([a-zA-Z0-9\s\p{P}]+?)[\)\]]$/u);
  if (devFirst && devFirst[1] && devFirst[2]) {
    return { titleNp: devFirst[1].trim(), titleEn: devFirst[2].trim() };
  }
  // Pattern 2: English (Devanagari)
  const enFirst = text.match(/^([a-zA-Z0-9\s\p{P}]+?)\s*[\(\[]([\u0900-\u097F\s\p{P}]+?)[\)\]]$/u);
  if (enFirst && enFirst[1] && enFirst[2]) {
    return { titleNp: enFirst[2].trim(), titleEn: enFirst[1].trim() };
  }
  return null;
}

/**
 * Strips YouTube boilerplate keywords
 */
function stripNoise(text) {
  let cleaned = text;
  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Splits and extracts structured titles and artist from raw title
 */
function parseYouTubeTitle(rawTitle, fallbackChannelName = '') {
  if (!rawTitle) {
    const fallbackSingers = fallbackChannelName ? splitArtistList(fallbackChannelName) : [];
    return {
      title_np: '',
      title_en: '',
      artist_name: fallbackChannelName,
      singers: fallbackSingers,
      featuring: []
    };
  }

  // 1. Extract featuring artists first before stripping noise
  const featResult = extractFeaturingArtists(rawTitle);
  let cleaned = stripNoise(featResult.cleaned);
  const featuring = [...featResult.featuring];

  // 2. Split by common delimiters: '|', ' - ', ' – ', ' — ', ':'
  const parts = cleaned.split(/\s*(?:\||–|—|\s+-\s+)\s*/).map(p => p.trim()).filter(Boolean);

  let titleNp = '';
  let titleEn = '';
  let artistPart = '';

  const cleanChannel = fallbackChannelName
    ? fallbackChannelName.toLowerCase().replace(/\s*(?:official|channel|vevo|entertainment|films|creation|music).*$/i, '').trim()
    : '';

  if (parts.length === 1) {
    const dual = extractDualScriptTitle(parts[0]);
    if (dual) {
      titleNp = dual.titleNp;
      titleEn = dual.titleEn;
    } else if (hasDevanagari(parts[0])) {
      titleNp = parts[0];
    } else {
      titleEn = parts[0];
    }
  } else if (parts.length >= 2) {
    // Check if any part is a dual-script title
    for (let i = 0; i < parts.length; i++) {
      const dual = extractDualScriptTitle(parts[i]);
      if (dual) {
        titleNp = dual.titleNp;
        titleEn = dual.titleEn;
        // The other part is almost certainly the artist
        const otherParts = parts.filter((_, idx) => idx !== i);
        if (otherParts.length > 0) {
          artistPart = otherParts[0];
        }
        break;
      }
    }

    // If dual script was not found, resolve artist and title parts
    if (!titleNp && !titleEn) {
      // Check channel matching
      let artistIdx = -1;
      if (cleanChannel) {
        artistIdx = parts.findIndex(p => {
          const pl = p.toLowerCase();
          return pl.includes(cleanChannel) || cleanChannel.includes(pl);
        });
      }

      // Check artist conjunctions e.g. "Artist1 & Artist2"
      if (artistIdx === -1) {
        artistIdx = parts.findIndex(p => /\s*(?:&|\bx\b|\bfeat\.?\b|\bft\.?\b|\bwith\b|,)\s*/i.test(p));
      }

      if (artistIdx !== -1) {
        artistPart = parts[artistIdx];
        const titleParts = parts.filter((_, idx) => idx !== artistIdx);
        const titleCand = titleParts[0] || '';
        const dualCand = extractDualScriptTitle(titleCand);
        if (dualCand) {
          titleNp = dualCand.titleNp;
          titleEn = dualCand.titleEn;
        } else if (hasDevanagari(titleCand)) {
          titleNp = titleCand;
        } else {
          titleEn = titleCand;
        }
      } else {
        // Fallback: standard convention "[Artist] - [Title]"
        artistPart = parts[0];
        const titleCand = parts[1];
        if (hasDevanagari(titleCand)) {
          titleNp = titleCand;
        } else {
          titleEn = titleCand;
        }
      }
    }
  }

  // Clean fallback channel
  const cleanedChannelFallback = fallbackChannelName
    .replace(/\s*-\s*topic$/i, '')
    .replace(/\s*(?:official|channel|vevo|entertainment|films|creation|music).*$/i, '')
    .trim();

  if (!artistPart && cleanedChannelFallback) {
    artistPart = cleanedChannelFallback;
  }

  // Split primary singers
  let singers = splitArtistList(artistPart);
  if (singers.length === 0 && cleanedChannelFallback) {
    singers = [cleanedChannelFallback];
  }

  if (!titleEn && titleNp) {
    titleEn = titleNp;
  }
  if (!titleNp && titleEn) {
    titleNp = titleEn;
  }

  const primaryArtistDisplay = singers.join(', ') || artistPart || cleanedChannelFallback;
  const movieName = extractMovieName(rawTitle);

  return {
    title_np: titleNp.trim(),
    title_en: titleEn.trim(),
    artist_name: primaryArtistDisplay,
    movie_name: movieName,
    singers: singers,
    featuring: featuring
  };
}

// Export for extension modules or content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseYouTubeTitle, hasDevanagari, stripNoise, splitArtistList, extractFeaturingArtists, extractDualScriptTitle, extractMovieName };
}
