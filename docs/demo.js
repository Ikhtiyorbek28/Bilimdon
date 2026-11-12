/* Bilimdon demo for GitHub Pages: a whole game played in the browser, without the server.
   The teacher's big screen (#tv) and the player's phone (#phone) are driven by one small state
   machine; the other players are bots. Looks come from the real site's style.css and avatars.js. */

const PIN = '349404';
const QUESTIONS = [
  {q: "O'zbekistonning poytaxti qaysi shahar?", a: ['Samarqand', 'Toshkent', 'Buxoro', 'Xiva'], r: 1, t: 20},
  {q: "Suv dengiz sathida 100 °C da qaynaydi.", a: ["To'g'ri", "Noto'g'ri"], r: 0, t: 15},
  {q: 'Yer Quyosh atrofini necha kunda aylanib chiqadi?', a: ['30', '180', '365', '1000'], r: 2, t: 20},
  {q: 'Qaysi biri sut emizuvchi?', a: ['Akula', 'Delfin', 'Qisqichbaqa', 'Ilon baliq'], r: 1, t: 20},
  {q: '7 × 8 = ?', a: ['54', '56', '58', '64'], r: 1, t: 15},
];
const BOTS = [
  ['Malika', '3d:icecream.bow.x', .8], ['Jasur', '3d:robot.shades.x', .65], ['Dilnoza', '3d:cloud.halo.x', .7],
  ['Sardor', '3d:astro.phones.x', .55], ['Madina', '3d:star.party.x', .75], ['Bekzod', '3d:dice.ninja.x', .5],
];
const HERO = ['3d:robot.tophat.x', '3d:jelly.party.x', '3d:alien.vr.x', '3d:fire.none.x', '3d:astro.phones.x',
  '3d:ghost.halo.x', '3d:cupcake.bow.x', '3d:planet.orbit.x', '3d:donut.shades.x'];

const tv = $('tv'), ph = $('ph'), phone = $('phone');
const wait = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);
const avName = tok => avatarName(tok) || '';

let G;  // the game
function newGame() {
  // token: bumped on every change of question or game, so late bot timers from before do nothing
  G = {state: 'lobby', qi: -1, players: [], me: null, tick: 0, ends: 0, token: G ? G.token + 1 : 0};
}

/* ---------------- teacher's big screen ---------------- */
const tvTop = (l, r) => `<div class="tv-top"><span>${l}</span><span>${r}</span></div>`;
// the teacher's button lives in the control bar under the big screen, so it never covers the game
const HINTS = {lobby: "O'quvchilar qo'shilmoqda", question: 'Savol ketmoqda', results: "To'g'ri javob ko'rsatildi", board: 'Reyting', final: "O'yin tugadi"};
function tvBtn(label, fn, on = true) {
  $('tv-hint').textContent = '🎛 ' + (HINTS[G.state] || "O'qituvchi boshqaruvi");
  $('tv-ctrl').innerHTML = `<button class="btn alt" ${on ? '' : 'disabled'} onclick="${fn}">${label}</button>`;
  return '';
}

function drawLobby() {
  const ps = G.players;
  tv.innerHTML = `<div class="tv-in">
    ${tvTop('Bilimdon', 'Umumiy bilim · 5 savol')}
    <div class="hint">Telefonda saytni oching va PIN kodni kiriting</div>
    <div class="pin"><small>O'yin PIN kodi</small><b>${PIN.slice(0, 3)} ${PIN.slice(3)}</b></div>
    <div class="chips">${ps.map(p => `<span class="chip${p.me ? ' me' : ''}">${avatarHTML(p.av, 28)} ${esc(p.name)}</span>`).join('')}</div>
    <div class="count">👥 ${ps.length} ta o'yinchi</div>
  </div>${G.me ? tvBtn('Boshlash ▶', 'startGame()') : tvBtn("Telefondan kiring…", '', false)}`;
}

function drawQuestionTV() {
  const q = QUESTIONS[G.qi], left = Math.max(0, Math.ceil((G.ends - Date.now()) / 1000));
  const n = G.players.filter(p => p.ans[G.qi] !== undefined).length;
  tv.innerHTML = `<div class="tv-in" style="justify-content:flex-start;padding-top:5cqw">
    ${tvTop(`${G.qi + 1} / ${QUESTIONS.length}`, 'PIN ' + PIN)}
    <div class="qtext">${esc(q.q)}</div>
    <div class="mid"><div class="timer${left <= 5 ? ' hurry' : ''}" id="tv-timer">${left}</div>
      <div class="side"><span id="tv-n">${n}</span><small>javob</small></div></div>
    <div class="answers">${q.a.map((a, i) => `<div class="ans c${i}"><span class="k">${KEYS[i]}</span>${esc(a)}</div>`).join('')}</div>
  </div>${tvBtn('O\'tkazib yuborish ⏭', 'endQuestion()')}`;
}

