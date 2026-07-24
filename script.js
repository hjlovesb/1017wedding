
/* ============================================
   Romantic Flower - Mobile Wedding Invitation
   script.js
   ============================================ */

(function () {
  'use strict';

  // Always reopen from the intro and the first main scene, never from a restored mid-page scroll.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const resetPageScroll = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  resetPageScroll();
  window.addEventListener('pageshow', resetPageScroll);

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

  const HERO_IMAGE_CANDIDATES = ['images/hero/1.jpg'];
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
    /* og:* 태그는 index.html 에 절대주소로 직접 적어 두었습니다.
       링크 미리보기 크롤러는 JavaScript 를 실행하지 않으므로
       여기서 값을 덮어쓰지 않습니다. */
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
    let opened = false;
    if (typeof window.openAttendModal === 'function') {
      opened = window.openAttendModal() !== false;
    } else {
      const modal = document.getElementById('attendModal');
      if (modal) {
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        opened = true;
      }
    }
    // 팝업이 뜨지 않는 상황(오늘 하루 보지 않기 등)이면 곧바로 본문 모션 시작
    if (!opened) markReady();
  }

  function revealMainBehindIntro() {
    // Mobile browsers often restore the previous scroll position after refresh.
    // Reset twice (before and after paint) so the wine-box hero is always the first main scene.
    resetPageScroll();
    document.body.classList.remove('intro-active');
    document.body.classList.add('intro-revealing');
    document.body.style.overflow = '';
    initPetals();
    requestAnimationFrame(() => {
      resetPageScroll();
      window.dispatchEvent(new CustomEvent('invitation:opened'));
    });
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
    popupTimer = setTimeout(showAttendPopup, 260);
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

    // 예식장 + 홀 이름을 함께 (예: 나비스퀘어 나비홀)
    const venue = $('#hero-venue');
    if (venue) {
      venue.innerHTML = w.hall
        ? `${w.venue} <span class="hero__hall">${w.hall}</span>`
        : w.venue;
    }

    // 최상단 와인박스 안의 "Wedding Day." → 마침표 제거
    const heroSec = document.getElementById('hero');
    if (heroSec) {
      heroSec.querySelectorAll('p, span, h1, h2, h3, small, em, i, b').forEach((el) => {
        if (el.children.length) return;
        const t = (el.textContent || '').trim();
        if (/^wedding\s*day\s*[.·・]?$/i.test(t)) el.textContent = 'Wedding Day';
      });
    }
  }

 

  /* ── Greeting ── */
  /* ── 순차 등장: 소제목 → 첫 틀 → 둘째 틀이 차례로, 은은하게 ──
     섹션이 화면에 들어오면 data-reveal-order 순서대로 지연시켜
     페이드업합니다. Our Beginning의 "소제목 → 현준 틀 → 상빈 틀" 흐름에 씁니다. */
  function initSequentialReveal(section) {
    if (!section) return;
    const title = section.querySelector('.section__title');
    const items = Array.from(section.querySelectorAll('[data-reveal]'));
    if (title) { title.classList.add('seq-reveal'); title.style.setProperty('--seq-delay', '0ms'); }
    items.forEach((el) => {
      const order = Number(el.getAttribute('data-reveal-order')) || 1;
      el.classList.add('seq-reveal');
      el.style.setProperty('--seq-delay', `${150 + order * 340}ms`);
    });

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      if (title) title.classList.add('is-in');
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const showAll = () => {
      if (title) title.classList.add('is-in');
      items.forEach((el) => el.classList.add('is-in'));
    };

    const start = () => {
      if (!('IntersectionObserver' in window)) { showAll(); return; }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            showAll();
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
      io.observe(section);
    };

    whenReady(start);
  }

  /* 인트로(봉투)와 참석 여부 팝업이 모두 닫힌 뒤에 본문 모션을 시작합니다. */
  function whenReady(fn) {
    if (window.__invitationReady) { fn(); return; }
    window.addEventListener('invitation:ready', fn, { once: true });
  }

  function markReady() {
    if (window.__invitationReady) return;
    window.__invitationReady = true;
    window.dispatchEvent(new CustomEvent('invitation:ready'));
  }
  window.__markInvitationReady = markReady;

  // 팝업을 닫으면 그때 본문 모션이 시작됩니다.
  window.addEventListener('rsvp:closed', markReady);
  // 어떤 이유로든 팝업이 뜨지 않으면 안전하게 열어 둡니다.
  setTimeout(markReady, 9000);

  function initGreeting() {
    const title = $('#greeting-title');
    const text = $('#greeting-text');
    const parents = $('#greeting-parents');

    if (title) title.textContent = CONFIG.greeting.title;

    // 시(만요수)와 초대 문구를 나눠서 순차적으로 등장시킵니다.
    const poemEl = $('#greeting-poem');
    const raw = String(CONFIG.greeting.content || '');
    const parts = raw.split(/\n\s*\n\s*\n?/);

    let inviteRaw = raw;
    if (poemEl && parts.length > 1) {
      poemEl.textContent = parts[0].trim();
      inviteRaw = parts.slice(1).join('\n\n').trim();
    }

    const escapeHtml = (s) => String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 초대글을 한 줄씩 나누어, 한 줄 한 줄 차례로 떠오르게 합니다.
    const inviteLines = inviteRaw.split('\n').map((s) => s.trim()).filter(Boolean);
    if (text) {
      if (inviteLines.length > 1) {
        text.innerHTML = inviteLines
          .map((ln, i) => {
            const order = (3.4 + i * 0.95).toFixed(2);
            return `<span class="gline" data-reveal data-reveal-order="${order}">${escapeHtml(ln)}</span>`;
          })
          .join('');
        text.classList.add('greeting__text--lines');
      } else {
        text.textContent = inviteRaw;
        text.setAttribute('data-reveal', '');
        text.setAttribute('data-reveal-order', '4');
      }
    }

    // 장미 → 시 → 초대문구(한 줄씩) 순으로 은은하게
    const rose = document.querySelector('.greeting__rose');
    if (rose) { rose.setAttribute('data-reveal',''); rose.setAttribute('data-reveal-order','1'); }
    if (poemEl) { poemEl.setAttribute('data-reveal',''); poemEl.setAttribute('data-reveal-order','2'); }
    initSequentialReveal(document.getElementById('greeting'));

    if (parents) {
      const g = CONFIG.groom;
      const b = CONFIG.bride;

      const makeName = (cfg, isDeceased) => {
        return isDeceased
          ? `<span class="deceased">${cfg}</span>`
          : cfg;
      };

      parents.innerHTML = `
        <div class="obeg" data-reveal data-reveal-order="1">
          <p class="obeg__parents">${makeName(g.father, g.fatherDeceased)} &middot; ${makeName(g.mother, g.motherDeceased)} <em>의 아들</em></p>
          <p class="obeg__name">${g.fullName || g.name}</p>
          <p class="obeg__en">${g.nameEn || ''}</p>
        </div>
        <span class="obeg__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path class="obeg__spark obeg__spark--main"
                  d="M12 0.6 C12.5 7.2 16.8 11.5 23.4 12 C16.8 12.5 12.5 16.8 12 23.4 C11.5 16.8 7.2 12.5 0.6 12 C7.2 11.5 11.5 7.2 12 0.6 Z"
                  fill="currentColor" />
            <path class="obeg__spark obeg__spark--sub"
                  d="M12 6.6 C12.25 9.7 14.3 11.75 17.4 12 C14.3 12.25 12.25 14.3 12 17.4 C11.75 14.3 9.7 12.25 6.6 12 C9.7 11.75 11.75 9.7 12 6.6 Z"
                  fill="currentColor" />
          </svg>
        </span>
        <div class="obeg" data-reveal data-reveal-order="2">
          <p class="obeg__parents">${makeName(b.father, b.fatherDeceased)} &middot; ${makeName(b.mother, b.motherDeceased)} <em>의 딸</em></p>
          <p class="obeg__name">${b.fullName || b.name}</p>
          <p class="obeg__en">${b.nameEn || ''}</p>
        </div>
      `;
      initSequentialReveal(parents.closest('section'));
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
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dowEn = DAYS[new Date(y, m - 1, d).getDay()];

  // 1~말일을 9개씩 한 줄로 (레퍼런스 스타일)
  // 요일에 맞춘 7열 배치 — 17일(토)이 맨 오른쪽 열에 놓입니다
  const firstDow = new Date(y, m - 1, 1).getDay();   // 0=일요일

  let cells = '';
  for (let i = 0; i < firstDow; i++) cells += '<span class="dcal__day is-blank"></span>';
  for (let day = 1; day <= lastDay; day++) {
    const dow = (firstDow + day - 1) % 7;
    const cls = (day === d ? ' is-wedding' : '') + (dow === 0 ? ' is-sun' : '');
    cells += `<span class="dcal__day${cls}">${day}</span>`;
  }

  el.innerHTML = `
    <div class="dcal">
      <div class="dcal__photo" id="dcal-photo">
        <img id="dcal-photo-img" src="" alt="웨딩 사진" loading="lazy" decoding="async" draggable="false" />
      </div>
      <p class="dcal__month script-font" aria-hidden="true">${MONTHS[m - 1]}</p>
      <div class="dcal__grid">${cells}</div>
      <p class="dcal__dateline">${dowEn}, ${MONTHS[m - 1]} ${d}, ${y}</p>
      <p class="dcal__dday">결혼식까지 <b id="dcal-days">0</b>일 남았습니다</p>
    </div>
  `;

  // 사진: images/calendar/1.* 자동 감지, 없으면 사진 영역 숨김
  let photoReady = Promise.resolve();
  const photoImg = document.getElementById('dcal-photo-img');
  if (photoImg) {
    const src = await resolveFirstImage([
      'images/calendar/1.jpg'
    ]);
    photoImg.src = src;
    photoImg.addEventListener('error', () => {
      const box = document.getElementById('dcal-photo');
      if (box) box.style.display = 'none';
    }, { once: true });

    // 이미지가 완전히 그려진 뒤에 등장시켜야 뚝 끊기지 않습니다
    photoReady = (photoImg.complete && photoImg.naturalWidth)
      ? Promise.resolve()
      : new Promise((res) => {
          photoImg.addEventListener('load', () => {
            if (photoImg.decode) { photoImg.decode().then(res).catch(res); } else { res(); }
          }, { once: true });
          photoImg.addEventListener('error', res, { once: true });
          setTimeout(res, 2500);
        });
  }

  // 남은 일수
  const target = new Date(y, m - 1, d, hh, mm, 0).getTime();
  const daysEl = document.getElementById('dcal-days');
  function tickDday() {
    if (!daysEl) return;
    const diff = target - Date.now();
    const days = Math.max(0, Math.ceil(diff / 86400000));
    daysEl.textContent = days;
  }
  tickDday();
  setInterval(tickDday, 60000);

  /* ── 스크롤로 이 영역에 닿으면 한 번, 깔끔하게 떠오릅니다 ── */
  const dcal = el.querySelector('.dcal');
  if (dcal) {
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reveal = () => {
      photoReady.then(() => {
        requestAnimationFrame(() => {
          dcal.classList.add('is-photo-in');
          setTimeout(() => dcal.classList.add('is-in'), 620);
        });
      });
    };

    if (prefersReduced || !('IntersectionObserver' in window)) {
      reveal();
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { reveal(); io.unobserve(e.target); }
        });
      }, { threshold: 0.22, rootMargin: '0px 0px -8% 0px' });

      whenReady(() => io.observe(dcal));
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

  galleryImages = Array.from({ length: 20 }, (_, i) => `images/gallery/${i + 1}.jpg`);

  if (galleryImages.length === 0) {
    grid.innerHTML = '';
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

    /* ── 맨하단 백조: 12프레임(백조00~11)이 가우시안 가중치로 겹쳐지며
     두 백조가 서로에게 다가가 하트를 이루는 왕복(핑퐁) 유영 모션 ── */
  /* ── 맨하단 나비: 21프레임(00~20)이 가우시안 가중치로 겹쳐지며
     물 흐르듯 이어지는 날갯짓 (앞으로만 순환) ── */
/* ── 갤러리 ──────────────────────────────────────────────────
   구성: 높이만 고정하고 칸 폭은 사진 원본 비율로 → 잘림이 없습니다.
   이동: JS가 인덱스를 하나씩 옮기며 rAF로 보간합니다.
         (CSS 애니메이션에 맡겼을 때는 손으로 미는 값과 애니메이션이
          같은 요소를 다투어 왔다갔다 하는 문제가 있었습니다.
          이제 위치를 한 곳에서만 계산하므로 충돌이 없습니다.)
   순환: 3벌을 이어 붙이고, 이동이 끝난 뒤 같은 그림의 가운데 벌 자리로
         옮깁니다. 화면은 완전히 동일해 이음매가 보이지 않습니다.
   확대: 가운데 칸만 아주 조금(1.045배) 커집니다. */
function initGallerySlider() {
  const grid = document.querySelector('#gallery-grid');
  if (!grid || !galleryImages.length) return;

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOVE_MS = 1250;
  const HOLD_MS = 2000;
  const GAP = 10;
  const SETS = 3;

  const src = galleryImages.slice();
  const one = src.length;
  const N = one * SETS;
  const CELL_TRANS = 'transform 1.25s cubic-bezier(0.28,0.72,0.22,1), opacity 1.25s ease, filter 1.25s ease';

  const view = document.createElement('div');
  view.style.cssText = [
    'position:relative', 'display:block', 'width:100%',
    'overflow:hidden', 'background:transparent',
    'touch-action:pan-y', 'cursor:grab',
    'padding:0', 'margin:0', '-webkit-tap-highlight-color:transparent'
  ].join(';');

  const rail = document.createElement('div');
  rail.style.cssText = [
    'position:relative', 'display:flex', 'align-items:center',
    'height:100%', 'width:max-content',
    'gap:' + GAP + 'px', 'margin:0', 'padding:0',
    'will-change:transform', 'backface-visibility:hidden'
  ].join(';');

  const cells = [];
  for (let n = 0; n < N; n++) {
    const k = n % one;
    const cell = document.createElement('div');
    cell.setAttribute('data-real', String(k));
    cell.style.cssText = [
      'position:relative', 'flex:0 0 auto', 'height:100%',
      'overflow:visible', 'cursor:pointer',
      'transform:scale(0.955)', 'opacity:0.55',
      'transform-origin:center center',
      'transition:' + CELL_TRANS,
      'will-change:transform'
    ].join(';');

    const img = document.createElement('img');
    img.src = src[k];
    img.alt = '갤러리 사진 ' + (k + 1);
    img.decoding = 'sync';
    img.loading = 'eager';
    img.draggable = false;
    img.style.cssText = [
      'display:block', 'width:100%', 'height:100%',
      'object-fit:cover', 'border:0', 'border-radius:0', 'box-shadow:none',
      'pointer-events:none', 'user-select:none', '-webkit-user-drag:none'
    ].join(';');

    cell.appendChild(img);
    rail.appendChild(cell);
    cells.push(cell);
  }

  view.appendChild(rail);
  grid.innerHTML = '';
  grid.appendChild(view);

  const widths = new Array(N).fill(160);
  const offsets = new Array(N).fill(0);
  let index = one;          // 가운데 벌의 첫 장
  let x = 0;
  let raf = 0, timer = 0;
  let animating = false, dragging = false, inView = true, paused = false, moved = false;

  function viewH() {
    let h = Math.round(window.innerHeight * 0.46);
    if (h > 320) h = 320;
    if (h < 210) h = 210;
    return h;
  }

  function measure() {
    const h = viewH();
    view.style.height = h + 'px';
    let acc = 0;
    for (let n = 0; n < N; n++) {
      const im = cells[n].firstChild;
      const ratio = (im && im.naturalWidth && im.naturalHeight)
        ? (im.naturalWidth / im.naturalHeight) : 0.75;
      widths[n] = Math.max(80, Math.round(h * ratio));
      cells[n].style.width = widths[n] + 'px';
      offsets[n] = acc;
      acc += widths[n] + GAP;
    }
  }

  function xFor(i) {
    return Math.round(view.clientWidth / 2 - (offsets[i] + widths[i] / 2));
  }

  function apply() { rail.style.transform = 'translate3d(' + x + 'px, 0, 0)'; }

  function mark() {
    for (let n = 0; n < N; n++) {
      const on = n === index;
      cells[n].style.transform = on ? 'scale(1.045)' : 'scale(0.955)';
      cells[n].style.opacity = on ? '1' : '0.55';
      cells[n].style.zIndex = on ? '2' : '1';
      // 가운데 사진 아래에만 아주 옅은 그림자로 깊이를 줍니다
      cells[n].style.filter = on
        ? 'drop-shadow(0 7px 9px rgba(62, 52, 40, 0.16))'
        : 'drop-shadow(0 2px 4px rgba(62, 52, 40, 0.05))';
    }
  }

  // 같은 그림의 가운데 벌 자리로 옮깁니다 (화면은 동일)
  function normalize() {
    const target = one + (((index % one) + one) % one);
    if (target === index) return;
    index = target;
    x = xFor(index);
    /* 같은 그림의 다른 칸으로 옮기는 순간에는 확대 전환을 끕니다.
       (전환이 켜져 있으면 이전 칸이 작아지고 새 칸이 커지는 과정이
        겹쳐 첫 장에서 깜빡이는 것처럼 보입니다.) */
    for (let n = 0; n < N; n++) cells[n].style.transition = 'none';
    apply();
    mark();
    void rail.offsetHeight;
    requestAnimationFrame(function () {
      for (let n = 0; n < N; n++) cells[n].style.transition = CELL_TRANS;
    });
  }

  function glide(to, ms) {
    cancelAnimationFrame(raf);
    const from = x, delta = to - from;
    if (Math.abs(delta) < 0.5) { x = to; apply(); animating = false; normalize(); return; }
    const t0 = performance.now();
    animating = true;
    (function frame(now) {
      const t = Math.min(1, (now - t0) / ms);
      // 아주 완만하게 출발해 소리 없이 멈추는 곡선
      const e = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
      x = from + delta * e;
      apply();
      if (t < 1) raf = requestAnimationFrame(frame);
      else { x = to; apply(); animating = false; normalize(); }
    })(t0);
  }

  function goTo(i, animate, ms) {
    index = i;
    mark();
    if (animate) glide(xFor(i), ms || MOVE_MS);
    else { cancelAnimationFrame(raf); animating = false; x = xFor(i); apply(); }
  }

  function tick() {
    clearTimeout(timer);
    if (prefersReduced) return;
    timer = setTimeout(function run() {
      if (!paused && !dragging && inView && !animating) goTo(index + 1, true);
      timer = setTimeout(run, MOVE_MS + HOLD_MS);
    }, HOLD_MS);
  }

  /* ── 손끝을 그대로 따라오는 스와이프 (양방향) ── */
  let sx = 0, sy = 0, startX = 0, lastX = 0, lastDx = 0;
  let decided = false, horizontal = false;

  function down(px, py) {
    cancelAnimationFrame(raf);
    animating = false;
    dragging = true; decided = false; horizontal = false; moved = false;
    sx = px; sy = py; lastX = px; lastDx = 0;
    startX = x;
    clearTimeout(timer);
  }

  function drag(px, py, ev) {
    if (!dragging) return;
    const dx = px - sx, dy = py - sy;
    if (!decided) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      horizontal = Math.abs(dx) >= Math.abs(dy) * 0.8;
      decided = true;
      if (!horizontal) { dragging = false; tick(); return; }
    }
    if (Math.abs(dx) > 3) moved = true;
    if (ev && ev.cancelable) ev.preventDefault();
    lastDx = px - lastX;
    lastX = px;
    x = startX + dx;          // 감싸지 않으므로 튀지 않습니다
    apply();
  }

  function up() {
    if (!dragging) return;
    dragging = false;
    if (!decided || !horizontal) { tick(); return; }

    const dx = x - startX;
    const w = widths[index] || 200;
    const flick = Math.abs(lastDx) > 6;                  // 빠르게 튕겼는지
    const th = flick ? w * 0.06 : w * 0.22;

    let next = index;
    if (dx < -th) next = index + Math.min(2, Math.max(1, Math.round(-dx / w)));
    else if (dx > th) next = index - Math.min(2, Math.max(1, Math.round(dx / w)));

    goTo(next, true, flick ? 620 : 780);
    tick();
  }

  view.addEventListener('touchstart', function (e) {
    if (e.touches[0]) down(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  view.addEventListener('touchmove', function (e) {
    if (e.touches[0]) drag(e.touches[0].clientX, e.touches[0].clientY, e);
  }, { passive: false });
  view.addEventListener('touchend', up);
  view.addEventListener('touchcancel', up);

  view.addEventListener('mousedown', function (e) {
    down(e.clientX, e.clientY);
    view.style.cursor = 'grabbing';
    e.preventDefault();
  });
  window.addEventListener('mousemove', function (e) { if (dragging) drag(e.clientX, e.clientY, e); });
  window.addEventListener('mouseup', function () {
    if (!dragging) return;
    view.style.cursor = 'grab';
    up();
  });

  view.addEventListener('click', function (e) {
    if (moved) return;
    const cell = e.target.closest('[data-real]');
    if (cell && typeof window.__openGalleryViewer === 'function') {
      window.__openGalleryViewer(Number(cell.getAttribute('data-real')) || 0);
    }
  });

  document.addEventListener('click', function () {
    const v = document.getElementById('viewer');
    paused = !!(v && (v.classList.contains('is-active') || v.classList.contains('show')));
  }, true);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { inView = en.isIntersecting; });
    }, { threshold: 0.05 }).observe(view);
  }

  let lastW = 0;
  function setup(force) {
    if (!force && view.clientWidth === lastW) return;
    lastW = view.clientWidth;
    measure();
    goTo(index, false);
  }
  window.addEventListener('resize', function () { setup(false); }, { passive: true });

  let done = false;
  function ready() {
    if (done) return;
    done = true;
    setup(true);
    tick();
  }

  Promise.all(cells.map(function (c) {
    const im = c.firstChild;
    return (im.complete && im.naturalWidth)
      ? Promise.resolve()
      : new Promise(function (r) {
          im.addEventListener('load', r, { once: true });
          im.addEventListener('error', r, { once: true });
        });
  })).then(ready);

  setup(true);
  setTimeout(ready, 1600);
}

