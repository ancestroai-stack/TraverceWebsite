/* ============================================================
   TRAVERCE — main.js
   Tab Router, Search, Cart, Lyrics, Filters, Countdown, Report Export
   ============================================================ */

import * as htmlToImage from 'html-to-image';

(function () {
  'use strict';

  /* ── SPOTIFY PLAYLIST DATA (Mocked due to API Restrictions) ── */
  // The Spotify Web API now strictly requires User OAuth (Log in with Spotify) 
  // to fetch any playlist tracks. Client Credentials will always throw a 403.
  // We've hardcoded your "Traverce Top 10" playlist here to keep the site fast and static.
  async function fetchSpotifyCharts() {
    return [
        {
          "rank": "01",
          "name": "Budget",
          "artist": "Yo Maps, Frank Ro, Dizmo, KingTec",
          "image": "https://i.scdn.co/image/ab67616d0000b2731228a8f88ba91b3f6646928b",
          "year": 2026,
          "previewUrl": "",
          "plays": "NEW",
          "trend": "new",
          "artistImage": "https://i.scdn.co/image/ab6761610000e5eb30574ae9b280bf3c228d4260"
        },
        {
          "rank": "02",
          "name": "Streams & Shazam Numbers",
          "artist": "Jae Cash",
          "image": "https://i.scdn.co/image/ab67616d0000b2734fff9dd3f6e2fed7b2bd8f77",
          "year": 2025,
          "previewUrl": "",
          "plays": "NEW",
          "trend": "new",
          "artistImage": "https://i.scdn.co/image/ab6761610000e5eb73ed5a4fd12b6c8f3d6df44f"
        },
        {
          "rank": "03",
          "name": "Weka",
          "artist": "Bomb$hell Grenade, Yo Maps",
          "image": "https://i.scdn.co/image/ab67616d0000b273a53c463745e85be8544cf308",
          "year": 2026,
          "previewUrl": "",
          "plays": "NEW",
          "trend": "new",
          "artistImage": "https://i.scdn.co/image/ab6761610000e5ebbe366637d910b4ee9d7ecdec"
        },
        {
          "rank": "04",
          "name": "Chingelengele (feat. Chile One)",
          "artist": "Drimz Mr Muziq, Chile One",
          "image": "https://i.scdn.co/image/ab67616d0000b273dfbb9b0e5fa9654667db354c",
          "year": 2026,
          "previewUrl": "",
          "plays": "NEW",
          "trend": "new",
          "artistImage": "https://i.scdn.co/image/ab6761610000e5eb7d2980092e059cf0f237d1aa"
        },
        {
          "rank": "05",
          "name": "Dzaddy",
          "artist": "Ndine Emma, Shokki Mwana Chibolya, Kayz Adams, Mwaka Hal",
          "image": "https://i.scdn.co/image/ab67616d0000b2734901a6c044e7094e053a6caa",
          "year": 2025,
          "previewUrl": "",
          "plays": "NEW",
          "trend": "new",
          "artistImage": "https://i.scdn.co/image/ab6761610000e5ebe77cea2ecae791df1b739392"
        }
      ];
  }

  function openSpotifyPlayer(track) {
    if (!spotifyModal || !spotifyModalTitle || !spotifyModalDesc || !spotifyPlayerMount) return;

    spotifyModalTitle.textContent = track?.name || 'Spotify Playback';
    spotifyModalDesc.textContent = track?.artist || '';
    spotifyPlayerMount.innerHTML = '';

    if (track?.previewUrl) {
      const audio = document.createElement('audio');
      audio.className = 'spotify-preview-audio';
      audio.controls = true;
      audio.autoplay = true;
      audio.src = track.previewUrl;
      spotifyPlayerMount.appendChild(audio);
      requestAnimationFrame(() => {
        audio.play().catch(() => {});
      });
    } else if (track?.spotifyTrackId) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://open.spotify.com/embed/track/${track.spotifyTrackId}?utm_source=generator`;
      iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.title = `${track.name} on Spotify`;
      spotifyPlayerMount.appendChild(iframe);

      const hint = document.createElement('p');
      hint.className = 'spotify-player-hint';
      hint.textContent = 'Spotify does not expose a preview clip for this track, so this opens the official player.';
      spotifyPlayerMount.appendChild(hint);
    } else {
      const fallback = document.createElement('p');
      fallback.className = 'spotify-player-hint';
      fallback.textContent = 'No playback source is available for this track.';
      spotifyPlayerMount.appendChild(fallback);
    }

    spotifyModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSpotifyPlayer() {
    if (!spotifyModal || !spotifyPlayerMount) return;
    spotifyModal.classList.remove('open');
    spotifyPlayerMount.innerHTML = '';
    document.body.style.overflow = '';
  }

  function renderCharts(tracks) {
    if (!gcRowsCont || !tracks) return;

    gcRowsCont.innerHTML = '';
    tracks.forEach(track => {
      const row = document.createElement('div');
      row.className = 'gc-row fade-up';
      row.innerHTML = `
        <div class="gc-num">${track.rank}</div>
        <div class="gc-thumb">
          <img src="${track.image}" alt="${track.name} cover">
        </div>
        <div class="gc-info">
          <div class="gc-track-name">${track.name}</div>
          <div class="gc-track-sub">${track.artist} · ${track.year}</div>
        </div>
        <div class="gc-meta">
          <div class="gc-trend gc-${track.trend}"></div>
          <div class="gc-plays">${track.plays}</div>
          <button class="gc-play-btn" type="button" aria-label="Play ${track.name}">
            <span class="gc-play-icon">▶</span>
            <span class="gc-play-label">${track.previewUrl ? 'Preview' : 'Spotify'}</span>
          </button>
        </div>
      `;
      gcRowsCont.appendChild(row);

      // Store the image for the report generator
      row.dataset.spotifyImg = track.image;
      row.dataset.spotifyTrackId = track.spotifyTrackId || '';
      row.dataset.spotifyTrackUrl = track.trackUrl || '';
      row.dataset.spotifyPreviewUrl = track.previewUrl || '';

      row.addEventListener('click', () => {
        openSpotifyPlayer(track);
      });
    });

    // Re-init fade-ups for new elements
    // Update Spotlight Artist (Number 1)
    const spotlightImg = document.getElementById('gcSpotlightImg');
    const spotlightName = document.querySelector('.gc-spotlight-name');
    if (tracks.length > 0 && spotlightImg && spotlightName) {
      const topTrack = tracks[0];
      spotlightImg.src = topTrack.artistImage || topTrack.image;
      spotlightName.textContent = topTrack.artist.split(',')[0];
    }

    initFadeUps(document.getElementById('page-home'));
  }

  /* ── Refs ─────────────────────────────────────────────────── */
  const nav           = document.getElementById('mainNav');
  const navToggle     = document.getElementById('navToggle');
  const searchBtn     = document.getElementById('searchBtn');
  const searchOverlay = document.getElementById('searchOverlay');
  const searchClose   = document.getElementById('searchClose');
  const searchInput   = document.getElementById('searchInput');
  const hero          = document.getElementById('hero');
  const cartBadge     = document.getElementById('cartBadge');

  /* ── CART STATE ────────────────────────────────────────────── */
  let cartCount = 0;

  function updateCart(count) {
    cartCount = count;
    if (cartBadge) {
      cartBadge.textContent = cartCount;
      cartBadge.classList.add('pop');
      setTimeout(() => cartBadge.classList.remove('pop'), 250);
    }
  }

  /* ── TAB ROUTER ────────────────────────────────────────────── */
  const tabs      = document.querySelectorAll('.nav-tab');
  const pages     = document.querySelectorAll('.page-view');
  const navLogo   = document.querySelector('.nav-logo');

  function switchTab(tabId) {
    // Deactivate all
    tabs.forEach(t => t.classList.remove('active'));
    pages.forEach(p => {
      p.classList.remove('active', 'fade-in');
    });

    // ── Lazy Spotify iframes: unload all embeds on page leave ──
    document.querySelectorAll('iframe[data-src]').forEach(iframe => {
      if (iframe.src && iframe.src !== 'about:blank') {
        iframe.dataset.src = iframe.src;
        iframe.removeAttribute('src');
      }
    });

    // Activate target tab
    const activeTab = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Show target page with fade
    const targetPage = document.getElementById(`page-${tabId}`);
    if (targetPage) {
      targetPage.classList.add('active');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          targetPage.classList.add('fade-in');
        });
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // ── Lazy Spotify iframes: load only the embed on the active page ──
      targetPage.querySelectorAll('iframe[data-src]').forEach(iframe => {
        if (!iframe.src || iframe.src === 'about:blank') {
          iframe.src = iframe.dataset.src;
        }
      });
    }

    // Re-init fade-up animations for the new page
    initFadeUps(targetPage);

    // Reinit hero if going home
    if (tabId === 'home' && hero) {
      requestAnimationFrame(() => {
        setTimeout(() => hero.classList.add('loaded'), 100);
      });
    }
  }

  // Wire up tab clicks
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = tab.dataset.tab;
      if (tabId) {
        history.pushState({ tab: tabId }, '', `#${tabId}`);
        switchTab(tabId);
        // Close mobile nav if open
        nav.classList.remove('mobile-open');
        navToggle && navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  });

  // Logo always goes home
  if (navLogo) {
    navLogo.addEventListener('click', (e) => {
      e.preventDefault();
      history.pushState({ tab: 'home' }, '', '#home');
      switchTab('home');
    });
  }

  // Hero CTA buttons (tab switching)
  document.querySelectorAll('[data-tab]').forEach(el => {
    if (el.classList.contains('nav-tab') || el.classList.contains('nav-logo')) return;
    el.addEventListener('click', (e) => {
      const tabId = el.dataset.tab;
      if (tabId) {
        e.preventDefault();
        history.pushState({ tab: tabId }, '', `#${tabId}`);
        switchTab(tabId);
      }
    });
  });

  // Handle browser back/forward
  window.addEventListener('popstate', (e) => {
    const tabId = (e.state && e.state.tab) || getHashTab();
    switchTab(tabId || 'home');
  });

  function getHashTab() {
    const hash = window.location.hash.replace('#', '');
    return ['home', 'artist', 
      /* ARTIST_TABS_START */
      'lila-ik-', 'magixx', 'mahalia', 'teni', 'yo-maps', 'chef-187', 'frank-ro', 'xaven', 'kb', 'triple-m', 'jc-kalinks', 'tio-nason', 'chewe', 'esii', 'mag44', 'mordecaii', 'rustar', 'the-f-a-k-e', 'f-jay', 'kanina-kandalama', 'styve-ace', 'bad-boy-shezy', 'iamwaters', 'nyarai', 'vleko', 'zaggar',
      /* ARTIST_TABS_END */
      'hub', 'shop', 'about'].includes(hash) ? hash : 'home';
  }

  // Init on load
  const initialTab = getHashTab();
  switchTab(initialTab);

  /* ── NAV: sticky scroll ────────────────────────────────────── */
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  /* ── Hero entry animation ───────────────────────────────────── */
  if (hero) {
    requestAnimationFrame(() => {
      setTimeout(() => hero.classList.add('loaded'), 100);
    });
  }

  /* ── MOBILE NAV TOGGLE ─────────────────────────────────────── */
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('mobile-open');
      navToggle.setAttribute('aria-expanded', isOpen.toString());
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  /* Mobile nav close button */
  const mobileNavClose = document.getElementById('mobileNavClose');
  if (mobileNavClose) {
    mobileNavClose.addEventListener('click', () => {
      nav.classList.remove('mobile-open');
      navToggle && navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  }

  /* ── SEARCH OVERLAY ────────────────────────────────────────── */
  function openSearch() {
    searchOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => searchInput && searchInput.focus(), 150);
  }
  function closeSearch() {
    searchOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (searchBtn)   searchBtn.addEventListener('click', openSearch);
  if (searchClose) searchClose.addEventListener('click', closeSearch);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearch();
  });
  if (searchOverlay) {
    searchOverlay.addEventListener('click', (e) => {
      if (e.target === searchOverlay) closeSearch();
    });
  }

  /* ── FADE-UP INTERSECTION OBSERVER ─────────────────────────── */
  function initFadeUps(scope) {
    const root = scope || document;
    const fadeEls = root.querySelectorAll('.fade-up:not(.visible)');
    if (!('IntersectionObserver' in window) || !fadeEls.length) {
      fadeEls.forEach(el => el.classList.add('visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const parent = entry.target;
          const siblings = parent.parentElement
            ? [...parent.parentElement.children].filter(el => el.classList.contains('fade-up'))
            : [parent];
          const idx = siblings.indexOf(parent);
          setTimeout(() => parent.classList.add('visible'), Math.min(idx * 80, 400));
          observer.unobserve(parent);
        }
      });
    }, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });
    fadeEls.forEach(el => observer.observe(el));
  }

  /* ── HOVER EFFECTS REMOVED ── */

  /* ── RADIO TRACK ROTATION ───────────────────────────────────── */
  const tracks = [
    'KAYGRÖ — "Burnt Frequencies"',
    'NÓBEN — "Shadows & Glass"',
    'ANTAUSER — "Cold Current"',
    'AMARA K — "Golden Orbit"',
    'EERA — "Hollow Room"',
  ];
  let trackIdx = 0;
  const nowTrackEl = document.querySelector('.radio-now-track');
  if (nowTrackEl) {
    setInterval(() => {
      trackIdx = (trackIdx + 1) % tracks.length;
      nowTrackEl.style.opacity = '0';
      setTimeout(() => {
        nowTrackEl.textContent = tracks[trackIdx];
        nowTrackEl.style.opacity = '1';
      }, 300);
      nowTrackEl.style.transition = 'opacity 300ms ease';
    }, 6000);
  }

  /* ── REDUCED MOTION ─────────────────────────────────────────── */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.radio-wave span, .ticker-track, .hero-scroll-line, .player-waveform span')
      .forEach(el => { el.style.animationPlayState = 'paused'; });
  }

  /* ── ARTIST PAGE: LYRICS TOGGLE ─────────────────────────────── */
  const noteTogglePairs = [
    ['lyricsToggle', 'lyricsBody'],
    /* ARTIST_TOGGLES_START */
    ['lila-ik-Toggle', 'lila-ik-Body'],
    ['magixxToggle', 'magixxBody'],
    ['mahaliaToggle', 'mahaliaBody'],
    ['teniToggle', 'teniBody'],
    ['yo-mapsToggle', 'yo-mapsBody'],
    ['chef-187Toggle', 'chef-187Body'],
    ['frank-roToggle', 'frank-roBody'],
    ['xavenToggle', 'xavenBody'],
    ['kbToggle', 'kbBody'],
    ['triple-mToggle', 'triple-mBody'],
    ['jc-kalinksToggle', 'jc-kalinksBody'],
    ['tio-nasonToggle', 'tio-nasonBody'],
    ['cheweToggle', 'cheweBody'],
    ['esiiToggle', 'esiiBody'],
    ['mag44Toggle', 'mag44Body'],
    ['mordecaiiToggle', 'mordecaiiBody'],
    ['rustarToggle', 'rustarBody'],
    ['the-f-a-k-eToggle', 'the-f-a-k-eBody'],
    ['f-jayToggle', 'f-jayBody'],
    ['kanina-kandalamaToggle', 'kanina-kandalamaBody'],
    ['styve-aceToggle', 'styve-aceBody'],
    ['bad-boy-shezyToggle', 'bad-boy-shezyBody'],
    ['iamwatersToggle', 'iamwatersBody'],
    ['nyaraiToggle', 'nyaraiBody'],
    ['vlekoToggle', 'vlekoBody'],
    ['zaggarToggle', 'zaggarBody'],
    /* ARTIST_TOGGLES_END */
  ];
  noteTogglePairs.forEach(([toggleId, bodyId]) => {
    const toggle = document.getElementById(toggleId);
    const body = document.getElementById(bodyId);
    if (!toggle || !body) return;

    toggle.addEventListener('click', () => {
      const isOpen = body.classList.toggle('open');
      toggle.textContent = isOpen ? 'Hide Notes' : 'Show Notes';
    });
  });

  /* CONTENT HUB: CATEGORY FILTER */
  const hubFilters = document.querySelectorAll('.hub-filter');
  const hubCards   = document.querySelectorAll('.hub-card');
  hubFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      hubFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      hubCards.forEach(card => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  /* ── SHOP: CATEGORY FILTER ──────────────────────────────────── */
  const shopCats    = document.querySelectorAll('.shop-cat');
  const productCards = document.querySelectorAll('.product-card');
  shopCats.forEach(btn => {
    btn.addEventListener('click', () => {
      shopCats.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.shopcat;
      productCards.forEach(card => {
        if (cat === 'all' || card.dataset.shopcat === cat) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  /* ── SHOP: ADD TO CART ──────────────────────────────────────── */
  document.querySelectorAll('.product-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cartCount++;
      updateCart(cartCount);
      const original = btn.textContent;
      btn.textContent = '✓ Added!';
      btn.style.background = '#34d399';
      setTimeout(() => {
        btn.textContent = original;
        btn.style.background = '';
      }, 1500);
    });
  });

  /* ── SHOP: COUNTDOWN TIMER ──────────────────────────────────── */
  let dropSeconds = 4 * 3600 + 22 * 60 + 9;
  const cdHours = document.getElementById('cd-hours');
  const cdMins  = document.getElementById('cd-mins');
  const cdSecs  = document.getElementById('cd-secs');

  function updateCountdown() {
    if (dropSeconds <= 0) return;
    dropSeconds--;
    const h = Math.floor(dropSeconds / 3600);
    const m = Math.floor((dropSeconds % 3600) / 60);
    const s = dropSeconds % 60;
    if (cdHours) cdHours.textContent = String(h).padStart(2, '0');
    if (cdMins)  cdMins.textContent  = String(m).padStart(2, '0');
    if (cdSecs)  cdSecs.textContent  = String(s).padStart(2, '0');
  }
  if (cdHours) setInterval(updateCountdown, 1000);

  /* ── NEWSLETTER FORM ────────────────────────────────────────── */
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn   = document.getElementById('newsletterSubmit');
      const input = document.getElementById('newsletterEmail');
      if (btn && input && input.value) {
        btn.textContent = '✓ Subscribed!';
        btn.style.background = '#34d399';
        btn.style.color = '#0a0a0a';
        input.value = '';
        setTimeout(() => {
          btn.textContent = 'Subscribe';
          btn.style.background = '';
          btn.style.color = '';
        }, 3000);
      }
    });
  }

  /* ── ACTIVE NAV ON SCROLL (HOME PAGE ONLY) ──────────────────── */
  const sections = document.querySelectorAll('#page-home section[id]');
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Nothing needed now — all nav items are tab-based
      }
    });
  }, { threshold: 0.35 });
  sections.forEach(s => sectionObserver.observe(s));

  // Initialize Spotify Data on Load
  (async function() {
    const tracks = await fetchSpotifyCharts();
    if (tracks) renderCharts(tracks);
  })();

  /* ── GLOBAL CHART: REPORT DOWNLOAD ─────────────────────────── */
  const gcShareBtn = document.getElementById('gcShareBtn');
  const shareModal = document.getElementById('shareModal');
  const shareClose = document.getElementById('shareClose');
  const shareDownloadBtn = document.getElementById('shareDownloadBtn');
  const spotifyModal = document.getElementById('spotifyModal');
  const spotifyClose = document.getElementById('spotifyClose');
  const spotifyModalTitle = document.getElementById('spotifyModalTitle');
  const spotifyModalDesc = document.getElementById('spotifyModalDesc');
  const spotifyPlayerMount = document.getElementById('spotifyPlayerMount');
  
  const reportTemplate = document.getElementById('reportTemplate');
  const reportRowsCont = document.getElementById('reportRows');
  const gcRowsCont = document.querySelector('.gc-rows');

  // Map tracks to artist images (for the premium report)
  const trackImages = {
    'Hollow Frequencies': 'images/editorial2.png',
    'Ocean Floor':        'images/artist1.png',
    'Concrete Jungle':   'images/artist3.png',
    'Groundbreaker':     'images/artist2.png',
    'Pulse Lines':       'images/artist4.png'
  };

  async function downloadReport() {
    if (!shareDownloadBtn || !reportTemplate || !reportRowsCont) return;

    // Change button state
    const originalText = shareDownloadBtn.innerHTML;
    shareDownloadBtn.innerHTML = 'Generating...';
    shareDownloadBtn.disabled = true;

    try {
      // 1. Populate current date
      const now = new Date();
      const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
      const reportDateEl = document.getElementById('reportDate');
      const reportYearEl = document.getElementById('reportYear');
      if (reportDateEl) reportDateEl.textContent = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
      if (reportYearEl) reportYearEl.textContent = now.getFullYear();

      // 2. Extract data from live charts
      const liveRows = document.querySelectorAll('.gc-row');
      reportRowsCont.innerHTML = ''; // Clear template

      liveRows.forEach(row => {
        const num = row.querySelector('.gc-num').textContent;
        const trackName = row.querySelector('.gc-track-name').textContent;
        const trackSub = row.querySelector('.gc-track-sub').textContent;
        const trendIcon = row.querySelector('.gc-trend').textContent;
        const trendClass = row.querySelector('.gc-trend').classList.contains('gc-up') ? 'up' : 
                           row.querySelector('.gc-trend').classList.contains('gc-down') ? 'down' : 'new';
        const plays = row.querySelector('.gc-plays').textContent;
        
        const imgSrc = row.dataset.spotifyImg;

        // Create report row
        const repRow = document.createElement('div');
        repRow.className = 'report-row';
        repRow.innerHTML = `
          <div class="rep-num">${num}</div>
          <div class="rep-avatar"><img src="${imgSrc}" alt="${trackName}"></div>
          <div class="rep-info">
            <div class="rep-track">${trackName}</div>
            <div class="rep-meta">${trackSub}</div>
          </div>
          <div class="rep-trend">
            <span class="rep-time">${plays}</span>
            <span class="rep-arrow ${trendClass === 'up' ? 'legend-up' : trendClass === 'down' ? 'legend-down' : 'legend-new'}">
               ${trendClass === 'up' ? '▲' : trendClass === 'down' ? '▼' : '■'}
            </span>
          </div>
        `;
        reportRowsCont.appendChild(repRow);
      });

      // 3. Pre-load images inside the template to prevent blank renders
      const images = Array.from(reportTemplate.querySelectorAll('img'));
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve; // Continue even if one fails
        });
      }));

      // Add a tiny delay to allow the browser to paint text/layout
      await new Promise(resolve => setTimeout(resolve, 800));

      const dataUrl = await htmlToImage.toPng(reportTemplate, {
        width: 1080,
        height: 1920,
        pixelRatio: 1, // Ensures exactly 1080x1920 output
        style: {
          transform: 'none',
          left: '0',
          top: '0',
          position: 'static',
          zIndex: '1',
          opacity: '1',
          pointerEvents: 'auto'
        }
      });

      // 4. Trigger download
      const link = document.createElement('a');
      link.download = `traverce-global-report-${now.toISOString().slice(0,10)}.png`;
      link.href = dataUrl;
      link.click();

    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      shareDownloadBtn.innerHTML = originalText;
      shareDownloadBtn.disabled = false;
    }
  }

  if (gcShareBtn && shareModal && shareClose) {
    gcShareBtn.addEventListener('click', () => {
      shareModal.classList.add('open');
    });

    shareClose.addEventListener('click', () => {
      shareModal.classList.remove('open');
    });

    // Close when clicking outside content
    shareModal.addEventListener('click', (e) => {
      if (e.target === shareModal) {
        shareModal.classList.remove('open');
      }
    });
  }

  if (shareDownloadBtn) {
    shareDownloadBtn.addEventListener('click', downloadReport);
  }

  if (spotifyModal && spotifyClose) {
    spotifyClose.addEventListener('click', closeSpotifyPlayer);
    spotifyModal.addEventListener('click', (e) => {
      if (e.target === spotifyModal) {
        closeSpotifyPlayer();
      }
    });
  }

})();
