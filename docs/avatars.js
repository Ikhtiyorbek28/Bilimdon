/* Bilimdon's own avatar characters: 12 round creatures drawn as SVG, shaded to look 3D
   (light from the top left), with an idle bounce and blinking eyes (animated in style.css).
   The server stores an avatar as "c0"…"c11"; anything else (old emoji avatars, the 👻 ghost)
   is shown as plain text. */
const AV_BODY = 'M50 16C76 16 88 38 88 60C88 82 72 93 50 93C28 93 12 82 12 60C12 38 24 16 50 16Z';
const AV_GHOST = 'M50 16C76 16 87 38 87 58L87 90C80 84 75 94 68 88C62 83 57 94 50 88C43 94 38 83 32 88C25 94 20 84 13 90L13 58C13 38 24 16 50 16Z';
// default face: two big eyes with a shine, rosy cheeks, a small smile
const AV_EYES = (y = 52) => `<g class="ey">
  <ellipse cx="38" cy="${y}" rx="8" ry="9.5" fill="#fff"/><ellipse cx="62" cy="${y}" rx="8" ry="9.5" fill="#fff"/>
  <circle cx="39.5" cy="${y + 1.5}" r="4.6" fill="#1b1410"/><circle cx="63.5" cy="${y + 1.5}" r="4.6" fill="#1b1410"/>
  <circle cx="41" cy="${y - 0.5}" r="1.6" fill="#fff"/><circle cx="65" cy="${y - 0.5}" r="1.6" fill="#fff"/></g>`;
const AV_MOUTH = '<path d="M43 70Q50 76 57 70" stroke="#1b1410" stroke-width="3" fill="none" stroke-linecap="round"/>';
const AV_CHEEKS = '<ellipse cx="28" cy="66" rx="5" ry="3" fill="#ff8fa3" opacity=".45"/><ellipse cx="72" cy="66" rx="5" ry="3" fill="#ff8fa3" opacity=".45"/>';