/* ── 사진 확대 보기 (라이트박스) ── */
function initViewer() {
  const viewer = document.getElementById('viewer');
  const track = document.getElementById('viewer-track');
  const closeBtn = document.getElementById('viewer-close');
  const counter = document.getElementById('viewer-counter');
  if (!viewer || !track) return;

  let built = false;
  let realIndex = 0;
  let virtualIndex = 1;
  let slideWidth = 0;
  let openedAt = 0;
  let animating = false;
  let dragging = false;
  let pointerId = null;
  let startX = 0;
  let lastX = 0;
  let startTime = 0;

  function build() {
    if (built || !galleryImages.length) return;
    built = true;
    const slides = [galleryImages[galleryImages.length - 1], ...galleryImages, galleryImages[0]];
    track.innerHTML = slides.map((src, i) =>
      `<div class="viewer__slide${i === 0 || i === slides.length - 1 ? ' is-clone' : ''}"><img src="${src}" alt="갤러리 사진" draggable="false" /></div>`
    ).join('');
  }

  function measure() {
    slideWidth = viewer.getBoundingClientRect().width || window.innerWidth;
  }

  function updateCounter() {
    if (counter) counter.textContent = `${realIndex + 1} / ${galleryImages.length}`;
  }

  function moveTo(px, animate) {
    track.style.transition = animate ? 'transform 720ms cubic-bezier(.25,.8,.25,1)' : 'none';
    track.style.transform = `translate3d(${px}px,0,0)`;
  }

  function snap(animate = true) {
    measure();
    moveTo(-virtualIndex * slideWidth, animate);
    updateCounter();
  }

  function normalize() {
    const n = galleryImages.length;
    if (virtualIndex === 0) {
      virtualIndex = n;
      realIndex = n - 1;
      snap(false);
    } else if (virtualIndex === n + 1) {
      virtualIndex = 1;
      realIndex = 0;
      snap(false);
    }
    animating = false;
  }

  function go(dir) {
    if (animating || galleryImages.length < 2) return;
    animating = true;
    virtualIndex += dir;
    realIndex = (realIndex + dir + galleryImages.length) % galleryImages.length;
    snap(true);
  }

  function open(startIndex = 0) {
    build();
    if (!built) return;
    realIndex = Math.max(0, Math.min(galleryImages.length - 1, Number(startIndex) || 0));
    virtualIndex = realIndex + 1;
    openedAt = Date.now();
    viewer.classList.add('is-active');
    viewer.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('viewer-open');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => snap(false)));
    window.dispatchEvent(new CustomEvent('gallery:viewer'));
  }

  function close() {
    if (Date.now() - openedAt < 250) return;
    viewer.classList.remove('is-active');
    viewer.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('viewer-open');
    document.body.style.overflow = '';
    window.dispatchEvent(new CustomEvent('gallery:viewer'));
  }

  function begin(x, id) {
    if (animating) return;
    measure();
    dragging = true;
    pointerId = id;
    startX = lastX = x;
    startTime = performance.now();
    track.style.transition = 'none';
  }

  function drag(x) {
    if (!dragging) return;
    lastX = x;
    moveTo(-virtualIndex * slideWidth + (x - startX), false);
  }

  function finish() {
    if (!dragging) return;
    dragging = false;
    const dx = lastX - startX;
    const elapsed = Math.max(1, performance.now() - startTime);
    const velocity = dx / elapsed;
    pointerId = null;
    if (Math.abs(dx) > slideWidth * 0.14 || Math.abs(velocity) > 0.38) go(dx < 0 ? 1 : -1);
    else snap(true);
  }

  window.__openGalleryViewer = open;
  track.addEventListener('transitionend', (e) => {
    if (e.propertyName === 'transform') normalize();
  });

  /* ── 마우스: Pointer Event ── */
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;          // 터치는 아래 touch 이벤트가 담당
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    begin(e.clientX, e.pointerId);
    try { track.setPointerCapture(e.pointerId); } catch (_) {}
  });
  track.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    if (!dragging || e.pointerId !== pointerId) return;
    if (e.cancelable) e.preventDefault();
    drag(e.clientX);
  }, { passive: false });
  track.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') finish(); });
  track.addEventListener('pointercancel', (e) => { if (e.pointerType !== 'touch') finish(); });
  track.addEventListener('lostpointercapture', (e) => { if (e.pointerType !== 'touch') finish(); });

  /* ── 터치: Touch Event 로 직접 처리 ──
     모바일에서 Pointer Event 만 쓰면 브라우저가 스크롤로 가로채
     pointermove 가 오지 않거나 pointercancel 로 끊기는 일이 있습니다. */
  let tDecided = false, tHoriz = false, tStartY = 0;

  track.addEventListener('touchstart', (e) => {
    if (!e.touches[0] || e.touches.length > 1) return;
    tDecided = false; tHoriz = false;
    tStartY = e.touches[0].clientY;
    begin(e.touches[0].clientX, 'touch');
  }, { passive: true });

  track.addEventListener('touchmove', (e) => {
    if (!dragging || !e.touches[0]) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - tStartY;
    if (!tDecided) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      tHoriz = Math.abs(dx) >= Math.abs(dy) * 0.7;
      tDecided = true;
      if (!tHoriz) { dragging = false; snap(true); return; }
    }
    if (e.cancelable) e.preventDefault();
    drag(e.touches[0].clientX);
  }, { passive: false });

  track.addEventListener('touchend', () => { if (dragging) finish(); });
  track.addEventListener('touchcancel', () => { if (dragging) finish(); });

  if (closeBtn) closeBtn.addEventListener('click', close);
  const backdrop = viewer.querySelector('.viewer__backdrop');
  if (backdrop) backdrop.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (!viewer.classList.contains('is-active')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  });

  window.addEventListener('resize', () => {
    if (viewer.classList.contains('is-active')) snap(false);
  }, { passive: true });
}

