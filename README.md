# PLAYMASTER R.A (`@PLAYMASTERRA`) — Official YouTube Channel Website

- **Channel Name:** PLAYMASTER R.A
- **YouTube Channel ID:** `UCutR0Ka7mjqAzambnp1c19A`
- **Handle:** `@PLAYMASTERRA`
- **Official URL:** [https://www.youtube.com/@PLAYMASTERRA](https://www.youtube.com/@PLAYMASTERRA)

---

## Real YouTube Data Architecture

This project is connected strictly to the real **PLAYMASTER R.A** YouTube channel (`UCutR0Ka7mjqAzambnp1c19A`) and displays **100% real channel content** (real videos, real Shorts, real Community Posts, real thumbnails, real view counts, real durations, and real upload dates).

### 1. Backend / Serverless Configuration (Protects `YOUTUBE_API_KEY`)
To ensure `YOUTUBE_API_KEY` is never exposed publicly in frontend JavaScript, the API key is stored in backend environment variables (`.env` / serverless function `/api/youtube.js` / `server.py`):

```env
YOUTUBE_CHANNEL_ID=UCutR0Ka7mjqAzambnp1c19A
YOUTUBE_API_KEY=YOUR_API_KEY_HERE
CACHE_TTL_SECONDS=1800
```

- **`api/youtube.js`**: Serverless function (compatible with Vercel / Netlify / Cloudflare) that queries the YouTube Data API v3 on the server and caches results to reduce API quota usage.
- **`server.py`**: Python backend proxy & static server serving `/api/youtube?channelId=UCutR0Ka7mjqAzambnp1c19A` with in-memory caching.
- **`data/channel_cache.json`**: Verified real channel data snapshot extracted from `UCutR0Ka7mjqAzambnp1c19A` for instant static hosting on **GitHub Pages**.

### 2. Frontend Configuration (`config.js`)
Frontend settings live in `config.js` without exposing any secret API keys:

```js
window.YOUTUBE_CONFIG = {
  YOUTUBE_CHANNEL_ID: "UCutR0Ka7mjqAzambnp1c19A",
  CHANNEL_NAME: "PLAYMASTER R.A",
  CHANNEL_HANDLE: "@PLAYMASTERRA",
  API_PROXY_ENDPOINT: "/api/youtube",
  STATIC_CACHE_PATH: "data/channel_cache.json",
  CACHE_STORAGE_KEY: "playmaster_ra_real_yt_cache_v2",
  CACHE_TTL_MS: 30 * 60 * 1000
};
```

---

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages** and select your branch (`main`, root `/`).
3. On static GitHub Pages, the site automatically loads `data/channel_cache.json` (and caches in `localStorage`), or you can point `API_PROXY_ENDPOINT` in `config.js` to your deployed `/api/youtube` serverless endpoint.
