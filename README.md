# GeetKosh (गीतकोश) YouTube Harvester — Chrome Extension

A specialized, zero-quota Chrome Extension (Manifest V3) for the **GeetKosh** editorial music discovery and synchronized lyrics platform.

## Features
- **Zero API Quota Cost:** Extracts metadata directly from rendered YouTube pages without consuming YouTube Data API v3 units.
- **Timed Caption Harvester:** Automatically extracts millisecond-accurate transcript tracks (`captionTracks`) from YouTube internal player responses for instant synchronized lyrics.
- **Credit Box Parser:** Scrapes YouTube's "Music in this video" structured credits (Song, Artist, Album, Composers, Lyricists, Record Label).
- **Injected Action Button:** Injects a native-styled **"📥 GeetKosh"** button into YouTube's toolbar.
- **1-Click Backend Ingestion:** Sends authenticated `POST` requests to `https://geet-backend.sandipkc.com.np/api/admin/songs` with your Admin Bearer Token, automatically linking artists and synchronized lyric lines.

## Installation in Chrome / Edge / Brave
1. Clone this repository or open the folder:
   ```bash
   git clone https://github.com/sandipkc7/geet-chrome-extension.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select this directory (`chrome-extension/`).
5. Click the GeetKosh extension icon in your Chrome toolbar, open **Settings**, and paste your Admin Bearer Token from GeetKosh Admin.

## Usage
1. Open any YouTube song (e.g. `https://www.youtube.com/watch?v=xi_FYfxU12Y`).
2. Click the **"📥 GeetKosh"** button on the YouTube page or click the extension icon in the toolbar.
3. Review and edit the pre-filled fields (Title, Artist, Genre, Duration, Captions).
4. Click **"Publish to GeetKosh"**.
5. The song is immediately inserted into the PostgreSQL database, and you receive a direct link to view it or open it in GeetKosh Studio.
