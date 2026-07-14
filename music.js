/* 배경음악 — DOM 준비 후 초기화되므로 스크립트 위치와 무관하게 작동합니다. */
(function () {
  'use strict';

  function initMusic() {
    const audio = document.getElementById('bgm');
    const btn = document.getElementById('music-toggle');
    if (!audio) return;

    let playing = false;

    async function playMusic() {
      try {
        audio.volume = 0.72;
        await audio.play();
        playing = true;
        if (btn) btn.classList.add('is-playing');
      } catch (e) {
        // Some mobile browsers block sound until the first user gesture.
      }
    }

    async function toggleMusic() {
      try {
        if (playing && !audio.paused) {
          audio.pause();
          playing = false;
          if (btn) btn.classList.remove('is-playing');
        } else {
          await playMusic();
        }
      } catch (e) {}
    }

    playMusic();
    window.addEventListener('touchstart', playMusic, { once: true, passive: true });
    window.addEventListener('click', playMusic, { once: true });

    if (btn) btn.addEventListener('click', toggleMusic);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMusic);
  } else {
    initMusic();
  }
})();
