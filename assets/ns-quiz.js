/**
 * NightSeals Sleep Quiz — vanilla state machine (no dependencies).
 * Markup: sections/ns-quiz.liquid. Logic/data mirror the design handoff
 * (Quiz.dc.html). Compliance: no percentages / study claims live here.
 */
(function () {
  'use strict';

  var root = document.querySelector('.nsq-root');
  if (!root) return;

  /* ---- Quiz data (title, [optionLabel, points]) ---- */
  var QS = [
    { title: "First, how old are you?",
      options: [["50+ years old", 2], ["40-49 years old", 2], ["30-39 years old", 1], ["20-29 years old", 1]] },
    { title: "When you wake up in the morning, what's the first thing you notice?",
      options: [["My mouth is completely dry", 3], ["My throat hurts", 2], ["I feel like I barely slept, even after 8 hours", 3], ["My partner is annoyed. I was snoring again", 3], ["I'm exhausted from tossing and turning all night", 2]] },
    { title: "How do you feel when the 2pm afternoon slump hits?",
      options: [["I completely crash. I need caffeine or a nap to survive", 3], ["Noticeably lower. I push through, but it's hard", 2], ["Slightly tired, but still functional", 1], ["I don't get an afternoon crash", 0]] },
    { title: "Has your partner complained about your snoring, or have you woken up gasping for air?",
      options: [["Yes, my partner complains about it constantly", 3], ["Sometimes, but it's not every night", 2], ["I've woken myself up gasping before", 3], ["No, I sleep quietly", 0]], after: 'stat' },
    { title: "Have you ever woken up in the middle of the night with your mouth wide open?",
      options: [["Yes, all the time", 3], ["Probably, but I'm not entirely sure", 2], ["My partner says I do", 3], ["No, I definitely breathe through my nose", 0]], after: 'info' },
    { title: "If you could fix one thing about your sleep tonight, what would it be?",
      options: [["Stop snoring, so my partner and I can actually rest", 0], ["Wake up with real energy instead of feeling groggy", 0], ["Stop waking up with a dry, painful throat", 0], ["Finally get deep, uninterrupted sleep", 0]] },
    { title: "Do you have facial hair or a beard?",
      options: [["Full beard", 0], ["Stubble / short facial hair", 0], ["Clean shaven", 0]],
      note: "A lot of guys assume mouth tape won't hold through a beard. NightSeals' adhesive is designed to stay put over facial hair, all night." }
  ];

  var LEVELS = [
    { label: 'LOW', color: '#3E9E6E', pos: '12%' },
    { label: 'NORMAL', color: '#9A8F35', pos: '38%' },
    { label: 'MEDIUM', color: '#C98A3B', pos: '63%' },
    { label: 'HIGH', color: '#C4523E', pos: '88%' }
  ];
  var VERDICTS = [
    ['in good shape', "Your sleep looks mostly healthy. If you snore even occasionally, nasal breathing is still the easiest upgrade there is."],
    ['could be better', "You're showing early signs of nighttime mouth breathing. Worth fixing before it compounds."],
    ['needs attention', "You're showing clear signs of nighttime mouth breathing. The good news: it's completely fixable."],
    ['needs attention', "You're showing clear signs of nighttime mouth breathing. The good news: it's completely fixable."]
  ];

  /* ---- DOM refs ---- */
  var screens = {};
  var list = root.querySelectorAll('[data-screen]');
  for (var s = 0; s < list.length; s++) screens[list[s].getAttribute('data-screen')] = list[s];
  function el(id) { return document.getElementById(id); }
  var progressFill = el('nsq-progress-fill');

  var STORE = 'ns_quiz_state';
  var state = load() || { stage: 'intro', qi: 0, answers: {} };
  var seen = {};
  var lock = false, aTimer = null, aTimeout = null;

  function save() {
    try { sessionStorage.setItem(STORE, JSON.stringify({ stage: state.stage, qi: state.qi, answers: state.answers })); } catch (e) {}
  }
  function load() {
    try {
      var v = JSON.parse(sessionStorage.getItem(STORE));
      if (v && v.answers) { if (v.stage === 'analyzing') v.stage = 'results'; return v; }
    } catch (e) {}
    return null;
  }
  function track(ev, extra) {
    try {
      window.dataLayer = window.dataLayer || [];
      var o = { event: ev };
      if (extra) for (var k in extra) o[k] = extra[k];
      window.dataLayer.push(o);
      if (typeof window.fbq === 'function') window.fbq('trackCustom', ev, extra || {});
    } catch (e) {}
  }

  /* ---- Scoring + personalization (mirrors the handoff logic) ---- */
  function compute() {
    var a = state.answers, score = 0, k;
    for (k in a) { var q = QS[k]; if (q && q.options[a[k]]) score += q.options[a[k]][1]; }
    var lvIdx = score <= 4 ? 0 : score <= 7 ? 1 : score <= 10 ? 2 : 3;
    var lv = LEVELS[lvIdx];
    var a1 = a[1], a2 = a[2], a3 = a[3], a5 = a[5], a6 = a[6];
    var snorer = a3 === 0 || a3 === 1 || a3 === 2 || a1 === 3 || a5 === 0;
    var dry = a1 === 0 || a1 === 1 || a5 === 2;
    var tired = a2 === 0 || a2 === 1 || a5 === 1 || a5 === 3;
    var beard = a6 === 0 || a6 === 1;
    var fixes = ["Seals lips gently so air takes the nasal route all night"];
    if (snorer) fixes.push("Quiets the soft-tissue vibration behind the snoring");
    if (dry) fixes.push("No more 3am sandpaper mouth or morning sore throat");
    if (tired) fixes.push("Deeper, steadier sleep so mornings stop hurting");
    if (beard) fixes.push("Extra-grip adhesive that holds through facial hair");
    if (fixes.length < 4) fixes.push("Featherweight 0.3mm strip. You forget it's on by night three");
    fixes = fixes.slice(0, 5);
    var chips = [lv.label.charAt(0) + lv.label.slice(1).toLowerCase() + ' disruption'];
    if (a1 !== undefined) chips.push(['Dry mouth', 'Sore throat', 'Never rested', 'Snoring', 'Restless nights'][a1]);
    if (a6 !== undefined) chips.push(['Full beard', 'Stubble', 'Clean shaven'][a6]);
    return {
      lvIdx: lvIdx, lv: lv,
      verdictTitle: VERDICTS[lvIdx][0], verdictBody: VERDICTS[lvIdx][1],
      primarySymptom: ['Dry mouth, sore throat', 'Sore throat, irritated airway', 'Non-restorative sleep', 'Snoring', 'Fragmented sleep'][a1 !== undefined ? a1 : 0],
      energyImpact: ['Severe', 'Moderate', 'Mild', 'Minimal'][a2 !== undefined ? a2 : 0],
      roomImprove: ['Low', 'Moderate', 'High', 'High'][lvIdx],
      qolImpact: ['Minor', 'Noticeable', 'Substantial', 'Substantial'][lvIdx],
      fixes: fixes, chips: chips
    };
  }

  /* ---- Rendering ---- */
  function showScreen(name) {
    for (var k in screens) {
      if (k === name) screens[k].removeAttribute('hidden');
      else screens[k].setAttribute('hidden', '');
    }
  }
  function progressBase() {
    var s = state.stage;
    return s === 'question' ? state.qi : s === 'stat' ? 4 : s === 'info' ? 5 : s === 'intro' ? 0 : QS.length;
  }
  function renderQuestion() {
    var qi = state.qi, q = QS[qi];
    el('nsq-qnum').textContent = qi + 1;
    el('nsq-qtitle').textContent = q.title;
    var box = el('nsq-qoptions');
    box.innerHTML = '';
    for (var i = 0; i < q.options.length; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nsq-opt';
      b.setAttribute('data-oi', i);
      var chip = document.createElement('span');
      chip.className = 'nsq-opt-chip';
      chip.textContent = String.fromCharCode(65 + i);
      var txt = document.createElement('span');
      txt.textContent = q.options[i][0];
      b.appendChild(chip);
      b.appendChild(txt);
      box.appendChild(b);
    }
    var note = el('nsq-qnote');
    if (q.note) { el('nsq-qnote-text').textContent = q.note; note.removeAttribute('hidden'); }
    else note.setAttribute('hidden', '');
    var back = el('nsq-back');
    if (qi > 0) back.removeAttribute('hidden'); else back.setAttribute('hidden', '');
  }
  function renderResults() {
    var c = compute();
    var pill = el('nsq-level-pill');
    pill.textContent = c.lv.label; pill.style.background = c.lv.color;
    var mk = el('nsq-meter-marker');
    mk.style.left = c.lv.pos; mk.style.borderColor = c.lv.color;
    el('nsq-verdict-dot').style.background = c.lv.color;
    el('nsq-verdict-title').textContent = c.verdictTitle;
    el('nsq-verdict-body').textContent = c.verdictBody;
    el('nsq-primary-symptom').textContent = c.primarySymptom;
    el('nsq-room-improve').textContent = c.roomImprove;
    el('nsq-energy-impact').textContent = c.energyImpact;
    el('nsq-qol-impact').textContent = c.qolImpact;
    if (!seen.results) { seen.results = true; track('quiz_results_viewed', { level: c.lv.label }); }
  }
  function renderSolution() {
    var c = compute(), i;
    var chips = el('nsq-chips');
    chips.innerHTML = '';
    for (i = 0; i < c.chips.length; i++) {
      var sp = document.createElement('span');
      sp.className = 'nsq-chip';
      sp.textContent = c.chips[i];
      chips.appendChild(sp);
    }
    var fx = el('nsq-fixlist');
    fx.innerHTML = '';
    for (i = 0; i < c.fixes.length; i++) {
      var d = document.createElement('div');
      d.className = 'nsq-fix';
      var ck = document.createElement('span');
      ck.className = 'nsq-fix-check';
      ck.textContent = '✓';
      var tx = document.createElement('span');
      tx.className = 'nsq-fix-text';
      tx.textContent = c.fixes[i];
      d.appendChild(ck); d.appendChild(tx);
      fx.appendChild(d);
    }
    if (!seen.plan) { seen.plan = true; track('quiz_plan_viewed'); }
  }
  function runAnalyze() {
    var rows = root.querySelectorAll('#nsq-analyze-list .nsq-arow');
    for (var r = 0; r < rows.length; r++) rows[r].classList.remove('is-done');
    var d = 0;
    clearInterval(aTimer);
    aTimer = setInterval(function () {
      if (rows[d]) rows[d].classList.add('is-done');
      d++;
      if (d >= rows.length) {
        clearInterval(aTimer);
        aTimeout = setTimeout(function () { state.stage = 'results'; save(); render(); }, 700);
      }
    }, 550);
  }
  function render() {
    showScreen(state.stage);
    progressFill.style.width = Math.round(progressBase() / QS.length * 100) + '%';
    if (state.stage === 'question') renderQuestion();
    else if (state.stage === 'analyzing') runAnalyze();
    else if (state.stage === 'results') renderResults();
    else if (state.stage === 'solution') renderSolution();
  }

  function go(patch) {
    for (var k in patch) state[k] = patch[k];
    save();
    window.scrollTo(0, 0);
    render();
  }

  /* ---- Events ---- */
  el('nsq-start').addEventListener('click', function () {
    if (!seen.start) { seen.start = true; track('quiz_start'); }
    go({ stage: 'question', qi: 0 });
  });

  el('nsq-qoptions').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-oi]') : null;
    if (!b || lock) return;
    var i = parseInt(b.getAttribute('data-oi'), 10);
    lock = true;
    b.classList.add('is-selected');
    setTimeout(function () {
      lock = false;
      var qi = state.qi, q = QS[qi];
      state.answers[qi] = i;
      track('quiz_q' + (qi + 1) + '_answered', { option: i });
      if (qi === QS.length - 1) go({ stage: 'analyzing' });
      else if (q.after === 'stat') go({ stage: 'stat' });
      else if (q.after === 'info') go({ stage: 'info' });
      else go({ qi: qi + 1 });
    }, 220);
  });

  var conts = root.querySelectorAll('.nsq-cont');
  for (var ci = 0; ci < conts.length; ci++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        go({ stage: 'question', qi: parseInt(btn.getAttribute('data-next-qi'), 10) });
      });
    })(conts[ci]);
  }

  el('nsq-back').addEventListener('click', function () {
    if (state.qi > 0) go({ stage: 'question', qi: state.qi - 1 });
  });
  el('nsq-to-solution').addEventListener('click', function () { go({ stage: 'solution' }); });
  el('nsq-back-results').addEventListener('click', function () { go({ stage: 'results' }); });
  el('nsq-restart').addEventListener('click', function () {
    clearInterval(aTimer); clearTimeout(aTimeout); lock = false; seen = {};
    try { sessionStorage.removeItem(STORE); } catch (e) {}
    state = { stage: 'intro', qi: 0, answers: {} };
    window.scrollTo(0, 0);
    render();
  });
  var cta = el('nsq-cta');
  if (cta) cta.addEventListener('click', function () { track('quiz_cta_clicked'); });

  render();
})();
