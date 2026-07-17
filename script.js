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
/* ── Calendar v-FINAL — 레퍼런스(빈티지 사진 위 캘린더) 스타일 ──
   images/calendar/1.jpg(또는 png)을 넣으면 그 사진이 흐릿하게 배경으로
   깔리고, 없으면 히어로 사진을 대신 사용합니다. 캘린더 아래에는
   "D - 일:시:분:초" 실시간 카운트다운과 UNTIL THE WEDDING 문구가
   함께 표시됩니다. */
async function initCalendar() {
  const el = $('#calendar');
  if (!el) return;

  const [y, m, d] = CONFIG.wedding.date.split('-').map(Number);
  const [hh, mm] = CONFIG.wedding.time.split(':').map(Number);

  const lastDay = new Date(y, m, 0).getDate();
  const startDow = new Date(y, m - 1, 1).getDay();

  const ampm = hh < 12 ? '오전' : '오후';
  const h12 = hh % 12 || 12;
  const timeText = `${CONFIG.wedding.dayOfWeek} ${ampm} ${h12}시${mm ? ' ' + mm + '분' : ''}`;

  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<span class="wcal__day is-empty"></span>';
  for (let day = 1; day <= lastDay; day++) {
    const dow = new Date(y, m - 1, day).getDay();
    const isSun = dow === 0 ? ' is-sun' : '';
    const isWed = day === d ? ' is-wedding' : '';
    cells += `<span class="wcal__day${isSun}${isWed}">${day}</span>`;
  }

  el.innerHTML = `
    <div class="wcal">
      <div class="wcal__summary">
        <p class="wcal__date">${y}. ${String(m).padStart(2,'0')}. ${String(d).padStart(2,'0')}</p>
        <p class="wcal__sub">${timeText}</p>
      </div>
      <div class="wcal__weekdays">
        <span class="is-sun">S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
      </div>
      <div class="wcal__grid">${cells}</div>
    </div>
    <div class="wtimer" id="wtimer" aria-label="결혼식까지 남은 시간">
      <span class="wtimer__u"><b id="wt-d">0</b><i>DAYS</i></span>
      <em class="wtimer__s">:</em>
      <span class="wtimer__u"><b id="wt-h">0</b><i>HRS</i></span>
      <em class="wtimer__s">:</em>
      <span class="wtimer__u"><b id="wt-m">0</b><i>MIN</i></span>
      <em class="wtimer__s">:</em>
      <span class="wtimer__u"><b id="wt-s">0</b><i>SEC</i></span>
    </div>
    <div class="wcount" id="wcount"></div>
  `;

  // ── 디데이: 슬림 타이머(일:시:분:초) + "결혼식까지 N일" 알약 ──
  const target = new Date(y, m - 1, d, hh, mm, 0).getTime();
  const wcountEl = document.getElementById('wcount');
  const tD = document.getElementById('wt-d');
  const tH = document.getElementById('wt-h');
  const tM = document.getElementById('wt-m');
  const tS = document.getElementById('wt-s');
  function tickDday() {
    let diff = target - Date.now();
    if (diff < 0) diff = 0;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff / 3600000) % 24);
    const minutes = Math.floor((diff / 60000) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    if (tD) tD.textContent = days;
    if (tH) tH.textContent = String(hours).padStart(2, '0');
    if (tM) tM.textContent = String(minutes).padStart(2, '0');
    if (tS) tS.textContent = String(seconds).padStart(2, '0');
    if (wcountEl) {
      let text;
      if (days > 0) text = `결혼식까지 ${days}일 남았습니다`;
      else if (diff > 0) text = '결혼식이 곧 시작됩니다';
      else if (diff === 0 || (Date.now() - target) < 86400000) text = '오늘, 저희 결혼합니다';
      else text = '함께해 주셔서 감사합니다';
      wcountEl.setAttribute('data-dday-text', text);
    }
  }
  tickDday();
  setInterval(tickDday, 1000);
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
  /* ── (구) 우리의 이야기 — 섹션 제거로 삭제되었습니다 ── */


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

  /* ── Footer: 나비 사진 겹침 효과 ──
     images/footer/ 폴더에 사진을 넣으면 자동 인식합니다. 파일명은
     1, 2, 3... 이든 0, 1, 2...(0부터 시작)든, 00, 01, 02...(두 자리
     앞자리 0)든 상관없이 인식되도록, 0~99번 인덱스를 0/00 형태로
     모두 시도합니다. 사용자가 보내준 실제 사진들을 은은하게 겹쳐
     크로스페이드시켜, 나비가 날갯짓하듯 움직이는 느낌을 만듭니다.
     사진 장수에 따라 한 바퀴 도는 시간을 자동으로 조절합니다. */
  function loadFooterButterflyImages() {
    return new Promise((resolve) => {
      const found = [];
      const extensions = ['jpg', 'png', 'jpeg', 'webp'];
      const MAX_INDEX = 99;
      let index = 0;
      let consecutiveFails = 0;

      function candidateNames(i) {
        // 00~09처럼 앞자리 0을 붙인 두 자리 표기와, 0/1/2처럼 그냥 숫자 표기를 모두 시도
        const plain = String(i);
        const padded = String(i).padStart(2, '0');
        return padded === plain ? [plain] : [padded, plain];
      }

      function tryIndex(i, nameIdx, extIdx) {
        if (i > MAX_INDEX || consecutiveFails >= 4) {
          resolve(found);
          return;
        }
        const names = candidateNames(i);
        if (nameIdx >= names.length) {
          // 이 인덱스의 이름 후보를 모두 못 찾음 → 다음 인덱스로
          consecutiveFails += 1;
          tryIndex(i + 1, 0, 0);
          return;
        }
        if (extIdx >= extensions.length) {
          tryIndex(i, nameIdx + 1, 0);
          return;
        }
        const path = `images/footer/${names[nameIdx]}.${extensions[extIdx]}`;
        const img = new Image();
        img.onload = () => {
          found.push(path);
          consecutiveFails = 0;
          tryIndex(i + 1, 0, 0);
        };
        img.onerror = () => {
          tryIndex(i, nameIdx, extIdx + 1);
        };
        img.src = path;
      }

      tryIndex(0, 0, 0);
    });
  }

  async function initFooterButterflies() {
    const stack = document.getElementById('footer-wine-frames');
    const stage = document.getElementById('bf-stage');
    if (!stack) return;

    // 나비 프레임: images/footer/00.png ~ 20.png (21장)
    const N = 21;
    const first = await imageExists('images/footer/00.png');
    if (!first) {
      if (stage) stage.style.display = 'none';
      return;
    }

    const imgs = [];
    for (let i = 0; i < N; i++) {
      const n = ('0' + i).slice(-2);
      const im = new Image();
      im.src = `images/footer/${n}.png`;
      im.alt = '';
      im.draggable = false;
      im.decoding = 'async';
      stack.appendChild(im);
      imgs.push(im);
    }

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || imgs.length < 2) {
      // 모션 최소화: 가운데 프레임 한 장만 정지 표시
      const mid = imgs[Math.floor(imgs.length / 2)];
      if (mid) mid.style.opacity = '1';
      return;
    }

    /* 가우시안 스윕 크로스페이드 — 인접 프레임들이 종 모양 가중치로
       겹쳐지며 물 흐르듯 이어지는 날갯짓 (위젯 원본 로직) */
    const LO = 0, HI = N - 1, range = HI - LO + 1;
    const sigma = 0.72, speed = 0.0022;
    let pos = 0, last = performance.now();

    function tick(now) {
      const dt = now - last; last = now;
      pos = (pos + speed * dt) % range;
      const center = LO + pos;
      for (let k = 0; k < imgs.length; k++) {
        let d = k - center;
        if (d > range / 2) d -= range;
        if (d < -range / 2) d += range;
        const op = Math.exp(-(d * d) / (2 * sigma * sigma));
        imgs[k].style.opacity = op < 0.01 ? '0' : op.toFixed(3);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

 function initGallerySlider() {
  const gallery = document.querySelector('#gallery-grid');
  if (!gallery || !galleryImages.length) return;

  const N = galleryImages.length;
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 진짜 필름처럼 "끊김 없이 물 흐르듯" 연속으로 흘러가게 하기 위해,
  // 사진 세트를 여러 번 이어 붙이고 한 세트 폭만큼 지나가면 살짝 되감아
  // 이음매가 보이지 않게 순환합니다. (스텝 단위 점프가 없어 뚝 끊기지 않음)
  const COPIES = Math.max(3, Math.ceil(10 / N) + 1);
  const seq = [];
  for (let c = 0; c < COPIES; c++) {
    for (let i = 0; i < N; i++) seq.push(i);
  }

  // 실제 35mm 필름 가장자리 인쇄처럼, 각 프레임 위/아래에 필름 마킹을 넣습니다.
  // 상단: 프레임 번호(13A 스타일)와 필름 브랜드가 번갈아,
  // 하단: 앰버색 세 자리 코드(004-400 스타일)와 필름 특유의 삼각 마크(◄).
  // 일부 하단 마킹은 실제 필름처럼 180도 뒤집혀 인쇄됩니다.
  const BRAND = '1017 Film';
  const STOCK = '400';
  const seqHtml = seq.map((real, k) => {
    const num3 = String(real + 1).padStart(3, '0');            // 004 스타일
    const topCode = `${real + 1}${k % 2 ? 'A' : ''}`;          // 13A 스타일
    const top = (k % 3 === 1) ? BRAND : topCode;               // 코드/브랜드 번갈아
    const flipBot = (k % 3 === 2);                             // 세 프레임마다 한 번 뒤집힘
    const botCore = (k % 2 === 0)
      ? `${num3}-${STOCK} <i class="gallery__tri" aria-hidden="true"></i>`
      : `<i class="gallery__tri" aria-hidden="true"></i> ${num3}`;
    const bot = botCore;
    return `
      <div class="gallery__frame" data-real="${real}">
        <span class="gallery__mark gallery__mark--top">${top}</span>
        <div class="gallery__shot">
          <img src="${galleryImages[real]}" alt="갤러리 사진 ${real + 1}" loading="lazy" decoding="async" draggable="false" />
        </div>
        <span class="gallery__mark gallery__mark--bot${flipBot ? ' is-flipped' : ''}">${bot}</span>
      </div>`;
  }).join('');

  gallery.innerHTML = `
    <div class="gallery__film" aria-label="갤러리 필름">
      <div class="gallery__track">
        ${seqHtml}
      </div>
    </div>
  `;

  const film = gallery.querySelector('.gallery__film');
  const track = gallery.querySelector('.gallery__track');
  const frames = Array.from(track.children);

  const SPEED = 27;            // px/초 — 잔잔하게 흐르는 속도
  let x = 0;                   // 현재 트랙 위치(px)
  let setWidth = 0;            // 사진 한 세트의 폭(px) — 되감기 기준
  let rafId = null;
  let lastT = null;
  let inView = true;
  let paused = false;          // 라이트박스 열림 등으로 일시정지

  function frameStep() {
    const f = frames[0];
    if (!f) return 0;
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0') || 0;
    return f.getBoundingClientRect().width + gap;
  }

  function measure() {
    setWidth = frameStep() * N;   // 한 세트 폭
    wrap();
    apply();
  }

  function wrap() {
    if (setWidth <= 0) return;
    // x는 항상 (-setWidth, 0] 범위 안에 있도록 유지 → 이음매 없이 순환
    while (x <= -setWidth) x += setWidth;
    while (x > 0) x -= setWidth;
  }

  function apply() {
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  function tick(t) {
    if (lastT == null) lastT = t;
    const dt = Math.min(0.05, (t - lastT) / 1000); // 탭 전환 후 큰 점프 방지
    lastT = t;
    if (!paused && !dragging && inView && !prefersReduced) {
      x -= SPEED * dt;
      wrap();
      apply();
    }
    rafId = requestAnimationFrame(tick);
  }

  /* ── 손가락을 그대로 따라오는 드래그(스크럽) ── */
  let dragging = false, decided = false, horizontal = false;
  let sx = 0, sy = 0, startX = 0, moved = false;

  function down(px, py) {
    dragging = true; decided = false; horizontal = false; moved = false;
    sx = px; sy = py;
    startX = x;
  }
  function moveHandler(px, py, ev) {
    if (!dragging) return;
    const dx = px - sx, dy = py - sy;
    if (!decided) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      horizontal = Math.abs(dx) > Math.abs(dy);
      decided = true;
      if (!horizontal) { dragging = false; return; } // 세로 → 페이지 스크롤 양보
    }
    if (Math.abs(dx) > 4) moved = true;
    if (horizontal && ev && ev.cancelable) ev.preventDefault();
    x = startX + dx;
    wrap();
    apply();
  }
  function up() {
    if (!dragging) return;
    dragging = false;
    lastT = null; // 이어서 연속 흐름 재개 시 dt 튐 방지
  }

  film.addEventListener('touchstart', (e) => { if (e.touches[0]) down(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  film.addEventListener('touchmove', (e) => { if (e.touches[0]) moveHandler(e.touches[0].clientX, e.touches[0].clientY, e); }, { passive: false });
  film.addEventListener('touchend', up);
  film.addEventListener('touchcancel', up);
  film.addEventListener('mousedown', (e) => { down(e.clientX, e.clientY); e.preventDefault(); });
  window.addEventListener('mousemove', (e) => { if (dragging) moveHandler(e.clientX, e.clientY, e); });
  window.addEventListener('mouseup', up);

  // 탭(드래그 아님) → 확대 보기
  film.addEventListener('click', (e) => {
    if (moved) return; // 스와이프였으면 무시
    const frame = e.target.closest('.gallery__frame');
    if (frame && typeof window.__openGalleryViewer === 'function') {
      window.__openGalleryViewer(Number(frame.dataset.real) || 0);
    }
  });

  // 라이트박스가 열려 있으면 흐름 정지
  function syncPaused() {
    const v = document.getElementById('viewer');
    paused = !!(v && v.classList.contains('is-active'));
  }
  document.addEventListener('click', syncPaused, true);
  window.addEventListener('gallery:viewer', syncPaused);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((en) => { inView = en.isIntersecting; });
    }, { threshold: 0.05 }).observe(film);
  }

  window.addEventListener('resize', measure, { passive: true });

  // 이미지 로드 후 정확히 재측정
  const imgs = Array.from(track.querySelectorAll('img'));
  Promise.all(imgs.map((im) => (im.complete && im.naturalWidth)
    ? Promise.resolve()
    : new Promise((r) => { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); })
  )).then(measure);

  measure();
  rafId = requestAnimationFrame(tick);
}

/* ── 사진 확대 보기 (라이트박스) ── */
function initViewer() {
  const viewer = document.getElementById('viewer');
  const track = document.getElementById('viewer-track');
  const closeBtn = document.getElementById('viewer-close');
  const counter = document.getElementById('viewer-counter');
  const prevBtn = document.getElementById('viewer-prev');
  const nextBtn = document.getElementById('viewer-next');
  if (!viewer || !track) return;

  let built = false;
  let index = 0;
  let width = 0;

  function build() {
    if (built || !galleryImages.length) return;
    built = true;
    track.innerHTML = galleryImages
      .map((src) => `<div class="viewer__slide"><img src="${src}" alt="" draggable="false" /></div>`)
      .join('');
  }

  function setX(x, animate) {
    track.style.transition = animate ? 'transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none';
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  function snap(animate) {
    width = viewer.clientWidth || window.innerWidth;
    setX(-index * width, animate);
    if (counter) counter.textContent = `${index + 1} / ${galleryImages.length}`;
  }

  let openedAt = 0;

  function open(startIndex) {
    build();
    if (!built) return;
    index = Math.max(0, Math.min(galleryImages.length - 1, startIndex || 0));
    openedAt = Date.now();
    viewer.classList.add('is-active');
    viewer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    snap(false);
  }

  function close() {
    // 갤러리 탭 직후 따라오는 고스트 클릭이 뷰어를 곧바로 닫는 것 방지
    if (Date.now() - openedAt < 500) return;
    viewer.classList.remove('is-active');
    viewer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function go(dir) {
    index = (index + dir + galleryImages.length) % galleryImages.length;
    snap(true);
  }

  window.__openGalleryViewer = open;

  if (closeBtn) closeBtn.addEventListener('click', close);
  const backdrop = viewer.querySelector('.viewer__backdrop');
  if (backdrop) backdrop.addEventListener('click', close);
  if (prevBtn) prevBtn.addEventListener('click', () => go(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => go(1));
  document.addEventListener('keydown', (e) => {
    if (!viewer.classList.contains('is-active')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  });

  // 확대 화면에서도 손가락 스와이프로 넘기기
  let startX = 0, startY = 0, lastX = 0, dragging = false, horizontal = false, decided = false;
  track.addEventListener('touchstart', (e) => {
    if (!e.touches[0]) return;
    dragging = true; decided = false; horizontal = false;
    startX = lastX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    track.style.transition = 'none';
  }, { passive: true });
  track.addEventListener('touchmove', (e) => {
    if (!dragging || !e.touches[0]) return;
    const x = e.touches[0].clientX;
    const dx = x - startX;
    const dy = e.touches[0].clientY - startY;
    if (!decided) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      horizontal = Math.abs(dx) > Math.abs(dy);
      decided = true;
    }
    if (!horizontal) return;
    if (e.cancelable) e.preventDefault();
    lastX = x;
    setX(-index * width + dx, false);
  }, { passive: false });
  track.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    if (!horizontal) { snap(false); return; }
    const dx = lastX - startX;
    if (Math.abs(dx) > width * 0.15) go(dx < 0 ? 1 : -1);
    else snap(true);
  });

  window.addEventListener('resize', () => {
    if (viewer.classList.contains('is-active')) snap(false);
  }, { passive: true });

  // 확대 화면에서는 더 이상 확대되지 않도록 잠급니다 (핀치/더블탭 차단)
  viewer.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1 && e.cancelable) e.preventDefault();
  }, { passive: false });
  viewer.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1 && e.cancelable) e.preventDefault();
  }, { passive: false });
  let lastTapAt = 0;
  viewer.addEventListener('touchend', (e) => {
    if (e.target.closest('button')) return; // 닫기/이전/다음 버튼은 그대로
    const now = Date.now();
    if (now - lastTapAt < 320 && e.cancelable) e.preventDefault(); // 더블탭 확대 방지
    lastTapAt = now;
  });
  document.addEventListener('gesturestart', (e) => {
    if (viewer.classList.contains('is-active')) e.preventDefault();
  });
}

