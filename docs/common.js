const KEYS = ['A', 'B', 'C', 'D'];
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id)); }
async function api(path, body) {
  const r = await fetch(path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  let data = {}; try { data = await r.json(); } catch (e) {}
  return {status: r.status, ...data};
}
function store(k, v) { try { v === undefined ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function recall(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }

/* Server-Sent Events with auto-reconnect */
function listen(url, onData, onGone) {
  let es, closed = false;
  const open = () => {
    es = new EventSource(url);
    es.onmessage = e => { const d = JSON.parse(e.data); if (d.state === 'gone') { closed = true; es.close(); onGone(); } else onData(d); };
    es.onerror = () => { es.close(); if (!closed) setTimeout(async () => {
      // 404 means the game no longer exists
      try { const r = await fetch(url, {method: 'HEAD'}); if (r.status === 404) { closed = true; return onGone(); } } catch (e) {}
      open();
    }, 1500); };
  };
  open();
  return () => { closed = true; es && es.close(); };
}

/* Countdown driven by the server's remaining seconds */
let cdTimer = null;
function countdown(el, remaining) {
  clearInterval(cdTimer);
  const end = Date.now() + remaining * 1000;
  const tick = () => { const s = Math.max(0, Math.ceil((end - Date.now()) / 1000)); el.textContent = s; if (s <= 0) clearInterval(cdTimer); };
  tick(); cdTimer = setInterval(tick, 250);
}

function confetti() {
  const c = $('confetti'), x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const cols = ['#e4572e','#2e86ab','#f3a712','#6a4c93','#2bb673','#fff'];
  const ps = Array.from({length: 180}, () => ({x: Math.random()*c.width, y: -20-Math.random()*c.height, s: 6+Math.random()*6, v: 2+Math.random()*3, r: Math.random()*6, dr: (Math.random()-.5)*.2, col: cols[Math.random()*cols.length|0]}));
  let f = 0;
  (function tick() {
    x.clearRect(0, 0, c.width, c.height);
    ps.forEach(p => { p.y += p.v; p.x += Math.sin((f+p.r*10)/20); p.r += p.dr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.col; x.fillRect(-p.s/2, -p.s/4, p.s, p.s/2); x.restore(); });
    if (++f < 420) requestAnimationFrame(tick); else x.clearRect(0, 0, c.width, c.height);
  })();
}
