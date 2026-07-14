/* ============================================
   참석 여부(RSVP) 팝업
   - DOM 준비 후에 초기화되므로 <head>·본문 어디에서
     로드해도 항상 작동합니다.
   ============================================ */
(function () {
  'use strict';

  function initRsvp() {
    const modal = document.getElementById('attendModal');
    if (!modal) return;

    const closeBtn = document.getElementById('rsvp-close');
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
    const STORAGE_KEY = 'wedding_rsvp_hide_date';

    function todayStamp() {
      const d = new Date();
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }

    function shouldHideToday() {
      try {
        return localStorage.getItem(STORAGE_KEY) === todayStamp();
      } catch (e) {
        return false;
      }
    }

    function storeHideToday() {
      if (!hideToday || !hideToday.checked) return;
      try {
        localStorage.setItem(STORAGE_KEY, todayStamp());
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
      if (shouldHideToday()) return;
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      updateCounterState();
      resetMessage();
      setTimeout(() => { if (nameInput) nameInput.focus(); }, 60);
    };

    function closeModal() {
      storeHideToday();
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.querySelectorAll('[data-rsvp-close]').forEach((el) => {
      el.addEventListener('click', closeModal);
    });

    if (minusBtn) minusBtn.addEventListener('click', () => setCount(getCount() - 1));
    if (plusBtn) plusBtn.addEventListener('click', () => setCount(getCount() + 1));
    if (attendRadio) attendRadio.addEventListener('change', updateCounterState);
    if (absentRadio) absentRadio.addEventListener('change', updateCounterState);

    if (form) {
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
        const count = attending ? `${getCount()}명` : '불참';
        if (message) {
          message.textContent = attending
            ? `${name}님의 참석 의사(${count})가 확인되었습니다.`
            : `${name}님의 불참 의사가 확인되었습니다.`;
          message.classList.add('is-success');
        }
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
