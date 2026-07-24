/* 배경음악 — DOM 준비 후 초기화됩니다.
   1분 11초(71초) 지점부터 재생하고, 끝나면 다시 71초로 돌아가 무한 반복.
   음악은 계속 흐르며, 우측 상단 버튼으로만 켜고 끕니다.
   (팝업 등 화면 내 다른 탭 동작에 음악이 끊기지 않도록 처리) */
(function () {
  'use strict';

  var START_AT = 71; // 1:11

  function initMusic() {
    var audio = document.getElementById('bgm');
    var btn = document.getElementById('music-toggle');
    if (!audio) return;

    var userStopped = false;  // 사용자가 버튼으로 직접 끈 경우에만 true
    var fadeTimer = null;

    audio.loop = false;

    function seekToStart() {
      try { audio.currentTime = START_AT; } catch (e) {}
    }

    if (audio.readyState >= 1) {
      seekToStart();
    } else {
      audio.addEventListener('loadedmetadata', seekToStart, { once: true });
    }

    // 곡이 끝나면 71초로 되감아 다시 재생 (무한 반복)
    audio.addEventListener('ended', function () {
      if (userStopped) return;
      seekToStart();
      audio.volume = 0;
      audio.play().then(function () { fadeIn(0.72, 1200); }).catch(function () {});
    });

    function fadeIn(targetVol, durationMs) {
      if (fadeTimer) clearInterval(fadeTimer);
      var stepMs = 40;
      var steps = Math.max(1, Math.round(durationMs / stepMs));
      var i = 0;
      fadeTimer = setInterval(function () {
        i += 1;
        var t = i / steps;
        var eased = 1 - Math.pow(1 - t, 2);
        audio.volume = Math.min(targetVol, targetVol * eased);
        if (i >= steps) {
          audio.volume = targetVol;
          clearInterval(fadeTimer);
          fadeTimer = null;
        }
      }, stepMs);
    }

    function startPlayback() {
      // 이미 재생 중이거나 사용자가 끈 상태면 아무것도 안 함 (깜빡임 방지)
      if (userStopped) return;
      if (!audio.paused) { if (btn) btn.classList.add('is-playing'); return; }
      if (audio.currentTime < START_AT - 0.5) seekToStart();
      audio.volume = 0;
      audio.play().then(function () {
        if (btn) btn.classList.add('is-playing');
        fadeIn(0.72, 1400);
      }).catch(function () {
        // 첫 사용자 제스처 전까지 막힐 수 있음 → 아래 unlock에서 재시도
      });
    }

    // 버튼: 명시적으로 켜고 끄기
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();  // window unlock 리스너로 전파 방지 (깜빡임 원인 차단)
        if (!audio.paused) {
          audio.pause();
          userStopped = true;
          btn.classList.remove('is-playing');
        } else {
          userStopped = false;
          startPlayback();
        }
      });
    }

    // 자동재생 시도 + 첫 제스처에서 한 번만 unlock (재생되면 리스너 제거)
    startPlayback();

    function unlock() {
      startPlayback();
      if (!audio.paused) {
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('click', unlock);
      }
    }
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('click', unlock);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMusic);
  } else {
    initMusic();
  }
})();
