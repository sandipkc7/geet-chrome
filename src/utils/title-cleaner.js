/**
 * GeetKosh Title & Metadata Sanitizer
 * Intelligently separates Devanagari title, Romanized/English title, and Artist names from YouTube video titles.
 */

const NOISE_PATTERNS = [
  /\[\s*(?:official\s+)?(?:music\s+)?(?:video|audio|lyric\s+video|visualizer|hd|4k|remastered)\s*\]/gi,
  /\(\s*(?:official\s+)?(?:music\s+)?(?:video|audio|lyric\s+video|visualizer|hd|4k|remastered)\s*\)/gi,
  /\b(?:official\s+video|official\s+audio|lyric\s+video|full\s+song|audio\s+song|video\s+song)\b/gi,
  /\b(?:new\s+nepali\s+(?:song|adhunik|lok\s+dohori|movie\s+song))\s*\d{0,4}\b/gi,
  /\b(?:ft\.?|feat\.?)\s+[^|–—-]+/gi,
  /\b\d{4}\b/g, // Stray 4-digit years at ends
];

/**
 * Checks if a string contains any Devanagari characters
 */
function hasDevanagari(text) {
  return /[\u0900-\u097F]/.test(text);
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
    return { title_np: '', title_en: '', artist_name: fallbackChannelName };
  }

  // Remove common outer brackets
  let cleaned = stripNoise(rawTitle);

  // Split by common delimiters: '|', ' - ', ' – ', ' — ', ':'
  const parts = cleaned.split(/\s*(?:\||–|—|\s+-\s+)\s*/).map(p => p.trim()).filter(Boolean);

  let titleNp = '';
  let titleEn = '';
  let artistName = '';

  if (parts.length === 1) {
    // Single chunk: check if parenthesized e.g. "Parelima (परेलीमा)"
    const parenMatch = parts[0].match(/^(.*?)\s*[\(\[]([\u0900-\u097F\s]+)[\)\]](.*)$/);
    if (parenMatch) {
      titleEn = (parenMatch[1] + ' ' + parenMatch[3]).trim();
      titleNp = parenMatch[2].trim();
    } else if (hasDevanagari(parts[0])) {
      titleNp = parts[0];
    } else {
      titleEn = parts[0];
    }
  } else if (parts.length >= 2) {
    // Check parts for Devanagari vs Latin
    for (const part of parts) {
      // Check if part is artist name
      if (fallbackChannelName && part.toLowerCase().includes(fallbackChannelName.toLowerCase().replace(/\s+official.*$/i, ''))) {
        artistName = part;
      } else if (hasDevanagari(part)) {
        if (!titleNp) titleNp = part;
      } else {
        if (!titleEn) titleEn = part;
        else if (!artistName) artistName = part;
      }
    }
  }

  // Fallbacks
  if (!artistName) {
    artistName = fallbackChannelName.replace(/\s*-\s*topic$/i, '').replace(/\s*(?:official|channel|vevo|entertainment|films|creation).*$/i, '').trim();
  }

  if (!titleEn && titleNp) {
    titleEn = parts[0] || titleNp;
  }
  if (!titleNp && titleEn) {
    titleNp = titleEn;
  }

  return {
    title_np: titleNp.trim(),
    title_en: titleEn.trim(),
    artist_name: artistName.trim()
  };
}

// Export for extension modules or content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseYouTubeTitle, hasDevanagari, stripNoise };
}