/* ── OUR STORY: 우편엽서 미니멀 타임라인 ──
   편지 텍스트는 CONFIG.story, 사진은 images/story/couple-2024.jpg·couple-2025.jpg
   봉투 속 사진: images/story/1.* 이 있으면 그 사진, 없으면 히어로 사진 */
/* ── 2026 은빛 물결 ──────────────────────────────────────────
   CSS 애니메이션으로 background-position 을 움직이면 모바일에서
   background-clip:text 와 함께 무시되는 경우가 있어,
   JS 가 매 프레임 직접 위치를 옮깁니다. (갤러리와 같은 방식) */
function initSilverFlow() {
  const nodes = Array.prototype.slice.call(document.querySelectorAll('.card__yr i, .card__yr b'));
  if (!nodes.length) return;

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  nodes.forEach(function (el, i) {
    el.style.setProperty('animation', 'none', 'important');
    el.style.setProperty('background-image',
      'linear-gradient(102deg, #66707a 0%, #e6edf2 20%, #545f68 42%, #dae2e8 64%, #66707a 100%)', 'important');
    el.style.setProperty('background-size', '300% 100%', 'important');
    el.style.setProperty('background-repeat', 'no-repeat', 'important');
    el.style.setProperty('-webkit-background-clip', 'text', 'important');
    el.style.setProperty('background-clip', 'text', 'important');
    el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
    el.style.setProperty('color', 'transparent', 'important');
    el.style.setProperty('background-position', (i % 2 ? 70 : 20) + '% 50%', 'important');
  });

  if (prefersReduced) return;

  const PERIOD = 13000;
  let running = false;
  let raf = 0;
  const t0 = performance.now();

  function frame(now) {
    const base = ((now - t0) % PERIOD) / PERIOD;          // 0 → 1
    for (let i = 0; i < nodes.length; i++) {
      const phase = base + (i % 2 ? 0.32 : 0);            // 두 줄이 살짝 어긋나게
      const wave = (1 - Math.cos(phase * Math.PI * 2)) / 2; // 0 → 1 → 0
      const pos = 8 + wave * 84;                            // 8% ~ 92%
      nodes[i].style.setProperty('background-position', pos.toFixed(2) + '% 50%', 'important');
    }
    if (running) raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.isIntersecting ? start() : stop(); });
    }, { threshold: 0.05 });
    const host = nodes[0].closest('.cards') || nodes[0];
    io.observe(host);
  } else {
    start();
  }
}

