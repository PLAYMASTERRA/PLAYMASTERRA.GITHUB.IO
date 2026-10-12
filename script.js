/**
 * PLAYMASTER RA — Public Website Controller (script.js)
 * Connects the editorial public website to published database records.
 * Strictly renders published records for public visitors; supports authorized Admin Draft Preview.
 */

(function initPublicWebsite() {
  const Core = window.PlaymasterCore;

  const state = {
    homepage: null,
    categories: [],
    videos: [],
    announcements: [],
    socialLinks: [],
    activeCategoryFilter: 'all',
    searchQuery: '',
    sortBy: 'order',
    isDraftPreview: false
  };

  // Escape HTML to prevent XSS from user-supplied text
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Format hero heading so the second sentence/word gets the signature editorial italic serif treatment
  function formatEditorialHeading(rawHeading) {
    const clean = (rawHeading || 'Gaming. Stories. Adventures.').trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      const first = escapeHtml(parts[0]);
      const second = escapeHtml(parts[1]);
      const rest = parts.slice(2).map(escapeHtml).join(' ');
      return `${first} <em class="serif-accent">${second}</em>${rest ? ' ' + rest : ''}`;
    }
    return escapeHtml(clean);
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return escapeHtml(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function getCategoryById(catId) {
    return (
      state.categories.find((c) => c.id === catId || c.slug === catId) || {
        id: 'cat-bussid',
        title: 'Gaming',
        imageUrl: 'assets/cat-bussid.svg'
      }
    );
  }

  // ============================================================================
  // 1. INITIALIZATION & LIVE DATA FETCH
  // ============================================================================
  async function loadAndRenderPublicSite() {
    // Dynamic copyright year (Section 3J)
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // Check if Admin requested ?preview=draft AND verify active admin session (Section 10 & 13)
    const params = new URLSearchParams(window.location.search);
    const wantsDraftPreview = params.get('preview') === 'draft';

    const publicData = await Core.fetchPublicWebsiteData();
    state.homepage = publicData.homepage;
    state.categories = publicData.categories;
    state.videos = publicData.videos;
    state.announcements = publicData.announcements;
    state.socialLinks = publicData.socialLinks;

    if (wantsDraftPreview) {
      const session = await Core.getAuthSession();
      if (session && session.authenticated) {
        const localDb = Core.readLocalDb();
        if (localDb && localDb.homepageDraft) {
          state.homepage = localDb.homepageDraft;
          state.isDraftPreview = true;
          const previewBar = document.getElementById('draft-preview-bar');
          if (previewBar) previewBar.hidden = false;
        }
      }
    }

    renderHomepageSettings();
    renderSectionVisibilityAndOrder();
    renderCategoryFilterPills();
    renderFeaturedVideos();
    renderLatestVideos();
    renderCategoriesSection();
    renderAnnouncementsSection();
    renderSocialAndContactSection();
  }

  // ============================================================================
  // 2. RENDER HOMEPAGE SETTINGS (Hero, About, Subscription, Footer, Banner)
  // ============================================================================
  function renderHomepageSettings() {
    const hp = state.homepage || Core.getDefaultHomepageSettings();

    // Top Announcement Banner
    const bannerEl = document.getElementById('announcement-banner');
    const bannerTextEl = document.getElementById('banner-text');
    const bannerLinkEl = document.getElementById('banner-link');
    if (bannerEl) {
      if (hp.announcementBannerEnabled && hp.announcementBannerText) {
        bannerEl.hidden = false;
        if (bannerTextEl) bannerTextEl.textContent = hp.announcementBannerText;
        if (bannerLinkEl) {
          bannerLinkEl.textContent = hp.announcementBannerLinkText || 'Visit Channel →';
          bannerLinkEl.href = hp.announcementBannerLinkUrl || 'https://youtube.com/@playmasterra';
        }
      } else {
        bannerEl.hidden = true;
      }
    }

    // Hero Section
    const badgeEl = document.getElementById('hero-badge');
    if (badgeEl) badgeEl.textContent = hp.heroBadge || 'OFFICIAL CREATOR ARCHIVE & INDEX';

    const heroHeadingEl = document.getElementById('hero-heading');
    if (heroHeadingEl) heroHeadingEl.innerHTML = formatEditorialHeading(hp.heroHeading);

    const heroSubEl = document.getElementById('hero-subtitle');
    if (heroSubEl) heroSubEl.textContent = hp.heroSubtitle || '';

    const primaryBtn = document.getElementById('hero-primary-btn');
    if (primaryBtn) {
      primaryBtn.href = hp.primaryBtnUrl || '#videos';
      primaryBtn.innerHTML = `<span>${escapeHtml(hp.primaryBtnText || 'Watch Videos')}</span><span aria-hidden="true">&rarr;</span>`;
    }

    const secondaryBtn = document.getElementById('hero-secondary-btn');
    if (secondaryBtn) {
      secondaryBtn.href = hp.secondaryBtnUrl || 'https://youtube.com/@playmasterra';
      secondaryBtn.innerHTML = `<span>${escapeHtml(hp.secondaryBtnText || 'Subscribe on YouTube')}</span><span aria-hidden="true">&#8599;</span>`;
    }

    const heroImg = document.getElementById('hero-image');
    if (heroImg) {
      heroImg.src = Core.resolveAssetPath(hp.heroVisual || 'assets/hero-cinema.svg');
      heroImg.alt = hp.heroVisualAlt || 'PLAYMASTER RA cinematic gaming illustration';
      heroImg.onerror = function handleHeroImgFallback() {
        this.onerror = null;
        this.src = Core.resolveAssetPath('assets/hero-cinema.svg');
      };
    }

    // Section Headings
    setText('featured-heading', hp.featuredHeading || 'Featured Spotlight');
    setText('featured-subheading', hp.featuredSubheading || '');
    setText('latest-heading', hp.latestHeading || 'The Video Index');
    setText('latest-subheading', hp.latestSubheading || '');
    setText('categories-heading', hp.categoriesHeading || 'Four Worlds We Explore');
    setText('categories-subheading', hp.categoriesSubheading || '');
    setText('about-heading', hp.aboutHeading || 'About PLAYMASTER RA');
    setText('about-lead', hp.aboutLead || '');

    // About Body Paragraphs
    const aboutBodyEl = document.getElementById('about-body');
    if (aboutBodyEl) {
      const paragraphs = String(hp.aboutBody || '')
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
      aboutBodyEl.innerHTML = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    }

    // About Creative Principles / Pillars
    const pillarsGrid = document.getElementById('about-pillars-grid');
    if (pillarsGrid) {
      const pillars = Array.isArray(hp.aboutPillars) && hp.aboutPillars.length
        ? hp.aboutPillars
        : Core.getDefaultHomepageSettings().aboutPillars;
      pillarsGrid.innerHTML = pillars
        .map(
          (p) => `
          <article class="pillar-card">
            <span class="pillar-num">${escapeHtml(p.number)}</span>
            <h3 class="pillar-title">${escapeHtml(p.title)}</h3>
            <p class="pillar-desc">${escapeHtml(p.description)}</p>
          </article>
        `
        )
        .join('');
    }

    // Announcements & Subscription & Contact Headings
    setText('announcements-heading', hp.announcementsHeading || 'Creator Dispatch & Updates');
    setText('announcements-subheading', hp.announcementsSubheading || '');
    setText('subscription-heading', hp.subscriptionHeading || 'Join the Journey on YouTube');
    setText('subscription-text', hp.subscriptionText || '');

    const subBtn = document.getElementById('subscription-btn');
    if (subBtn) {
      subBtn.href = hp.subscriptionBtnUrl || 'https://youtube.com/@playmasterra';
      subBtn.innerHTML = `<span>${escapeHtml(hp.subscriptionBtnText || 'Subscribe to @playmasterra')}</span><span aria-hidden="true">&#8599;</span>`;
    }

    setText('contact-heading', hp.contactHeading || 'Connect & Channels');
    setText('contact-text', hp.contactText || '');
    setText('footer-description', hp.footerText || '');
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ============================================================================
  // 3. SECTION VISIBILITY & ORDERING (Section 7)
  // ============================================================================
  function renderSectionVisibilityAndOrder() {
    const hp = state.homepage || Core.getDefaultHomepageSettings();
    const visibility = hp.sectionVisibility || {};
    const order = Array.isArray(hp.sectionOrder)
      ? hp.sectionOrder
      : ['featured', 'latest', 'categories', 'about', 'announcements', 'subscription', 'contact'];

    const root = document.getElementById('dynamic-sections-root');
    if (!root) return;

    const sectionMap = {};
    root.querySelectorAll('[data-section-key]').forEach((sec) => {
      const key = sec.getAttribute('data-section-key');
      sectionMap[key] = sec;
      const isVisible = visibility[key] !== false;
      sec.hidden = !isVisible;
    });

    // Reorder DOM nodes according to configured order and update editorial section numbers (01, 02, ...)
    let visibleCounter = 1;
    order.forEach((key) => {
      const sec = sectionMap[key];
      if (sec) {
        root.appendChild(sec);
        if (!sec.hidden) {
          const numEl = sec.querySelector('.section-num');
          if (numEl) {
            numEl.textContent = String(visibleCounter).padStart(2, '0');
          }
          visibleCounter += 1;
        }
      }
    });
  }

  // ============================================================================
  // 4. VIDEO CARD BUILDER (Used by Featured & Latest Sections)
  // ============================================================================
  function buildVideoCardHtml(video, indexNum, isFeaturedCard = false) {
    const cat = getCategoryById(video.categoryId);
    const thumbSrc = Core.resolveAssetPath(
      video.thumbnailUrl || `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`
    );
    const fallbackYtThumb = video.youtubeId
      ? `https://i.ytimg.com/vi/${encodeURIComponent(video.youtubeId)}/hqdefault.jpg`
      : Core.resolveAssetPath(cat.imageUrl || 'assets/cat-bussid.svg');
    const finalSvgFallback = Core.resolveAssetPath(cat.imageUrl || 'assets/cat-bussid.svg');

    const objectFit = ['cover', 'contain', 'fill'].includes(video.objectFit) ? video.objectFit : 'cover';
    const focalX = Number.isFinite(Number(video.focalX)) ? Number(video.focalX) : 50;
    const focalY = Number.isFinite(Number(video.focalY)) ? Number(video.focalY) : 50;
    const imgStyle = `object-fit:${objectFit};object-position:${focalX}% ${focalY}%;`;

    const formattedIndex = `#${String(indexNum).padStart(2, '0')}`;
    const pubDate = video.publishedDate ? formatDisplayDate(video.publishedDate) : '';
    const tagsHtml =
      Array.isArray(video.tags) && video.tags.length
        ? `<div class="video-tags-row">${video.tags
            .slice(0, 4)
            .map((t) => `<span class="video-tag">${escapeHtml(t)}</span>`)
            .join('')}</div>`
        : '';

    return `
      <article class="video-card ${isFeaturedCard ? 'video-card-featured' : ''}" data-video-id="${escapeHtml(video.id)}">
        <div class="video-thumb-wrap">
          <img
            src="${escapeHtml(thumbSrc)}"
            alt="${escapeHtml(video.thumbnailAlt || video.title)}"
            class="video-thumb-img"
            style="${escapeHtml(imgStyle)}"
            loading="lazy"
            data-yt-fallback="${escapeHtml(fallbackYtThumb)}"
            data-svg-fallback="${escapeHtml(finalSvgFallback)}"
          >
          <div class="thumb-badges-top">
            <div class="badge-group">
              ${video.isFeatured ? '<span class="badge badge-featured">Featured</span>' : ''}
              ${video.isNew ? '<span class="badge badge-new">New</span>' : ''}
              <span class="badge badge-category">${escapeHtml(cat.title)}</span>
            </div>
            <span class="badge badge-index">${escapeHtml(formattedIndex)}</span>
          </div>
          <a
            href="${escapeHtml(video.youtubeUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="thumb-play-overlay"
            aria-label="Watch ${escapeHtml(video.title)} on YouTube"
          >
            <span class="play-circle" aria-hidden="true">&#9654;</span>
          </a>
        </div>

        <div class="video-card-body">
          <div>
            <div class="video-meta-top">
              <span class="video-cat-label">${escapeHtml(cat.title)}</span>
              ${pubDate ? `<time datetime="${escapeHtml(video.publishedDate)}">${pubDate}</time>` : ''}
            </div>
            <h3 class="video-card-title" title="${escapeHtml(video.title)}">
              <a href="${escapeHtml(video.youtubeUrl)}" target="_blank" rel="noopener noreferrer">
                ${escapeHtml(video.title)}
              </a>
            </h3>
            ${
              video.description
                ? `<p class="video-card-desc">${escapeHtml(video.description)}</p>`
                : ''
            }
            ${tagsHtml}
          </div>

          <div class="video-card-actions">
            <a
              href="${escapeHtml(video.youtubeUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-primary btn-sm"
            >
              <span>Watch Video</span>
              <span aria-hidden="true">&#8599;</span>
            </a>

            ${
              video.youtubeId
                ? `<button type="button" class="video-preview-btn" data-open-modal="${escapeHtml(video.id)}">
                     Theatre View
                   </button>`
                : ''
            }
          </div>
        </div>
      </article>
    `;
  }

  // Attach graceful image fallback handlers (Section 6 & 13: "Broken images have graceful fallbacks")
  function bindThumbnailFallbacks(container) {
    if (!container) return;
    container.querySelectorAll('img.video-thumb-img').forEach((img) => {
      img.addEventListener('error', function onImgError() {
        const ytFallback = this.getAttribute('data-yt-fallback');
        const svgFallback = this.getAttribute('data-svg-fallback');
        if (ytFallback && this.src !== ytFallback && !this.dataset.triedYt) {
          this.dataset.triedYt = '1';
          this.src = ytFallback;
        } else if (svgFallback && this.src !== svgFallback) {
          this.onerror = null;
          this.src = svgFallback;
        }
      });
    });

    // Bind Theatre Modal triggers
    container.querySelectorAll('[data-open-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const vidId = btn.getAttribute('data-open-modal');
        const video = state.videos.find((v) => v.id === vidId);
        if (video) openVideoModal(video);
      });
    });
  }

  // ============================================================================
  // 5. RENDER FEATURED VIDEOS (Section 3C)
  // ============================================================================
  function renderFeaturedVideos() {
    const container = document.getElementById('featured-videos-container');
    if (!container) return;

    const featuredList = state.videos
      .filter((v) => v.isFeatured)
      .sort((a, b) => (Number(a.featuredOrder) || 99) - (Number(b.featuredOrder) || 99));

    container.classList.toggle('single-featured', featuredList.length === 1);

    if (featuredList.length === 0) {
      container.innerHTML = `
        <div class="editorial-empty-state">
          <p class="empty-state-kicker">FEATURED SHOWCASE READY</p>
          <h3 class="empty-state-title">No Featured Videos Published Yet</h3>
          <p class="empty-state-desc">
            Add your real YouTube video links and custom thumbnails in the PLAYMASTER RA Admin Studio and mark them as <strong>Featured</strong> to showcase them here.
          </p>
          <div class="empty-state-actions">
            <a href="https://youtube.com/@playmasterra" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
              <span>Visit @playmasterra on YouTube &#8599;</span>
            </a>
            <a href="admin/" class="btn btn-outline">
              <span>Open Admin Studio (/admin/) &rarr;</span>
            </a>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = featuredList
      .map((video, idx) => buildVideoCardHtml(video, idx + 1, true))
      .join('');
    bindThumbnailFallbacks(container);
  }

  // ============================================================================
  // 6. RENDER LATEST VIDEOS & CATEGORY PILLS (Section 3D)
  // ============================================================================
  function renderCategoryFilterPills() {
    const pillBar = document.getElementById('video-category-pills');
    if (!pillBar) return;

    const allBtn = `
      <button
        type="button"
        class="filter-pill ${state.activeCategoryFilter === 'all' ? 'active' : ''}"
        data-category="all"
        role="tab"
        aria-selected="${state.activeCategoryFilter === 'all'}"
      >
        All Videos (${state.videos.length})
      </button>
    `;

    const catButtons = state.categories
      .map((cat) => {
        const count = state.videos.filter((v) => v.categoryId === cat.id).length;
        const isActive = state.activeCategoryFilter === cat.id;
        return `
          <button
            type="button"
            class="filter-pill ${isActive ? 'active' : ''}"
            data-category="${escapeHtml(cat.id)}"
            role="tab"
            aria-selected="${isActive}"
          >
            ${escapeHtml(cat.title)} (${count})
          </button>
        `;
      })
      .join('');

    pillBar.innerHTML = allBtn + catButtons;

    pillBar.querySelectorAll('.filter-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeCategoryFilter = btn.getAttribute('data-category') || 'all';
        renderCategoryFilterPills();
        renderLatestVideos();
      });
    });
  }

  function renderLatestVideos() {
    const container = document.getElementById('latest-videos-container');
    if (!container) return;

    let filtered = [...state.videos];

    // Filter by category
    if (state.activeCategoryFilter !== 'all') {
      filtered = filtered.filter((v) => v.categoryId === state.activeCategoryFilter);
    }

    // Filter by search query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (v) =>
          (v.title && v.title.toLowerCase().includes(q)) ||
          (v.description && v.description.toLowerCase().includes(q)) ||
          (Array.isArray(v.tags) && v.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Sort videos
    if (state.sortBy === 'newest') {
      filtered.sort(
        (a, b) =>
          new Date(b.publishedDate || b.createdAt || 0) - new Date(a.publishedDate || a.createdAt || 0)
      );
    } else if (state.sortBy === 'oldest') {
      filtered.sort(
        (a, b) =>
          new Date(a.publishedDate || a.createdAt || 0) - new Date(b.publishedDate || b.createdAt || 0)
      );
    } else if (state.sortBy === 'title') {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
      filtered.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
    }

    if (filtered.length === 0) {
      const hasAnyVideos = state.videos.length > 0;
      container.innerHTML = `
        <div class="editorial-empty-state">
          <p class="empty-state-kicker">${hasAnyVideos ? 'NO MATCHING VIDEOS' : 'VIDEO INDEX READY'}</p>
          <h3 class="empty-state-title">
            ${
              hasAnyVideos
                ? 'No published videos match your current filter'
                : 'Your Published Video Archive Appears Here'
            }
          </h3>
          <p class="empty-state-desc">
            ${
              hasAnyVideos
                ? 'Try clearing your search query or switching to "All Videos" to browse all published episodes.'
                : 'No fake video links are pre-filled. Open the Admin Panel (/admin/) to paste your real YouTube links, customize thumbnails, and publish them live.'
            }
          </p>
          <div class="empty-state-actions">
            ${
              hasAnyVideos
                ? `<button type="button" class="btn btn-primary" id="reset-video-filters-btn">Reset Filters</button>`
                : `<a href="https://youtube.com/@playmasterra" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                     <span>Watch on YouTube (@playmasterra) &#8599;</span>
                   </a>
                   <a href="admin/" class="btn btn-outline">
                     <span>Add Videos in Admin Panel &rarr;</span>
                   </a>`
            }
          </div>
        </div>
      `;

      const resetBtn = document.getElementById('reset-video-filters-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          state.activeCategoryFilter = 'all';
          state.searchQuery = '';
          const searchInput = document.getElementById('public-video-search');
          if (searchInput) searchInput.value = '';
          renderCategoryFilterPills();
          renderLatestVideos();
        });
      }
      return;
    }

    container.innerHTML = filtered
      .map((video, idx) => buildVideoCardHtml(video, idx + 1, false))
      .join('');
    bindThumbnailFallbacks(container);
  }

  // ============================================================================
  // 7. RENDER GAMING CATEGORIES (Section 3E)
  // ============================================================================
  function renderCategoriesSection() {
    const container = document.getElementById('categories-container');
    const footerCatList = document.getElementById('footer-categories-list');

    if (footerCatList && state.categories.length) {
      footerCatList.innerHTML = state.categories
        .map(
          (cat) =>
            `<li><a href="#videos" data-jump-category="${escapeHtml(cat.id)}">${escapeHtml(cat.title)}</a></li>`
        )
        .join('');
    }

    if (!container) return;

    if (state.categories.length === 0) {
      container.innerHTML = `
        <div class="editorial-empty-state">
          <p class="empty-state-kicker">CATEGORIES</p>
          <h3 class="empty-state-title">No Visible Gaming Categories</h3>
          <p class="empty-state-desc">Enable or create gaming categories inside the Admin Studio.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = state.categories
      .map((cat, idx) => {
        const linkedVideos = state.videos.filter((v) => v.categoryId === cat.id);
        const codeStr = cat.code || String(idx + 1).padStart(2, '0');
        const imgSrc = Core.resolveAssetPath(cat.imageUrl || 'assets/cat-bussid.svg');

        const linkedListHtml =
          linkedVideos.length > 0
            ? `<ul class="category-mini-list">
                ${linkedVideos
                  .slice(0, 3)
                  .map(
                    (v) => `
                  <li class="category-mini-item">
                    <a href="${escapeHtml(v.youtubeUrl)}" target="_blank" rel="noopener noreferrer">
                      <span>${escapeHtml(v.title)}</span>
                      <span aria-hidden="true">&#8599;</span>
                    </a>
                  </li>
                `
                  )
                  .join('')}
               </ul>`
            : `<p class="category-mini-empty">Ready for episodes — assign videos to ${escapeHtml(cat.title)} in Admin.</p>`;

        return `
          <article class="category-card" data-category-card="${escapeHtml(cat.id)}">
            <div class="category-visual-wrap">
              <img
                src="${escapeHtml(imgSrc)}"
                alt="${escapeHtml(cat.imageAlt || cat.title)}"
                class="category-visual-img"
                loading="lazy"
                onerror="this.onerror=null;this.src='assets/cat-bussid.svg';"
              >
              <span class="category-code-pill">${escapeHtml(codeStr)} // ${escapeHtml(cat.title)}</span>
              <span class="category-count-pill">${linkedVideos.length} ${linkedVideos.length === 1 ? 'Video' : 'Videos'}</span>
            </div>

            <div class="category-body">
              <div>
                <h3 class="category-title">${escapeHtml(cat.title)}</h3>
                <p class="category-desc">${escapeHtml(cat.description)}</p>
              </div>

              <div class="category-linked-videos">
                <p class="category-linked-label">
                  ${escapeHtml(cat.playlistTitle || `Published in ${cat.title}`)}
                </p>
                ${linkedListHtml}
              </div>

              <div class="category-footer">
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  data-jump-category="${escapeHtml(cat.id)}"
                >
                  <span>Filter ${escapeHtml(cat.title)} Videos &rarr;</span>
                </button>

                ${
                  cat.playlistUrl
                    ? `<a
                         href="${escapeHtml(cat.playlistUrl)}"
                         target="_blank"
                         rel="noopener noreferrer"
                         class="section-action-link"
                       >
                         <span>YouTube Playlist &#8599;</span>
                       </a>`
                    : `<a
                         href="https://youtube.com/@playmasterra"
                         target="_blank"
                         rel="noopener noreferrer"
                         class="section-action-link"
                       >
                         <span>Watch on Channel &#8599;</span>
                       </a>`
                }
              </div>
            </div>
          </article>
        `;
      })
      .join('');

    // Bind category filter jump links
    document.querySelectorAll('[data-jump-category]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const catId = el.getAttribute('data-jump-category');
        if (catId) {
          state.activeCategoryFilter = catId;
          renderCategoryFilterPills();
          renderLatestVideos();
          const videosSec = document.getElementById('videos');
          if (videosSec) videosSec.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // ============================================================================
  // 8. RENDER ANNOUNCEMENTS (Section 3H)
  // ============================================================================
  function renderAnnouncementsSection() {
    const container = document.getElementById('announcements-container');
    if (!container) return;

    if (state.announcements.length === 0) {
      container.innerHTML = `
        <div class="editorial-empty-state">
          <p class="empty-state-kicker">CREATOR DISPATCH</p>
          <h3 class="empty-state-title">No Active Announcements Right Now</h3>
          <p class="empty-state-desc">
            New gaming series announcements, challenge schedules, and creator updates published in the Admin Panel will appear here.
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = state.announcements
      .map((ann) => {
        const imgHtml = ann.imageUrl
          ? `<div class="announcement-img-wrap">
               <img
                 src="${escapeHtml(Core.resolveAssetPath(ann.imageUrl))}"
                 alt="${escapeHtml(ann.imageAlt || ann.title)}"
                 class="announcement-img"
                 loading="lazy"
                 onerror="this.parentElement.style.display='none';"
               >
             </div>`
          : '';
        return `
          <article class="announcement-card">
            ${imgHtml}
            <div class="announcement-body">
              <div class="announcement-meta">
                <span class="announcement-tag">${escapeHtml(ann.tag || 'CREATOR UPDATE')}</span>
                ${
                  ann.displayDate
                    ? `<time class="announcement-date" datetime="${escapeHtml(ann.displayDate)}">${formatDisplayDate(ann.displayDate)}</time>`
                    : ''
                }
              </div>
              <h3 class="announcement-title">${escapeHtml(ann.title)}</h3>
              <p class="announcement-desc">${escapeHtml(ann.description)}</p>
            </div>
          </article>
        `;
      })
      .join('');
  }

  // ============================================================================
  // 9. RENDER CONTACT & SOCIAL LINKS (Section 3I — Never fabricates links)
  // ============================================================================
  function renderSocialAndContactSection() {
    const container = document.getElementById('social-links-container');
    const footerSocialList = document.getElementById('footer-social-list');

    // Strictly show only configured & enabled links
    const validLinks = state.socialLinks.filter(
      (s) => s.isEnabled && s.url && String(s.url).trim().length > 0
    );

    if (footerSocialList) {
      if (validLinks.length > 0) {
        footerSocialList.innerHTML = validLinks
          .map((s) => {
            const href =
              s.platform.toLowerCase() === 'email' && !s.url.startsWith('mailto:')
                ? `mailto:${s.url}`
                : s.url;
            return `
              <li>
                <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">
                  ${escapeHtml(s.label || s.platform)} &#8599;
                </a>
              </li>
            `;
          })
          .join('');
      } else {
        footerSocialList.innerHTML = `
          <li>
            <a href="https://youtube.com/@playmasterra" target="_blank" rel="noopener noreferrer">
              YouTube (@playmasterra) &#8599;
            </a>
          </li>
        `;
      }
    }

    if (!container) return;

    if (validLinks.length === 0) {
      container.innerHTML = `
        <a
          href="https://youtube.com/@playmasterra"
          target="_blank"
          rel="noopener noreferrer"
          class="social-card"
        >
          <div>
            <p class="social-platform">YOUTUBE CHANNEL</p>
            <h3 class="social-label">PLAYMASTER RA (@playmasterra)</h3>
          </div>
          <span class="social-arrow" aria-hidden="true">&#8599;</span>
        </a>
      `;
      return;
    }

    container.innerHTML = validLinks
      .map((s) => {
        const isEmail = s.platform.toLowerCase() === 'email' || s.url.startsWith('mailto:');
        const href = isEmail && !s.url.startsWith('mailto:') ? `mailto:${s.url}` : s.url;
        return `
          <a
            href="${escapeHtml(href)}"
            ${isEmail ? '' : 'target="_blank" rel="noopener noreferrer"'}
            class="social-card"
          >
            <div>
              <p class="social-platform">${escapeHtml(s.platform)}</p>
              <h3 class="social-label">${escapeHtml(s.label || s.platform)}</h3>
            </div>
            <span class="social-arrow" aria-hidden="true">&#8599;</span>
          </a>
        `;
      })
      .join('');
  }

  // ============================================================================
  // 10. THEATRE VIDEO MODAL & INTERACTIVE CONTROLS
  // ============================================================================
  function openVideoModal(video) {
    const modal = document.getElementById('video-modal');
    const embedWrap = document.getElementById('video-modal-embed-wrap');
    const titleEl = document.getElementById('video-modal-title');
    const catEl = document.getElementById('video-modal-category');
    const descEl = document.getElementById('video-modal-desc');
    const ytLink = document.getElementById('video-modal-yt-link');

    if (!modal || !embedWrap) return;

    const cat = getCategoryById(video.categoryId);
    if (catEl) catEl.textContent = cat.title;
    if (titleEl) titleEl.textContent = video.title;
    if (descEl) descEl.textContent = video.description || '';
    if (ytLink) ytLink.href = video.youtubeUrl || 'https://youtube.com/@playmasterra';

    embedWrap.innerHTML = `
      <iframe
        src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.youtubeId)}?autoplay=1&rel=0"
        title="${escapeHtml(video.title)}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    `;

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    const embedWrap = document.getElementById('video-modal-embed-wrap');
    if (!modal || modal.hidden) return;
    if (embedWrap) embedWrap.innerHTML = '';
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  function bindGlobalUiEvents() {
    // Mobile drawer controls
    const menuBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('drawer-close-btn');
    const drawer = document.getElementById('mobile-drawer');
    const scrim = document.getElementById('drawer-scrim');

    function openDrawer() {
      if (!drawer || !scrim) return;
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
      scrim.hidden = false;
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      if (!drawer || !scrim) return;
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
      scrim.hidden = true;
      document.body.style.overflow = '';
    }

    if (menuBtn) menuBtn.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (scrim) scrim.addEventListener('click', closeDrawer);

    if (drawer) {
      drawer.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', closeDrawer);
      });
    }

    // Search & Sort listeners
    const searchInput = document.getElementById('public-video-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value || '';
        renderLatestVideos();
      });
    }

    const sortSelect = document.getElementById('public-video-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value || 'order';
        renderLatestVideos();
      });
    }

    // Video Modal Close listeners
    const modalClose = document.getElementById('video-modal-close');
    const modalBackdrop = document.getElementById('video-modal-backdrop');
    if (modalClose) modalClose.addEventListener('click', closeVideoModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeVideoModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeVideoModal();
        closeDrawer();
      }
    });

    // Live cross-tab refresh when Admin publishes updates (Section 12)
    if (Core.syncChannel) {
      Core.syncChannel.addEventListener('message', (ev) => {
        if (ev.data && ev.data.type === 'DB_UPDATED') {
          loadAndRenderPublicSite();
        }
      });
    }

    window.addEventListener('storage', (ev) => {
      if (ev.key === 'pmra_cms_database_v1') {
        loadAndRenderPublicSite();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindGlobalUiEvents();
    loadAndRenderPublicSite();
  });
})();
