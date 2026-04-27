// Fifths — marketing-site JS. Captures UTM params, hijacks form submits,
// opens the survey modal, and POSTs to /waitlist with first-touch attribution.

(function captureUtms() {
  const params = new URLSearchParams(window.location.search);
  const map = {
    'utm-source':   params.get('utm_source')   || '',
    'utm-medium':   params.get('utm_medium')   || '',
    'utm-campaign': params.get('utm_campaign') || '',
    'utm-content':  params.get('utm_content')  || '',
    'utm-referrer': document.referrer          || ''
  };
  Object.entries(map).forEach(([cls, val]) => {
    document.querySelectorAll('.' + cls).forEach(el => { el.value = val; });
  });
})();

// Paint the dashboard-mockup heatmap (if present on this page).
(function paintHeatmap() {
  const wrap = document.querySelector('.dash .heatmap'); if (!wrap) return;
  if (wrap.childElementCount > 0) return; // already painted (server-rendered)
  const warm = ['#ff8a6b', '#ffb199', '#ffd1c1', '#ffe1d4'];
  const cool = ['#b6e5cd', '#c8b8ff', '#a8d5ff', '#ffd768'];
  for (let i = 0; i < 144; i++) {
    const d = document.createElement('div');
    const x = i % 12, y = Math.floor(i / 12);
    const confused = Math.abs(x - y) === 3 || (x === 10 && y === 3) || (x === 2 && y === 9);
    const offDiag = x !== y && Math.random() > 0.88;
    if (confused) d.style.background = warm[Math.floor(Math.random() * warm.length)];
    else if (offDiag) d.style.background = cool[Math.floor(Math.random() * cool.length)];
    wrap.appendChild(d);
  }
})();

// Sticky nav border on scroll
(function stickyBorder() {
  const nav = document.querySelector('header.nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Waitlist + survey flow
(function waitlist() {
  const modal = document.getElementById('survey-modal');
  const surveyForm = document.getElementById('survey-form');
  const surveyUI = modal && modal.querySelector('.survey-ui');
  const thanksUI = modal && modal.querySelector('.thanks-ui');
  const closeBtn = modal && modal.querySelector('.modal-close');
  const skipBtn  = modal && modal.querySelector('.modal-skip');

  function openModal() {
    if (!modal) return;
    modal.classList.remove('thanks');
    modal.classList.add('open');
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
  }
  function showThanks() {
    if (!modal) return;
    modal.classList.add('thanks');
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (skipBtn)  skipBtn.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });
  }

  async function postWaitlist(form, extra) {
    const fd = new FormData(form);
    if (extra) for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    const body = new URLSearchParams();
    fd.forEach((v, k) => body.append(k, typeof v === 'string' ? v : ''));
    try {
      const res = await fetch('/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      return res.ok;
    } catch (err) {
      console.warn('waitlist post failed', err);
      return false;
    }
  }

  // Hijack hero + bottom forms
  document.querySelectorAll('form.waitlist-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailEl = form.querySelector('input[type=email]');
      const email = emailEl ? (emailEl.value || '').trim().toLowerCase() : '';
      if (!email) return;

      try { localStorage.setItem('fifths.waitlist.email', email); } catch {}

      // Open modal immediately for snappy feel.
      openModal();
      // Fire and forget the backend write.
      postWaitlist(form);
    });
  });

  // Survey submit
  if (surveyForm) {
    surveyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      let email = '';
      try { email = localStorage.getItem('fifths.waitlist.email') || ''; } catch {}
      await postWaitlist(surveyForm, { form_source: 'survey', email });
      showThanks();
    });
  }
})();
