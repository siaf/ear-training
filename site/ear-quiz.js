// A three-question ear test for blog posts: one tap plays a key (I–IV–V–I), then a
// note, and the reader names it as 1, 3 or 5. It's the functional-hearing task the
// app teaches, so a reader can try it without leaving the article.
//
// Mount with <div class="ear-quiz" data-ear-quiz data-campaign="<slug>"></div> and
// <script defer src="/ear-quiz.js"></script>. Plain Web Audio, no samples or
// libraries, so it costs the page almost nothing until someone taps it.
(function () {
  var QUESTIONS = 3;
  var DEGREES = [
    { label: '1', semis: 0, name: 'home (1)' },
    { label: '3', semis: 4, name: 'the third (3)' },
    { label: '5', semis: 7, name: 'the fifth (5)' },
  ];
  var CHORDS = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]]; // I IV V I

  function track(event, props) {
    try {
      if (window.posthog && typeof window.posthog.capture === 'function') window.posthog.capture(event, props);
    } catch (e) {}
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'onclick') node.addEventListener('click', attrs[k]);
      else node.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  function midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function createAudio() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    // Lets Safari on iPhone play through the silent switch, like a music app.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    var ctx = new Ctx();
    var comp = ctx.createDynamicsCompressor();
    var master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(comp);
    comp.connect(ctx.destination);

    function note(midi, start, dur, level) {
      var hz = midiToHz(midi);
      [[1, 'triangle', 1], [2, 'sine', 0.25]].forEach(function (p) {
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = p[1];
        osc.frequency.value = hz * p[0];
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(level * p[2], start + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(g);
        g.connect(master);
        osc.start(start);
        osc.stop(start + dur + 0.05);
      });
    }

    return {
      resume: function () { return ctx.state === 'suspended' ? ctx.resume() : Promise.resolve(); },
      // Plays the cadence in the key, then the target note. Returns seconds until it ends.
      play: function (tonic, targetSemis) {
        var t = ctx.currentTime + 0.05;
        CHORDS.forEach(function (chord, i) {
          chord.forEach(function (s) { note(tonic + s, t + i * 0.55, 0.6, 0.18); });
          note(tonic - 12 + chord[0], t + i * 0.55, 0.6, 0.14);
        });
        var at = t + CHORDS.length * 0.55 + 0.45;
        note(tonic + targetSemis, at, 1.1, 0.32);
        return at + 1.1 - ctx.currentTime;
      },
    };
  }

  function makeQuestions() {
    // Every answer appears at least once across the three questions.
    var order = DEGREES.slice().sort(function () { return Math.random() - 0.5; });
    return order.slice(0, QUESTIONS).map(function (d) {
      return { degree: d, tonic: 57 + Math.floor(Math.random() * 8) }; // keys A3 to E4
    });
  }

  function mount(root) {
    var campaign = root.getAttribute('data-campaign') || 'blog';
    var appUrl = 'https://app.fifths.io/?utm_source=fifths.io&utm_medium=blog&utm_campaign=' +
      encodeURIComponent(campaign) + '&utm_content=quiz';
    var audio = null;
    var questions = [];
    var index = 0;
    var score = 0;

    function render(children) {
      root.innerHTML = '';
      children.forEach(function (c) { root.appendChild(c); });
    }

    function lessonLink(label) {
      return el('a', {
        href: appUrl, class: 'btn btn-coral', 'data-ph-track': '', 'data-ph-cta': 'quiz-lesson', text: label,
      });
    }

    function intro() {
      render([
        el('p', { class: 'ear-quiz-title', text: 'Test your ear in 30 seconds' }),
        el('p', { class: 'ear-quiz-copy', text: 'You’ll hear a key, then one note. Is it 1 (home), 3 or 5? Three questions, sound on.' }),
        el('div', { class: 'ear-quiz-actions' }, [
          el('button', { type: 'button', class: 'btn btn-ink', onclick: start, text: '▶ Start the ear test' }),
          el('a', { href: appUrl, class: 'btn-link', 'data-ph-track': '', 'data-ph-cta': 'quiz-skip', text: 'or go straight to a free lesson' }),
        ]),
      ]);
    }

    function start() {
      if (!audio) audio = createAudio();
      if (!audio) { window.location.href = appUrl; return; }
      questions = makeQuestions();
      index = 0;
      score = 0;
      track('blog_quiz_started', { campaign: campaign });
      ask();
    }

    function ask() {
      var q = questions[index];
      var status = el('p', { class: 'ear-quiz-status', 'aria-live': 'polite', text: 'Listen…' });
      var answers = DEGREES.map(function (d) {
        return el('button', {
          type: 'button', class: 'ear-quiz-answer', disabled: '', 'aria-label': 'Scale degree ' + d.label,
          onclick: function () { answer(d, answers, status); }, text: d.label,
        });
      });
      function play() {
        answers.forEach(function (b) { b.setAttribute('disabled', ''); });
        status.textContent = 'Listen…';
        audio.resume().then(function () {
          var secs = audio.play(q.tonic, q.degree.semis);
          setTimeout(function () {
            answers.forEach(function (b) { if (!b.classList.contains('is-done')) b.removeAttribute('disabled'); });
            status.textContent = 'Which note was that?';
          }, Math.max(0, secs - 0.9) * 1000);
        });
      }
      render([
        el('p', { class: 'ear-quiz-title', text: 'Question ' + (index + 1) + ' of ' + QUESTIONS }),
        status,
        el('div', { class: 'ear-quiz-answers' }, answers),
        el('button', { type: 'button', class: 'btn-link', onclick: play, text: '↻ Play again' }),
      ]);
      play();
    }

    function answer(choice, buttons, status) {
      var q = questions[index];
      var right = choice.label === q.degree.label;
      if (right) score++;
      buttons.forEach(function (b) {
        b.setAttribute('disabled', '');
        b.classList.add('is-done');
        if (b.textContent === q.degree.label) b.classList.add('is-right');
        else if (b.textContent === choice.label) b.classList.add('is-wrong');
      });
      status.textContent = right ? 'Yes, that was ' + q.degree.name + '.' : 'It was ' + q.degree.name + '.';
      track('blog_quiz_answered', { campaign: campaign, correct: right, question: index + 1 });
      setTimeout(function () {
        index++;
        if (index < QUESTIONS) ask(); else finish();
      }, 1400);
    }

    function finish() {
      track('blog_quiz_finished', { campaign: campaign, score: score, of: QUESTIONS });
      var verdict = score === QUESTIONS
        ? 'Your ear already hears where notes sit in a key. Fifths takes that to the other scale degrees, chords and melodies.'
        : 'That’s normal at the start: hearing a note’s place in the key is a skill you train, not a talent you’re born with. A few minutes a day gets you there.';
      render([
        el('p', { class: 'ear-quiz-title', text: 'You got ' + score + ' of ' + QUESTIONS + '.' }),
        el('p', { class: 'ear-quiz-copy', text: verdict }),
        el('div', { class: 'ear-quiz-actions' }, [
          lessonLink('Keep training free in Fifths →'),
          el('button', { type: 'button', class: 'btn-link', onclick: start, text: 'Try three more' }),
        ]),
      ]);
    }

    intro();
  }

  function init() {
    var roots = document.querySelectorAll('[data-ear-quiz]');
    for (var i = 0; i < roots.length; i++) mount(roots[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
