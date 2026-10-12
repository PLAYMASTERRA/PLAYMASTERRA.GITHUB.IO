/**
 * PLAYMASTER RA — Shared Configuration, YouTube Utilities & Data Layer
 * Architecture: HTML5 + Modern CSS + Vanilla JS + Supabase (Auth, Database, Storage)
 * Supports both live Supabase Cloud Backend and instant Local Studio Persistence.
 */

window.PLAYMASTER_CONFIG = {
  brandName: 'PLAYMASTER RA',
  youtubeChannelUrl: 'https://youtube.com/@playmasterra',
  youtubeHandle: '@playmasterra',

  // ============================================================================
  // SUPABASE CONFIGURATION (Public Project URL & Public Anon Key ONLY)
  // SECURITY RULE: NEVER put a service_role key or secret password in this file.
  // Row Level Security (RLS) in supabase/schema.sql protects all write operations.
  // You can either paste your keys below OR configure them inside /admin/ -> Website Settings.
  // ============================================================================
  supabaseUrl: '',
  supabaseAnonKey: '',
  storageBucket: 'website-media',

  // Maximum upload size for custom thumbnails in bytes (5 MB default)
  maxThumbnailSizeBytes: 5 * 1024 * 1024,
  allowedImageMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
};

(function initPlaymasterCore() {
  const STORAGE_KEY = 'pmra_cms_database_v1';
  const SESSION_KEY = 'pmra_admin_session_v1';
  const SUPABASE_CFG_KEY = 'pmra_supabase_config_v1';
  const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pmra_live_sync') : null;

  // Resolve relative asset paths whether running from "/" or "/admin/"
  function resolveAssetPath(relPath) {
    if (!relPath) return '';
    if (
      relPath.startsWith('http://') ||
      relPath.startsWith('https://') ||
      relPath.startsWith('data:') ||
      relPath.startsWith('blob:') ||
      relPath.startsWith('/')
    ) {
      return relPath;
    }
    const isAdminRoute = window.location.pathname.includes('/admin');
    if (isAdminRoute && relPath.startsWith('assets/')) {
      return '../' + relPath;
    }
    if (!isAdminRoute && relPath.startsWith('../assets/')) {
      return relPath.replace(/^\.\.\//, '');
    }
    return relPath;
  }

  // Normalize asset path when saving so it works from both "/" and "/admin/"
  function normalizeStoredAssetPath(pathStr) {
    if (!pathStr) return '';
    return pathStr.replace(/^\.\.\//, '');
  }

  // ============================================================================
  // YOUTUBE URL VALIDATION & ID EXTRACTION (Section 5)
  // Supports: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/embed/, youtube.com/live/
  // ============================================================================
  function parseYouTubeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return {
        valid: false,
        videoId: null,
        error: 'Please enter a YouTube video URL.'
      };
    }

    const trimmed = rawUrl.trim();
    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch (e) {
      return {
        valid: false,
        videoId: null,
        error: 'Invalid URL format. Please include https:// (e.g., https://www.youtube.com/watch?v=...).'
      };
    }

    const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    let videoId = null;
    let urlType = 'watch';

    if (host === 'youtu.be') {
      const seg = parsed.pathname.split('/').filter(Boolean)[0];
      if (seg) {
        videoId = seg;
        urlType = 'shortlink';
      }
    } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v');
        urlType = 'watch';
      } else if (pathParts[0] === 'shorts' && pathParts[1]) {
        videoId = pathParts[1];
        urlType = 'shorts';
      } else if (pathParts[0] === 'embed' && pathParts[1]) {
        videoId = pathParts[1];
        urlType = 'embed';
      } else if (pathParts[0] === 'live' && pathParts[1]) {
        videoId = pathParts[1];
        urlType = 'live';
      }
    } else {
      return {
        valid: false,
        videoId: null,
        error: 'Only official YouTube URLs (youtube.com or youtu.be) are supported.'
      };
    }

    // Standard YouTube video IDs are 11 characters: [A-Za-z0-9_-]{11}
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return {
        valid: false,
        videoId: null,
        error: 'Could not extract a valid 11-character YouTube Video ID from this link. Please check the URL.'
      };
    }

    return {
      valid: true,
      videoId,
      urlType,
      canonicalWatchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      standardThumbnailMax: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      standardThumbnailHq: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      error: null
    };
  }

  // Validate external YouTube Playlist URL (Section 8)
  function validateYouTubePlaylistUrl(rawUrl) {
    if (!rawUrl || !rawUrl.trim()) {
      return { valid: true, url: '', playlistId: null, error: null };
    }
    try {
      const parsed = new URL(rawUrl.trim());
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
      if (host !== 'youtube.com' && host !== 'youtu.be') {
        return { valid: false, error: 'Playlist link must be a valid youtube.com URL.' };
      }
      const listId = parsed.searchParams.get('list');
      if (!listId || listId.length < 4) {
        return {
          valid: false,
          error: 'Playlist URL must contain a valid "?list=..." parameter (or leave blank if not linking an external playlist).'
        };
      }
      return {
        valid: true,
        url: `https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}`,
        playlistId: listId,
        error: null
      };
    } catch (e) {
      return { valid: false, error: 'Please enter a valid https:// YouTube playlist link.' };
    }
  }

  // ============================================================================
  // DEFAULT INITIAL DATABASE STATE (Honors all brand & non-fabrication rules)
  // ============================================================================
  function getDefaultHomepageSettings() {
    return {
      heroHeading: 'Gaming. Stories. Adventures.',
      heroSubtitle:
        'Welcome to PLAYMASTER RA — cinematic gaming, unforgettable challenges, and stories from the virtual world.',
      heroBadge: 'OFFICIAL CREATOR ARCHIVE & INDEX',
      heroVisual: 'assets/hero-cinema.svg',
      heroVisualAlt: 'PLAYMASTER RA cinematic highway and virtual gaming worlds illustration',
      primaryBtnText: 'Watch Videos',
      primaryBtnUrl: '#videos',
      secondaryBtnText: 'Subscribe on YouTube',
      secondaryBtnUrl: 'https://youtube.com/@playmasterra',

      featuredHeading: 'Featured Spotlight',
      featuredSubheading:
        'Curated flagship episodes, high-stakes gaming challenges, and story-driven virtual journeys selected by PLAYMASTER RA.',

      latestHeading: 'The Video Index',
      latestSubheading:
        'Every published episode organized by category and release order. Managed directly through the PLAYMASTER RA Studio.',

      categoriesHeading: 'Four Worlds We Explore',
      categoriesSubheading:
        'From highway passenger expeditions in BUSSID to precision builds in Car Parking Multiplayer and narrative experiments.',

      aboutHeading: 'About PLAYMASTER RA',
      aboutLead:
        'An ambitious, story-driven gaming channel dedicated to turning virtual gameplay into memorable cinema.',
      aboutBody:
        'PLAYMASTER RA approaches gaming not merely as screen recording, but as storytelling. Whether navigating cross-country routes in Bus Simulator Indonesia (BUSSID), engineering detailed builds in Car Parking Multiplayer (CPM), or designing high-stakes gaming challenges, every video is crafted with pacing, atmosphere, and narrative intention.\n\nThis official website serves as the central archive for featured episodes, curated series categories, and creator announcements.',
      aboutPillars: [
        {
          number: '01',
          title: 'Cinematic Framing',
          description: 'Every highway journey, vehicle build, and challenge is shot and paced to feel like a cohesive story.'
        },
        {
          number: '02',
          title: 'Story-Driven Gameplay',
          description: 'Moving beyond raw gameplay into narrative vlogs, passenger journeys, and character-led virtual adventures.'
        },
        {
          number: '03',
          title: 'Creative Experiments',
          description: 'Testing unique rules, difficult missions, and unconventional objectives across simulation and open-world titles.'
        },
        {
          number: '04',
          title: 'Community First',
          description: 'Clean, family-friendly entertainment built around creativity, curiosity, and shared gaming passion.'
        }
      ],

      subscriptionHeading: 'Join the Journey on YouTube',
      subscriptionText:
        'Subscribe to PLAYMASTER RA on YouTube for new BUSSID expeditions, Car Parking Multiplayer builds, high-stakes challenges, and cinematic gaming stories.',
      subscriptionBtnText: 'Subscribe to @playmasterra',
      subscriptionBtnUrl: 'https://youtube.com/@playmasterra',

      announcementsHeading: 'Creator Dispatch & Updates',
      announcementsSubheading:
        'Upcoming series notes, challenge schedules, and official updates from PLAYMASTER RA.',

      contactHeading: 'Connect & Channels',
      contactText:
        'Follow official PLAYMASTER RA updates and verified links below. Unconfigured social links remain hidden automatically.',

      footerText:
        'The official creator website and video index of PLAYMASTER RA. Crafted for cinematic gameplay, virtual journeys, and gaming storytelling.',

      announcementBannerEnabled: true,
      announcementBannerText: 'Welcome to the official PLAYMASTER RA website — explore gaming categories or subscribe on YouTube.',
      announcementBannerLinkText: 'Visit Channel →',
      announcementBannerLinkUrl: 'https://youtube.com/@playmasterra',

      sectionVisibility: {
        featured: true,
        latest: true,
        categories: true,
        about: true,
        announcements: true,
        subscription: true,
        contact: true
      },
      sectionOrder: [
        'featured',
        'latest',
        'categories',
        'about',
        'announcements',
        'subscription',
        'contact'
      ],
      updatedAt: new Date().toISOString()
    };
  }

  function getDefaultDatabase() {
    const now = new Date().toISOString();
    const hp = getDefaultHomepageSettings();
    return {
      meta: {
        version: '1.0.0',
        initializedAt: now
      },
      homepagePublished: JSON.parse(JSON.stringify(hp)),
      homepageDraft: JSON.parse(JSON.stringify(hp)),
      categories: [
        {
          id: 'cat-bussid',
          slug: 'bussid',
          code: '01',
          title: 'BUSSID',
          fullName: 'Bus Simulator Indonesia',
          description: 'Bus journeys, passenger stories, travel adventures and challenges.',
          imageUrl: 'assets/cat-bussid.svg',
          imageAlt: 'BUSSID — Bus Simulator Indonesia highway expedition artwork',
          playlistTitle: 'BUSSID Expeditions & Stories',
          playlistUrl: '',
          displayOrder: 1,
          isVisible: true,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'cat-cpm',
          slug: 'car-parking-multiplayer',
          code: '02',
          title: 'Car Parking Multiplayer',
          fullName: 'CPM Builds & Driving',
          description: 'Car builds, driving challenges, progression and cinematic gameplay.',
          imageUrl: 'assets/cat-cpm.svg',
          imageAlt: 'Car Parking Multiplayer custom vehicle build illustration',
          playlistTitle: 'CPM Builds & Progression',
          playlistUrl: '',
          displayOrder: 2,
          isVisible: true,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'cat-challenges',
          slug: 'gaming-challenges',
          code: '03',
          title: 'Gaming Challenges',
          fullName: 'Missions & Experiments',
          description: 'Difficult missions, experiments and unique goals.',
          imageUrl: 'assets/cat-challenges.svg',
          imageAlt: 'Gaming Challenges precision timer and mission target illustration',
          playlistTitle: 'High-Stakes Gaming Challenges',
          playlistUrl: '',
          displayOrder: 3,
          isVisible: true,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'cat-stories',
          slug: 'gaming-stories',
          code: '04',
          title: 'Gaming Stories',
          fullName: 'Cinematic Vlogs & Lore',
          description: 'Vlog-style storytelling and immersive gaming adventures.',
          imageUrl: 'assets/cat-stories.svg',
          imageAlt: 'Gaming Stories narrative storyboard illustration',
          playlistTitle: 'Virtual Vlogs & Narrative Series',
          playlistUrl: '',
          displayOrder: 4,
          isVisible: true,
          createdAt: now,
          updatedAt: now
        }
      ],
      // No fake YouTube URLs are pre-populated (Section 3C: "Do not invent video URLs. Let me add real YouTube video links through the admin panel.")
      videos: [],
      thumbnails: [
        {
          id: 'thumb-bussid-art',
          name: 'BUSSID Highway Editorial Artwork',
          url: 'assets/cat-bussid.svg',
          altText: 'BUSSID Highway Expedition Editorial Illustration',
          sourceType: 'preset',
          objectFit: 'cover',
          focalX: 50,
          focalY: 50,
          createdAt: now
        },
        {
          id: 'thumb-cpm-art',
          name: 'CPM Custom Build Studio Artwork',
          url: 'assets/cat-cpm.svg',
          altText: 'Car Parking Multiplayer Custom Coupe Illustration',
          sourceType: 'preset',
          objectFit: 'cover',
          focalX: 50,
          focalY: 50,
          createdAt: now
        },
        {
          id: 'thumb-challenges-art',
          name: 'Gaming Challenges Telemetry Artwork',
          url: 'assets/cat-challenges.svg',
          altText: 'Gaming Challenges Stopwatch Illustration',
          sourceType: 'preset',
          objectFit: 'cover',
          focalX: 50,
          focalY: 50,
          createdAt: now
        },
        {
          id: 'thumb-stories-art',
          name: 'Gaming Stories Three-Act Artwork',
          url: 'assets/cat-stories.svg',
          altText: 'Gaming Stories Three-Act Storyboard Illustration',
          sourceType: 'preset',
          objectFit: 'cover',
          focalX: 50,
          focalY: 50,
          createdAt: now
        }
      ],
      announcements: [
        {
          id: 'ann-welcome',
          tag: 'WEBSITE LAUNCH',
          title: 'Official PLAYMASTER RA Creator Website & Video Archive Is Live',
          description:
            'Welcome to the new editorial home of PLAYMASTER RA. Explore curated categories for BUSSID, Car Parking Multiplayer, Gaming Challenges, and Gaming Stories — all managed through our dedicated creator studio.',
          imageUrl: '',
          imageAlt: '',
          displayDate: now.slice(0, 10),
          status: 'published',
          createdAt: now,
          updatedAt: now
        }
      ],
      // Do not fabricate social handles or email addresses (Section 3I). Only real YouTube channel is enabled by default.
      socialLinks: [
        {
          id: 'soc-youtube',
          platform: 'YouTube',
          label: 'YouTube Channel (@playmasterra)',
          url: 'https://youtube.com/@playmasterra',
          isEnabled: true,
          displayOrder: 1
        },
        {
          id: 'soc-instagram',
          platform: 'Instagram',
          label: 'Instagram',
          url: '',
          isEnabled: false,
          displayOrder: 2
        },
        {
          id: 'soc-x',
          platform: 'X (Twitter)',
          label: 'X / Twitter',
          url: '',
          isEnabled: false,
          displayOrder: 3
        },
        {
          id: 'soc-discord',
          platform: 'Discord',
          label: 'Discord Community',
          url: '',
          isEnabled: false,
          displayOrder: 4
        },
        {
          id: 'soc-email',
          platform: 'Email',
          label: 'Business / Creator Contact Email',
          url: '',
          isEnabled: false,
          displayOrder: 5
        }
      ],
      activityLogs: [
        {
          id: 'log-init',
          action: 'System Initialized',
          details: 'PLAYMASTER RA editorial database initialized with 4 gaming categories and published homepage settings.',
          timestamp: now
        }
      ]
    };
  }

  // Load or initialize local database
  function readLocalDb() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seed = getDefaultDatabase();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }
      const parsed = JSON.parse(raw);
      const defaults = getDefaultDatabase();
      return {
        meta: parsed.meta || defaults.meta,
        homepagePublished: { ...defaults.homepagePublished, ...(parsed.homepagePublished || {}) },
        homepageDraft: { ...defaults.homepageDraft, ...(parsed.homepageDraft || {}) },
        categories: Array.isArray(parsed.categories) ? parsed.categories : defaults.categories,
        videos: Array.isArray(parsed.videos) ? parsed.videos : [],
        thumbnails: Array.isArray(parsed.thumbnails) ? parsed.thumbnails : defaults.thumbnails,
        announcements: Array.isArray(parsed.announcements) ? parsed.announcements : defaults.announcements,
        socialLinks: Array.isArray(parsed.socialLinks) ? parsed.socialLinks : defaults.socialLinks,
        activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : defaults.activityLogs
      };
    } catch (e) {
      console.error('Error reading local database, falling back to default:', e);
      return getDefaultDatabase();
    }
  }

  function writeLocalDb(db, logAction, logDetails) {
    if (logAction) {
      db.activityLogs = db.activityLogs || [];
      db.activityLogs.unshift({
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        action: logAction,
        details: logDetails || '',
        timestamp: new Date().toISOString()
      });
      if (db.activityLogs.length > 50) {
        db.activityLogs = db.activityLogs.slice(0, 50);
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    if (syncChannel) {
      try {
        syncChannel.postMessage({ type: 'DB_UPDATED', timestamp: Date.now() });
      } catch (err) {
        // Ignore broadcast errors
      }
    }
    return db;
  }

  // ============================================================================
  // SUPABASE CONFIGURATION & DYNAMIC CLIENT LOADER
  // ============================================================================
  function getSupabaseConfig() {
    let saved = {};
    try {
      const raw = localStorage.getItem(SUPABASE_CFG_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (e) {
      saved = {};
    }
    const url = (saved.supabaseUrl || window.PLAYMASTER_CONFIG.supabaseUrl || '').trim();
    const anonKey = (saved.supabaseAnonKey || window.PLAYMASTER_CONFIG.supabaseAnonKey || '').trim();
    const bucket = (saved.storageBucket || window.PLAYMASTER_CONFIG.storageBucket || 'website-media').trim();
    return {
      url,
      anonKey,
      bucket,
      isConfigured: Boolean(url && anonKey && url.startsWith('https://'))
    };
  }

  function saveSupabaseConfig(url, anonKey, bucket = 'website-media') {
    const clean = {
      supabaseUrl: (url || '').trim(),
      supabaseAnonKey: (anonKey || '').trim(),
      storageBucket: (bucket || 'website-media').trim()
    };
    localStorage.setItem(SUPABASE_CFG_KEY, JSON.stringify(clean));
    supabaseClientInstance = null;
    return getSupabaseConfig();
  }

  let supabaseClientInstance = null;
  async function getSupabaseClient() {
    const cfg = getSupabaseConfig();
    if (!cfg.isConfigured) return null;
    if (supabaseClientInstance) return supabaseClientInstance;

    // Dynamically load @supabase/supabase-js from CDN if not already loaded
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Could not load Supabase JS library from CDN.'));
        document.head.appendChild(script);
      });
    }

    supabaseClientInstance = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    return supabaseClientInstance;
  }

  // ============================================================================
  // PUBLIC READ API (Strictly returns PUBLISHED content only — Section 10 & 13)
  // ============================================================================
  async function fetchPublicWebsiteData() {
    const cfg = getSupabaseConfig();
    if (cfg.isConfigured) {
      try {
        const client = await getSupabaseClient();
        if (client) {
          const [hpRes, catRes, vidRes, annRes, socRes] = await Promise.all([
            client.from('homepage_settings').select('*').eq('id', 1).maybeSingle(),
            client.from('categories').select('*').eq('is_visible', true).order('display_order', { ascending: true }),
            client
              .from('videos')
              .select('*')
              .eq('status', 'published')
              .order('display_order', { ascending: true })
              .order('created_at', { ascending: false }),
            client
              .from('announcements')
              .select('*')
              .eq('status', 'published')
              .order('display_date', { ascending: false }),
            client
              .from('social_links')
              .select('*')
              .eq('is_enabled', true)
              .order('display_order', { ascending: true })
          ]);

          if (!hpRes.error && !catRes.error && !vidRes.error) {
            const defaultHp = getDefaultHomepageSettings();
            const publishedHp = hpRes.data && hpRes.data.published_data
              ? { ...defaultHp, ...hpRes.data.published_data }
              : defaultHp;

            return {
              mode: 'supabase',
              homepage: publishedHp,
              categories: (catRes.data || []).map(mapSupabaseCategoryFromRow),
              videos: (vidRes.data || []).map(mapSupabaseVideoFromRow),
              announcements: (annRes.data || []).map(mapSupabaseAnnouncementFromRow),
              socialLinks: (socRes.data || [])
                .map(mapSupabaseSocialFromRow)
                .filter((s) => s.isEnabled && s.url && s.url.trim().length > 0)
            };
          }
        }
      } catch (err) {
        console.warn('Supabase public fetch encountered an issue, using local published store:', err.message);
      }
    }

    // Local store fallback — strictly filter to published/visible records only!
    const db = readLocalDb();
    const visibleCategories = [...db.categories]
      .filter((c) => c.isVisible !== false)
      .sort((a, b) => (Number(a.displayOrder) || 99) - (Number(b.displayOrder) || 99));

    const publishedVideos = [...db.videos]
      .filter((v) => v.status === 'published')
      .sort((a, b) => {
        const orderDiff = (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999);
        if (orderDiff !== 0) return orderDiff;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });

    const publishedAnnouncements = [...db.announcements]
      .filter((a) => a.status === 'published')
      .sort((a, b) => new Date(b.displayDate || b.createdAt || 0) - new Date(a.displayDate || a.createdAt || 0));

    const activeSocials = [...db.socialLinks]
      .filter((s) => s.isEnabled && s.url && s.url.trim().length > 0)
      .sort((a, b) => (Number(a.displayOrder) || 99) - (Number(b.displayOrder) || 99));

    return {
      mode: 'local',
      homepage: db.homepagePublished,
      categories: visibleCategories,
      videos: publishedVideos,
      announcements: publishedAnnouncements,
      socialLinks: activeSocials
    };
  }

  // Row mappers for Supabase snake_case <-> JS camelCase
  function mapSupabaseCategoryFromRow(r) {
    return {
      id: r.id,
      slug: r.slug,
      code: r.code || '01',
      title: r.title,
      fullName: r.full_name || r.title,
      description: r.description || '',
      imageUrl: r.image_url || 'assets/cat-bussid.svg',
      imageAlt: r.image_alt || r.title,
      playlistTitle: r.playlist_title || '',
      playlistUrl: r.playlist_url || '',
      displayOrder: r.display_order ?? 1,
      isVisible: r.is_visible !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  function mapSupabaseVideoFromRow(r) {
    return {
      id: r.id,
      youtubeUrl: r.youtube_url,
      youtubeId: r.youtube_id,
      title: r.title,
      description: r.description || '',
      categoryId: r.category_id || 'cat-bussid',
      tags: Array.isArray(r.tags) ? r.tags : [],
      thumbnailUrl: r.thumbnail_url || `https://i.ytimg.com/vi/${r.youtube_id}/hqdefault.jpg`,
      thumbnailSource: r.thumbnail_source || 'youtube',
      thumbnailAlt: r.thumbnail_alt || r.title,
      objectFit: r.object_fit || 'cover',
      focalX: r.focal_x ?? 50,
      focalY: r.focal_y ?? 50,
      displayOrder: r.display_order ?? 1,
      isFeatured: Boolean(r.is_featured),
      featuredOrder: r.featured_order ?? 1,
      isNew: Boolean(r.is_new),
      publishedDate: r.published_date || '',
      status: r.status || 'draft',
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  function mapSupabaseAnnouncementFromRow(r) {
    return {
      id: r.id,
      tag: r.tag || 'UPDATE',
      title: r.title,
      description: r.description || '',
      imageUrl: r.image_url || '',
      imageAlt: r.image_alt || '',
      displayDate: r.display_date || '',
      status: r.status || 'draft',
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  function mapSupabaseSocialFromRow(r) {
    return {
      id: r.id,
      platform: r.platform,
      label: r.label || r.platform,
      url: r.url || '',
      isEnabled: Boolean(r.is_enabled),
      displayOrder: r.display_order ?? 1
    };
  }

  // ============================================================================
  // AUTHENTICATION ENGINE (Section 10)
  // Uses Supabase Auth + `admin_users` authorization table when Supabase is configured,
  // and provides a Local Studio Session gate for local preview testing before Supabase setup.
  // ============================================================================
  async function getAuthSession() {
    const cfg = getSupabaseConfig();
    if (cfg.isConfigured) {
      try {
        const client = await getSupabaseClient();
        const { data, error } = await client.auth.getSession();
        if (error || !data || !data.session) {
          return { authenticated: false, mode: 'supabase', user: null };
        }
        // Verify explicit authorization in `admin_users` table
        const user = data.session.user;
        const { data: adminRecord, error: adminErr } = await client
          .from('admin_users')
          .select('id, email, role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (adminErr || !adminRecord) {
          await client.auth.signOut();
          return {
            authenticated: false,
            mode: 'supabase',
            user: null,
            unauthorizedReason:
              'This account is authenticated but is not listed as an active authorized admin in public.admin_users.'
          };
        }

        return {
          authenticated: true,
          mode: 'supabase',
          user: {
            id: user.id,
            email: user.email,
            role: adminRecord.role || 'owner'
          }
        };
      } catch (e) {
        return { authenticated: false, mode: 'supabase', user: null, error: e.message };
      }
    }

    // Local Studio Preview Auth Session
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (!raw) return { authenticated: false, mode: 'local', user: null };
      const parsed = JSON.parse(raw);
      if (parsed && parsed.authenticated && parsed.email) {
        return {
          authenticated: true,
          mode: 'local',
          user: {
            email: parsed.email,
            role: 'Studio Admin (Local Preview Mode)',
            signedInAt: parsed.signedInAt
          }
        };
      }
    } catch (e) {
      // Ignore
    }
    return { authenticated: false, mode: 'local', user: null };
  }

  async function signInAdmin(email, password, rememberSession = true) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid admin email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const cfg = getSupabaseConfig();
    if (cfg.isConfigured) {
      const client = await getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password
      });
      if (error) {
        throw new Error(error.message || 'Supabase authentication failed.');
      }
      // Verify user is in `admin_users`
      const { data: adminRow, error: roleError } = await client
        .from('admin_users')
        .select('id, email, role, is_active')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (roleError || !adminRow) {
        await client.auth.signOut();
        throw new Error(
          'Access Denied: Your account is not registered in the public.admin_users authorization table. Run the admin setup SQL in Supabase first.'
        );
      }

      return {
        authenticated: true,
        mode: 'supabase',
        user: {
          id: data.user.id,
          email: data.user.email,
          role: adminRow.role || 'owner'
        }
      };
    }

    // Local Studio Preview Mode Sign-in (for testing before Supabase keys are entered)
    const sessionPayload = {
      authenticated: true,
      email: cleanEmail,
      signedInAt: new Date().toISOString()
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
    if (rememberSession) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
    }
    const db = readLocalDb();
    writeLocalDb(db, 'Admin Sign-In', `Signed in as ${cleanEmail} (Local Studio Mode)`);
    return {
      authenticated: true,
      mode: 'local',
      user: {
        email: cleanEmail,
        role: 'Studio Admin (Local Preview Mode)'
      }
    };
  }

  async function signOutAdmin() {
    const cfg = getSupabaseConfig();
    if (cfg.isConfigured) {
      try {
        const client = await getSupabaseClient();
        if (client) await client.auth.signOut();
      } catch (e) {
        // Ignore
      }
    }
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  // Expose unified global API
  window.PlaymasterCore = {
    resolveAssetPath,
    normalizeStoredAssetPath,
    parseYouTubeUrl,
    validateYouTubePlaylistUrl,
    getDefaultHomepageSettings,
    getDefaultDatabase,
    readLocalDb,
    writeLocalDb,
    getSupabaseConfig,
    saveSupabaseConfig,
    getSupabaseClient,
    fetchPublicWebsiteData,
    getAuthSession,
    signInAdmin,
    signOutAdmin,
    syncChannel
  };
})();
