/**
 * GeetKosh (गीतकोश) — Smart Chord & Lyric Parser Utility
 * Intelligently identifies guitar chord lines, extracts chord progressions,
 * cleans Romanized lyric lines, and estimates root musical keys.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ChordParser = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Standard guitar chord regex: [A-G][#b]?(m|maj|min|dim|aug|sus\d?|add\d?|\d)?(/([A-G][#b]?))?
  const CHORD_REGEX = /^[A-G][#b]?(m|maj|min|dim|aug|sus\d?|add\d?|\d)?(\/[A-G][#b]?)?$/i;
  const CHORD_IN_TEXT_REGEX = /\b([A-G][#b]?(?:m|maj|min|dim|aug|sus\d?|add\d?|\d)?(?:\/[A-G][#b]?)?)\b/g;

  /**
   * Tests whether an individual token looks like a musical chord
   */
  function isChordToken(token) {
    if (!token) return false;
    // Strip trailing/leading punctuation or dots
    const clean = token.replace(/^[.\s\-_()\[\]]+|[.\s\-_()\[\]]+$/g, '');
    if (!clean) return false;
    return CHORD_REGEX.test(clean);
  }

  /**
   * Determines if a single line of text is predominantly chords rather than lyrics
   */
  function isChordLine(line) {
    if (!line) return false;
    const trimmed = line.trim();
    if (!trimmed) return false;

    // Remove repeated dots or spaces used for spacing out chords in tabs
    const tokens = trimmed.split(/[\s\t.]+/).filter(t => t.length > 0);
    if (tokens.length === 0) return false;

    let chordCount = 0;
    for (const token of tokens) {
      if (isChordToken(token)) {
        chordCount++;
      }
    }

    // If over 50% of tokens are valid chords, or line is only 1-3 tokens and all chords
    const ratio = chordCount / tokens.length;
    return (chordCount > 0 && ratio >= 0.5) || (tokens.length <= 3 && chordCount === tokens.length);
  }

  /**
   * Extracts all unique chords in order of first appearance from text
   */
  function extractChordProgression(text) {
    if (!text) return [];
    const matches = text.match(CHORD_IN_TEXT_REGEX) || [];
    const unique = [];
    const seen = new Set();

    for (const m of matches) {
      const upper = m.toUpperCase();
      // Normalize e.g. "GM" -> "Gm", "BB" -> "Bb"
      const normalized = m.charAt(0).toUpperCase() + m.slice(1);
      if (!seen.has(upper) && isChordToken(normalized)) {
        seen.add(upper);
        unique.push(normalized);
      }
    }
    return unique;
  }

  /**
   * Guesses likely root key / scale from first detected chord
   */
  function estimateScale(chords) {
    if (!chords || chords.length === 0) return 'C Major';
    const first = chords[0];
    if (first.endsWith('m') && !first.endsWith('dim')) {
      return `${first.slice(0, -1)} Minor`;
    }
    return `${first} Major`;
  }

  /**
   * Cleans a lyric line: strips embedded chord annotations, dots, trailing symbols
   */
  function cleanLyricLine(line) {
    if (!line) return '';
    let cleaned = line
      .replace(/&nbsp;/g, ' ')
      .replace(/\.{2,}/g, ' ')       // Remove repeated dots e.g. F......Gm
      .replace(/\s+/g, ' ')           // Collapse multiple whitespace
      .trim();

    // Remove guitar tab instruction lines (e.g. "Play chord same as above", "Strumming pattern", etc.)
    const lower = cleaned.toLowerCase();
    if (
      lower.startsWith('play chord') ||
      lower.startsWith('strumming') ||
      lower.startsWith('tuning:') ||
      lower.startsWith('capo:') ||
      lower.startsWith('verse') ||
      lower.startsWith('chorus') ||
      lower.startsWith('intro') ||
      lower.startsWith('outro')
    ) {
      // Keep section headers if clean e.g. [Chorus], but remove instructions
      if (lower.startsWith('play chord') || lower.startsWith('strumming')) {
        return '';
      }
    }

    return cleaned;
  }

  /**
   * Full parse of raw text / HTML into structured chords and clean lyric lines
   */
  function parseSheet(rawContent) {
    if (!rawContent) {
      return {
        chords: [],
        chords_progression: '',
        scale: 'C Major',
        lyrics_lines: [],
        raw_text: ''
      };
    }

    // Normalize line endings
    const lines = rawContent
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '') // Strip any remaining HTML tags
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const lyricLines = [];
    const allChords = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line contains "Artist :" or similar meta header
      if (/^Artist\s*:/i.test(line) || /^Song\s*:/i.test(line)) {
        continue;
      }

      if (isChordLine(line)) {
        const found = extractChordProgression(line);
        allChords.push(...found);
      } else {
        // Line is lyrical text
        const cleaned = cleanLyricLine(line);
        if (cleaned.length > 1) {
          // If the line has some chords embedded inside words (e.g. "F Malai bhanna aaundaina"),
          // separate the leading/trailing chord tokens from the lyrics
          const tokens = cleaned.split(' ');
          const nonChordTokens = [];
          for (const token of tokens) {
            if (isChordToken(token)) {
              allChords.push(token);
            } else {
              nonChordTokens.push(token);
            }
          }
          const pureLyrics = nonChordTokens.join(' ').trim();
          if (pureLyrics.length > 1) {
            lyricLines.push(pureLyrics);
          }
        }
      }
    }

    // Deduplicate chords in order
    const uniqueChords = [];
    const seenChords = new Set();
    for (const c of allChords) {
      const norm = c.charAt(0).toUpperCase() + c.slice(1);
      const upper = norm.toUpperCase();
      if (!seenChords.has(upper) && isChordToken(norm)) {
        seenChords.add(upper);
        uniqueChords.push(norm);
      }
    }

    return {
      chords: uniqueChords,
      chords_progression: uniqueChords.join(', '),
      scale: estimateScale(uniqueChords),
      lyrics_lines: lyricLines,
      raw_text: lyricLines.join('\n')
    };
  }

  return {
    isChordToken,
    isChordLine,
    extractChordProgression,
    estimateScale,
    cleanLyricLine,
    parseSheet
  };
}));
