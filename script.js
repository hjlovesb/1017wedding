/* ============================================
   Romantic Flower - Mobile Wedding Invitation
   script.js
   ============================================ */

(function () {
  'use strict';

  /* ── Helpers ── */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function padZero(n) {
    return String(n).padStart(2, '0');
  }


  /* -- PNG/JPG 자동 인식 -- */
  function imageExists(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => resolve(null);
      img.src = src + (src.includes('?') ? '&' : '?') + 'v=' + Date.now();
    });
  }

  async function resolveFirstImage(paths) {
    for (const src of paths) {
      const ok = await imageExists(src);
      if (ok) return src;
    }
    return paths[0];
  }

  function cssUrl(src) {
    return `url('${String(src).replace(/'/g, "\\'")}')`;
  }




  const HERO_IMAGE_CANDIDATES = [
    'images/hero/1.png',
    'images/hero/1.jpg',
    'images/hero/1.jpeg'
  ];
  let heroImagePromise = null;

  function primeHeroImage() {
    if (!heroImagePromise) {
      heroImagePromise = resolveFirstImage(HERO_IMAGE_CANDIDATES).then((src) => {
        return new Promise((resolve) => {
          const preload = new Image();
          preload.decoding = 'sync';
          try { preload.fetchPriority = 'high'; } catch (e) {}
          preload.onload = () => resolve(src);
          preload.onerror = () => resolve(src);
          preload.src = src;

          const heroImg = $('#hero-img');
          if (heroImg && !heroImg.getAttribute('src')) {
            heroImg.loading = 'eager';
            heroImg.decoding = 'sync';
            try { heroImg.fetchPriority = 'high'; } catch (e) {}
            heroImg.src = src;
          }
        });
      });
    }
    return heroImagePromise;
  }

  // Legacy compatibility: curtain code still calls initPetals().
  // The current sparkle effect is initialized by the Lux Star block below,
  // so this keeps the curtain and RSVP flow from breaking.
  function initPetals() {
    return;
  }

  /* ── Image Auto-Detection ── */
  // Discovered images stored here for use across functions
  let galleryImages = [];

  function loadImagesFromFolder(folder, maxAttempts = 50) {
    return new Promise(resolve => {
        const images = [];
        let current = 1;
        let consecutiveFails = 0;
        const extensions = ['jpg', 'png', 'jpeg'];

        function tryImageWithExt(extIndex) {
            if (current > maxAttempts || consecutiveFails >= 3) {
                resolve(images);
                return;
            }

            if (extIndex >= extensions.length) {
                consecutiveFails++;
                current++;
                tryNext();
                return;
            }

            const ext = extensions[extIndex];
            const path = `images/${folder}/${current}.${ext}`;
            const img = new Image();

            img.onload = function() {
                images.push(path);
                consecutiveFails = 0;
                current++;
                tryNext();
            };

            img.onerror = function() {
                tryImageWithExt(extIndex + 1);
            };

            img.src = path;
        }

        function tryNext() {
            tryImageWithExt(0);
        }

        tryNext();
    });
  }

  /* ── Meta Tags ── */
  function initMeta() {
    document.title = CONFIG.meta.title;
    const t = $('#og-title');
    const d = $('#og-description');
    const i = $('#og-image');
    if (t) t.setAttribute('content', CONFIG.meta.title);
    if (d) d.setAttribute('content', CONFIG.meta.description);
    if (i) { resolveFirstImage(['images/og/1.png', 'images/og/1.jpg', 'images/og/1.jpeg']).then((src) => i.setAttribute('content', src)); }
    const pt = $('#page-title');
    if (pt) pt.textContent = CONFIG.meta.title;
  }

  /* ── Intro Fade Scene ── */