async function initStoryPost() {
  const section = document.getElementById('letter');
  if (!section) return;

  const title = section.querySelector('.section__title');
  const wrap = document.getElementById('story-cards');
  const targets = [title, wrap].filter(Boolean);
  targets.forEach(function (el) { el.classList.add('seq-reveal'); });

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -10% 0px' });
    whenReady(function () { targets.forEach(function (el) { io.observe(el); }); });
  }

  if (!wrap) return;

  /* 엽서를 누르면 뒤집히고, 화살표·스와이프로 다음 엽서로 넘어갑니다. */
  const cards = Array.prototype.slice.call(wrap.querySelectorAll('.card'));
  const dotsBox = document.getElementById('cards-dots');
  const prevBtn = document.getElementById('cards-prev');
  const nextBtn = document.getElementById('cards-next');
  const hint = document.getElementById('cards-hint');
  let cur = 0;

  if (dotsBox) {
    dotsBox.innerHTML = cards.map(function (_, i2) {
      return '<i class="cards__dot' + (i2 === 0 ? ' is-on' : '') + '"></i>';
    }).join('');
  }
  const dots = dotsBox ? Array.prototype.slice.call(dotsBox.children) : [];

  function sync() {
    cards.forEach(function (el, i2) {
      el.classList.toggle('is-current', i2 === cur);
      el.style.zIndex = String(cards.length - Math.abs(i2 - cur));
    });
    dots.forEach(function (dot, i2) { dot.classList.toggle('is-on', i2 === cur); });
    if (prevBtn) prevBtn.disabled = cur === 0;
    if (nextBtn) nextBtn.disabled = cur === cards.length - 1;
    if (hint) {
      if (cards[cur].getAttribute('data-flip') === '0') hint.textContent = '';
      else hint.textContent = cards[cur].classList.contains('is-flipped')
        ? '옆으로 넘겨 보세요'
        : '엽서를 눌러 뒤집어 보세요';
    }
  }

  cards.forEach(function (el) {
    el.addEventListener('click', function () {
      if (!el.classList.contains('is-current')) return;
      if (el.getAttribute('data-flip') === '0') return;
      el.classList.toggle('is-flipped');
      sync();
    });
  });

  function move(dir) {
    const next = cur + dir;
    if (next < 0 || next >= cards.length) return;
    cards[cur].classList.remove('is-flipped');
    cur = next;
    sync();
  }

  if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); move(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); move(1); });

  let sx2 = 0, sy2 = 0, decided2 = false, horiz2 = false;
  wrap.addEventListener('touchstart', function (e) {
    if (!e.touches[0]) return;
    sx2 = e.touches[0].clientX; sy2 = e.touches[0].clientY;
    decided2 = false; horiz2 = false;
  }, { passive: true });
  wrap.addEventListener('touchmove', function (e) {
    if (!e.touches[0] || decided2) return;
    const dx = e.touches[0].clientX - sx2, dy = e.touches[0].clientY - sy2;
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    decided2 = true; horiz2 = Math.abs(dx) > Math.abs(dy);
  }, { passive: true });
  wrap.addEventListener('touchend', function (e) {
    if (!horiz2) return;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - sx2;
    if (dx < -40) move(1);
    else if (dx > 40) move(-1);
  });

  sync();
}


  /* ── Location ── */
  function initLocation() {
    const w = CONFIG.wedding;
    const venue = $('#loc-venue');
    const hall = $('#loc-hall');
    const addr = $('#loc-address');
    const tel = $('#loc-tel');

    // 예식장 이름과 홀을 한 줄로, 주소/연락처는 표시하지 않음
    if (venue) venue.innerHTML = `${w.venue} <span class="location__hall-inline">${w.hall}</span>`;
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
              imageUrl: new URL('images/og/1.jpg', window.location.href).href,
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

    // 쌀화환 안내는 Information 섹션으로 옮겼습니다.
    wrap.innerHTML = blocks;

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

  /* ── Scroll Animations: start only after the envelope opens ── */
  let scrollObserver = null;
  let scrollAnimationsStarted = false;

  function initScrollAnimations() {
    if (scrollAnimationsStarted) return;
    scrollAnimationsStarted = true;
    const targets = $$('.anim-target, .gallery__item');
    if (!targets.length) return;

    targets.forEach((el) => el.classList.remove('is-visible'));
    scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          scrollObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -12% 0px' });

    targets.forEach((el) => scrollObserver.observe(el));
  }

  function observeNewElements(container) {
    if (!scrollObserver) return;
    const targets = $$('.gallery__item', container);
    targets.forEach((el) => {
      el.classList.remove('is-visible');
      scrollObserver.observe(el);
    });
  }

  window.addEventListener('invitation:opened', initScrollAnimations, { once: true });

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

    await initGallery();
    initGallerySlider();
    initViewer();
    initStoryPost();
    initSilverFlow();
    initInformation();
    tidyLabels();
  }

  /* ── Information 탭 ── */
  function initInformation() {
    const sec = document.getElementById('information');
    if (!sec) return;
    const tabs = Array.prototype.slice.call(sec.querySelectorAll('.info__tab'));
    const panels = Array.prototype.slice.call(sec.querySelectorAll('[data-info-panel]'));
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        const key = tab.getAttribute('data-info');
        tabs.forEach(function (t) {
          const on = t === tab;
          t.classList.toggle('is-on', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        panels.forEach(function (p) {
          p.classList.toggle('is-on', p.getAttribute('data-info-panel') === key);
        });
      });
    });
  }

  /* "Wedding Day." 처럼 뒤에 붙은 마침표를 정리합니다. */
  function tidyLabels() {
    document.querySelectorAll('h1, h2, h3, h4, p, span, small, em, i, b, strong').forEach((el) => {
      if (el.children.length) return;
      const t = (el.textContent || '').trim();
      if (/^wedding\s*day\s*[.·・]$/i.test(t)) el.textContent = 'Wedding Day';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
