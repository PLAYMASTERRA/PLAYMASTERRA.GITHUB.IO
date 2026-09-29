/**
 * ============================================================================
 * PLAYMASTER R.A — CENTRALIZED YOUTUBE DATA ARCHITECTURE CONFIGURATION
 * ============================================================================
 * Channel ID: UCutR0Ka7mjqAzambnp1c19A (@PLAYMASTERRA)
 *
 * SECURITY NOTE:
 * YOUTUBE_API_KEY is stored strictly in backend environment variables
 * (.env / serverless function /api/youtube.js / server.py) and is NEVER
 * exposed publicly in frontend JavaScript.
 * ============================================================================
 */

window.YOUTUBE_CONFIG = {
  // Real YouTube Channel Identifiers
  YOUTUBE_CHANNEL_ID: "UCutR0Ka7mjqAzambnp1c19A",
  CHANNEL_NAME: "PLAYMASTER R.A",
  CHANNEL_HANDLE: "@PLAYMASTERRA",

  // Real YouTube URLs
  CHANNEL_URL: "https://www.youtube.com/channel/UCutR0Ka7mjqAzambnp1c19A",
  HANDLE_URL: "https://www.youtube.com/@PLAYMASTERRA",
  SUBSCRIBE_URL: "https://www.youtube.com/channel/UCutR0Ka7mjqAzambnp1c19A?sub_confirmation=1",
  VIDEOS_TAB_URL: "https://www.youtube.com/@PLAYMASTERRA/videos",
  SHORTS_TAB_URL: "https://www.youtube.com/@PLAYMASTERRA/shorts",
  POSTS_TAB_URL: "https://www.youtube.com/@PLAYMASTERRA/posts",

  // Backend / Serverless Proxy & Static Cache Paths
  // Backend holds:
  //   YOUTUBE_CHANNEL_ID = UCutR0Ka7mjqAzambnp1c19A
  //   YOUTUBE_API_KEY    = YOUR_API_KEY_HERE (server-side only)
  API_PROXY_ENDPOINT: "/api/youtube",
  STATIC_CACHE_PATH: "data/channel_cache.json",

  // Client-side caching to reduce YouTube API quota usage
  CACHE_STORAGE_KEY: "playmaster_ra_real_yt_cache_v2",
  CACHE_TTL_MS: 30 * 60 * 1000, // 30 minutes

  // Content categories derived from actual channel uploads
  CATEGORIES: [
    "All",
    "BUSSID",
    "Travel Gaming",
    "Gaming",
    "Challenges",
    "Shorts"
  ],

  // Channel About Themes
  ABOUT_THEMES: [
    "Gaming",
    "BUSSID",
    "Travel Gaming",
    "Challenges",
    "Famous Places",
    "Indian Gaming Content"
  ]
};