/* ── OUR STORY: 우편엽서 미니멀 타임라인 ──
   편지: images/letters/1.jpg(상빈→현준), 2.jpg(현준→상빈)
   봉투 속 사진: images/story/1.* 이 있으면 그 사진, 없으면 히어로 사진 */
async function initStoryPost() {
  const section = document.getElementById('letter');
  if (!section) return;

  // 스크롤로 들어올 때 액자가 부드럽게 올라오며 나타나는 모션
  const frames = section.querySelectorAll('[data-reveal]');
  if (!frames.length) return;

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    frames.forEach((f) => io.observe(f));
  } else {
    frames.forEach((f) => f.classList.add('is-in'));
  }

  // 액자 이미지가 없으면 그 항목만 조용히 숨깁니다.
  section.querySelectorAll('.storyframe__img img').forEach((img) => {
    img.addEventListener('error', () => {
      const fig = img.closest('.storyframe');
      if (fig) fig.style.display = 'none';
    }, { once: true });
  });
}


  /* ── Location ── */
  function initLocation() {
    const w = CONFIG.wedding;
    const venue = $('#loc-venue');
    const hall = $('#loc-hall');
    const addr = $('#loc-address');
    const tel = $('#loc-tel');

    // 예식장 이름과 홀을 한 줄로, 주소/연락처는 표시하지 않음
    if (venue) venue.textContent = `${w.venue} ${w.hall}`;
    if (hall) hall.style.display = 'none';
    if (addr) addr.style.display = 'none';
    if (tel) tel.style.display = 'none';

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

    initMap();
    initTransport();
    initShareButtons();
  }

  /* ── 최하단 공유 버튼 (주소 복사 · 카카오톡 공유) ── */
  function initShareButtons() {
    const copyBtn = document.getElementById('btn-copy-address-bottom');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        copyToClipboard(CONFIG.wedding.address, '주소가 복사되었습니다');
      });
    }

    const kakaoBtn = document.getElementById('btn-kakao-share');
    if (!kakaoBtn) return;

    // 카카오톡 인앱 브라우저 등 일부 임베디드 브라우저는 navigator.share /
    // Clipboard API 자체를 차단하거나 조용히 실패시킵니다. 어떤 경로가 실패하든
    // 사용자에게는 절대 날것의 오류가 아니라 "링크가 복사되었습니다" 류의
    // 안내만 보이도록 전체를 방어적으로 감쌌습니다.
    kakaoBtn.addEventListener('click', () => {
      let shareData;
      try {
        shareData = {
          title: (CONFIG.kakaoShare && CONFIG.kakaoShare.title) || (CONFIG.meta && CONFIG.meta.title) || document.title,
          text: (CONFIG.kakaoShare && CONFIG.kakaoShare.description) || (CONFIG.meta && CONFIG.meta.description) || '',
          url: window.location.href.split('#')[0]
        };
      } catch (e) {
        shareData = { title: document.title, text: '', url: window.location.href.split('#')[0] };
      }

      function doClipboardFallback() {
        copyToClipboard(shareData.url, '청첩장 링크가 복사되었습니다. 카카오톡에 붙여넣어 주세요.');
      }

      // 1순위: 카카오 SDK (config.js에 appKey를 넣으면 카카오톡 공유창이 바로 열립니다)
      try {
        if (window.Kakao && CONFIG.kakaoShare && CONFIG.kakaoShare.appKey) {
          if (!Kakao.isInitialized()) Kakao.init(CONFIG.kakaoShare.appKey);
          Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
              title: shareData.title,
              description: shareData.text,
              imageUrl: new URL('images/og/1.png', window.location.href).href,
              link: { mobileWebUrl: shareData.url, webUrl: shareData.url }
            },
            buttons: [{
              title: '청첩장 보기',
              link: { mobileWebUrl: shareData.url, webUrl: shareData.url }
            }]
          });
          return;
        }
      } catch (e) { /* 아래 공유 시트/복사로 폴백 */ }

      // 2순위: 휴대폰 기본 공유 시트 (카카오톡 선택 가능)
      // navigator.share가 존재해도 인앱 브라우저에서 즉시 reject 되는 경우가 있어
      // 반드시 .catch로 받아 항상 클립보드 복사로 자연스럽게 이어지도록 합니다.
      try {
        if (navigator.share) {
          navigator.share(shareData).catch((e) => {
            if (e && e.name === 'AbortError') return; // 사용자가 공유 시트를 직접 취소
            doClipboardFallback();
          });
          return;
        }
      } catch (e) { /* 아래 복사로 폴백 */ }

      // 3순위: 링크 복사
      doClipboardFallback();
    });
  }

  /* ── 지도: 네이버 지도 우선 시도 → 실패 시 자동으로 구글 지도 임베드로 전환 ──
     네이버 Open API는 콘솔 등록이 안 맞으면 화면에 "인증이 실패했습니다"라는
     보기 안좋은 에러 패널을 그대로 노출합니다. 이를 막기 위해
     1) window.navermap_authFailure 콜백(네이버 공식 훅)을 미리 등록해 인증 실패를
        조용히 감지하고, 2) 스크립트 자체가 로드되지 않거나 3초 안에 정상
        렌더링되지 않는 경우까지 포함해 항상 구글 지도 임베드로 자연스럽게
        전환되도록 했습니다. 즉, 네이버 콘솔 설정이 맞으면 네이버 지도가,
        아직 안 맞으면 사용자 눈에 보이지 않게 구글 지도가 대신 뜹니다. */
  function initMap() {
    const wrap = document.getElementById('loc-map-wrap');
    if (!wrap) return;

    // 네이버 지도 키는 config.js의 map.naverClientId에서 읽습니다.
    // 이 키가 네이버 클라우드 콘솔에 "배포된 도메인"과 함께 등록되어 있어야
    // 네이버 지도가 뜨고, 인증이 실패하면 자동으로 구글 지도로 대체됩니다.
    const NAVER_CLIENT_ID = (typeof CONFIG !== 'undefined' && CONFIG.map && CONFIG.map.naverClientId) || '202liu94d4';
    const address = CONFIG.wedding.address || CONFIG.wedding.venue;
    let settled = false;

    // 로딩 중 흰 화면 대신 은은한 안내를 먼저 표시합니다.
    wrap.innerHTML = '<div class="loc-map-loading">지도를 불러오는 중…</div>';

    function showGoogleFallback() {
      if (settled) return;
      settled = true;
      wrap.innerHTML = '';
      const query = encodeURIComponent(CONFIG.wedding.venue || CONFIG.wedding.address);
      const iframe = document.createElement('iframe');
      iframe.className = 'loc-map-frame';
      iframe.setAttribute('title', '나비스퀘어 지도');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
      iframe.src = `https://maps.google.com/maps?q=${query}&z=16&hl=ko&output=embed`;
      wrap.appendChild(iframe);
    }

    function renderNaverMap() {
      if (settled || !window.naver || !window.naver.maps) { showGoogleFallback(); return; }
      try {
        settled = true;
        wrap.innerHTML = '';
        const naver = window.naver;
        // 아산 시청 인근 대략 좌표로 우선 중심을 잡고, 지오코딩 성공 시 정확한 위치로 이동합니다.
        const fallbackCenter = new naver.maps.LatLng(36.7898, 127.0044);
        const map = new naver.maps.Map(wrap, { center: fallbackCenter, zoom: 16 });

        if (naver.maps.Service && address) {
          naver.maps.Service.geocode({ query: address }, function (status, response) {
            if (status !== naver.maps.Service.Status.OK) return;
            const item = response?.v2?.addresses?.[0];
            if (!item) return;
            const point = new naver.maps.LatLng(item.y, item.x);
            map.setCenter(point);
            new naver.maps.Marker({ position: point, map });
          });
        } else {
          new naver.maps.Marker({ position: fallbackCenter, map });
        }
      } catch (e) {
        settled = false;
        showGoogleFallback();
      }
    }

    function loadNaverScript(param) {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        // submodules=geocoder: 주소 → 좌표 변환(Service.geocode)에 필요
        s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?${param}=${NAVER_CLIENT_ID}&submodules=geocoder`;
        s.onload = () => {
          // 인증 실패 시에도 onload는 정상 발생하므로, 실제 지도 객체 존재 여부로 재확인합니다.
          if (window.naver && window.naver.maps && window.naver.maps.Map) resolve();
          else reject(new Error('naver maps not ready'));
        };
        s.onerror = () => reject(new Error('script load failed'));
        document.head.appendChild(s);
      });
    }

    // 신규 콘솔(ncpKeyId) → 구 콘솔(ncpClientId) 순서로 시도합니다.
    // 인증 실패는 스크립트 로드 "이후" 비동기로 통보되므로(navermap_authFailure),
    // 콜백 안에서 남은 파라미터로 한 번 더 재시도한 뒤에야 구글 지도로 전환합니다.
    const paramQueue = ['ncpClientId'];      // ncpKeyId 실패 시 남은 재시도 목록
    let timeout = setTimeout(showGoogleFallback, 4000);

    function tryLoad(param) {
      loadNaverScript(param)
        .then(() => {
          clearTimeout(timeout);
          // 렌더링 후에도 인증 실패 콜백이 올 수 있으므로 여유 타임아웃은 걸지 않습니다.
          renderNaverMap();
        })
        .catch(() => {
          clearTimeout(timeout);
          const next = paramQueue.shift();
          if (next) {
            timeout = setTimeout(showGoogleFallback, 4000);
            tryLoad(next);
          } else {
            showGoogleFallback();
          }
        });
    }

    // 네이버 공식 인증 실패 콜백 — 에러 패널 대신 이 함수가 조용히 호출됩니다.
    window.navermap_authFailure = function () {
      settled = false;
      const next = paramQueue.shift();
      if (next) {
        clearTimeout(timeout);
        wrap.innerHTML = '<div class="loc-map-loading">지도를 불러오는 중…</div>';
        timeout = setTimeout(showGoogleFallback, 4000);
        tryLoad(next);
      } else {
        showGoogleFallback();
      }
    };

    tryLoad('ncpKeyId');
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
      // 줄 성격에 따라 시각적 위계를 다르게 표현합니다.
      //  [ ... ]  → 소제목(살짝 진하게, 위 간격)
      //  ＊ ...   → 각주(작고 옅게)
      //  제 n주차장 → 소제목 아래 들여쓰기 항목
      const lines = (it.lines || [])
        .map((ln) => {
          let cls = 'location-transport__line';
          if (/^\[/.test(ln)) cls += ' is-label';
          else if (/^＊/.test(ln)) cls += ' is-note';
          else if (/^제\s?\d/.test(ln)) cls += ' is-sub';
          return `<p class="${cls}">${ln}</p>`;
        })
        .join('');
      return `
        <div class="location-transport__block">
          <button class="location-transport__toggle" type="button" aria-expanded="false">
            <span class="location-transport__heading">${it.title}</span>
            <svg class="location-transport__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="location-transport__panel">
            <div class="location-transport__panel-inner">${lines}</div>
          </div>
        </div>
      `;
    }).join('');

    wrap.innerHTML = blocks + (data.note
      ? `<p class="location-transport__note">${data.note}</p>`
      : '');

    // 소제목 클릭 → 해당 내용 펼침/접힘
    wrap.querySelectorAll('.location-transport__toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const block = btn.closest('.location-transport__block');
        const open = block.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

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

  /* ── Clipboard ──
     카카오톡 인앱 브라우저 등 일부 임베디드 브라우저는 Clipboard API에
     퍼미션 오류(NotAllowedError)를 던지는 경우가 흔해, execCommand 방식을
     iOS/구형 웹뷰에서도 잘 동작하도록 보강했고, 그마저 실패하면 "실패"라는
     말 대신 주소를 직접 보여줘 사용자가 손으로 복사할 수 있게 합니다. */
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
    ta.setAttribute('readonly', '');
    ta.contentEditable = 'true';
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '-9999px';
    ta.style.fontSize = '16px'; // iOS 자동 확대 방지
    document.body.appendChild(ta);

    let success = false;
    try {
      const range = document.createRange();
      range.selectNodeContents(ta);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      ta.setSelectionRange(0, text.length);
      success = document.execCommand('copy');
      sel.removeAllRanges();
    } catch (e) {
      success = false;
    }
    document.body.removeChild(ta);

    if (success) {
      showToast(toastMsg);
    } else {
      // 복사 자체가 막힌 브라우저 — "실패" 대신 주소를 직접 보여줍니다.
      showToast(`아래 주소를 길게 눌러 복사해 주세요: ${text}`);
    }
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

    await initGallery();
    initGallerySlider();
    initViewer();
    initStoryPost();
    initFooterButterflies();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
