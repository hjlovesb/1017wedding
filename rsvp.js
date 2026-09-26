/* ============================================
   참석 여부(RSVP) 팝업
   - DOM 준비 후에 초기화되므로 <head>·본문 어디에서
     로드해도 항상 작동합니다.
   ============================================ */
(function () {
  'use strict';

  // ── Firebase 연결 (참석여부 응답을 Firestore에 저장) ──
  var firebaseConfig = {
    apiKey: "AIzaSyCjSJ84mUFZSReIkb-TyJuP4F5iQQAWOhA",
    authDomain: "wedding-88902.firebaseapp.com",
    projectId: "wedding-88902",
    storageBucket: "wedding-88902.firebasestorage.app",
    messagingSenderId: "331843175920",
    appId: "1:331843175920:web:3d34801d0314f5496a8935"
  };

  var db = null;
  try {
    if (window.firebase && !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    if (window.firebase) {
      db = firebase.firestore();
    }
  } catch (e) {
    db = null;
  }

  function saveRsvpToFirestore(data) {
    if (!db) {
      return Promise.reject(new Error('Firestore not available'));
    }
    return db.collection('rsvpResponses').add({
      invitationId: 'general',
      name: data.name,
      attendance: data.attendance,
      count: data.count,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      userAgent: (navigator.userAgent || '').slice(0, 180)
    });
  }

  function initRsvp() {
    const modal = document.getElementById('attendModal');
    if (!modal) return;

    const form = document.getElementById('rsvp-form');
    const message = document.getElementById('rsvp-message');
    const attendRadio = document.getElementById('rsvp-attend');
    const absentRadio = document.getElementById('rsvp-absent');
    const counter = document.getElementById('rsvp-counter');
    const countEl = document.getElementById('rsvp-count');
    const minusBtn = document.getElementById('rsvp-minus');
    const plusBtn = document.getElementById('rsvp-plus');
    const helpEl = document.getElementById('rsvp-help');
    const hideToday = document.getElementById('rsvp-hide-today');
    const nameInput = document.getElementById('rsvp-name');

    // 한 번이라도 참석/불참을 "전달하기"로 제출한 사람에게는 영구히 다시 뜨지 않고,
    // 제출하지 않고 닫은 경우엔 "오늘 하루 보지 않기"를 체크했을 때만 오늘 하루 숨깁니다.
    const SUBMITTED_KEY = 'wedding_rsvp_submitted';
    const HIDE_TODAY_KEY = 'wedding_rsvp_hide_date';

    function todayStamp() {
      const d = new Date();
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }

    function hasSubmitted() {
      try {
        return localStorage.getItem(SUBMITTED_KEY) === '1';
      } catch (e) {
        return false;
      }
    }

    function markSubmitted() {
      try {
        localStorage.setItem(SUBMITTED_KEY, '1');
      } catch (e) {}
    }

    function isHiddenToday() {
      try {
        return localStorage.getItem(HIDE_TODAY_KEY) === todayStamp();
      } catch (e) {
        return false;
      }
    }

    function storeHideToday() {
      if (!hideToday || !hideToday.checked) return;
      try {
        localStorage.setItem(HIDE_TODAY_KEY, todayStamp());
      } catch (e) {}
    }

    function getCount() {
      return Number((countEl && countEl.dataset.count) || '1');
    }

    function setCount(value) {
      const next = Math.max(1, Math.min(10, Number(value) || 1));
      if (countEl) {
        countEl.dataset.count = String(next);
        countEl.textContent = `${next}명`;
      }
    }

    function updateCounterState() {
      const attending = !!(attendRadio && attendRadio.checked);
      if (counter) counter.classList.toggle('is-disabled', !attending);
      if (minusBtn) minusBtn.disabled = !attending;
      if (plusBtn) plusBtn.disabled = !attending;
      if (helpEl) {
        helpEl.textContent = attending ? '본인 포함 참석 인원' : '불참으로 전달됩니다';
      }
      if (countEl && !attending) {
        countEl.textContent = '0명';
      } else if (countEl && attending) {
        countEl.textContent = `${getCount()}명`;
      }
    }

    function resetMessage() {
      if (!message) return;
      message.textContent = '';
      message.classList.remove('is-success', 'is-error');
    }

    window.openAttendModal = function () {
      if (hasSubmitted() || isHiddenToday()) return false;
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      if (hideToday) hideToday.checked = false;   // 새로고침 시 체크 상태가 남지 않도록
      updateCounterState();
      resetMessage();
      return true;
    };

    function closeModal() {
      storeHideToday();
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      // 팝업이 닫힌 뒤에 본문 모션이 시작됩니다.
      window.dispatchEvent(new CustomEvent('rsvp:closed'));
    }

    modal.querySelectorAll('[data-rsvp-close]').forEach((el) => {
      el.addEventListener('click', closeModal);
    });

    if (minusBtn) minusBtn.addEventListener('click', () => setCount(getCount() - 1));
    if (plusBtn) plusBtn.addEventListener('click', () => setCount(getCount() + 1));
    if (attendRadio) attendRadio.addEventListener('change', updateCounterState);
    if (absentRadio) absentRadio.addEventListener('change', updateCounterState);

    if (form) {
      const submitBtn = form.querySelector('[type="submit"]');

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = nameInput && nameInput.value ? nameInput.value.trim() : '';
        resetMessage();
        if (!name) {
          if (message) {
            message.textContent = '성함을 입력해 주세요.';
            message.classList.add('is-error');
          }
          if (nameInput) nameInput.focus();
          return;
        }
        const attending = !!(attendRadio && attendRadio.checked);
        const count = attending ? getCount() : 0;
        const countLabel = attending ? `${count}명` : '불참';

        if (submitBtn) submitBtn.disabled = true;
        if (message) {
          message.textContent = '전달 중입니다...';
          message.classList.remove('is-error', 'is-success');
        }

        saveRsvpToFirestore({
          name: name,
          attendance: attending ? 'attend' : 'absent',
          count: count
        }).then(() => {
          if (message) {
            message.textContent = attending
              ? `${name}님의 참석 의사(${countLabel})가 확인되었습니다.`
              : `${name}님의 불참 의사가 확인되었습니다.`;
            message.classList.remove('is-error');
            message.classList.add('is-success');
          }
          markSubmitted();
          // 전달 완료 후 곧바로 팝업을 닫습니다(사용자가 완료 메시지를 잠깐 볼 수 있도록 살짝 지연).
          setTimeout(closeModal, 900);
        }).catch(() => {
          if (submitBtn) submitBtn.disabled = false;
          if (message) {
            message.textContent = '전달에 실패했습니다. 잠시 후 다시 시도해 주세요.';
            message.classList.remove('is-success');
            message.classList.add('is-error');
          }
        });
      });
    }

    updateCounterState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRsvp);
  } else {
    initRsvp();
  }
})();
