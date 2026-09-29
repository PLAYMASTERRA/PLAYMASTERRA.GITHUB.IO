/**
 * ============================================================================
 * PLAYMASTER R.A — SERVERLESS YOUTUBE DATA API PROXY (/api/youtube.js)
 * ============================================================================
 * Protects YOUTUBE_API_KEY on the backend so it is never exposed in frontend JS.
 * Fetches real channel statistics, videos, and metadata for:
 *   YOUTUBE_CHANNEL_ID = UCutR0Ka7mjqAzambnp1c19A
 * Caches responses in memory and via HTTP Cache-Control headers to minimize
 * YouTube Data API v3 quota consumption.
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

const SERVER_CONFIG = {
  YOUTUBE_CHANNEL_ID: process.env.YOUTUBE_CHANNEL_ID || "UCutR0Ka7mjqAzambnp1c19A",
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || "YOUR_API_KEY_HERE",
  CACHE_TTL_MS: Number(process.env.CACHE_TTL_SECONDS || 1800) * 1000
};

let memoryCache = {
  timestamp: 0,
  payload: null
};

function formatDuration(isoDuration) {
  if (!isoDuration) return "";
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function inferCategoriesFromTitle(title) {
  const t = (title || "").toLowerCase();
  const cats = ["Gaming"];
  if (t.includes("bussid") || t.includes("bus simulator") || t.includes("bus")) {
    cats.unshift("BUSSID");
  }
  if (
    t.includes("journey") ||
    t.includes("mumbai") ||
    t.includes("delhi") ||
    t.includes("manali") ||
    t.includes("kedarnath") ||
    t.includes("mountain") ||
    t.includes("trip") ||
    t.includes("vlog")
  ) {
    cats.push("Travel Gaming");
  }
  if (t.includes("challenge") || t.includes("10,000") || t.includes("impossible") || t.includes("gone wrong")) {
    cats.push("Challenges");
  }
  return Array.from(new Set(cats));
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");

  const now = Date.now();
  if (memoryCache.payload && now - memoryCache.timestamp < SERVER_CONFIG.CACHE_TTL_MS) {
    return res.status(200).json({ ...memoryCache.payload, cached: true });
  }

  const channelId = SERVER_CONFIG.YOUTUBE_CHANNEL_ID;
  const apiKey = SERVER_CONFIG.YOUTUBE_API_KEY;

  // Load verified real channel cache snapshot as base/fallback
  let verifiedSnapshot = null;
  try {
    const cacheFile = path.join(process.cwd(), "data", "channel_cache.json");
    if (fs.existsSync(cacheFile)) {
      verifiedSnapshot = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    }
  } catch (_) {}

  // If a real YouTube Data API v3 key is configured on the server, fetch live from Google APIs
  if (apiKey && apiKey !== "YOUR_API_KEY_HERE") {
    try {
      const chRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails,brandingSettings&id=${encodeURIComponent(
          channelId
        )}&key=${encodeURIComponent(apiKey)}`
      );
      if (!chRes.ok) throw new Error(`YouTube Channels API returned ${chRes.status}`);
      const chJson = await chRes.json();
      const chItem = chJson.items && chJson.items[0];
      if (!chItem) throw new Error("Channel not found");

      const uploadsPlaylistId = chItem.contentDetails.relatedPlaylists.uploads;
      const plRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(
          uploadsPlaylistId
        )}&maxResults=25&key=${encodeURIComponent(apiKey)}`
      );
      const plJson = await plRes.json();
      const videoIds = (plJson.items || [])
        .map((i) => i.contentDetails && i.contentDetails.videoId)
        .filter(Boolean)
        .join(",");

      const vRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${encodeURIComponent(
          videoIds
        )}&key=${encodeURIComponent(apiKey)}`
      );
      const vJson = await vRes.json();

      const liveVideos = [];
      const liveShorts = [];

      for (const v of vJson.items || []) {
        const durFormatted = formatDuration(v.contentDetails && v.contentDetails.duration);
        const viewsNum = v.statistics && v.statistics.viewCount ? `${Number(v.statistics.viewCount).toLocaleString()} views` : "";
        const pubDate = v.snippet && v.snippet.publishedAt ? new Date(v.snippet.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";
        const title = v.snippet.title;
        const isShort = title.toLowerCase().includes("#shorts") || title.toLowerCase().includes("#short");

        if (isShort) {
          liveShorts.push({
            videoId: v.id,
            title,
            views: viewsNum,
            publishedTime: pubDate,
            url: `https://www.youtube.com/shorts/${v.id}`,
            thumbnail: `https://i.ytimg.com/vi/${v.id}/oar2.jpg`,
            categories: ["Shorts", ...inferCategoriesFromTitle(title)]
          });
        } else {
          liveVideos.push({
            videoId: v.id,
            title,
            duration: durFormatted,
            views: viewsNum,
            publishedTime: pubDate,
            url: `https://www.youtube.com/watch?v=${v.id}`,
            embedUrl: `https://www.youtube.com/embed/${v.id}`,
            thumbnail:
              (v.snippet.thumbnails.maxres && v.snippet.thumbnails.maxres.url) ||
              (v.snippet.thumbnails.high && v.snippet.thumbnails.high.url) ||
              `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
            categories: inferCategoriesFromTitle(title),
            description: v.snippet.description || ""
          });
        }
      }

      const payload = {
        source: "youtube_data_api_v3",
        channel: {
          ...(verifiedSnapshot ? verifiedSnapshot.channel : {}),
          channelId,
          title: chItem.snippet.title,
          handle: chItem.snippet.customUrl || "@PLAYMASTERRA",
          subscriberCount: `${Number(chItem.statistics.subscriberCount).toLocaleString()} subscribers`,
          videoCount: `${Number(chItem.statistics.videoCount).toLocaleString()} videos`,
          fullDescription: chItem.snippet.description
        },
        featuredSeries: verifiedSnapshot ? verifiedSnapshot.featuredSeries : null,
        videos: liveVideos.length ? liveVideos : verifiedSnapshot ? verifiedSnapshot.videos : [],
        shorts: liveShorts.length ? liveShorts : verifiedSnapshot ? verifiedSnapshot.shorts : [],
        posts: verifiedSnapshot ? verifiedSnapshot.posts : []
      };

      memoryCache = { timestamp: now, payload };
      return res.status(200).json(payload);
    } catch (err) {
      if (verifiedSnapshot) {
        return res.status(200).json({ ...verifiedSnapshot, source: "verified_channel_cache", apiWarning: err.message });
      }
      return res.status(502).json({
        error: "Unable to fetch live YouTube Data API v3 data.",
        channelUrl: `https://www.youtube.com/channel/${channelId}`
      });
    }
  }

  // Return verified real channel snapshot for UCutR0Ka7mjqAzambnp1c19A
  if (verifiedSnapshot) {
    memoryCache = { timestamp: now, payload: verifiedSnapshot };
    return res.status(200).json({ ...verifiedSnapshot, source: "verified_channel_snapshot" });
  }

  return res.status(503).json({
    error: "YouTube API key not configured and no verified channel cache found.",
    channelUrl: `https://www.youtube.com/channel/${channelId}`
  });
};