function drawResultsTV() {
  const q = QUESTIONS[G.qi];
  const cnt = q.a.map((_, i) => G.players.filter(p => p.ans[G.qi] && p.ans[G.qi].c === i).length);
  const max = Math.max(1, ...cnt);
  tv.innerHTML = `<div class="tv-in">
    ${tvTop(`${G.qi + 1} / ${QUESTIONS.length}`, 'PIN ' + PIN)}
    <div class="qtext" style="animation:none">${esc(q.q)}</div>
    <div class="bars">${q.a.map((a, i) => `<div class="bar${i === q.r ? '' : ' dim'}"><span>${cnt[i]}${i === q.r ? ' ✓' : ''}</span><i class="c${i}" data-h="${Math.round(cnt[i] / max * 100)}"></i><em>${KEYS[i]}</em></div>`).join('')}</div>
    <div class="answers">${q.a.map((a, i) => `<div class="ans c${i}${i === q.r ? ' ok' : ' dim'}"><span class="k">${i === q.r ? '✓' : KEYS[i]}</span>${esc(a)}<span class="n">${cnt[i]}</span></div>`).join('')}</div>
  </div>${tvBtn('Keyingi ▶', 'showBoard()')}`;
  requestAnimationFrame(() => requestAnimationFrame(() => tv.querySelectorAll('.bar i').forEach(b => b.style.height = Math.max(4, +b.dataset.h) + '%')));
}

function ranked() { return [...G.players].sort((a, b) => b.score - a.score); }

function drawBoardTV() {
  const last = G.qi + 1 >= QUESTIONS.length;
  tv.innerHTML = `<div class="tv-in">
    ${tvTop(`${G.qi + 1} / ${QUESTIONS.length}`, 'PIN ' + PIN)}
    <h3>🏆 Reyting</h3>
    <div class="lb">${ranked().slice(0, 5).map((p, i) => `<div class="lb-row" style="animation-delay:${i * .08}s"><span>${i + 1}. ${avatarHTML(p.av, 30)} ${esc(p.name)}${p.me ? ' (siz)' : ''}</span><span>${p.score}</span></div>`).join('')}</div>
  </div>${tvBtn(last ? 'Natijalar 🏆' : 'Keyingi savol ▶', last ? 'showFinal()' : 'nextQuestion()')}`;
}

function drawFinalTV() {
  const r = ranked(), order = [1, 0, 2], H = ['26cqw', '19cqw', '14cqw'], C = ['linear-gradient(180deg,#ffe08a,#e0a400)', 'linear-gradient(180deg,#eef1f6,#9aa3b5)', 'linear-gradient(180deg,#f2b27a,#a8602c)'];
  tv.innerHTML = `<div class="tv-in" style="justify-content:flex-end;padding-bottom:0">
    ${tvTop('Bilimdon', "O'yin tugadi")}
    <div class="podium">${order.map(i => r[i] ? `<div class="pod"><div class="nm">${avatarHTML(r[i].av, 64)}<span>${esc(r[i].name)}</span><span class="sc">${r[i].score}</span></div>
      <div class="blk" style="height:${H[i]};background:${C[i]};animation-delay:${(2 - i) * .3}s">${i + 1}</div></div>` : '').join('')}</div>
  </div>${tvBtn('Qaytadan ↺', 'restart()')}`;
}

/* ---------------- the player's phone ---------------- */
function phoneBar(on) {
  $('pbar').hidden = !on;
  if (!on || !G.me) return;
  $('pb-name').innerHTML = avatarHTML(G.me.av, 26) + ' ' + esc(G.me.name);
  $('pb-score').textContent = (G.me.shown || 0) + ' ball';  // the new score shows only after the reveal
}
function setPhoneBg(c) { phone.classList.remove('ok', 'bad'); if (c) phone.classList.add(c); }

