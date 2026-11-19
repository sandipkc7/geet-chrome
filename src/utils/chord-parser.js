/**
 * GeetKosh (गीतकोश) — Smart Chord & Lyric Parser Utility
 * Intelligently identifies guitar chord lines, pairs chords directly with lyric lines,
 * extracts chord progressions, and estimates root musical keys.
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
   * Cleans a chord line: strips tab dots (.....) and normalizes spacing
   */
  function cleanChordLine(line) {
    if (!line) return '';
    return line
      .replace(/&nbsp;/g, ' ')
      .replace(/\.{2,}/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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
   * Full parse of raw text / HTML into structured chords and lyric lines with chords paired
   */
  function parseSheet(rawContent, durationSeconds = 210) {
    if (!rawContent) {
      return {
        chords: [],
        chords_progression: '',
        scale: 'C Major',
        lyrics_lines: [],
        sheet_text: '',
        raw_text: ''
      };
    }

    // Normalize line endings
    const lines = rawContent
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '') // Strip HTML tags
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const structuredLines = [];
    const allChords = [];
    let pendingChord = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip artist/song/header meta lines
      if (/^Artist\s*:/i.test(line) || /^Song\s*:/i.test(line) || /^Nepali\s+Songs\s+(?:and|&)\s+chords\s*:/i.test(line) || /^Guitar\s+Chords\s*:/i.test(line)) {
        continue;
      }

      if (isChordLine(line)) {
        const cleanChord = cleanChordLine(line);
        pendingChord = cleanChord;
        // Extract unique chords
        const tokens = cleanChord.split(/\s+/).filter(isChordToken);
        allChords.push(...tokens);
      } else {
        // It's a lyric line
        let text = line
          .replace(/&nbsp;/g, ' ')
          .replace(/\.{2,}/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // Filter out instructions
        const lower = text.toLowerCase();
        if (lower.startsWith('play chord') || lower.startsWith('strumming')) {
          continue;
        }

        // Check if line has leading/inline chords e.g. "F Malai bhanna aaundaina"
        const words = text.split(' ');
        const leadingChords = [];
        const lyricWords = [];
        let inLeading = true;

        for (const w of words) {
          if (inLeading && isChordToken(w)) {
            leadingChords.push(w);
            allChords.push(w);
          } else {
            inLeading = false;
            lyricWords.push(w);
          }
        }

        if (leadingChords.length > 0 && !pendingChord) {
          pendingChord = leadingChords.join(' ');
        }
        const cleanText = lyricWords.join(' ').trim() || text;

        if (cleanText.length > 1) {
          structuredLines.push({
            line_order: structuredLines.length + 1,
            time_ms: 0,
            duration_ms: 3000,
            text_en: cleanText,
            text_np: cleanText,
            chords: pendingChord || ''
          });
          pendingChord = ''; // Consumed
        }
      }
    }

    // Evenly distribute lyrics lines through song length (defaults to 210s = 3m 30s)
    const timedLines = distributeLinesEvenly(structuredLines, durationSeconds);

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

    // Generate formatted chord sheet text (chords above each line)
    const sheetText = timedLines
      .map(l => (l.chords ? `${l.chords}\n${l.text_en}` : l.text_en))
      .join('\n\n');

    // Generate clean lyrics text without chords
    const plainText = timedLines.map(l => l.text_en).join('\n');

    return {
      chords: uniqueChords,
      chords_progression: uniqueChords.join(', '),
      scale: estimateScale(uniqueChords),
      lyrics_lines: timedLines,
      sheet_text: sheetText,
      raw_text: sheetText, // Defaults to sheet with chords
      plain_text: plainText
    };
  }

  /**
   * Distributes lyric lines evenly across the full song length (in seconds)
   * Leaves natural musical intro and outro buffers (~8% intro, ~7% outro)
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
      return {
        ...line,
        line_order: idx + 1,
        time_ms: timeMs,
        duration_ms: durMs
      };
    });
  }

  return {
    isChordToken,
    isChordLine,
    cleanChordLine,
    extractChordProgression,
    estimateScale,
    distributeLinesEvenly,
    parseSheet
  };
}));
