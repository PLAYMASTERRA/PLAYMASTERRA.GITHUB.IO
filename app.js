/**
 * ============================================================================
 * PLAYMASTER R.A — REAL YOUTUBE CHANNEL APPLICATION LOGIC
 * Channel ID: UCutR0Ka7mjqAzambnp1c19A (@PLAYMASTERRA)
 * ============================================================================
 */

(function () {
  const cfg = window.YOUTUBE_CONFIG || {};
  let channelPayload = null;
  let activeCategory = "All";
  let currentSearchQuery = "";

  // Helper to resolve image path with embedded fallback for sandboxed previews
  function resolveImage(localPath, remoteUrl) {
    if (localPath && window.ASSET_FALLBACKS && window.ASSET_FALLBACKS[localPath]) {
      const proto = window.location.protocol;
      if (proto === "about:" || proto === "blob:" || proto === "data:") {
        return window.ASSET_FALLBACKS[localPath];
      }
    }
    return localPath || remoteUrl || "";
  }

  window.handleImgError = function (imgEl, localPath, remoteUrl) {
    if (
      localPath &&
      window.ASSET_FALLBACKS &&
      window.ASSET_FALLBACKS[localPath] &&
      imgEl.src !== window.ASSET_FALLBACKS[localPath]
    ) {
      imgEl.src = window.ASSET_FALLBACKS[localPath];
      return;
    }
    if (remoteUrl && imgEl.src !== remoteUrl) {
      imgEl.src = remoteUrl;
    }
  };

  // --------------------------------------------------------------------------
  // 1. FETCH & CACHE REAL YOUTUBE CHANNEL DATA
  // --------------------------------------------------------------------------
  async function loadChannelData() {
    const loadingEl = document.getElementById("loading-state-banner");
    const errorEl = document.getElementById("error-fallback-box");

    // 1. Check localStorage cache first to reduce API quota usage
    try {
      const rawCache = localStorage.getItem(cfg.CACHE_STORAGE_KEY);
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        if (parsed && parsed.timestamp && Date.now() - parsed.timestamp < (cfg.CACHE_TTL_MS || 1800000)) {
          if (parsed.data && parsed.data.videos && parsed.data.videos.length > 0) {
            if (loadingEl) loadingEl.style.display = "none";
            return parsed.data;
          }
        }
      }
    } catch (_) {}

    // 2. Try backend proxy (/api/youtube) then static cache (data/channel_cache.json)
    const endpoints = [
      `${cfg.API_PROXY_ENDPOINT || "/api/youtube"}?channelId=${encodeURIComponent(
        cfg.YOUTUBE_CHANNEL_ID || "UCutR0Ka7mjqAzambnp1c19A"
      )}`,
      cfg.STATIC_CACHE_PATH || "data/channel_cache.json"
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.videos)) {
            try {
              localStorage.setItem(
                cfg.CACHE_STORAGE_KEY,
                JSON.stringify({ timestamp: Date.now(), data })
              );
            } catch (_) {}
            if (loadingEl) loadingEl.style.display = "none";
            return data;
          }
        }
      } catch (_) {}
    }

    // 3. Fallback to verified embedded channel snapshot (for offline/sandboxed iframe preview)
    if (window.VERIFIED_CHANNEL_DATA && Array.isArray(window.VERIFIED_CHANNEL_DATA.videos)) {
      if (loadingEl) loadingEl.style.display = "none";
      return window.VERIFIED_CHANNEL_DATA;
    }

    // 4. If all sources fail, show clean error/fallback message (NEVER show fake videos)
    if (loadingEl) loadingEl.style.display = "none";
    if (errorEl) errorEl.classList.add("visible");
    return null;
  }

  // --------------------------------------------------------------------------
  // 2. HYDRATE HEADER & BRAND METADATA
  // --------------------------------------------------------------------------
  function renderHeader(data) {
    const ch = data.channel || {};

    const bannerEl = document.getElementById("channel-banner-img");
    if (bannerEl) {
      bannerEl.src = resolveImage(ch.localBanner || "assets/banner.png", ch.bannerUrl);
    }

    document.querySelectorAll(".js-channel-avatar").forEach((img) => {
      img.src = resolveImage(ch.localAvatar || "assets/real/avatar.png", ch.avatarUrl);
    });

    document.querySelectorAll(".js-channel-name").forEach((el) => {
      el.textContent = ch.title || "PLAYMASTER R.A";
    });

    document.querySelectorAll(".js-channel-handle").forEach((el) => {
      el.textContent = ch.handle || "@PLAYMASTERRA";
    });

    document.querySelectorAll(".js-subscriber-count").forEach((el) => {
      el.textContent = ch.subscriberCount || "211 subscribers";
    });

    document.querySelectorAll(".js-video-count").forEach((el) => {
      el.textContent = ch.videoCount || "141 videos";
    });

    const shortDescEl = document.getElementById("channel-desc-text");
    if (shortDescEl) {
      shortDescEl.textContent = ch.shortDescription || "Welcome to PLAYMASTER R.A 🚍🔥";
    }

    const fullAboutEl = document.getElementById("about-text-body");
    if (fullAboutEl) {
      fullAboutEl.textContent = ch.fullDescription || "";
    }

    const themesEl = document.getElementById("about-themes-list");
    if (themesEl) {
      const themes = ch.themes || cfg.ABOUT_THEMES || [];
      themesEl.innerHTML = themes
        .map((t) => `<span class="about-theme-pill">${t}</span>`)
        .join("");
    }
  }

  // --------------------------------------------------------------------------
  // 3. CREATE REAL VIDEO CARD
  // --------------------------------------------------------------------------
  function createVideoCard(video) {
    const thumbSrc = resolveImage(video.localThumbnail, video.thumbnail);
    const cats = video.categories || [];
    return `
      <article
        class="video-card"
        data-video-id="${video.videoId}"
        data-title="${(video.title || "").toLowerCase()}"
        data-categories="${cats.join(",").toLowerCase()}"
      >
        <div
          class="video-thumb-trigger js-open-watch"
          data-video-id="${video.videoId}"
          role="button"
          tabindex="0"
          aria-label="Play ${video.title}"
        >
          <img
            src="${thumbSrc}"
            alt="${video.title}"
            class="video-thumb-img"
            loading="lazy"
            onerror="window.handleImgError(this, '${video.localThumbnail || ""}', '${video.thumbnail || ""}')"
          />
          <div class="video-thumb-overlay">
            <span class="play-badge-circle" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"></path>
              </svg>
            </span>
          </div>
          ${video.duration ? `<span class="video-duration-badge">${video.duration}</span>` : ""}
        </div>

        <div class="video-card-body">
          <div class="video-card-main">
            <h3
              class="video-card-title js-open-watch"
              data-video-id="${video.videoId}"
              title="${video.title}"
            >${video.title}</h3>

            <div class="video-card-meta">
              <span>PLAYMASTER R.A</span>
              ${video.views ? `<span class="meta-dot">•</span><span>${video.views}</span>` : ""}
              ${video.publishedTime ? `<span class="meta-dot">•</span><span>${video.publishedTime}</span>` : ""}
            </div>

            <div class="video-card-categories">
              ${cats.map((c) => `<span class="video-cat-pill">${c}</span>`).join("")}
            </div>

            <div class="video-card-actions">
              <button
                type="button"
                class="btn-play-inline js-open-watch"
                data-video-id="${video.videoId}"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"></path>
                </svg>
                <span>Play Video</span>
              </button>

              <a
                href="${video.url}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-open-yt-direct"
                title="Open on YouTube"
              >
                <span>YouTube ↗</span>
              </a>
            </div>
          </div>

          <a
            href="${video.url}"
            target="_blank"
            rel="noopener noreferrer"
            class="video-menu-dots"
            title="Watch on YouTube"
            aria-label="Open video on YouTube"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
            </svg>
          </a>
        </div>
      </article>
    `;
  }

  // --------------------------------------------------------------------------
  // 4. CREATE REAL SHORT CARD (9:16 VERTICAL)
  // --------------------------------------------------------------------------
  function createShortCard(shortItem) {
    const thumbSrc = resolveImage(shortItem.localThumbnail, shortItem.thumbnail);
    const cats = shortItem.categories || ["Shorts"];
    return `
      <article
        class="short-card"
        data-title="${(shortItem.title || "").toLowerCase()}"
        data-categories="${cats.join(",").toLowerCase()}"
      >
        <a
          href="${shortItem.url}"
          target="_blank"
          rel="noopener noreferrer"
          class="short-thumb-wrap"
          aria-label="${shortItem.title}"
        >
          <img
            src="${thumbSrc}"
            alt="${shortItem.title}"
            class="short-thumb-img"
            loading="lazy"
            onerror="window.handleImgError(this, '${shortItem.localThumbnail || ""}', '${shortItem.thumbnail || ""}')"
          />
          <div class="short-overlay-gradient">
            <div class="short-top-row">
              <span class="short-badge-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff0000">
                  <path d="M17.77 10.32l-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25zM10 14.65v-5.3L15 12l-5 2.65z"></path>
                </svg>
                <span>Shorts</span>
              </span>
              <span class="play-badge-circle" style="width:32px;height:32px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"></path>
                </svg>
              </span>
            </div>
            <div class="short-bottom-info">
              <h3 class="short-card-title">${shortItem.title}</h3>
              ${shortItem.views ? `<span class="short-card-views">${shortItem.views}</span>` : ""}
            </div>
          </div>
        </a>
      </article>
    `;
  }

  // --------------------------------------------------------------------------
  // 5. RENDER FEATURED SERIES: TRAVEL TO FAMOUS PLACES (Section 7)
  // --------------------------------------------------------------------------
  function renderFeaturedSeries(data) {
    const mount = document.getElementById("featured-series-mount");
    if (!mount) return;
    const s = data.featuredSeries || {
      seriesTitle: "TRAVEL TO FAMOUS PLACES",
      episodeNumber: "EPISODE 01",
      route: "DELHI → AGRA",
      destination: "TAJ MAHAL",
      existsOnChannel: false
    };

    // Check if an actual uploaded video on the channel matches Delhi -> Agra / Taj Mahal
    const matchingRealVideo = (data.videos || []).find((v) => {
      const t = (v.title || "").toLowerCase();
      return t.includes("agra") || t.includes("taj mahal");
    });

    if (matchingRealVideo) {
      // If the creator has uploaded the episode, display the actual uploaded video
      mount.innerHTML = createVideoCard(matchingRealVideo);
      return;
    }

    // Since it does not exist yet on UCutR0Ka7mjqAzambnp1c19A, show honestly as an upcoming series
    mount.innerHTML = `
      <div class="series-upcoming-card">
        <div>
          <div class="series-status-row">
            <span class="series-label-pill">${s.seriesTitle}</span>
            <span class="series-upcoming-badge">${s.statusLabel || "UPCOMING SERIES • NOT YET UPLOADED"}</span>
          </div>
          <h3 class="series-main-heading">${s.episodeNumber}: ${s.route} — ${s.destination}</h3>
          <p class="series-desc">${s.description}</p>
          <div class="channel-actions-row">
            <a
              href="${s.subscribeUrl || "https://www.youtube.com/channel/UCutR0Ka7mjqAzambnp1c19A?sub_confirmation=1"}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-subscribe-white"
            >
              <span>Subscribe for Episode 01 Premiere</span>
            </a>
            <a
              href="${s.channelVideosUrl || "https://www.youtube.com/@PLAYMASTERRA/videos"}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-view-all-link"
            >
              <span>Check Channel Uploads →</span>
            </a>
          </div>
        </div>

        <div class="series-route-board">
          <div class="route-board-row">
            <span class="route-board-key">Featured Series</span>
            <span class="route-board-val">${s.seriesTitle}</span>
          </div>
          <div class="route-board-row">
            <span class="route-board-key">Episode</span>
            <span class="route-board-val highlight">${s.episodeNumber}</span>
          </div>
          <div class="route-board-row">
            <span class="route-board-key">Highway Route</span>
            <span class="route-board-val">${s.route}</span>
          </div>
          <div class="route-board-row">
            <span class="route-board-key">Destination</span>
            <span class="route-board-val highlight">${s.destination}</span>
          </div>
          <div class="route-board-row">
            <span class="route-board-key">Release Status</span>
            <span class="route-board-val" style="font-size:13px;color:var(--text-secondary);">Upcoming Episode on @PLAYMASTERRA</span>
          </div>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 6. RENDER REAL COMMUNITY POSTS (Section 5)
  // --------------------------------------------------------------------------
  function renderCommunityPosts(data) {
    const mount = document.getElementById("grid-posts");
    if (!mount) return;
    const posts = data.posts || [];
    const ch = data.channel || {};
    const avatarSrc = resolveImage(ch.localAvatar || "assets/real/avatar.png", ch.avatarUrl);

    if (!posts.length) {
      mount.innerHTML = `
        <div class="post-card" style="grid-column: 1 / -1; text-align: center; padding: 32px;">
          <p class="post-body-text" style="margin-bottom: 14px;">
            Community posts can be viewed directly on the official PLAYMASTER R.A YouTube Community tab.
          </p>
          <div>
            <a
              href="https://www.youtube.com/@PLAYMASTERRA/posts"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-subscribe-white"
            >
              <span>Open Community on YouTube →</span>
            </a>
          </div>
        </div>
      `;
      return;
    }

    mount.innerHTML = posts
      .map((post) => {
        const imgSrc = resolveImage(post.localImage, post.image);
        const mediaHtml =
          post.image || post.localImage
            ? `
          <a href="${post.postUrl}" target="_blank" rel="noopener noreferrer" class="post-media-wrap">
            <img
              src="${imgSrc}"
              alt="Community post attachment"
              class="post-media-img"
              loading="lazy"
              onerror="window.handleImgError(this, '${post.localImage || ""}', '${post.image || ""}')"
            />
          </a>`
            : "";

        const pollHtml =
          Array.isArray(post.pollChoices) && post.pollChoices.length
            ? `
          <div class="poll-options-list">
            ${post.pollChoices
              .map(
                (choice) => `
              <a href="${post.postUrl}" target="_blank" rel="noopener noreferrer" class="poll-option-item">
                <span>${choice}</span>
                <span style="font-size:12px;color:var(--text-secondary);">Vote on YouTube ↗</span>
              </a>`
              )
              .join("")}
          </div>`
            : "";

        return `
        <article class="post-card">
          <div class="post-header">
            <div class="post-header-left">
              <img
                src="${avatarSrc}"
                alt="PLAYMASTER R.A"
                class="post-avatar"
                onerror="window.handleImgError(this, 'assets/real/avatar.png', '${ch.avatarUrl || ""}')"
              />
              <div>
                <div class="post-author-name">PLAYMASTER R.A</div>
                <div class="post-date-label">@PLAYMASTERRA • ${post.publishedTime}</div>
              </div>
            </div>
            <a
              href="${post.postUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-open-yt-direct"
            >
              <span>View Post ↗</span>
            </a>
          </div>

          <p class="post-body-text">${post.text}</p>
          ${mediaHtml}
          ${pollHtml}

          <div class="post-footer-bar">
            <span class="post-likes-badge">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"></path>
              </svg>
              <span>${post.likes || "0"} likes</span>
            </span>
            <a href="${post.postUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--text-bright);font-weight:500;">
              Open on YouTube Community →
            </a>
          </div>
        </article>
      `;
      })
      .join("");
  }

  // --------------------------------------------------------------------------
  // 7. DEDICATED VIDEO WATCH PAGE / EMBEDDED PLAYER (Section 8)
  // --------------------------------------------------------------------------
  function openVideoWatchPage(videoId) {
    if (!channelPayload || !Array.isArray(channelPayload.videos)) return;
    const video = channelPayload.videos.find((v) => v.videoId === videoId);
    if (!video) return;

    const watchView = document.getElementById("video-watch-view");
    const playerMount = document.getElementById("watch-player-mount");
    const titleEl = document.getElementById("watch-video-title");
    const statsEl = document.getElementById("watch-video-stats");
    const descEl = document.getElementById("watch-video-desc");
    const openYtBtn = document.getElementById("watch-open-yt-btn");
    const relatedMount = document.getElementById("watch-related-list");

    if (!watchView) return;

    // Populate embedded YouTube iframe player
    if (playerMount) {
      playerMount.innerHTML = `
        <iframe
          class="watch-player-iframe"
          src="https://www.youtube.com/embed/${video.videoId}?rel=0"
          title="${video.title}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      `;
    }

    if (titleEl) titleEl.textContent = video.title;
    if (statsEl) {
      statsEl.innerHTML = `
        <span>${video.views || ""}</span>
        <span>•</span>
        <span>Uploaded ${video.publishedTime || ""}</span>
        ${video.duration ? `<span>•</span><span>Duration: ${video.duration}</span>` : ""}
      `;
    }
    if (descEl) {
      descEl.textContent =
        video.description +
        "\n\n" +
        (channelPayload.channel ? channelPayload.channel.fullDescription : "");
    }
    if (openYtBtn) {
      openYtBtn.href = video.url;
    }

    // Populate Related Real Videos (excluding current video)
    if (relatedMount) {
      const related = channelPayload.videos.filter((v) => v.videoId !== video.videoId);
      relatedMount.innerHTML = related
        .map((rv) => {
          const rThumb = resolveImage(rv.localThumbnail, rv.thumbnail);
          return `
          <button
            type="button"
            class="related-video-item js-open-watch"
            data-video-id="${rv.videoId}"
          >
            <div class="related-thumb-wrap">
              <img
                src="${rThumb}"
                alt="${rv.title}"
                class="related-thumb-img"
                loading="lazy"
                onerror="window.handleImgError(this, '${rv.localThumbnail || ""}', '${rv.thumbnail || ""}')"
              />
              ${rv.duration ? `<span class="video-duration-badge">${rv.duration}</span>` : ""}
            </div>
            <div>
              <div class="related-item-title">${rv.title}</div>
              <div class="related-item-meta">PLAYMASTER R.A</div>
              <div class="related-item-meta">${rv.views} • ${rv.publishedTime}</div>
            </div>
          </button>
        `;
        })
        .join("");
    }

    watchView.classList.add("open");
    watchView.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeVideoWatchPage() {
    const watchView = document.getElementById("video-watch-view");
    const playerMount = document.getElementById("watch-player-mount");
    if (playerMount) playerMount.innerHTML = "";
    if (watchView) watchView.classList.remove("open");
  }

  // --------------------------------------------------------------------------
  // 8. FILTERING & RENDERING GRIDS
  // --------------------------------------------------------------------------
  function applyFiltersAndRender() {
    if (!channelPayload) return;

    const videos = channelPayload.videos || [];
    const shorts = channelPayload.shorts || [];

    // Filter videos by activeCategory and currentSearchQuery
    const filteredVideos = videos.filter((v) => {
      const matchesCat =
        activeCategory === "All" ||
        activeCategory === "Shorts" ||
        (v.categories || []).some((c) => c.toLowerCase() === activeCategory.toLowerCase());
      const matchesQuery =
        !currentSearchQuery ||
        (v.title || "").toLowerCase().includes(currentSearchQuery) ||
        (v.categories || []).join(" ").toLowerCase().includes(currentSearchQuery);
      return matchesCat && matchesQuery;
    });

    const filteredShorts = shorts.filter((s) => {
      const matchesCat =
        activeCategory === "All" ||
        activeCategory === "Shorts" ||
        (s.categories || []).some((c) => c.toLowerCase() === activeCategory.toLowerCase());
      const matchesQuery =
        !currentSearchQuery ||
        (s.title || "").toLowerCase().includes(currentSearchQuery) ||
        (s.categories || []).join(" ").toLowerCase().includes(currentSearchQuery);
      return matchesCat && matchesQuery;
    });

    const forYouMount = document.getElementById("grid-for-you");
    if (forYouMount) {
      // On Home "For You", show top 3 real videos matching the channel screenshot (Mumbai to Hyderabad, Delhi to Manali, ₹10,000 Kedarnath Challenge)
      const featuredIds = ["7bN7Rl7C4Rw", "AFVG_diwRpg", "9DJoLtDX3js"];
      const forYouVids = featuredIds
        .map((id) => videos.find((v) => v.videoId === id))
        .filter(Boolean);
      forYouMount.innerHTML = (forYouVids.length ? forYouVids : videos.slice(0, 3))
        .map(createVideoCard)
        .join("");
    }

    const latestVideosMount = document.getElementById("grid-latest-videos");
    if (latestVideosMount) {
      latestVideosMount.innerHTML = filteredVideos.map(createVideoCard).join("");
    }

    const shortsMount = document.getElementById("grid-shorts");
    if (shortsMount) {
      shortsMount.innerHTML = filteredShorts.map(createShortCard).join("");
    }

    // Toggle visibility if "Shorts" chip is explicitly clicked
    const videosSec = document.getElementById("section-latest-videos");
    const shortsSec = document.getElementById("section-shorts");
    if (activeCategory === "Shorts" && shortsSec) {
      shortsSec.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (videosSec) {
      videosSec.style.display = "";
    }
  }

  // --------------------------------------------------------------------------
  // 9. EVENT LISTENERS (Tabs, Categories, Watch Page, Search)
  // --------------------------------------------------------------------------
  function setupEvents() {
    // Top Navigation Tabs: Home | Videos | Shorts | Posts | About
    const navTabs = document.querySelectorAll(".js-nav-tab");
    const tabSections = document.querySelectorAll("[data-tab-group]");

    navTabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        closeVideoWatchPage();
        const target = btn.dataset.tab;
        navTabs.forEach((b) => b.classList.toggle("active", b === btn));

        tabSections.forEach((sec) => {
          const groups = (sec.dataset.tabGroup || "").split(" ");
          if (target === "home" || groups.includes(target)) {
            sec.style.display = "";
          } else {
            sec.style.display = "none";
          }
        });
      });
    });

    // Content Category Filter Chips: All | BUSSID | Travel Gaming | Gaming | Challenges | Shorts
    const catChips = document.querySelectorAll(".js-category-chip");
    catChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        catChips.forEach((c) => c.classList.toggle("active", c === chip));
        activeCategory = chip.dataset.category || "All";
        applyFiltersAndRender();
      });
    });

    // Delegated click handler for opening the Dedicated Video Watch Page
    document.addEventListener("click", (e) => {
      const watchTrigger = e.target.closest(".js-open-watch");
      if (watchTrigger && watchTrigger.dataset.videoId) {
        e.preventDefault();
        openVideoWatchPage(watchTrigger.dataset.videoId);
      }
    });

    const backBtn = document.getElementById("btn-close-watch");
    if (backBtn) {
      backBtn.addEventListener("click", closeVideoWatchPage);
    }

    // Search Toggle & Live Input
    const searchToggle = document.getElementById("nav-search-toggle");
    const searchWrap = document.getElementById("nav-search-wrap");
    const searchInput = document.getElementById("nav-search-input");

    if (searchToggle && searchWrap && searchInput) {
      searchToggle.addEventListener("click", () => {
        searchWrap.classList.toggle("open");
        if (searchWrap.classList.contains("open")) {
          searchInput.focus();
        } else {
          searchInput.value = "";
          currentSearchQuery = "";
          applyFiltersAndRender();
        }
      });

      searchInput.addEventListener("input", (e) => {
        currentSearchQuery = e.target.value.trim().toLowerCase();
        applyFiltersAndRender();
      });
    }

    // "...more" button scrolls smoothly to About section
    const moreBtn = document.getElementById("header-more-btn");
    const aboutSec = document.getElementById("section-about");
    if (moreBtn && aboutSec) {
      moreBtn.addEventListener("click", () => {
        aboutSec.style.display = "";
        aboutSec.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  // --------------------------------------------------------------------------
  // 10. INITIALIZE APPLICATION
  // --------------------------------------------------------------------------
  async function init() {
    setupEvents();
    const data = await loadChannelData();
    if (!data) return;
    channelPayload = data;
    renderHeader(data);
    renderFeaturedSeries(data);
    applyFiltersAndRender();
    renderCommunityPosts(data);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