function phonePin(err = '') {
  setPhoneBg(); phoneBar(false); $('pb-timer').textContent = '';
  ph.innerHTML = `<h1 class="logo">Bilim<span>don</span></h1>
    <div class="box">
      <input id="pin-in" inputmode="numeric" maxlength="7" placeholder="O'yin PIN kodi" autocomplete="off">
      <button class="btn" id="pin-go">Keyingi</button>
      <p class="err">${esc(err)}</p>
      <p class="tip">Katta ekrandagi PIN: <b>${PIN}</b> · <a href="#" id="pin-fill">o'zi yozsin</a></p>
    </div>`;
  const go = () => { const v = $('pin-in').value.replace(/\D/g, ''); v === PIN ? phoneName() : phonePin(v ? "Bunday o'yin topilmadi" : 'PIN kodni kiriting'); };
  $('pin-go').onclick = go;
  $('pin-in').onkeydown = e => { if (e.key === 'Enter') go(); };
  $('pin-fill').onclick = e => { e.preventDefault(); $('pin-in').value = PIN; go(); };
}

let myName = '';
function phoneName(err = '') {
  ph.innerHTML = `<div class="box">
      <div class="jhead"><button id="back">← PIN</button><b>🎮 Umumiy bilim</b></div>
      <input id="name-in" maxlength="16" placeholder="Ismingiz" autocomplete="off" value="${esc(myName)}">
      <button class="btn" id="name-go">Davom etish →</button>
      <p class="err">${esc(err)}</p>
    </div>`;
  $('back').onclick = () => phonePin();
  const go = () => {
    const v = $('name-in').value.trim();
    if (!v) return phoneName('Ismingizni yozing');
    if (G.players.some(p => !p.me && p.name.toLowerCase() === v.toLowerCase())) { myName = v; return phoneName('Bu ism band, boshqasini yozing'); }
    myName = v; phoneAvatar();
  };
  $('name-go').onclick = go;
  $('name-in').onkeydown = e => { if (e.key === 'Enter') go(); };
  setTimeout(() => $('name-in') && $('name-in').focus({preventScroll: true}), 50);
}