function initCurtain() {
  const curtain = $('#curtain');
  const openBtn = $('#curtain-open');

  primeHeroImage();

  const audio = document.getElementById('bgm');
  const musicBtn = document.getElementById('music-toggle');
  const AUTO_OPEN_DELAY = 12000;

  async function startMusic() {
    if (!audio) return;
    try {
      audio.volume = 0.72;
      await audio.play();
      if (musicBtn) musicBtn.classList.add('is-playing');
    } catch (e) {
      // 일부 모바일 브라우저는 첫 제스처 전 자동재생을 제한합니다.
    }
  }

  startMusic();

  const playOnGesture = () => {
    startMusic();
    window.removeEventListener('touchstart', playOnGesture);
    window.removeEventListener('click', playOnGesture);
  };
  window.addEventListener('touchstart', playOnGesture, { once: true, passive: true });
  window.addEventListener('click', playOnGesture, { once: true });

  if (CONFIG.useCurtain === false || !curtain) {
    document.body.classList.remove('intro-active');
    document.body.classList.remove('intro-revealing');
    document.body.style.overflow = '';
    if (curtain) curtain.style.display = 'none';
    initPetals();
    return;
  }

  document.body.classList.add('intro-active');
  document.body.classList.remove('intro-revealing');
  document.body.style.overflow = 'hidden';

  let introClosed = false;
  let popupTimer = null;
  let hideTimer = null;
  let autoTimer = null;

  function showAttendPopup() {
    if (typeof window.openAttendModal === 'function') {
      window.openAttendModal();
      return;
    }
    const modal = document.getElementById('attendModal');
    if (modal) {
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function revealMainBehindIntro() {
    document.body.classList.remove('intro-active');
    document.body.classList.add('intro-revealing');
    document.body.style.overflow = '';
    initPetals();
  }

  function hideIntroCompletely() {
    curtain.classList.add('is-hidden');
    curtain.style.pointerEvents = 'none';

    setTimeout(() => {
      curtain.style.display = 'none';
      document.body.classList.remove('intro-revealing');
    }, 180);
  }

  function closeIntro(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    if (introClosed) return;
    introClosed = true;

    if (autoTimer) clearTimeout(autoTimer);
    if (popupTimer) clearTimeout(popupTimer);
    if (hideTimer) clearTimeout(hideTimer);

    startMusic();
    primeHeroImage();

    revealMainBehindIntro();

    requestAnimationFrame(() => {
      curtain.classList.add('is-opening');
      requestAnimationFrame(() => {
        curtain.classList.add('is-open');
      });
    });

    hideTimer = setTimeout(hideIntroCompletely, 1580);
    popupTimer = setTimeout(showAttendPopup, 2380);
  }

  curtain.classList.add('is-ready');

  if (openBtn) {
    const setPressing = (active) => openBtn.classList.toggle('is-pressing', !!active);
    let pressTimer = null;

    const clearPressTimer = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    const scheduleCloseFromPress = (event) => {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
      if (introClosed) return;

      clearPressTimer();
      setPressing(true);

      pressTimer = setTimeout(() => {
        setPressing(false);
        closeIntro();
      }, 135);
    };

    openBtn.addEventListener('pointerdown', () => setPressing(true));
    openBtn.addEventListener('pointerup', scheduleCloseFromPress);
    openBtn.addEventListener('pointerleave', () => setPressing(false));
    openBtn.addEventListener('pointercancel', () => setPressing(false));
    openBtn.addEventListener('blur', () => setPressing(false));

    openBtn.addEventListener('click', (event) => {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    });

    openBtn.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') scheduleCloseFromPress(event);
    });
  }

  autoTimer = setTimeout(() => closeIntro(), AUTO_OPEN_DELAY);
}

  /* ── Hero ── */
  function initHero() {
    const img = $('#hero-img');
    if (img) {
      img.loading = 'eager';
      img.decoding = 'sync';
      try { img.fetchPriority = 'high'; } catch (e) {}
      primeHeroImage().then((src) => {
        img.src = src;
      });
    }

    const names = $('#hero-names');
    if (names) {
      names.innerHTML =
        CONFIG.groom.fullName +
        ' <span class="ampersand">&amp;</span> ' +
        CONFIG.bride.fullName;
    }

    const w = CONFIG.wedding;
    const [y, m, d] = w.date.split('-');
    const [hh, mm] = w.time.split(':');
    const ampm = +hh < 12 ? '오전' : '오후';
    const h12 = +hh % 12 || 12;

    const dateEl = $('#hero-date');
    if (dateEl) {
      dateEl.textContent = `${y}년 ${+m}월 ${+d}일 ${w.dayOfWeek} ${ampm} ${h12}시${+mm ? ' ' + +mm + '분' : ''}`;
    }

    const venue = $('#hero-venue');
    if (venue) venue.textContent = w.venue;
  }

 

  /* ── Greeting ── */
  function initGreeting() {
    const title = $('#greeting-title');
    const text = $('#greeting-text');
    const parents = $('#greeting-parents');

    if (title) title.textContent = CONFIG.greeting.title;
    if (text) text.textContent = CONFIG.greeting.content;

    if (parents) {
      const g = CONFIG.groom;
      const b = CONFIG.bride;

      const makeName = (cfg, isDeceased) => {
        return isDeceased
          ? `<span class="deceased">${cfg}</span>`
          : cfg;
      };

      parents.innerHTML = `
        <span class="parent-line">
          ${makeName(g.father, g.fatherDeceased)} &middot; ${makeName(g.mother, g.motherDeceased)}
          <em>의 ${g.lastName === g.father?.charAt(0) ? '아들' : '아들'}</em> <strong>${g.name}</strong>
        </span>
        <span class="parent-dot">&amp;</span>
        <span class="parent-line">
          ${makeName(b.father, b.fatherDeceased)} &middot; ${makeName(b.mother, b.motherDeceased)}
          <em>의 딸</em> <strong>${b.name}</strong>
        </span>
      `;
    }
  }

  /* ── Calendar ── */