// [name, base colour, light, dark, parts behind the body, parts in front, custom face]
const AV_DEFS = [
  ['Olovjon', '#ff7a1a', '#ffc27a', '#b8460a',
    '<path d="M50 4C56 12 62 14 60 24C66 20 68 14 67 10C74 20 70 30 62 32L38 32C30 30 27 20 34 12C34 18 38 22 42 22C38 14 44 8 50 4Z" fill="#ffb02e"/><path d="M50 12C54 18 57 20 55 27L45 27C43 21 46 17 50 12Z" fill="#fff1b8"/>'],
  ['Ko\'kboy', '#2b7fd4', '#8cc4ff', '#14457e',
    '<path d="M50 18L50 6" stroke="#14457e" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="5" r="5" fill="#ffd166"/><circle cx="48.5" cy="3.5" r="1.6" fill="#fff"/>'],
  ['Baqavoy', '#2bb673', '#8ff0bb', '#146b40',
    '<circle cx="34" cy="26" r="13" fill="#2bb673"/><circle cx="66" cy="26" r="13" fill="#2bb673"/>', '',
    `<g class="ey"><circle cx="34" cy="26" r="9" fill="#fff"/><circle cx="66" cy="26" r="9" fill="#fff"/>
      <circle cx="35" cy="27" r="4.6" fill="#1b1410"/><circle cx="67" cy="27" r="4.6" fill="#1b1410"/>
      <circle cx="36.5" cy="25" r="1.6" fill="#fff"/><circle cx="68.5" cy="25" r="1.6" fill="#fff"/></g>
      <path d="M36 66Q50 78 64 66" stroke="#1b1410" stroke-width="3" fill="none" stroke-linecap="round"/>`],
  ['Shoxdor', '#7b4fd6', '#c4a8ff', '#3e2378',
    '<path d="M30 26L22 6L40 20Z" fill="#ffe2b8"/><path d="M70 26L78 6L60 20Z" fill="#ffe2b8"/>'],
  ['Chaqmoq', '#f2b705', '#fff08a', '#9a6f00',
    '<path d="M36 22L44 6L46 16L56 4L56 16L66 8L62 24Z" fill="#ff7a1a"/>'],
  ['Mushukcha', '#e5383b', '#ff9b9d', '#8a1416',
    '<path d="M18 40L20 8L42 24Z" fill="#e5383b"/><path d="M82 40L80 8L58 24Z" fill="#e5383b"/><path d="M24 30L25 16L35 24Z" fill="#ffb3b4"/><path d="M76 30L75 16L65 24Z" fill="#ffb3b4"/>',
    '<path d="M18 62L4 58M18 67L4 68M82 62L96 58M82 67L96 68" stroke="#5a0d0f" stroke-width="2" stroke-linecap="round"/>'],
  ['Quyonjon', '#ff6fa8', '#ffc0da', '#a0285c',
    '<ellipse cx="36" cy="14" rx="7" ry="18" fill="#ff6fa8" transform="rotate(-10 36 14)"/><ellipse cx="64" cy="14" rx="7" ry="18" fill="#ff6fa8" transform="rotate(10 64 14)"/><ellipse cx="36" cy="15" rx="3.5" ry="12" fill="#ffd3e5" transform="rotate(-10 36 15)"/><ellipse cx="64" cy="15" rx="3.5" ry="12" fill="#ffd3e5" transform="rotate(10 64 15)"/>'],
  ['Sharpa', '#3cc8e0', '#b3f3ff', '#167487', '', '', null, AV_GHOST],
  ['Robo', '#4a4f5c', '#a3a9b8', '#1c1f26',
    '<path d="M50 16L50 6" stroke="#1c1f26" stroke-width="3"/><circle cx="50" cy="5" r="4" fill="#ff7a1a"/>',
    '<rect x="20" y="58" width="60" height="5" rx="2.5" fill="#1c1f26" opacity=".5"/>',
    `<rect x="22" y="40" width="56" height="22" rx="11" fill="#14161b"/>
      <g class="ey"><rect x="31" y="47" width="14" height="8" rx="4" fill="#ff7a1a"/><rect x="55" y="47" width="14" height="8" rx="4" fill="#ff7a1a"/></g>
      <rect x="40" y="72" width="20" height="4" rx="2" fill="#1c1f26"/>`],
  ['Qorvoy', '#e9eef2', '#ffffff', '#8b98a3', '',
    '<path d="M18 78Q50 92 82 78L84 86Q50 100 16 86Z" fill="#ff7a1a"/><path d="M70 86L76 99L66 98Z" fill="#c2410c"/>'],
  ['Ayiqcha', '#9a5b33', '#d9a06f', '#4f2b14',
    '<circle cx="24" cy="26" r="11" fill="#9a5b33"/><circle cx="76" cy="26" r="11" fill="#9a5b33"/><circle cx="24" cy="26" r="5.5" fill="#d9a06f"/><circle cx="76" cy="26" r="5.5" fill="#d9a06f"/>',
    '<ellipse cx="50" cy="69" rx="12" ry="8" fill="#e8c09a"/><ellipse cx="50" cy="65" rx="4" ry="3" fill="#2a160a"/>'],
  ['O\'zga', '#9be15d', '#e2ffc0', '#4c7d1c',
    '<path d="M38 20L32 6M62 20L68 6" stroke="#4c7d1c" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="6" r="4" fill="#ff6fa8"/><circle cx="68" cy="6" r="4" fill="#ff6fa8"/>', '',
    `<g class="ey"><ellipse cx="32" cy="52" rx="7" ry="8" fill="#fff"/><ellipse cx="50" cy="44" rx="8.5" ry="9.5" fill="#fff"/><ellipse cx="68" cy="52" rx="7" ry="8" fill="#fff"/>
      <circle cx="33" cy="53" r="3.8" fill="#1b1410"/><circle cx="51" cy="45.5" r="4.6" fill="#1b1410"/><circle cx="69" cy="53" r="3.8" fill="#1b1410"/>
      <circle cx="34.2" cy="51.5" r="1.3" fill="#fff"/><circle cx="52.5" cy="44" r="1.6" fill="#fff"/><circle cx="70.2" cy="51.5" r="1.3" fill="#fff"/></g>
      <path d="M42 70Q50 77 58 70" stroke="#1b1410" stroke-width="3" fill="none" stroke-linecap="round"/>`],
];
let avUid = 0;
function avatarSVG(i) {
  const [, base, light, dark, back = '', front = '', face, body = AV_BODY] = AV_DEFS[i];
  const id = 'avg' + (++avUid);
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs>
      <radialGradient id="${id}" cx="34%" cy="28%" r="78%"><stop offset="0" stop-color="${light}"/><stop offset=".45" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/></radialGradient>
    </defs>
    <ellipse class="sh" cx="50" cy="95" rx="27" ry="4.5" fill="rgba(0,0,0,.35)"/>
    <g class="bd">${back}
      <path d="${body}" fill="url(#${id})"/>
      <ellipse cx="50" cy="76" rx="22" ry="12" fill="#fff" opacity=".12"/>
      ${face || AV_EYES() + AV_MOUTH + AV_CHEEKS}
      ${front}
      <ellipse cx="34" cy="30" rx="10" ry="6" fill="#fff" opacity=".35" transform="rotate(-25 34 30)"/>
    </g></svg>`;
}
/* ---- 3D avatars ("3d:<character>.<accessory>.<colour>", built by avatar3d.js) ----
   Lists show a still picture rendered once per token in the browser; the module is loaded
   on first need. Without it (no internet for the three.js CDN) a matching SVG character is shown. */
const AV3_NAMES = {robot: 'Robo', jelly: 'Jeli', alien: 'Zorp', ghost: 'Arvoh', astro: 'Kosmo', mushroom: "Qo'ziqorin",
  cactus: 'Kaktus', icecream: 'Muzqaymoq', planet: 'Sayyora', fire: 'Olov', cloud: 'Bulut', crystal: 'Kristall',
  cupcake: 'Keks', dice: 'Kubik', star: 'Yulduz', donut: 'Donut'};
const AV3_RE = /^3d:([a-z]+)\.([a-z]+)\.([a-z]+|[0-9a-f]{6})$/;
let av3Mod = null, av3Promise = null, av3Timer = 0;
function loadAvatar3D() {
  return av3Promise || (av3Promise = import('./avatar3d.js').then(m => (av3Mod = m))
    .catch(e => { console.warn('3D avatars unavailable, using the SVG ones', e); return null; }));
}
function av3Fallback(token) {  // the same token always gets the same SVG character
  let h = 0; for (const ch of token) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 'c' + (h % AV_DEFS.length);
}
function av3Fill() {
  clearTimeout(av3Timer);
  av3Timer = setTimeout(async () => {
    if (!document.querySelector('img[data-av3]:not([src])')) return;
    const mod = await loadAvatar3D();
    for (const img of document.querySelectorAll('img[data-av3]:not([src])')) {
      const span = img.parentNode, tok = img.dataset.av3;
      let url = null;
      if (mod) try { url = mod.thumbFor(tok, img.dataset.m); } catch (e) { console.warn(e); }
      if (!url) { span.outerHTML = avatarHTML(av3Fallback(tok), +img.dataset.s, span.classList.contains('still')); continue; }
      img.src = url;
      await new Promise(r => setTimeout(r, 0));  // keep the page responsive while many pictures render
    }
  }, 0);
}
/* The avatar as HTML. size in px; still: no animation (long lists, tables). */
function avatarHTML(token, size = 32, still = false) {
  if (AV3_RE.test(token || '')) {
    const mode = size < 60 ? 'face' : 'full', cached = av3Mod && av3Mod.cachedThumb(token, mode);
    if (!cached) av3Fill();
    const delay = -((token.length * 0.37) % 1.6).toFixed(2);
    return `<span class="av3d av3i${still ? ' still' : ''}" style="--s:${size}px;--d:${delay}s" title="${esc(avatarName(token))}"><img alt="" data-av3="${esc(token)}" data-m="${mode}" data-s="${size}"${cached ? ` src="${cached}"` : ''}></span>`;
  }
  const m = /^c(\d{1,2})$/.exec(token || '');
  if (!m || !AV_DEFS[+m[1]]) return token ? `<span class="av-txt" style="font-size:${Math.round(size * .8)}px">${esc(token)}</span>` : '';
  const delay = -((+m[1] * 0.37) % 1.6).toFixed(2);  // characters don't all bounce in step
  return `<span class="av3d${still ? ' still' : ''}" style="--s:${size}px;--d:${delay}s" title="${esc(AV_DEFS[+m[1]][0])}">${avatarSVG(+m[1])}</span>`;
}
const avatarName = token => {
  const t = AV3_RE.exec(token || ''); if (t) return AV3_NAMES[t[1]] || '';
  const m = /^c(\d{1,2})$/.exec(token || ''); return m && AV_DEFS[+m[1]] ? AV_DEFS[+m[1]][0] : (token || '');
};