/* avatar step: the 3D picker when three.js loads, else the SVG characters */
let av3 = null, stage = null, cfg = null, avTab = 'char', svgPick = 0;
async function phoneAvatar() {
  ph.innerHTML = `<div class="box" style="padding:12px">
      <div class="jhead"><button id="back">← Ism</button><b>${esc(myName)}</b></div>
      <div id="av-area"><div class="av-big"><div class="spin"></div></div></div>
      <button class="btn" id="join-go">Kirish</button>
    </div>`;
  $('back').onclick = () => { stopStage(); phoneName(); };
  $('join-go').onclick = joinGame;
  const mod = await Promise.race([loadAvatar3D(), wait(6000).then(() => null)]);
  if (!$('av-area')) return;
  if (!mod) return drawSvgPicker();
  av3 = mod;
  cfg = cfg || {char: mod.CHAR_LIST[Math.floor(Math.random() * mod.CHAR_LIST.length)].id, acc: 'none', color: null};
  $('av-area').innerHTML = `<div class="av3-stage" id="av3-stage"><div class="av3-acts">
      <button data-act="wave" title="Qo'l silkitish">👋</button><button data-act="jump" title="Sakrash">⤴️</button>
      <button data-act="dance" title="Raqs">💃</button><button data-act="spin" title="Aylanish">🔄</button><button id="av-rnd" title="Tasodifiy">🎲</button></div></div>
    <div class="av-who"><b id="av-name"></b></div>
    <div class="av-tabs"><button data-tab="char">Qahramon</button><button data-tab="acc">Aksessuar</button></div>
    <div class="av-grid" id="av-grid"></div>`;
  try { stage = mod.createStage($('av3-stage'), cfg); }
  catch (e) { console.warn('3D stage failed', e); stage = null; return drawSvgPicker(); }
  $('av3-stage').querySelectorAll('[data-act]').forEach(b => b.onclick = () => stage && stage.play(b.dataset.act));
  $('av-rnd').onclick = () => {
    const pick = a => a[Math.floor(Math.random() * a.length)];
    cfg = {char: pick(mod.CHAR_LIST).id, acc: pick(mod.ACC_LIST).id, color: null};
    stage.set(cfg); stage.play('jump'); drawAv3Grid();
  };
  document.querySelectorAll('.av-tabs button').forEach(b => b.onclick = () => { avTab = b.dataset.tab; drawAv3Grid(); });
  drawAv3Grid();
}
function drawAv3Grid() {
  const m = av3, grid = $('av-grid'); if (!grid) return;
  document.querySelectorAll('.av-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === avTab));
  const items = avTab === 'char'
    ? m.CHAR_LIST.map(c => ({id: c.id, label: c.name, on: cfg.char === c.id, pic: () => m.charThumb(c.id)}))
    : m.ACC_LIST.map(a => ({id: a.id, label: a.name, on: cfg.acc === a.id, pic: () => m.accThumb(a.id)}));
  grid.innerHTML = items.map(it => `<button class="${it.on ? 'on' : ''}" title="${esc(it.label)}"><img alt=""></button>`).join('');
  grid.querySelectorAll('button').forEach((b, i) => b.onclick = () => {
    if (avTab === 'char') cfg.char = items[i].id; else cfg.acc = items[i].id;
    stage && stage.set(cfg); drawAv3Grid();
  });
  const imgs = [...grid.querySelectorAll('img')]; let i = 0;
  (function next() {  // one picture at a time keeps the page responsive
    if (i >= imgs.length || !grid.contains(imgs[i])) return;
    try { imgs[i].src = items[i].pic(); } catch (e) { console.warn(e); }
    i++; setTimeout(next, 0);
  })();
  $('av-name').textContent = avName(m.makeToken(cfg));
}
function drawSvgPicker() {
  $('av-area').innerHTML = `<div class="av-big" id="av-big"></div><div class="av-who"><b id="av-name"></b></div><div class="av-grid svg" id="av-grid"></div>`;
  const draw = jump => {
    $('av-big').innerHTML = avatarHTML('c' + svgPick, 110); $('av-name').textContent = AV_DEFS[svgPick][0];
    if (jump) $('av-big').firstChild.classList.add('jump');
    $('av-grid').innerHTML = AV_DEFS.map((_, i) => `<button class="${i === svgPick ? 'on' : ''}">${avatarHTML('c' + i, 40, true)}</button>`).join('');
    $('av-grid').querySelectorAll('button').forEach((b, i) => b.onclick = () => { svgPick = i; draw(true); });
  };
  draw(false);
}
function stopStage() { if (stage) { stage.destroy(); stage = null; } }

function joinGame() {
  const av = stage && av3 ? av3.makeToken(cfg) : 'c' + svgPick;
  stopStage();
  G.me = {name: myName, av, score: 0, ans: [], me: true};
  G.players.push(G.me);
  if (G.state === 'lobby') drawLobby();
  phoneWait("Siz o'yindasiz! ✓", `Ismingizni ekranda ko'ring: ${myName}. Katta ekrandagi «Boshlash» ni bosing.`, true);
}

function phoneWait(title, sub, bigAv) {
  setPhoneBg(); phoneBar(true);
  ph.innerHTML = `<div class="fbt">${esc(title)}</div>
    ${bigAv ? `<div>${avatarHTML(G.me.av, 120)}</div>` : '<div class="spin"></div>'}
    <p style="font-weight:800;font-size:16px;opacity:.9">${esc(sub)}</p>`;
}

function phoneQuestion() {
  const q = QUESTIONS[G.qi];
  setPhoneBg(); phoneBar(true);
  ph.innerHTML = `<div class="qno">${G.qi + 1} / ${QUESTIONS.length}</div>
    <div class="qmini">${esc(q.q)}</div>
    <div class="pbtns${q.a.length === 2 ? ' n2' : ''}">${q.a.map((a, i) => `<button class="pbtn c${i}" data-i="${i}"><b>${KEYS[i]}</b>${esc(a)}</button>`).join('')}</div>`;
  ph.querySelectorAll('.pbtn').forEach(b => b.onclick = () => answer(G.me, +b.dataset.i));
}

function phoneFeedback() {
  const q = QUESTIONS[G.qi], a = G.me.ans[G.qi], place = ranked().indexOf(G.me) + 1;
  phoneBar(true);
  if (!a) { setPhoneBg('bad'); ph.innerHTML = `<div class="fbt">⏰ Vaqt tugadi<small>To'g'ri javob: <b>${esc(q.a[q.r])}</b></small></div><div class="pts">${place}-o'rin</div>`; return; }
  setPhoneBg(a.ok ? 'ok' : 'bad');
  ph.innerHTML = a.ok
    ? `<div class="fbt">✓ To'g'ri!<small>Ajoyib, shunday davom eting</small></div><div class="pts">+${a.pts} ball</div><p style="font-weight:900">${place}-o'rindasiz</p>`
    : `<div class="fbt">✗ Noto'g'ri<small>To'g'ri javob: <b>${esc(q.a[q.r])}</b></small></div><div class="pts">+0</div><p style="font-weight:900">${place}-o'rindasiz</p>`;
}

function phoneFinal() {
  const place = ranked().indexOf(G.me) + 1, medal = ['🥇', '🥈', '🥉'][place - 1] || '🎉';
  setPhoneBg(); phoneBar(true); $('pb-timer').textContent = '';
  ph.innerHTML = `<div class="fbt" style="font-size:54px">${medal}</div>
    <div class="fbt">${place}-o'rin<small>${G.me.score} ball · ${G.players.length} ta o'yinchi</small></div>
    <div>${avatarHTML(G.me.av, 110)}</div>
    <button class="btn alt sm" onclick="restart()">Yana o'ynash ↺</button>`;
}

/* ---------------- the game ---------------- */
function answer(p, c) {
  if (G.state !== 'question' || p.ans[G.qi]) return;
  const q = QUESTIONS[G.qi], used = (Date.now() - G.started) / 1000;
  const ok = c === q.r, pts = ok ? Math.round(1000 * (1 - Math.min(used / q.t, 1) / 2)) : 0;
  p.ans[G.qi] = {c, ok, pts}; p.score += pts;
  const n = G.players.filter(x => x.ans[G.qi]).length;
  if ($('tv-n')) $('tv-n').textContent = n;
  if (p.me) phoneWait('Javob qabul qilindi', 'Boshqalarni kutamiz…');
  if (n === G.players.length) setTimeout(endQuestion, 600);
}

function startGame() { if (G.me) nextQuestion(); }

function nextQuestion() {
  const tok = ++G.token;
  G.qi++; G.state = 'question';
  const q = QUESTIONS[G.qi];
  G.started = Date.now(); G.ends = G.started + q.t * 1000;
  drawQuestionTV(); phoneQuestion();
  clearInterval(G.tick);
  G.tick = setInterval(() => {
    const left = Math.max(0, Math.ceil((G.ends - Date.now()) / 1000));
    const t = $('tv-timer'); if (t) { t.textContent = left; t.classList.toggle('hurry', left <= 5); }
    $('pb-timer').textContent = left;
    if (left <= 0) endQuestion();
  }, 250);
  // the bots think for a while, then answer (the better ones get it right more often)
  G.players.filter(p => !p.me).forEach(p => {
    const right = Math.random() < p.skill, c = right ? q.r : (q.r + 1 + Math.floor(Math.random() * (q.a.length - 1))) % q.a.length;
    setTimeout(() => { if (tok === G.token) answer(p, c); }, rnd(2.5, q.t * .75) * 1000);
  });
}

function endQuestion() {
  if (G.state !== 'question') return;
  G.state = 'results'; G.token++;
  clearInterval(G.tick); $('pb-timer').textContent = '';
  if (G.me) G.me.shown = G.me.score;
  drawResultsTV(); phoneFeedback();
}

function showBoard() { G.state = 'board'; drawBoardTV(); }

function showFinal() {
  G.state = 'final'; drawFinalTV(); phoneFinal();
  if (ranked().indexOf(G.me) < 3) confetti();
}

function restart() {
  clearInterval(G.tick); G.token++;
  const me = G.me;
  newGame(); seedBots();
  if (me) { G.me = {...me, score: 0, shown: 0, ans: []}; G.players.push(G.me); phoneWait("Siz o'yindasiz! ✓", "Yangi o'yin. Katta ekrandagi «Boshlash» ni bosing.", true); }
  else phonePin();
  drawLobby();
}

// the bots drop into the lobby one by one, as classmates would
function seedBots() {
  const tok = G.token;
  BOTS.forEach(([name, av, skill], i) => setTimeout(() => {
    if (tok !== G.token || G.state !== 'lobby') return;
    G.players.splice(G.players.length - (G.me ? 1 : 0), 0, {name, av, skill, score: 0, ans: []});
    drawLobby();
  }, 900 + i * 1300));
}

/* ---------------- hero characters ---------------- */
$('hero-av').innerHTML = HERO.map(t => avatarHTML(t, 64)).join('');

newGame(); seedBots(); drawLobby(); phonePin();