function initCalendar() {
  const el = $('#calendar');
  if (!el) return;

  const [y, m, d] = CONFIG.wedding.date.split('-').map(Number);
  const [hh, mm] = CONFIG.wedding.time.split(':').map(Number);

  const first = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0).getDate();
  const startDow = first.getDay();

  const ampm = hh < 12 ? '오전' : '오후';
  const h12 = hh % 12 || 12;
  const timeText = `${CONFIG.wedding.dayOfWeek} ${ampm} ${h12}시${mm ? ' ' + mm + '분' : ''}`;

  let html = `
    <div class="calendar__summary">
      <p class="calendar__date-title">${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}</p>
      <p class="calendar__date-sub">${timeText}</p>
    </div>

    <div class="calendar__line"></div>

    <div class="calendar__weekdays">
      <span class="calendar__weekday is-sunday">S</span>
      <span class="calendar__weekday">M</span>
      <span class="calendar__weekday">T</span>
      <span class="calendar__weekday">W</span>
      <span class="calendar__weekday">T</span>
      <span class="calendar__weekday">F</span>
      <span class="calendar__weekday">S</span>
    </div>

    <div class="calendar__days">
  `;

  for (let i = 0; i < startDow; i++) {
    html += '<span class="calendar__day is-empty"></span>';
  }

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(y, m - 1, day);
    const isSunday = date.getDay() === 0 ? ' is-sunday' : '';
    const isWeddingDay = day === d ? ' is-today' : '';

    html += `<span class="calendar__day${isSunday}${isWeddingDay}">${day}</span>`;
  }

  html += '</div>';

  el.innerHTML = html;

  const countdown = $('#countdown');
  if (countdown) {
    countdown.classList.add('countdown--calendar');
    el.insertAdjacentElement('afterend', countdown);

    if (!countdown.querySelector('.countdown__headline')) {
      const headline = document.createElement('div');
      headline.className = 'countdown__headline';
      headline.innerHTML = `
        <span class="countdown__headline-names">
          <span class="countdown__person">${CONFIG.bride.name}</span>
          <span class="countdown__rose" aria-hidden="true"></span>
          <span class="countdown__person">${CONFIG.groom.name}</span>
        </span>
        <span class="countdown__headline-text">결혼식까지 남은 시간</span>
      `;
      countdown.prepend(headline);
    }
  }
}

 /* ── Countdown ── */
  function initCountdown() {
    const w = CONFIG.wedding;
    const [y, m, d] = w.date.split('-');
    const [hh, mm] = w.time.split(':');
    const target = new Date(+y, +m - 1, +d, +hh, +mm, 0).getTime();

    function update() {
      const now = Date.now();
      let diff = target - now;
      if (diff < 0) diff = 0;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      const dEl = $('#cd-days');
      const hEl = $('#cd-hours');
      const mEl = $('#cd-minutes');
      const sEl = $('#cd-seconds');
      if (dEl) dEl.textContent = days;
      if (hEl) hEl.textContent = padZero(hours);
      if (mEl) mEl.textContent = padZero(minutes);
      if (sEl) sEl.textContent = padZero(seconds);
    }

    update();
    setInterval(update, 1000);
  }
  /* ── Story: 봉투에서 나온 뒤 01~04 사진이 자동으로 순환 ── */
  function startStoryPhotoCycle(reveal) {
    const card = reveal.querySelector('.story-envelope-slide__card');
    if (!card) return;

    const photos = Array.from(card.querySelectorAll('.story-envelope-slide__photo'));
    if (photos.length <= 1) return;

    const prefersReducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return; // 첫 사진(01)만 정지 상태로 보여주고 순환은 건너뜀

    let index = Math.max(0, photos.findIndex((p) => p.classList.contains('is-active')));

    function showNext() {
      const nextIndex = (index + 1) % photos.length;
      photos[index].classList.remove('is-active');
      photos[nextIndex].classList.add('is-active');
      index = nextIndex;
    }

    function loop() {
      showNext();
      window.setTimeout(loop, 3200);
    }

    // 봉투에서 카드가 스르륵 올라오는 연출이 끝난 뒤 사진 순환을 시작합니다.
    const riseDelayMs = window.matchMedia('(max-width: 480px)').matches ? 6300 : 6650;
    window.setTimeout(loop, riseDelayMs);
  }

  async function initStory() {
    const title = $('#story-title');
    const text = $('#story-text');
    const container = $('#story-images');

    if (title) title.textContent = CONFIG.story.title;
    if (text) text.textContent = CONFIG.story.content;
    if (!container) return;

    const reveal = container.querySelector('#story-envelope-slide');
    if (!reveal) return;

    const images = Array.from(reveal.querySelectorAll('img'));
    // 이미지를 완전히 '디코드'까지 끝낸 뒤 모션을 시작해 첫 프레임 끊김을 방지합니다.
    await Promise.all(images.map(async (img) => {
      try {
        if (typeof img.decode === 'function') {
          await img.decode();
          return;
        }
      } catch (e) {}
      if (img.complete) return;
      await new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }));

    let cycleStarted = false;
    const play = () => {
      reveal.classList.remove('is-playing');
      void reveal.offsetWidth;
      reveal.classList.add('is-visible', 'is-playing');

      if (!cycleStarted) {
        cycleStarted = true;
        startStoryPhotoCycle(reveal);
      }
    };

    if ('IntersectionObserver' in window) {
      const storyObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            play();
            storyObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.22, rootMargin: '0px 0px -8% 0px' });
      storyObserver.observe(reveal);
    } else {
      play();
    }

    // 안전장치: 화면에 실제로 보일 때만 재생을 시작합니다.
    const fallbackCheck = () => {
      if (reveal.classList.contains('is-playing')) return;
      const rect = reveal.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < vh * 0.85 && rect.bottom > 0) play();
    };
    window.setTimeout(fallbackCheck, 1200);
  }


  /* ── Gallery (async — waits for image discovery) ── */
 async function initGallery() {
  const grid = $('#gallery-grid');
  const section = $('#gallery');
  if (!grid) return;

  grid.innerHTML = `
    <div class="section-loading">
      <span class="section-loading__dot"></span>
      <span class="section-loading__dot"></span>
      <span class="section-loading__dot"></span>
    </div>
  `;

  galleryImages = await loadImagesFromFolder('gallery');

  if (galleryImages.length === 0) {
    if (section) section.style.display = 'none';
    return;
  }

  grid.innerHTML = galleryImages
    .map(
      (src, i) => `
        <div class="gallery__item" data-index="${i}">
          <img src="${src}" alt="갤러리 사진 ${i + 1}" loading="lazy" />
        </div>
      `
    )
    .join('');

  observeNewElements(grid);
}

 function initGallerySlider() {
  const gallery = document.querySelector('#gallery-grid');
  if (!gallery) return;

  const originalItems = Array.from(gallery.querySelectorAll('.gallery__item'));
  if (!originalItems.length) return;

  gallery.innerHTML = `
    <div class="gallery__viewport">
      <div class="gallery__track"></div>
    </div>
    <div class="gallery__counter" aria-live="polite"></div>
  `;

  const viewport = gallery.querySelector('.gallery__viewport');
  const track = gallery.querySelector('.gallery__track');
  const counter = gallery.querySelector('.gallery__counter');

  const prepareItem = (item) => {
    item.removeAttribute('onclick');
    const img = item.querySelector('img');
    if (img) {
      img.removeAttribute('onclick');
      img.style.pointerEvents = 'none';
      img.setAttribute('draggable', 'false');
    }
    return item;
  };

  originalItems.forEach((item) => track.appendChild(prepareItem(item)));

  const loopEnabled = originalItems.length > 1;
  // 앞뒤 복제 슬라이드로 첫 장과 마지막 장 사이도 끊김 없이 순환합니다.
  if (loopEnabled) {
    track.insertBefore(prepareItem(originalItems[originalItems.length - 1].cloneNode(true)), track.firstChild);
    track.appendChild(prepareItem(originalItems[0].cloneNode(true)));
  }

  const slides = Array.from(track.children);
  let index = loopEnabled ? 1 : 0;
  let width = 0;
  let animating = false;

  const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

  function realIndex() {
    if (!loopEnabled) return 0;
    if (index === 0) return originalItems.length - 1;
    if (index === slides.length - 1) return 0;
    return index - 1;
  }

  function updateCounter() {
    counter.textContent = `${realIndex() + 1} / ${originalItems.length}`;
  }

  function activeImg() {
    const slide = slides[index];
    return slide ? slide.querySelector('img') : null;
  }

  // 현재 사진의 실제 높이에 맞춰 갤러리 높이를 부드럽게 조정 (가로/세로 사진 대응)
  function syncHeight(animate) {
    const img = activeImg();
    if (!img) return;
    const apply = () => {
      const h = img.clientHeight ||
        (img.naturalWidth ? width * (img.naturalHeight / img.naturalWidth) : 0);
      if (!h) return;
      // 인라인 !important 로 지정해야 스타일시트의 height:auto !important 를 이깁니다.
      viewport.style.setProperty('transition', animate ? `height 0.45s ${EASE}` : 'none', 'important');
      viewport.style.setProperty('height', `${Math.round(h)}px`, 'important');
    };
    if (img.complete && img.naturalWidth) apply();
    else img.addEventListener('load', apply, { once: true });
  }

  function setX(x, animate) {
    track.style.transition = animate ? `transform 0.5s ${EASE}` : 'none';
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  function snap(animate) {
    setX(-index * width, animate);
    updateCounter();
    syncHeight(animate);
  }

  function measure() {
    width = viewport.clientWidth || gallery.clientWidth || 1;
    slides.forEach((slide) => { slide.style.width = `${width}px`; });
    snap(false);
  }

  track.addEventListener('transitionend', (event) => {
    if (event.propertyName !== 'transform') return;
    animating = false;
    // 복제 슬라이드에 도착하면 같은 실제 슬라이드로 순간 이동해 무한 루프를 만듭니다.
    if (loopEnabled) {
      if (index === 0) { index = originalItems.length; snap(false); }
      else if (index === slides.length - 1) { index = 1; snap(false); }
    }
  });

  /* ── 손가락을 그대로 따라오는 드래그 (touch + mouse) ── */
  let dragging = false;
  let decided = false;
  let horizontal = false;
  let startX = 0, startY = 0, lastX = 0, baseX = 0, startTime = 0;

  function down(x, y) {
    if (!loopEnabled || animating) return;
    dragging = true;
    decided = false;
    horizontal = false;
    startX = lastX = x;
    startY = y;
    baseX = -index * width;
    startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    track.style.transition = 'none';
    viewport.classList.add('is-dragging');
  }

  function move(x, y, ev) {
    if (!dragging) return;
    const dx = x - startX;
    const dy = y - startY;

    if (!decided) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      horizontal = Math.abs(dx) > Math.abs(dy);
      decided = true;
      if (!horizontal) { // 세로 제스처 → 페이지 스크롤에 양보
        dragging = false;
        viewport.classList.remove('is-dragging');
        return;
      }
    }

    if (horizontal && ev && ev.cancelable) ev.preventDefault();
    lastX = x;
    setX(baseX + dx, false); // 손가락을 1:1로 따라옴
  }

  function up() {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
    if (!horizontal) return;

    const dx = lastX - startX;
    const elapsed = Math.max(1, (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime);
    const velocity = dx / elapsed;

    // 짧고 빠르게 밀어도(속도) 또는 충분히 밀면(거리) 다음 장으로
    if (Math.abs(dx) > width * 0.16 || Math.abs(velocity) > 0.4) {
      index += dx < 0 ? 1 : -1;
    }
    animating = true;
    snap(true);
    // 위치 변화가 없어 transitionend가 안 뜨는 경우(정확히 제자리) 대비
    window.setTimeout(() => { animating = false; }, 600);
  }

  // Touch (모바일)
  viewport.addEventListener('touchstart', (e) => {
    if (!e.touches[0]) return;
    down(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  viewport.addEventListener('touchmove', (e) => {
    if (!e.touches[0]) return;
    move(e.touches[0].clientX, e.touches[0].clientY, e);
  }, { passive: false });
  viewport.addEventListener('touchend', up);
  viewport.addEventListener('touchcancel', up);

  // Mouse (데스크톱 미리보기)
  viewport.addEventListener('mousedown', (e) => { down(e.clientX, e.clientY); e.preventDefault(); });
  window.addEventListener('mousemove', (e) => { if (dragging) move(e.clientX, e.clientY, e); });
  window.addEventListener('mouseup', up);

  window.addEventListener('resize', measure, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', measure, { passive: true });
  }

  // 이미지 로드가 끝나면 정확한 높이로 다시 맞춥니다.
  const imgs = Array.from(track.querySelectorAll('img'));
  Promise.all(imgs.map((im) => (im.complete && im.naturalWidth)
    ? Promise.resolve()
    : new Promise((res) => {
        im.addEventListener('load', res, { once: true });
        im.addEventListener('error', res, { once: true });
      })
  )).then(() => { measure(); });

  measure();
  updateCounter();
}


  /* ── Location ── */
  function initLocation() {
    const w = CONFIG.wedding;
    const venue = $('#loc-venue');
    const hall = $('#loc-hall');
    const addr = $('#loc-address');
    const tel = $('#loc-tel');

    if (venue) venue.textContent = w.venue;
    if (hall) hall.textContent = w.hall;
    if (addr) addr.textContent = w.address;
    if (tel) tel.textContent = `Tel. ${w.tel}`;

    const kakao = $('#btn-kakao-map');
    const naver = $('#btn-naver-map');
    const tmap = $('#btn-tmap');

    if (kakao) kakao.href = w.mapLinks.kakao;
    if (naver) naver.href = w.mapLinks.naver;
    if (tmap) tmap.href = w.mapLinks.tmap;

    if (tmap) {
      const defaultTmapUrl = `tmap://search?name=${encodeURIComponent(w.venue || w.address)}`;
      const tmapUrl = w.mapLinks.tmap || defaultTmapUrl;
      const fallbackUrl = w.mapLinks.tmapFallback || 'https://www.tmap.co.kr/';

      tmap.href = tmapUrl;

      tmap.addEventListener('click', (e) => {
        if (!tmapUrl.startsWith('tmap://')) return;

        e.preventDefault();

        let fallbackTimer = null;
        const clearFallback = () => {
          if (fallbackTimer) clearTimeout(fallbackTimer);
          window.removeEventListener('pagehide', clearFallback);
          document.removeEventListener('visibilitychange', onVisibilityChange);
        };
        const onVisibilityChange = () => {
          if (document.hidden) clearFallback();
        };

        window.addEventListener('pagehide', clearFallback);
        document.addEventListener('visibilitychange', onVisibilityChange);

        window.location.href = tmapUrl;

        fallbackTimer = setTimeout(() => {
          if (!document.hidden) {
            window.location.href = fallbackUrl;
          }
          clearFallback();
        }, 1200);
      });
    }

    const copyBtn = $('#btn-copy-address');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        copyToClipboard(w.address, '주소가 복사되었습니다');
      });
    }

    initTransport();
  }

  /* ── 오시는 길: 교통편 안내 (지도 버튼 아래) ── */
  function initTransport() {
    const section = $('#location .section__inner') || $('#location');
    if (!section) return;
    if ($('#location-transport')) return; // 중복 주입 방지

    // 교통편 내용은 config.js 의 CONFIG.transport 에서 관리합니다.
    const data = (typeof CONFIG !== 'undefined') ? CONFIG.transport : null;
    if (!data || !Array.isArray(data.items) || !data.items.length) return;

    const wrap = document.createElement('div');
    wrap.className = 'location-transport';
    wrap.id = 'location-transport';

    const blocks = data.items.map((it) => {
      const lines = (it.lines || [])
        .map((ln) => `<p class="location-transport__line">${ln}</p>`)
        .join('');
      return `
        <div class="location-transport__block">
          <h3 class="location-transport__heading">${it.title}</h3>
          ${lines}
        </div>
      `;
    }).join('');

    wrap.innerHTML = blocks + (data.note
      ? `<p class="location-transport__note">${data.note}</p>`
      : '');

    // 지도/버튼 영역 바로 아래에 배치 (없으면 섹션 끝에 추가)
    const buttons = $('#location .location__buttons');
    if (buttons && buttons.parentNode) {
      buttons.parentNode.insertBefore(wrap, buttons.nextSibling);
    } else {
      section.appendChild(wrap);
    }
  }


  /* ── Account ── */
  function initAccount() {
    const groomBody = $('#acc-groom-body');
    const brideBody = $('#acc-bride-body');

    if (groomBody) {
      groomBody.innerHTML = renderAccounts(CONFIG.accounts.groom);
    }
    if (brideBody) {
      brideBody.innerHTML = renderAccounts(CONFIG.accounts.bride);
    }

    // Accordion toggle
    $$('.accordion__toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const acc = btn.closest('.accordion');
        acc.classList.toggle('is-open');
      });
    });

    // Copy account
    document.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('.account-item__copy');
      if (copyBtn) {
        const account = copyBtn.dataset.account;
        copyToClipboard(account, '계좌번호가 복사되었습니다');
      }
    });
  }

  function renderAccounts(accounts) {
    return accounts
      .map(
        (acc) => `
      <div class="account-item">
        <div class="account-item__info">
          <p class="account-item__role">${acc.role}</p>
          <p class="account-item__detail">
            <span class="account-item__name">${acc.name}</span>
            ${acc.bank} ${acc.number}
          </p>
        </div>
        <button class="account-item__copy" data-account="${acc.bank} ${acc.number} ${acc.name}">복사</button>
      </div>
    `
      )
      .join('');
  }

  /* ── Toast ── */
  let toastTimer = null;
  function showToast(msg) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2200);
  }

  /* ── Clipboard ── */
  function copyToClipboard(text, toastMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(toastMsg);
      }).catch(() => {
        fallbackCopy(text, toastMsg);
      });
    } else {
      fallbackCopy(text, toastMsg);
    }
  }

  function fallbackCopy(text, toastMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(toastMsg);
    } catch (e) {
      showToast('복사에 실패했습니다');
    }
    document.body.removeChild(ta);
  }

  /* ── Scroll Animations (IntersectionObserver) ── */
  let scrollObserver = null;

  function initScrollAnimations() {
    const targets = $$('.anim-target, .gallery__item, .story__img-card');
    if (!targets.length) return;

    scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            scrollObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach((el) => scrollObserver.observe(el));
  }

  // Re-observe dynamically added elements after async image loading
  function observeNewElements(container) {
    if (!scrollObserver) return;
    const targets = $$('.gallery__item, .story__img-card', container);
    targets.forEach((el) => scrollObserver.observe(el));
  }

/* =========================================
   Luxury Star Sparkle Fall
   - 기존 하트/꽃잎/펄/스파클 효과 삭제 후 이 코드로 교체
   - 작은 별빛 스파클이 계속 반짝이며 떨어짐
   - 미색 배경용 웜 화이트 / 샴페인 펄 톤
========================================= */

(function () {
  const oldLayer = document.querySelector(".lux-star-layer");
  if (oldLayer) oldLayer.remove();

  const oldStyle = document.getElementById("lux-star-style");
  if (oldStyle) oldStyle.remove();

  const layer = document.createElement("div");
  layer.className = "lux-star-layer";
  document.body.appendChild(layer);

  const style = document.createElement("style");
  style.id = "lux-star-style";
  style.textContent = `
    .lux-star-layer {
      position: fixed;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 4;
    }

    .lux-star {
      position: absolute;
      top: -14vh;
      left: var(--x);
      width: var(--size);
      height: var(--size);
      transform: translate3d(0, -14vh, 0) rotate(var(--r));
      will-change: transform, opacity, filter;
      animation: luxStarFall var(--fall) linear var(--delay) infinite;
    }

    .lux-star__inner {
      width: 100%;
      height: 100%;
      display: block;
      transform-origin: center;
      opacity: var(--opacity);
      animation: luxStarTwinkle var(--twinkle) ease-in-out var(--delay) infinite;
      filter:
        drop-shadow(0 0 2px rgba(255,255,255,0.58))
        drop-shadow(0 0 5px rgba(248,230,200,0.30))
        drop-shadow(0 0 9px rgba(255,247,236,0.12));
    }

    .lux-star svg {
      width: 100%;
      height: 100%;
      display: block;
      overflow: visible;
    }

    @keyframes luxStarFall {
      0% {
        transform: translate3d(0, -14vh, 0) rotate(var(--r));
      }
      25% {
        transform: translate3d(calc(var(--sway) * 0.42), 24vh, 0) rotate(calc(var(--r) + 10deg));
      }
      50% {
        transform: translate3d(calc(var(--sway) * -0.18), 52vh, 0) rotate(calc(var(--r) + 22deg));
      }
      75% {
        transform: translate3d(calc(var(--sway) * 0.24), 79vh, 0) rotate(calc(var(--r) + 34deg));
      }
      100% {
        transform: translate3d(calc(var(--sway) * -0.10), 114vh, 0) rotate(calc(var(--r) + 48deg));
      }
    }

    /* 핵심: 멈추지 않고 한 사이클 안에서 여러 번 반짝이게 */
    @keyframes luxStarTwinkle {
      0% {
        opacity: calc(var(--opacity) * 0.18);
        transform: scale(0.45);
        filter:
          brightness(0.92)
          drop-shadow(0 0 1px rgba(255,255,255,0.18))
          drop-shadow(0 0 2px rgba(248,230,200,0.10));
      }

      8% {
        opacity: calc(var(--opacity) * 0.42);
        transform: scale(0.72);
        filter:
          brightness(1.08)
          drop-shadow(0 0 2px rgba(255,255,255,0.32))
          drop-shadow(0 0 4px rgba(248,230,200,0.16));
      }

      16% {
        opacity: calc(var(--opacity) * 0.85);
        transform: scale(1.02);
        filter:
          brightness(1.52)
          drop-shadow(0 0 4px rgba(255,255,255,0.56))
          drop-shadow(0 0 7px rgba(248,230,200,0.24));
      }

      22% {
        opacity: calc(var(--opacity) * 0.40);
        transform: scale(0.66);
        filter:
          brightness(1.02)
          drop-shadow(0 0 2px rgba(255,255,255,0.22))
          drop-shadow(0 0 3px rgba(248,230,200,0.12));
      }

      30% {
        opacity: calc(var(--opacity) * 0.72);
        transform: scale(0.92);
        filter:
          brightness(1.34)
          drop-shadow(0 0 3px rgba(255,255,255,0.42))
          drop-shadow(0 0 6px rgba(248,230,200,0.20));
      }

      38% {
  opacity: calc(var(--opacity) * 0.88);
  transform: scale(1.04);
  filter:
    brightness(1.62)
    drop-shadow(0 0 3px rgba(255,255,255,0.56))
    drop-shadow(0 0 6px rgba(248,230,200,0.22))
    drop-shadow(0 0 9px rgba(255,247,236,0.08));
}

      46% {
        opacity: calc(var(--opacity) * 0.48);
        transform: scale(0.68);
        filter:
          brightness(1.00)
          drop-shadow(0 0 2px rgba(255,255,255,0.22))
          drop-shadow(0 0 4px rgba(248,230,200,0.12));
      }

      56% {
        opacity: calc(var(--opacity) * 0.76);
        transform: scale(0.94);
        filter:
          brightness(1.42)
          drop-shadow(0 0 4px rgba(255,255,255,0.50))
          drop-shadow(0 0 7px rgba(248,230,200,0.22));
      }

      64% {
        opacity: calc(var(--opacity) * 0.34);
        transform: scale(0.60);
        filter:
          brightness(0.98)
          drop-shadow(0 0 2px rgba(255,255,255,0.18))
          drop-shadow(0 0 3px rgba(248,230,200,0.10));
      }

      74% {
        opacity: calc(var(--opacity) * 0.68);
        transform: scale(0.88);
        filter:
          brightness(1.30)
          drop-shadow(0 0 3px rgba(255,255,255,0.44))
          drop-shadow(0 0 6px rgba(248,230,200,0.20));
      }

    82% {
  opacity: calc(var(--opacity) * 0.78);
  transform: scale(0.96);
  filter:
    brightness(1.48)
    drop-shadow(0 0 3px rgba(255,255,255,0.50))
    drop-shadow(0 0 5px rgba(248,230,200,0.18));
}

      90% {
        opacity: calc(var(--opacity) * 0.46);
        transform: scale(0.66);
        filter:
          brightness(1.00)
          drop-shadow(0 0 2px rgba(255,255,255,0.22))
          drop-shadow(0 0 4px rgba(248,230,200,0.12));
      }

      100% {
        opacity: calc(var(--opacity) * 0.22);
        transform: scale(0.50);
        filter:
          brightness(0.95)
          drop-shadow(0 0 1px rgba(255,255,255,0.18))
          drop-shadow(0 0 2px rgba(248,230,200,0.10));
      }
    }
  `;
  document.head.appendChild(style);

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  const tones = [
    "#fffdf8",
    "#fff9f1",
    "#fff6eb",
    "#fdf3e5",
    "#fffaf4"
  ];

  function makeSparkleSVG(color, variant) {
    // 4-point sparkle
    if (variant === 1) {
      return `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <g fill="none" stroke="${color}" stroke-linecap="round">
            <path d="M50 10 L50 90" stroke-width="4.6" opacity="0.98"/>
            <path d="M10 50 L90 50" stroke-width="4.6" opacity="0.98"/>
            <path d="M50 28 L50 72" stroke-width="1.4" opacity="0.36"/>
            <path d="M28 50 L72 50" stroke-width="1.4" opacity="0.36"/>
          </g>
          <path d="M50 44 L56 50 L50 56 L44 50 Z" fill="${color}" opacity="0.88"/>
        </svg>
      `;
    }

    // 6/8-point soft star sparkle
    if (variant === 2) {
      return `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <g fill="none" stroke="${color}" stroke-linecap="round">
            <path d="M50 12 L50 88" stroke-width="4.0" opacity="0.96"/>
            <path d="M12 50 L88 50" stroke-width="4.0" opacity="0.96"/>
            <path d="M24 24 L76 76" stroke-width="2.0" opacity="0.48"/>
            <path d="M76 24 L24 76" stroke-width="2.0" opacity="0.48"/>
          </g>
          <circle cx="50" cy="50" r="2.6" fill="${color}" opacity="0.82"/>
        </svg>
      `;
    }

    // slim jewel star
    return `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g fill="none" stroke="${color}" stroke-linecap="round">
          <path d="M50 14 L50 86" stroke-width="3.8" opacity="0.98"/>
          <path d="M14 50 L86 50" stroke-width="3.8" opacity="0.98"/>
          <path d="M31 31 L69 69" stroke-width="1.3" opacity="0.24"/>
          <path d="M69 31 L31 69" stroke-width="1.3" opacity="0.24"/>
        </g>
        <path d="M50 40 L60 50 L50 60 L40 50 Z" fill="${color}" opacity="0.78"/>
      </svg>
    `;
  }

  function createSparkles() {
    layer.innerHTML = "";

    const count = window.innerWidth < 420 ? 30 : 42;

    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "lux-star";

      const inner = document.createElement("span");
      inner.className = "lux-star__inner";

      const depth = Math.random();
      let size, opacity, fall, twinkle, sway;

      if (depth > 0.75) {
  size = rand(6.5, 9.2);
  opacity = rand(0.52, 0.72);
  fall = rand(8.5, 12.5);
  twinkle = rand(1.8, 2.8);
  sway = rand(-28, 28);
} else if (depth > 0.38) {
  size = rand(4.6, 6.8);
  opacity = rand(0.34, 0.54);
  fall = rand(11, 16);
  twinkle = rand(2.3, 3.6);
  sway = rand(-24, 24);
} else {
  size = rand(3.0, 4.6);
  opacity = rand(0.18, 0.32);
  fall = rand(14, 20);
  twinkle = rand(3.0, 4.4);
  sway = rand(-20, 20);
}

      const color = pick(tones);
      const variant = Math.floor(rand(0, 3));

      el.style.setProperty("--x", `${rand(-6, 106)}vw`);
      el.style.setProperty("--size", `${size}px`);
      el.style.setProperty("--opacity", opacity);
      el.style.setProperty("--fall", `${fall}s`);
      el.style.setProperty("--twinkle", `${twinkle}s`);
      el.style.setProperty("--delay", `${rand(-fall, 0)}s`);
      el.style.setProperty("--sway", `${sway}px`);
      el.style.setProperty("--r", `${rand(0, 28)}deg`);

      inner.innerHTML = makeSparkleSVG(color, variant);
      el.appendChild(inner);
      layer.appendChild(el);
    }
  }

  createSparkles();

  let resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(createSparkles, 250);
  });
})();

  /* ── Init ── */
  async function init() {
    initMeta();
    initCurtain();
    initHero();
    initCountdown();
    initGreeting();
    initCalendar();
    initLocation();
    initAccount();

    setTimeout(initScrollAnimations, 200);

    await initStory();
    await initGallery();
    initGallerySlider();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ======================================================
   OUR DAY COUNTDOWN — reference-style wedding countdown
   ====================================================== */
(function () {
  'use strict';

  function setupOurDayCountdown() {
    const countdown = document.getElementById('countdown');
    const calendar = document.getElementById('calendar');
    if (!countdown || !calendar || typeof CONFIG === 'undefined') return;

    countdown.classList.add('our-day-countdown');
    countdown.classList.remove('countdown--calendar');

    // 위쪽 캘린더 구분선과 완전히 같은 구조의 선을 캘린더 내부 하단에 추가
    let lowerDivider = calendar.querySelector('.our-day-divider');
    if (!lowerDivider) {
      lowerDivider = document.createElement('div');
      lowerDivider.className = 'calendar__line our-day-divider';
      calendar.append(lowerDivider);
    }

    // 캘린더 바로 아래 배치
    calendar.insertAdjacentElement('afterend', countdown);

    // 위쪽 캘린더 구분선의 실제 렌더링 폭만 읽어 동일하게 적용
    function syncDividerWidth() {
      const calendarLine = calendar.querySelector('.calendar__line');
      if (!calendarLine) return;
      const width = calendarLine.getBoundingClientRect().width;
      if (width > 0) countdown.style.setProperty('--our-day-divider-width', `${width}px`);
    }
    requestAnimationFrame(syncDividerWidth);
    window.addEventListener('resize', syncDividerWidth);

    // 기존 자동 생성 헤드라인 제거
    const oldHeadline = countdown.querySelector('.countdown__headline');
    if (oldHeadline) oldHeadline.remove();

    if (!countdown.querySelector('.our-day-countdown__header')) {
      const header = document.createElement('div');
      header.className = 'our-day-countdown__header';
      header.innerHTML = `
        <img class="our-day-countdown__swan" src="swan-divider.png" alt="백조 장식" />
        <p class="our-day-countdown__eyebrow">OUR DAY</p>
      `;
      countdown.prepend(header);
    }

    if (!countdown.querySelector('.our-day-countdown__message')) {
      const message = document.createElement('p');
      message.className = 'our-day-countdown__message';
      message.innerHTML = `
        <span>${CONFIG.groom.name}</span>
        <span class="our-day-countdown__dot" aria-hidden="true">·</span>
        <span>${CONFIG.bride.name}</span>의 결혼식이
        <strong id="our-day-days-text">0일</strong> 남았습니다.
      `;
      countdown.append(message);
    }

    const target = new Date(`${CONFIG.wedding.date}T${CONFIG.wedding.time}:00`).getTime();
    const dayText = document.getElementById('our-day-days-text');

    function refreshDayText() {
      const diff = Math.max(0, target - Date.now());
      const days = Math.floor(diff / 86400000);
      if (dayText) dayText.textContent = `${days}일`;
    }

    refreshDayText();
    window.setInterval(refreshDayText, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupOurDayCountdown);
  } else {
    setupOurDayCountdown();
  }
})();
