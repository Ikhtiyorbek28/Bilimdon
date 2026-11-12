/* Bilimdon 3D avatars (three.js r160, loaded through the import map in the page).
   Characters, accessories and colour finishes are built from code - no model files.
   Loaded lazily by avatars.js; if it cannot load (no internet), the SVG avatars are used. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ---------- helpers ---------- */
const V3 = THREE.Vector3, Y = new V3(0,1,0), Z = new V3(0,0,1);
const SPH = new THREE.SphereGeometry(1, 40, 28);
const g = () => new THREE.Group();
const M = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: .38, clearcoat: .5, clearcoatRoughness: .25, ...o });
const Glow = (color, k = 2) => new THREE.MeshStandardMaterial({ color: '#000', emissive: color, emissiveIntensity: k });
const Cyl = (a, b, h, s = 32) => new THREE.CylinderGeometry(a, b, h, s);
const Cap = (r, l) => new THREE.CapsuleGeometry(r, l, 8, 20);
function add(p, geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; p.add(m); return m; }
function ball(p, mat, r, x = 0, y = 0, z = 0) { const m = add(p, SPH, mat, x, y, z); m.scale.setScalar(r); return m; }
function orient(o, n) { o.quaternion.setFromUnitVectors(Z, n.clone().normalize()); }
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function canvasTex(w, h, draw, rep = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 4; return t;
}

/* ---------- face parts ---------- */
const EYE_W = M('#ffffff', { roughness: .12, clearcoat: 1 });
const PUPIL = M('#111522', { roughness: .05, clearcoat: 1 });
const SHINE = new THREE.MeshBasicMaterial({ color: '#ffffff' });
const MOUTH = M('#3a0f22', { roughness: .4 });
const TONGUE = M('#ff6b81');
const CHEEK = new THREE.MeshStandardMaterial({ color: '#ff6f91', roughness: .8, transparent: true, opacity: .5, depthWrite: false });

function cuteEye(p, pos, n, r) {
  const e = g(); e.position.copy(pos); orient(e, n);
  const w = ball(e, EYE_W, r); w.scale.z = r * .55;
  const pu = ball(e, PUPIL, r * .6, 0, -r * .06, r * .3); pu.scale.z = r * .3;
  const s = ball(e, SHINE, r * .2, r * .22, r * .24, r * .5); s.castShadow = false;
  p.add(e); return e;
}
function mouth(p, pos, n, s, type = 'smile') {
  const m = g(); m.position.copy(pos).addScaledVector(n.clone().normalize(), .01); orient(m, n); p.add(m);
  if (type === 'smile') { const t = add(m, new THREE.TorusGeometry(.12 * s, .025 * s, 10, 24, Math.PI), MOUTH); t.rotation.z = Math.PI; }
  else if (type === 'o') { const o = ball(m, MOUTH, 1); o.scale.set(.08 * s, .1 * s, .03 * s); }
  else {
    add(m, new THREE.CircleGeometry(.14 * s, 32, Math.PI, Math.PI), MOUTH);
    const tg = ball(m, TONGUE, 1, 0, -.085 * s, .006); tg.scale.set(.07 * s, .035 * s, .01 * s);
  }
  return m;
}
function sphereFace(head, R, c = new V3(), o = {}) {
  const { eyeY = .1 * R, gap = .36 * R, er = .2 * R, mouth: mt = 'grin', three = false, cheeks = true } = o;
  const pt = (x, y, k = 1) => { const z = Math.sqrt(Math.max(R * R - x * x - y * y, 0)); const n = new V3(x, y, z).normalize(); return [n.clone().multiplyScalar(R * k).add(c), n]; };
  const eyes = [];
  const xs = three ? [-gap * 1.15, 0, gap * 1.15] : [-gap, gap];
  xs.forEach(x => { const mid = three && x === 0; const [p, n] = pt(x, mid ? eyeY + .24 * R : eyeY, .97); eyes.push(cuteEye(head, p, n, mid ? er * 1.15 : er)); });
  const [mp, mn] = pt(0, eyeY - .32 * R); mouth(head, mp, mn, R, mt);
  if (cheeks) [-1, 1].forEach(s => { const [p, n] = pt(s * (gap + .1 * R), eyeY - .22 * R); const ch = ball(head, CHEEK, 1); ch.position.copy(p); orient(ch, n); ch.scale.set(.1 * R, .065 * R, .02 * R); ch.castShadow = false; });
  return eyes;
}
function arm(p, x, y, mat, { len = .4, r = .085, hand = mat, hr = .12 } = {}) {
  const a = g(); a.position.set(x, y, 0); a.userData.side = Math.sign(x); p.add(a);
  add(a, Cap(r, len), mat, 0, -len / 2, 0); ball(a, hand, hr, 0, -len - r * .5, 0); return a;
}
function leg(p, x, mat, shoe, h = .38) {
  add(p, Cap(.1, h - .1), mat, x, h / 2 + .06, 0);
  const s = ball(p, shoe, 1, x, .09, .05); s.scale.set(.15, .1, .2);
}
function base(main) {
  const root = g(), body = g(); root.add(body);
  return { root, body, head: null, arms: [], legs: [], eyes: [], hide: [], mainMat: main, floatH: 0, waveAngle: 2.5, update: null, acc: null };
}
/* humanoid body (shirt, pants, sneakers, gloves) — the character sits on top as the head */
const GLOVE = M('#ffffff', { roughness: .45, sheen: .6, sheenColor: '#ffffff' });
const WHITE = M('#ffffff', { roughness: .4, clearcoat: .5 });
function humanoid(R, { headY, s = 1, neckTop = 1.3, shirt, pants, shoe }) {
  const B = R.body;
  const sh = M(shirt, { roughness: .6, sheen: .6, sheenColor: '#ffffff' }), pa = M(pants, { roughness: .65, sheen: .4 }), so = M(shoe, { roughness: .3, clearcoat: 1 });
  R.floatH = 0; R.head.position.y = headY; R.head.scale.setScalar(s); R.head.userData.s = s;
  R.legs = [1, -1].map(side => {
    const L = g(); L.position.set(side * .15, .6, 0); L.userData.side = side; B.add(L);
    add(L, Cap(.095, .36), pa, 0, -.27, 0);
    const shoeM = ball(L, so, 1, 0, -.5, .06); shoeM.scale.set(.14, .1, .21);
    const sole = ball(L, WHITE, 1, 0, -.565, .06); sole.scale.set(.15, .035, .22);
    const lace = ball(L, WHITE, 1, 0, -.44, .16); lace.scale.set(.06, .03, .04);
    return L;
  });
  const hip = ball(B, pa, 1, 0, .64, 0); hip.scale.set(.29, .17, .23);
  const torso = add(B, Cap(.27, .26), sh, 0, .9, 0); torso.scale.set(1.05, 1, .85);
  const col = add(B, new THREE.TorusGeometry(.15, .04, 12, 32), WHITE, 0, 1.22, 0); col.rotation.x = Math.PI / 2;
  const em = add(B, Cyl(.08, .08, .02, 32), R.mainMat, 0, .98, .23); em.rotation.x = Math.PI / 2;
  const nh = Math.max(neckTop - 1.18, .06); add(B, Cyl(.08, .09, nh, 16), R.mainMat, 0, 1.18 + nh / 2, 0);
  R.arms = [1, -1].map(side => {
    const a = g(); a.position.set(side * .33, 1.15, 0); a.userData.side = side; B.add(a);
    add(a, Cap(.08, .28), sh, 0, -.18, 0);
    const cuff = add(a, new THREE.TorusGeometry(.085, .028, 10, 24), GLOVE, 0, -.36, 0); cuff.rotation.x = Math.PI / 2;
    const palm = ball(a, GLOVE, 1, 0, -.46, 0); palm.scale.set(.12, .13, .1);
    ball(a, GLOVE, .05, -side * .02, -.42, .1);
    return a;
  });
  R.waveAngle = 2.5;
}

/* ---------- characters ---------- */
function robot(color) {
  const main = M(color, { metalness: .55, roughness: .26, clearcoat: 1 }), dark = M('#1a2032', { metalness: .5, roughness: .3, clearcoat: .6 });
  const scr = M('#070b16', { roughness: .08, clearcoat: 1 }), glow = Glow('#5cf2ff', 2.2);
  const R = base(main), B = R.body;
  [-1, 1].forEach(s => { add(B, Cyl(.1, .1, .36, 20), dark, s * .26, .28, 0); add(B, new RoundedBoxGeometry(.32, .14, .44, 3, .06), main, s * .26, .07, .05); });
  add(B, new RoundedBoxGeometry(.98, .78, .72, 4, .18), main, 0, .84, 0);
  const core = add(B, Cyl(.12, .12, .04, 32), glow, 0, .9, .37); core.rotation.x = Math.PI / 2;
  add(B, Cyl(.17, .2, .12, 24), dark, 0, 1.25, 0);
  const H = g(); H.position.y = 1.28; B.add(H); R.head = H;
  add(H, new RoundedBoxGeometry(1.15, .88, .88, 5, .24), main, 0, .45, 0);
  add(H, new RoundedBoxGeometry(.9, .56, .08, 4, .06), scr, 0, .46, .42);
  [-1, 1].forEach(s => {
    const e = g(); e.position.set(s * .2, .5, .47); add(e, Cap(.065, .09), glow); H.add(e); R.eyes.push(e);
    const ear = add(H, Cyl(.14, .14, .12, 24), dark, s * .6, .45, 0); ear.rotation.z = Math.PI / 2;
    R.hide.push(add(H, Cyl(.018, .018, .3, 8), dark, s * .62, .68, 0), ball(H, glow, .06, s * .62, .86, 0));
  });
  const sm = add(H, new THREE.TorusGeometry(.1, .022, 8, 24, Math.PI), glow, 0, .34, .47); sm.rotation.z = Math.PI;
  R.arms = [1, -1].map(s => arm(B, s * .6, 1.1, main, { len: .38, r: .08, hand: dark, hr: .12 }));
  R.ctx = { r: .6, topY: .9, cy: .45, eyeY: .5, faceZ: .47, fs: .6 };
  R.update = t => { glow.emissiveIntensity = 1.8 + Math.sin(t * 4) * .6; };
  return R;
}

function jelly(color) {
  const main = M(color, { transmission: .9, thickness: 1.4, roughness: .08, ior: 1.33, clearcoat: 1, attenuationColor: color, attenuationDistance: 1.2 });
  const R = base(main), H = g(); H.position.y = .72; R.body.add(H); R.head = H;
  const b = ball(H, main, .8); b.scale.y = .8 * .86;
  const bub = M('#eafff6', { roughness: .05, clearcoat: 1 }), rnd = rng(7);
  for (let i = 0; i < 6; i++) ball(H, bub, .03 + rnd() * .04, (rnd() - .5) * .9, (rnd() - .7) * .6, (rnd() - .5) * .5);
  R.eyes = sphereFace(H, .8, new V3(), { eyeY: .08, mouth: 'grin' });
  humanoid(R, { headY: 1.66, s: .75, shirt: '#ff8a3d', pants: '#2b3a67', shoe: '#3ee0ff' });
  R.ctx = { r: .8, topY: .66, cy: 0, eyeY: .08, faceZ: .78, fs: .75 };
  R.update = t => { const s = Math.sin(t * 3.2) * .05, b = H.userData.s || 1; H.scale.set(b * (1 + s * .6), b * (1 - s), b * (1 + s * .6)); };
  return R;
}

function alien(color) {
  const main = M(color, { roughness: .45, sheen: 1, sheenColor: '#ffffff', sheenRoughness: .4, clearcoat: .3 });
  const suit = M('#2a2f4a', { roughness: .35, metalness: .3, clearcoat: .8 }), glow = Glow('#ff5ce1', 2.4);
  const R = base(main), B = R.body;
  [-1, 1].forEach(s => leg(B, s * .17, main, suit, .36));
  add(B, Cap(.3, .3), suit, 0, .72, 0);
  const belt = add(B, Cyl(.305, .305, .05, 40), glow, 0, .62, 0); belt.castShadow = false;
  const H = g(); H.position.y = 1.55; B.add(H); R.head = H;
  const hb = ball(H, main, .72); hb.scale.x = .72 * 1.08;
  R.eyes = sphereFace(H, .72, new V3(), { three: true, eyeY: .02, gap: .25, er: .13, mouth: 'smile' });
  [-1, 1].forEach(s => { const a = g(); a.position.set(s * .28, .55, 0); a.rotation.z = -s * .45; H.add(a); add(a, Cyl(.025, .03, .45, 8), main, 0, .22, 0); ball(a, glow, .08, 0, .47, 0); R.hide.push(a); });
  R.arms = [1, -1].map(s => arm(B, s * .38, .95, main, { len: .34, r: .07, hr: .1 }));
  R.ctx = { r: .72, topY: .72, cy: 0, eyeY: .02, faceZ: .7, fs: .72 };
  return R;
}

function ghost(color) {
  const main = M(color, { roughness: .3, transmission: .25, thickness: .6, sheen: .6, sheenColor: '#ffffff', clearcoat: .6 });
  const R = base(main); R.floatH = .28; R.waveAngle = 2;
  const H = g(); H.position.y = .9; R.body.add(H); R.head = H;
  const geo = Cap(.7, .7), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < -.1) {
      const k = Math.min((-.1 - y) / .95, 1), f = 1 + k * .28; x *= f; z *= f;
      if (y < -.7) y = -.7 + (y + .7) * .25;
      y += Math.sin(Math.atan2(z, x) * 7) * .1 * k;
    }
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  add(H, geo, main);
  R.eyes = sphereFace(H, .7, new V3(0, .35, 0), { eyeY: .05, gap: .24, er: .14, mouth: 'o' });
  R.arms = [1, -1].map(s => { const a = g(); a.position.set(s * .72, 0, 0); a.userData.side = s; H.add(a); const n = ball(a, main, 1, 0, -.12, 0); n.scale.set(.13, .2, .13); return a; });
  R.ctx = { r: .7, topY: 1.03, cy: .35, eyeY: .4, faceZ: .66, fs: .66 };
  return R;
}

function astro(color) {
  const suit = M('#eef1f8', { roughness: .55, sheen: .5, sheenColor: '#ffffff' }), main = M(color, { roughness: .35, clearcoat: .8 });
  const skin = M('#ffd2b0', { roughness: .6, sheen: .4 }), glass = M('#cfeaff', { transmission: 1, roughness: .02, thickness: .08, ior: 1.15, clearcoat: 1 });
  const R = base(main), B = R.body;
  [-1, 1].forEach(s => leg(B, s * .2, suit, main, .4));
  add(B, Cap(.42, .32), suit, 0, .82, 0);
  add(B, new RoundedBoxGeometry(.42, .3, .12, 3, .05), main, 0, .86, .38);
  [['#5cf2ff', -.1], ['#ff5c7a', 0], ['#ffd23f', .1]].forEach(([c, x]) => ball(B, Glow(c, 2.2), .035, x, .88, .45));
  add(B, new RoundedBoxGeometry(.6, .62, .3, 3, .1), main, 0, .95, -.42);
  const H = g(); H.position.y = 1.58; B.add(H); R.head = H;
  ball(H, skin, .46);
  R.eyes = sphereFace(H, .46, new V3(), { eyeY: .04, gap: .17, er: .1, mouth: 'grin' });
  const gl = ball(H, glass, .68); gl.castShadow = false;
  const ring = add(H, new THREE.TorusGeometry(.5, .08, 16, 48), main, 0, -.5, 0); ring.rotation.x = Math.PI / 2;
  R.arms = [1, -1].map(s => arm(B, s * .52, 1.12, suit, { len: .36, r: .1, hand: main, hr: .13 }));
  R.ctx = { r: .68, topY: .68, cy: 0, eyeY: .05, faceZ: .68, fs: .6 };
  return R;
}

function mushroom(color) {
  const main = M(color, { roughness: .32, clearcoat: .9 }), stem = M('#f7ecd6', { roughness: .6, sheen: .5, sheenColor: '#ffffff' });
  const gill = M('#efd7ae', { roughness: .8 }), dot = M('#ffffff', { roughness: .4, clearcoat: .6 });
  const R = base(main), B = R.body;
  [-1, 1].forEach(s => { const f = ball(B, stem, 1, s * .2, .08, .08); f.scale.set(.16, .1, .22); });
  const H = g(); H.position.y = .6; B.add(H); R.head = H;
  add(H, Cyl(.42, .5, .95, 40), stem);
  const cap = add(H, new THREE.SphereGeometry(.88, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), main, 0, .42, 0); cap.scale.y = .72;
  const under = add(H, new THREE.CircleGeometry(.88, 48), gill, 0, .42, 0); under.rotation.x = Math.PI / 2;
  const rnd = rng(3);
  [[0, 0], [.9, .55], [2.1, .6], [3.3, .5], [4.4, .62], [5.5, .55], [1.5, 1.05], [3.9, 1.05], [5.2, 1.1], [.4, 1.15], [2.7, 1.1]].forEach(([th, ph]) => {
    const n = new V3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
    const d = ball(H, dot, 1); d.position.set(n.x * .88, n.y * .88 * .72 + .42, n.z * .88); orient(d, new V3(n.x, n.y / .72, n.z));
    d.scale.set(.1 + rnd() * .06, .1 + rnd() * .06, .03); d.castShadow = false;
  });
  [-1, 1].forEach(s => {
    const x = s * .17, z = Math.sqrt(.45 ** 2 - x * x);
    R.eyes.push(cuteEye(H, new V3(x, .12, z * .97), new V3(x, 0, z), .13));
    const cx = s * .28, cz = Math.sqrt(.46 ** 2 - cx * cx), ch = ball(H, CHEEK, 1); ch.position.set(cx, -.04, cz); orient(ch, new V3(cx, 0, cz)); ch.scale.set(.07, .045, .015);
  });
  mouth(H, new V3(0, -.08, .46), new V3(0, 0, 1), .5, 'grin');
  R.arms = [1, -1].map(s => arm(B, s * .5, .95, stem, { len: .25, r: .07, hr: .09 }));
  R.ctx = { r: .88, topY: 1.05, cy: .42, eyeY: .12, faceZ: .46, fs: .45 };
  return R;
}

function cactus(color) {
  const main = M(color, { roughness: .5, sheen: .6, sheenColor: '#d8ffd8', clearcoat: .3 }), pot = M('#d9774b', { roughness: .7 });
  const soil = M('#4a2e20', { roughness: 1 }), spike = M('#fff6d8', { roughness: .5 });
  const R = base(main), B = R.body; R.waveAngle = .6;
  add(B, Cyl(.46, .34, .5, 40), pot, 0, .25, 0);
  const rim = add(B, new THREE.TorusGeometry(.46, .06, 12, 40), pot, 0, .5, 0); rim.rotation.x = Math.PI / 2;
  const so = add(B, new THREE.CircleGeometry(.44, 40), soil, 0, .49, 0); so.rotation.x = -Math.PI / 2;
  const H = g(); H.position.y = 1.15; B.add(H); R.head = H;
  add(H, Cap(.4, .7), main);
  const rnd = rng(11), sg = new THREE.ConeGeometry(.022, .11, 6);
  for (let i = 0; i < 50; i++) {
    const th = rnd() * Math.PI * 2, h = -.35 + rnd() * 1.0; let n, p;
    if (h <= .35) { n = new V3(Math.cos(th), 0, Math.sin(th)); p = new V3(n.x * .4, h, n.z * .4); }
    else { const ph = (h - .35) / .65 * 1.3; n = new V3(Math.cos(th) * Math.cos(ph), Math.sin(ph), Math.sin(th) * Math.cos(ph)); p = n.clone().multiplyScalar(.4).add(new V3(0, .35, 0)); }
    if (n.z > .5 && h < .4 && h > -.3) continue;
    const m = add(H, sg, spike); m.position.copy(p.addScaledVector(n, .04)); m.quaternion.setFromUnitVectors(Y, n); m.castShadow = false;
  }
  [-1, 1].forEach(s => {
    const x = s * .15, z = Math.sqrt(.16 - x * x);
    R.eyes.push(cuteEye(H, new V3(x, .14, z * .97), new V3(x, 0, z), .12));
    const cx = s * .25, cz = Math.sqrt(.16 - cx * cx), ch = ball(H, CHEEK, 1); ch.position.set(cx, -.02, cz); orient(ch, new V3(cx, 0, cz)); ch.scale.set(.06, .04, .015);
  });
  mouth(H, new V3(0, -.06, .4), new V3(0, 0, 1), .45, 'smile');
  R.arms = [1, -1].map(s => {
    const a = g(); a.position.set(s * .36, 1.05, 0); a.userData.side = s; B.add(a);
    const h = add(a, Cap(.12, .18), main, s * .2, 0, 0); h.rotation.z = Math.PI / 2;
    add(a, Cap(.12, .26), main, s * .36, .22, 0); return a;
  });
  R.ctx = { r: .42, topY: 1.1, cy: .35, eyeY: .14, faceZ: .4, fs: .42 };
  return R;
}

function icecream(color) {
  const main = M(color, { roughness: .55, sheen: .8, sheenColor: '#ffffff', clearcoat: .2 });
  const R = base(main), B = R.body;
  const H = g(); B.add(H); R.head = H;
  ball(H, main, .64);
  for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2; ball(H, main, .13 + (i % 3) * .025, Math.cos(a) * .52, -.36 - (i % 3) * .05, Math.sin(a) * .52); }
  const rnd = rng(5), sg = new THREE.CapsuleGeometry(.018, .07, 4, 8);
  const sm = ['#ff4d5e', '#ffd23f', '#3ee0ff', '#7cff6b', '#ffffff', '#a37bff'].map(c => M(c, { roughness: .4 }));
  for (let i = 0; i < 44; i++) {
    const n = new V3(rnd() - .5, rnd() * .9 + .1, rnd() - .5).normalize(); if (n.z > .45 && n.y < .62) continue;
    const s = add(H, sg, sm[i % 6]); s.position.copy(n).multiplyScalar(.645);
    s.quaternion.setFromUnitVectors(Y, new V3(rnd() - .5, rnd() - .5, rnd() - .5).cross(n).normalize()); s.castShadow = false;
  }
  R.eyes = sphereFace(H, .64, new V3(), { eyeY: .02, mouth: 'grin' });
  humanoid(R, { headY: 1.72, s: .8, shirt: '#7b5cff', pants: '#2b2f45', shoe: '#ff4d6d' });
  R.ctx = { r: .64, topY: .62, cy: 0, eyeY: .02, faceZ: .62, fs: .6 };
  return R;
}

function planet(color) {
  const bands = canvasTex(8, 256, (c, w, h) => { const v = [255, 222, 245, 205, 240, 214, 250, 230]; for (let i = 0; i < 16; i++) { const k = v[i % 8]; c.fillStyle = `rgb(${k},${k},${k})`; c.fillRect(0, i * h / 16, w, h / 16); } });
  const main = M(color, { roughness: .45, map: bands, clearcoat: .4 });
  const ringM = M('#ffd38a', { roughness: .35, metalness: .2, side: THREE.DoubleSide, transparent: true, opacity: .9 });
  const R = base(main); R.floatH = .22;
  const H = g(); H.position.y = 1.0; R.body.add(H); R.head = H;
  ball(H, main, .74);
  R.eyes = sphereFace(H, .74, new V3(), { eyeY: .1, mouth: 'grin' });
  const ring = add(H, new THREE.RingGeometry(.98, 1.32, 96), ringM); ring.rotation.set(Math.PI / 2 + .3, 0, .18);
  const mp = g(); mp.rotation.z = .4; H.add(mp); ball(mp, M('#cfd3e0', { roughness: .8 }), .12, 1.6, 0, 0);
  R.update = t => { mp.rotation.y = t * 1.1; };
  humanoid(R, { headY: 1.84, s: .8, shirt: '#1f2a5a', pants: '#3e9bff', shoe: '#ffd23f' });
  R.ctx = { r: .74, topY: .74, cy: 0, eyeY: .1, faceZ: .72, fs: .7 };
  return R;
}

function fire(color) {
  const FH = 2.0;
  const rad = y => { const t = Math.min(Math.max(y / FH, 0), 1); return .72 * Math.sin(Math.PI * Math.pow(t, .5)) * (1 - .22 * t); };
  const pts = []; for (let i = 0; i <= 64; i++) { const y = i / 64 * FH; pts.push(new THREE.Vector2(rad(y), y)); }
  const geo = new THREE.LatheGeometry(pts, 72);
  // height gradient: pale-yellow core at the bottom -> orange -> red tip
  const stops = [[0, '#fff6b0'], [.3, '#ffc93a'], [.6, '#ff7a1a'], [1, '#ff2e12']].map(([t, c]) => [t, new THREE.Color(c)]);
  const pa = geo.attributes.position, cols = new Float32Array(pa.count * 3), tmp = new THREE.Color();
  for (let i = 0; i < pa.count; i++) {
    const t = pa.getY(i) / FH; let j = 0; while (j < stops.length - 2 && t > stops[j + 1][0]) j++;
    const [t0, c0] = stops[j], [t1, c1] = stops[j + 1];
    tmp.copy(c0).lerp(c1, Math.min(Math.max((t - t0) / (t1 - t0), 0), 1)).toArray(cols, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const time = { value: 0 };
  const main = new THREE.MeshPhysicalMaterial({ color, vertexColors: true, emissive: '#ff5200', emissiveIntensity: .45, roughness: .35, clearcoat: .6, sheen: .5, sheenColor: '#fff2a0' });
  main.onBeforeCompile = sh => {   // the upper part of the flame licks and sways
    sh.uniforms.uTime = time;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float fk = smoothstep(.9, 2.0, position.y);
      transformed.x += sin(position.y * 5.0 - uTime * 7.0) * .1 * fk;
      transformed.z += cos(position.y * 4.0 - uTime * 6.0) * .05 * fk;`);
  };
  main.customProgramCacheKey = () => 'flame-body';
  const R = base(main);
  const H = g(); R.body.add(H); R.head = H;
  const f = add(H, geo, main); f.castShadow = false;
  // translucent additive flame tongues around the body
  const tongueMat = new THREE.ShaderMaterial({
    uniforms: { uTime: time, uC1: { value: new THREE.Color('#ffd23f') }, uC2: { value: new THREE.Color('#ff2a0a') } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime; varying float vH; varying float vF;
      void main(){ vec3 p = position; float k = smoothstep(.2, 2.0, p.y);
        p.x += sin(p.y * 4.5 - uTime * 8.0) * .16 * k; p.z += cos(p.y * 3.7 - uTime * 6.5) * .1 * k;
        vH = p.y / 2.0; vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vF = pow(abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz))), 1.4);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uC1; uniform vec3 uC2; varying float vH; varying float vF;
      void main(){ vec3 c = mix(uC1, uC2, clamp(vH * 1.2, 0.0, 1.0)); float a = vF * (1.0 - smoothstep(.55, 1.0, vH)) * .85; gl_FragColor = vec4(c * a, a); }`
  });
  const tongues = [[0, 0, -.18, 1.12, 1.22, 0], [-.42, -.05, -.05, .55, .8, .38], [.42, -.05, -.05, .55, .8, -.38], [-.2, .1, -.25, .5, .95, .15], [.22, .1, -.25, .5, .9, -.18]]
    .map(([x, y, z, sw, shh, rz], i) => { const m = new THREE.Mesh(geo, tongueMat); m.position.set(x, y, z); m.scale.set(sw, shh, sw); m.rotation.z = rz; m.userData = { sw, shh, p: i * 1.7 }; H.add(m); return m; });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); }), color: '#ff7a1a', transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(3, 3.4, 1); halo.position.set(0, .9, -.4); H.add(halo);
  // face with determined little brows
  [-1, 1].forEach(s => {
    const r0 = rad(.72), x = s * .21, z = Math.sqrt(r0 * r0 - x * x);
    R.eyes.push(cuteEye(H, new V3(x, .72, z * .97), new V3(x, .15, z), .14));
    const b = add(H, Cap(.025, .12), M('#7a1a05', { roughness: .5 }), s * .21, .93, .52); b.rotation.z = Math.PI / 2 + s * .3; b.castShadow = false;
  });
  mouth(H, new V3(0, .48, rad(.48)), new V3(0, .1, 1), .6, 'grin');
  const eg = Glow('#ffb347', 3), em = [];
  for (let i = 0; i < 10; i++) { const e = ball(H, eg, .035); e.castShadow = false; e.userData = { o: i / 10, x: (Math.random() - .5) * 1.1, z: (Math.random() - .5) * .6 }; em.push(e); }
  humanoid(R, { headY: 1.2, s: .7, shirt: '#2a2f45', pants: '#3b3f58', shoe: '#ff7a1a' });
  const light = new THREE.PointLight('#ff8a3a', 6, 4, 2); light.position.set(0, 1.7, 1.0); R.body.add(light);
  R.update = t => {
    time.value = t;
    const fl = Math.sin(t * 11) * .02 + Math.sin(t * 17.3) * .015;
    f.scale.set(1 - fl * .5, 1 + fl, 1 - fl * .5);
    tongues.forEach(m => { const u = m.userData, k = 1 + Math.sin(t * 9 + u.p) * .08 + Math.sin(t * 14.7 + u.p * 2) * .05; m.scale.set(u.sw * (2 - k), u.shh * k, u.sw * (2 - k)); });
    halo.material.opacity = .45 + Math.sin(t * 10) * .08;
    main.emissiveIntensity = .45 + Math.sin(t * 9) * .1; light.intensity = 5 + Math.sin(t * 13) * 1.5;
    em.forEach(e => { const k = (t * .45 + e.userData.o) % 1; e.position.set(e.userData.x * (1 - k * .5) + Math.sin(t * 3 + e.userData.o * 9) * .08, .2 + k * 2.4, e.userData.z); e.scale.setScalar(.045 * (1 - k)); });
  };
  R.ctx = { r: .62, topY: 1.45, cy: .8, eyeY: .72, faceZ: .64, fs: .62 };
  return R;
}

function cloud(color) {
  const main = M(color, { roughness: .6, sheen: 1, sheenColor: '#ffffff', clearcoat: .2 });
  const R = base(main); R.floatH = .25;
  const H = g(); H.position.y = 1.0; R.body.add(H); R.head = H;
  ball(H, main, .62);
  const puffs = [[.58, -.12, -.05, .42], [-.58, -.12, -.05, .42], [.32, .32, -.2, .38], [-.32, .32, -.2, .38], [0, -.2, -.25, .5]].map(([x, y, z, r]) => ball(H, main, r, x, y, z));
  R.eyes = sphereFace(H, .62, new V3(), { eyeY: .06, mouth: 'grin' });
  humanoid(R, { headY: 1.74, s: .7, shirt: '#3e9bff', pants: '#ffd23f', shoe: '#ff4d6d' });
  R.ctx = { r: .62, topY: .62, cy: 0, eyeY: .06, faceZ: .6, fs: .58 };
  R.update = t => puffs.forEach((p, i) => p.scale.setScalar([.42, .42, .38, .38, .5][i] * (1 + Math.sin(t * 2 + i) * .04)));
  return R;
}

function crystal(color) {
  const main = M(color, { roughness: .08, metalness: .15, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1, flatShading: true });
  const R = base(main); R.floatH = .15;
  [-1, 1].forEach(s => { const f = add(R.body, new THREE.OctahedronGeometry(.16), main, s * .2, .12, 0); f.scale.y = .7; });
  const torso = add(R.body, new THREE.OctahedronGeometry(.42), main, 0, .66, 0); torso.scale.y = 1.25;
  const H = g(); H.position.y = 1.45; R.body.add(H); R.head = H;
  add(H, new THREE.IcosahedronGeometry(.7, 1), main);
  R.eyes = sphereFace(H, .66, new V3(), { eyeY: .05, mouth: 'smile' });
  R.arms = [1, -1].map(s => { const a = g(); a.position.set(s * .55, .95, 0); a.userData.side = s; R.body.add(a); add(a, new THREE.OctahedronGeometry(.13), main, 0, -.28, 0); return a; });
  const orb = g(); H.add(orb);
  const shards = [0, 1, 2].map(i => { const s = add(orb, new THREE.OctahedronGeometry(.08), Glow(['#5cf2ff', '#ff5ce1', '#ffd23f'][i], 2.2)); s.castShadow = false; return s; });
  R.update = t => shards.forEach((s, i) => { const a = t * 1.3 + i * 2.1; s.position.set(Math.cos(a) * 1.0, .1 + Math.sin(a * 1.5) * .25, Math.sin(a) * 1.0); s.rotation.y = t * 2; });
  R.ctx = { r: .66, topY: .68, cy: 0, eyeY: .05, faceZ: .64, fs: .6 };
  return R;
}

function cupcake(color) {
  const main = M(color, { roughness: .5, sheen: .8, sheenColor: '#ffffff', clearcoat: .3 });
  const wrap = M('#ffffff', { roughness: .45, clearcoat: .6, map: canvasTex(128, 16, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#ffd36b' : '#ffbf3f'; c.fillRect(i * w / 16, 0, w / 16, h); } }) });
  const R = base(main), B = R.body;
  const H = g(); B.add(H); R.head = H;
  add(H, Cyl(.5, .4, .36, 32), wrap, 0, -.44, 0);
  const fr = ball(H, main, .58); fr.scale.y = .58 * .85;
  const sw = add(H, new THREE.TorusGeometry(.32, .13, 16, 40), main, 0, .44, 0); sw.rotation.x = Math.PI / 2;
  ball(H, main, .2, 0, .58, 0);
  const cherry = g(); H.add(cherry); ball(cherry, M('#e8143c', { roughness: .1, clearcoat: 1 }), .11, 0, .82, 0);
  const st = add(cherry, Cyl(.012, .012, .2, 6), M('#5a8a2a'), .05, .98, 0); st.rotation.z = -.4;
  R.hide.push(cherry);
  const rnd = rng(9), sg = new THREE.CapsuleGeometry(.016, .06, 4, 8), sm = ['#ff4d5e', '#3ee0ff', '#7cff6b', '#ffffff'].map(c => M(c, { roughness: .4 }));
  for (let i = 0; i < 30; i++) {
    const n = new V3(rnd() - .5, rnd() * .8 + .2, rnd() - .5).normalize(); if (n.z > .4 && n.y < .55) continue;
    const s = add(H, sg, sm[i % 4]); s.position.set(n.x * .585, n.y * .5, n.z * .585);
    s.quaternion.setFromUnitVectors(Y, new V3(rnd() - .5, rnd() - .5, rnd() - .5).cross(n).normalize()); s.castShadow = false;
  }
  R.eyes = sphereFace(H, .58, new V3(), { eyeY: -.02, mouth: 'grin' });
  humanoid(R, { headY: 1.72, s: .75, shirt: '#ff5fa8', pants: '#5a3a2a', shoe: '#ffffff' });
  R.ctx = { r: .58, topY: .66, cy: .05, eyeY: -.02, faceZ: .56, fs: .55 };
  return R;
}

function dice(color) {
  const main = M(color, { roughness: .2, clearcoat: 1 }), pip = M('#ffffff', { roughness: .2, clearcoat: 1 }), dark = M('#262b3d', { roughness: .4 });
  const R = base(main), B = R.body;
  [-1, 1].forEach(s => leg(B, s * .25, dark, main, .34));
  const H = g(); H.position.y = .98; B.add(H); R.head = H;
  add(H, new RoundedBoxGeometry(1.1, 1.1, 1.1, 5, .2), main);
  const pips = (n, pts) => pts.forEach(([a, b]) => { const p = ball(H, pip, 1); const v = n.clone().multiplyScalar(.55); p.position.copy(v).add(n.x ? new V3(0, b, a) : n.z ? new V3(a, b, 0) : new V3(a, 0, b)); orient(p, n); p.scale.set(.09, .09, .025); p.castShadow = false; });
  pips(new V3(1, 0, 0), [[-.25, .25], [0, 0], [.25, -.25]]);
  pips(new V3(-1, 0, 0), [[-.22, .22], [.22, -.22]]);
  pips(new V3(0, 0, -1), [[-.25, .25], [.25, .25], [-.25, -.25], [.25, -.25]]);
  [-1, 1].forEach(s => {
    R.eyes.push(cuteEye(H, new V3(s * .22, .12, .54), new V3(0, 0, 1), .14));
    const ch = ball(H, CHEEK, 1); ch.position.set(s * .36, -.08, .555); ch.scale.set(.08, .05, .01);
  });
  mouth(H, new V3(0, -.14, .55), new V3(0, 0, 1), .6, 'grin');
  R.arms = [1, -1].map(s => arm(B, s * .62, .9, main, { len: .3, r: .07, hand: dark, hr: .1 }));
  R.ctx = { r: .6, topY: .55, cy: 0, eyeY: .12, faceZ: .55, fs: .6 };
  return R;
}

function star(color) {
  const sh = new THREE.Shape();
  for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .38 : .88; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: .3, bevelEnabled: true, bevelThickness: .12, bevelSize: .08, bevelSegments: 5, curveSegments: 4 }); geo.center();
  const main = M(color, { emissive: color, emissiveIntensity: .12, metalness: .3, roughness: .22, clearcoat: 1 }); main.userData.glow = true;
  const R = base(main); R.floatH = .2;
  const H = g(); H.position.y = 1.15; R.body.add(H); R.head = H;
  add(H, geo, main);
  [-1, 1].forEach(s => {
    R.eyes.push(cuteEye(H, new V3(s * .16, .08, .26), new V3(0, 0, 1), .12));
    const ch = ball(H, CHEEK, 1); ch.position.set(s * .27, -.08, .27); ch.scale.set(.06, .04, .01);
  });
  mouth(H, new V3(0, -.12, .27), new V3(0, 0, 1), .5, 'grin');
  const sp = g(); H.add(sp);
  const glints = [0, 1, 2, 3].map(i => { const s = add(sp, new THREE.OctahedronGeometry(.05), Glow('#fff6c2', 3)); s.castShadow = false; return s; });
  R.update = t => { H.rotation.y += Math.sin(t * 1.2) * .002; glints.forEach((s, i) => { const k = (t * .5 + i / 4) % 1, a = i * 1.6; s.position.set(Math.cos(a) * (.9 + k * .4), Math.sin(a) * (.9 + k * .4), 0); s.scale.setScalar(Math.sin(k * Math.PI)); }); };
  humanoid(R, { headY: 1.75, s: .75, neckTop: 1.5, shirt: '#a37bff', pants: '#2b2f45', shoe: '#ffd23f' });
  R.ctx = { r: .55, topY: .72, cy: 0, eyeY: .08, faceZ: .26, fs: .5 };
  return R;
}

function donut(color) {
  const dough = M('#e0a35a', { roughness: .6, sheen: .5 }), main = M(color, { roughness: .15, clearcoat: 1 }), dark = M('#6b3f1f', { roughness: .5 });
  const R = base(main), B = R.body;
  [-1, 1].forEach(s => leg(B, s * .22, dough, dark, .34));
  const H = g(); H.position.y = 1.08; B.add(H); R.head = H;
  const d = add(H, new THREE.TorusGeometry(.5, .28, 24, 64), dough); d.scale.z = .7;
  const gl = add(H, new THREE.TorusGeometry(.5, .3, 24, 64), main, 0, 0, .04); gl.scale.z = .7;
  const rnd = rng(13), sg = new THREE.CapsuleGeometry(.018, .07, 4, 8), sm = ['#ffd23f', '#3ee0ff', '#7cff6b', '#ffffff', '#a37bff'].map(c => M(c, { roughness: .4 }));
  for (let i = 0; i < 46; i++) {
    const f = rnd() * Math.PI * 2, ps = .3 + rnd() * 1.1;
    const df = Math.abs(Math.atan2(Math.sin(f - Math.PI / 2), Math.cos(f - Math.PI / 2))), dm = Math.abs(Math.atan2(Math.sin(f + Math.PI / 2), Math.cos(f + Math.PI / 2)));
    if (df < .75 || dm < .45) continue;
    const rr = .5 + .3 * Math.cos(ps), n = new V3(Math.cos(ps) * Math.cos(f), Math.cos(ps) * Math.sin(f), Math.sin(ps)).normalize();
    const s = add(H, sg, sm[i % 5]); s.position.set(Math.cos(f) * rr, Math.sin(f) * rr, .3 * Math.sin(ps) * .7 + .045);
    s.quaternion.setFromUnitVectors(Y, new V3(rnd() - .5, rnd() - .5, rnd() - .5).cross(n).normalize()); s.castShadow = false;
  }
  [-1, 1].forEach(s => R.eyes.push(cuteEye(H, new V3(s * .22, .45, .24), new V3(s * .1, .3, 1), .13)));
  mouth(H, new V3(0, -.5, .25), new V3(0, -.2, 1), .55, 'grin');
  R.arms = [1, -1].map(s => arm(B, s * .8, 1.0, dough, { len: .3, r: .07, hand: dark, hr: .1 }));
  R.ctx = { r: .72, topY: .78, cy: 0, eyeY: .45, faceZ: .24, fs: .55 };
  return R;
}

const CHARS = [
  { id: 'robot', name: 'Robo', color: '#4f8cff', build: robot },
  { id: 'jelly', name: 'Jeli', color: '#2fe08a', build: jelly },
  { id: 'alien', name: 'Zorp', color: '#8be04e', build: alien },
  { id: 'ghost', name: 'Arvoh', color: '#c9b8ff', build: ghost },
  { id: 'astro', name: 'Kosmo', color: '#ff8a3d', build: astro },
  { id: 'mushroom', name: 'Qo‘ziqorin', color: '#ff4d5e', build: mushroom },
  { id: 'cactus', name: 'Kaktus', color: '#3fbf6a', build: cactus },
  { id: 'icecream', name: 'Muzqaymoq', color: '#ff8fc8', build: icecream },
  { id: 'planet', name: 'Sayyora', color: '#8a6bff', build: planet },
  { id: 'fire', name: 'Olov', color: '#ffffff', build: fire },
  { id: 'cloud', name: 'Bulut', color: '#e8f0ff', build: cloud },
  { id: 'crystal', name: 'Kristall', color: '#7fe3ff', build: crystal },
  { id: 'cupcake', name: 'Keks', color: '#ffb3d9', build: cupcake },
  { id: 'dice', name: 'Kubik', color: '#ff5c8a', build: dice },
  { id: 'star', name: 'Yulduz', color: '#ffcc33', build: star },
  { id: 'donut', name: 'Donut', color: '#ff7ab8', build: donut },
];

/* ---------- accessories (built for a head of radius 1) ---------- */
const ACCS = [
  { id: 'none', name: 'Yo‘q' },
  { id: 'tophat', name: 'Silindr', at: 'top', build() {
    const G = g(), k = M('#1b1b26', { roughness: .45, clearcoat: .6 });
    add(G, Cyl(.8, .8, .05, 48), k, 0, .03, 0); add(G, Cyl(.47, .5, .78, 48), k, 0, .44, 0); add(G, Cyl(.512, .512, .15, 48), M('#ff4d6d', { roughness: .5 }), 0, .13, 0);
    G.rotation.z = -.14; return G; } },
  { id: 'party', name: 'Bayram', at: 'top', build() {
    const G = g(), tex = canvasTex(64, 64, (c, w, h) => { const cs = ['#ffd23f', '#ff4d8d', '#3ee0ff', '#7cff6b']; for (let i = 0; i < 8; i++) { c.fillStyle = cs[i % 4]; c.fillRect(0, i * h / 8, w, h / 8); } });
    add(G, new THREE.ConeGeometry(.4, .95, 40), M('#ffffff', { map: tex, roughness: .45, clearcoat: .5 }), 0, .47, 0);
    ball(G, M('#ffffff', { roughness: .9, sheen: 1, sheenColor: '#ffffff' }), .13, 0, .97, 0); G.rotation.z = .22; return G; } },
  { id: 'halo', name: 'Nur halqa', at: 'top', build() {
    const G = g(), h = add(G, new THREE.TorusGeometry(.55, .06, 16, 64), Glow('#ffd76a', 2.6), 0, .38, 0); h.rotation.x = Math.PI / 2; h.castShadow = false;
    G.userData.update = t => { h.position.y = .38 + Math.sin(t * 2.4) * .06; h.rotation.y = Math.sin(t * 1.3) * .15; }; return G; } },
  { id: 'phones', name: 'Quloqchin', at: 'center', build() {
    const G = g(), d = M('#20242f', { roughness: .3, metalness: .4, clearcoat: 1 }), a = M('#ff4d8d', { roughness: .3, clearcoat: 1 });
    add(G, new THREE.TorusGeometry(1.06, .07, 14, 64, Math.PI), d);
    [-1, 1].forEach(s => { const c = add(G, Cyl(.3, .3, .24, 40), a, s * 1.06, 0, 0); c.rotation.z = Math.PI / 2; const r = add(G, new THREE.TorusGeometry(.2, .035, 10, 32), Glow('#5cf2ff', 2.5), s * 1.19, 0, 0); r.rotation.y = Math.PI / 2; });
    return G; } },
  { id: 'shades', name: 'Ko‘zoynak', at: 'face', build() {
    const G = g(), f = M('#ffd23f', { metalness: .8, roughness: .2 }), l = M('#0b0d18', { metalness: .9, roughness: .05, iridescence: 1, iridescenceIOR: 1.8, clearcoat: 1 });
    [-1, 1].forEach(s => { const L = add(G, Cyl(.27, .27, .05, 40), l, s * .34, 0, .12); L.rotation.x = Math.PI / 2; add(G, new THREE.TorusGeometry(.27, .035, 10, 40), f, s * .34, 0, .12); });
    add(G, new THREE.BoxGeometry(.16, .04, .04), f, 0, .06, .13); return G; } },
  { id: 'prop', name: 'Parrak', at: 'top', build() {
    const G = g(), cap = add(G, new THREE.SphereGeometry(.62, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), M('#3e7bff', { roughness: .4, clearcoat: .7 }), 0, -.12, 0); cap.scale.y = .75;
    add(G, new THREE.TorusGeometry(.6, .05, 10, 48), M('#ffd23f'), 0, -.1, 0).rotation.x = Math.PI / 2;
    add(G, Cyl(.035, .035, .26, 10), M('#d0d6e6', { metalness: .8, roughness: .2 }), 0, .42, 0);
    const P = g(); P.position.y = .55; G.add(P);
    [M('#ff4d5e'), M('#ffd23f')].forEach((m, i) => { const b = add(P, new RoundedBoxGeometry(.95, .03, .16, 2, .015), m); b.rotation.set(.25, i * Math.PI / 2, 0); });
    ball(P, M('#ff4d5e'), .06); G.userData.update = t => { P.rotation.y = t * 12; }; return G; } },
  { id: 'horns', name: 'Shoxlar', at: 'top', build() {
    const G = g(), m = M('#e8344a', { roughness: .25, clearcoat: 1 });
    [-1, 1].forEach(s => { const c = add(G, new THREE.ConeGeometry(.12, .42, 24), m, s * .42, .08, 0); c.rotation.z = -s * .45; }); return G; } },
  { id: 'bow', name: 'Bant', at: 'top', build() {
    const W = g(), G = g(), m = M('#ff5fa8', { roughness: .35, clearcoat: .8, sheen: .6 }); W.add(G); G.position.set(.38, -.05, .1); G.rotation.z = -.35;
    [-1, 1].forEach(s => { const c = add(G, new THREE.ConeGeometry(.2, .36, 24), m, s * .19, 0, 0); c.rotation.z = s * Math.PI / 2; c.scale.z = .5; });
    ball(G, m, .1); return W; } },
  { id: 'orbit', name: 'Yulduzlar', at: 'center', build() {
    const G = g(); G.rotation.x = .35;
    const st = ['#ffd23f', '#5cf2ff', '#ff5ca8'].map(c => { const s = add(G, new THREE.OctahedronGeometry(.14), Glow(c, 2.4)); s.castShadow = false; return s; });
    G.userData.update = t => st.forEach((s, i) => { const a = t * 1.6 + i * Math.PI * 2 / 3; s.position.set(Math.cos(a) * 1.45, Math.sin(a * 2) * .15 + .35, Math.sin(a) * 1.45); s.rotation.y = t * 3; });
    G.userData.update(0); return G; } },
  { id: 'chef', name: 'Oshpaz', at: 'top', build() {
    const G = g(), w = M('#ffffff', { roughness: .85, sheen: 1, sheenColor: '#ffffff' });
    add(G, Cyl(.56, .56, .32, 40), w, 0, .1, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ball(G, w, .3, Math.cos(a) * .32, .45, Math.sin(a) * .32); }
    ball(G, w, .36, 0, .6, 0); return G; } },
  { id: 'vr', name: 'VR', at: 'face', build() {
    const G = g();
    add(G, new RoundedBoxGeometry(1.0, .44, .34, 4, .13), M('#f2f4fa', { roughness: .3, clearcoat: 1 }), 0, 0, .12);
    add(G, new RoundedBoxGeometry(.84, .28, .04, 3, .02), M('#0b0d18', { roughness: .05, clearcoat: 1, iridescence: 1 }), 0, 0, .29);
    const strip = add(G, new THREE.BoxGeometry(.6, .05, .02), Glow('#5cf2ff', 3), 0, 0, .315);
    G.userData.update = t => { strip.scale.x = .6 + .4 * Math.abs(Math.sin(t * 2)); }; return G; } },
  { id: 'stache', name: 'Mo‘ylov', at: 'face', build() {
    const G = g(), m = M('#3b2414', { roughness: .6, sheen: .5 });
    [-1, 1].forEach(s => { const a = ball(G, m, 1, s * .15, -.24, .12); a.scale.set(.17, .07, .06); a.rotation.z = s * .25; ball(G, m, .06, s * .3, -.19, .1); });
    return G; } },
  { id: 'mask', name: 'Qahramon niqobi', at: 'face', build() {
    const G = g(), m = M('#e8344a', { roughness: .35, clearcoat: 1, side: THREE.DoubleSide });
    add(G, new THREE.CylinderGeometry(1.03, 1.03, .4, 48, 1, true, -.9, 1.8), m, 0, .02, -.97);
    [-1, 1].forEach(s => { const t = add(G, Cap(.05, .3), m, s * .1, 0, -1.9); t.rotation.set(.5, 0, s * .6); });
    return G; } },
  { id: 'ninja', name: 'Ninja lenta', at: 'center', build() {
    const G = g(), m = M('#1f2438', { roughness: .45, sheen: .6 });
    const b = add(G, new THREE.TorusGeometry(.95, .08, 12, 64), m, 0, .38, 0); b.rotation.x = Math.PI / 2; b.scale.z = 1.6;
    const tails = [-1, 1].map(s => { const t = g(); t.position.set(s * .08, .38, -.93); G.add(t); const r = add(t, Cap(.06, .4), m, 0, -.25, 0); r.scale.set(1.6, 1, .4); t.rotation.z = s * .5; return t; });
    G.userData.update = t => tails.forEach((x, i) => { x.rotation.x = .4 + Math.sin(t * 6 + i) * .2; }); return G; } },
  { id: 'rainbow', name: 'Kamalak', at: 'top', build() {
    const G = g();
    ['#ff4d5e', '#ff9f1a', '#ffd23f', '#2fe08a', '#3e9bff', '#a37bff'].forEach((c, i) => add(G, new THREE.TorusGeometry(.75 - i * .07, .036, 10, 48, Math.PI), M(c, { emissive: c, emissiveIntensity: .25, roughness: .3 }), 0, .05, 0));
    const w = M('#ffffff', { roughness: .7, sheen: 1, sheenColor: '#ffffff' });
    [-1, 1].forEach(s => [0, 1, 2].forEach(j => ball(G, w, .13 - j * .02, s * (.55 + j * .1), .02 + j * .03, 0)));
    return G; } },
  { id: 'raincloud', name: 'Yomg‘ir bulut', at: 'top', build() {
    const G = g(), w = M('#dfe6f5', { roughness: .7, sheen: 1, sheenColor: '#ffffff' }), dm = M('#7cc8ff', { roughness: .1, clearcoat: 1 });
    [[0, .78, .28], [.25, .72, .22], [-.25, .72, .22], [.12, .92, .2], [-.1, .9, .18]].forEach(([x, y, r]) => ball(G, w, r, x, y, 0));
    const drops = [-.2, 0, .2].map((x, i) => { const d = add(G, Cap(.03, .05), dm, x, .5, 0); d.castShadow = false; d.userData.o = i * .33; return d; });
    G.userData.update = t => drops.forEach(d => { const k = (t * 1.2 + d.userData.o) % 1; d.position.y = .5 - k * .45; d.visible = k < .85; });
    G.userData.update(0); return G; } },
  { id: 'wings', name: 'Qanotchalar', at: 'center', build() {
    const G = g(), m = M('#ffffff', { roughness: .35, sheen: 1, sheenColor: '#cfe8ff', clearcoat: .6 });
    const ws = [-1, 1].map(s => { const w = g(); w.position.set(s * .95, .15, -.1); w.userData.s = s; G.add(w);
      [0, 1, 2].forEach(j => { const f = ball(w, m, 1, s * (.18 + j * .12), .12 + j * .05, 0); f.scale.set(.22 - j * .03, .07, .045); f.rotation.z = s * (.5 + j * .25); }); return w; });
    G.userData.update = t => ws.forEach(w => { w.rotation.y = w.userData.s * (Math.sin(t * 8) * .35 - .2); }); return G; } },
];

function attachAcc(R, id) {
  if (R.acc) { R.acc.parent?.remove(R.acc); R.acc = null; }
  const def = ACCS.find(a => a.id === id);
  const covers = def && (def.at === 'top' || def.at === 'center');
  R.hide.forEach(o => o.visible = !covers);
  if (!def || !def.build) return;
  const o = def.build(), c = R.ctx;
  if (def.at === 'top') { o.position.set(0, c.topY - .05 * c.r, 0); o.scale.setScalar(c.r); }
  else if (def.at === 'center') { o.position.set(0, c.cy, 0); o.scale.setScalar(c.r); }
  else { o.position.set(0, c.eyeY, c.faceZ); o.scale.setScalar(c.fs); }
  R.head.add(o); R.acc = o;
}
/* ---------- special finishes ---------- */
const texCache = {};
function gradTex(key, stops, o = {}) {
  return texCache[key] || (texCache[key] = canvasTex(256, 256, (c, w, h) => {
    const gr = o.horizontal ? c.createLinearGradient(0, 0, w, 0) : c.createLinearGradient(0, 0, 0, h);
    stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s)); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    const r = rng(o.seed || 4);
    if (o.stars) for (let i = 0; i < 240; i++) { c.fillStyle = `rgba(255,255,255,${.35 + r() * .65})`; c.beginPath(); c.arc(r() * w, r() * h, r() * 1.8 + .4, 0, 7); c.fill(); }
    if (o.cracks) { c.strokeStyle = '#ffb000'; c.lineWidth = 3; c.shadowColor = '#ff5a00'; c.shadowBlur = 10;
      for (let i = 0; i < 16; i++) { c.beginPath(); let x = r() * w, y = r() * h; c.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (r() - .5) * 70; y += (r() - .5) * 70; c.lineTo(x, y); } c.stroke(); } }
    if (o.camo) for (let i = 0; i < 40; i++) { c.fillStyle = o.camo[i % o.camo.length]; c.beginPath(); c.ellipse(r() * w, r() * h, 12 + r() * 26, 8 + r() * 18, r() * 3, 0, 7); c.fill(); }
  }));
}
const FINISH = {
  gold: { name: 'Oltin', css: 'linear-gradient(135deg,#fff3b0,#ffc94a 45%,#a8740b)', p: () => ({ color: '#ffc94a', metalness: 1, roughness: .18 }) },
  chrome: { name: 'Xrom', css: 'linear-gradient(135deg,#ffffff,#9aa3b5 50%,#eef1f8 70%,#5d6577)', p: () => ({ color: '#eef1f8', metalness: 1, roughness: .04 }) },
  holo: { name: 'Gologramma', css: 'linear-gradient(135deg,#a0f0ff,#e3a6ff,#fff3a6,#a6ffcf)', p: () => ({ color: '#ffffff', map: gradTex('holo', ['#9eeeff', '#e3a6ff', '#fff3a6', '#a6ffcf', '#9eb8ff']), metalness: .45, roughness: .12, iridescence: 1, iridescenceIOR: 2.1, clearcoat: 1 }) },
  pearl: { name: 'Marvarid', css: 'radial-gradient(circle at 35% 30%,#ffffff,#ffe9f3 50%,#d9c8e8)', p: () => ({ color: '#fff4f8', roughness: .22, iridescence: .6, iridescenceIOR: 1.5, sheen: 1, clearcoat: 1 }) },
  neon: { name: 'Neon', css: 'radial-gradient(circle,#c9ffe3,#2bff88 55%,#0a8f4a)', p: () => ({ color: '#2bff88', emissiveColor: '#2bff88', emissiveIntensity: .9, roughness: .3 }) },
  galaxy: { name: 'Galaktika', css: 'radial-gradient(circle at 30% 30%,#fff 0 2%,transparent 3%),radial-gradient(circle at 70% 60%,#fff 0 2%,transparent 3%),linear-gradient(135deg,#1a0b3d,#3b1c8c,#0b4d8c)',
    p: () => { const t = gradTex('galaxy', ['#1a0b3d', '#3b1c8c', '#0b4d8c', '#5a1c8c', '#1a0b3d'], { stars: true }); return { color: '#ffffff', map: t, emissiveMap: t, emissiveColor: '#ffffff', emissiveIntensity: .35, roughness: .25, clearcoat: 1 }; } },
  rainbow: { name: 'Kamalak', css: 'linear-gradient(135deg,#ff4d5e,#ff9f1a,#ffd23f,#2fe08a,#3e9bff,#a37bff)',
    p: () => ({ color: '#ffffff', map: gradTex('rainbow', ['#ff4d5e', '#ff9f1a', '#ffd23f', '#2fe08a', '#3e9bff', '#a37bff', '#ff4d5e'], { horizontal: true }), roughness: .25, clearcoat: 1 }) },
  sunset: { name: 'Shom', css: 'linear-gradient(180deg,#ffd23f,#ff7a5c,#ff4d8d,#7b3cff)',
    p: () => ({ color: '#ffffff', map: gradTex('sunset', ['#ffd23f', '#ff7a5c', '#ff4d8d', '#7b3cff']), roughness: .3, clearcoat: 1 }) },
  ocean: { name: 'Okean', css: 'linear-gradient(180deg,#5cf2ff,#2b8cff,#1b2fa8)',
    p: () => ({ color: '#ffffff', map: gradTex('ocean', ['#a8fff5', '#5cf2ff', '#2b8cff', '#1b2fa8']), roughness: .2, clearcoat: 1 }) },
  lava: { name: 'Lava', css: 'radial-gradient(circle at 40% 40%,#ffb000 0 8%,transparent 12%),linear-gradient(135deg,#4a1208,#2a0a05)',
    p: () => { const t = gradTex('lava', ['#4a1208', '#2a0a05', '#3a0e06'], { cracks: true, seed: 8 }); return { color: '#ffffff', map: t, emissiveMap: t, emissiveColor: '#ffffff', emissiveIntensity: 1.2, roughness: .55 }; } },
  camo: { name: 'Kamuflyaj', css: 'radial-gradient(circle at 30% 30%,#3d5a2a 0 20%,transparent 22%),radial-gradient(circle at 70% 65%,#2a2d1f 0 18%,transparent 20%),#6b8a4a',
    p: () => ({ color: '#ffffff', map: gradTex('camo', ['#6b8a4a', '#6b8a4a'], { camo: ['#3d5a2a', '#2a2d1f', '#a3a36b'], seed: 21 }), roughness: .7, clearcoat: .1 }) },
  candy: { name: 'Konfet', css: 'repeating-linear-gradient(45deg,#ff4d6d 0 8px,#ffffff 8px 16px)',
    p: () => ({ color: '#ffffff', map: texCache.candy || (texCache.candy = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff4d6d'; for (let i = -h; i < w; i += 40) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 20, 0); c.lineTo(i + 20 + h, h); c.lineTo(i + h, h); c.fill(); } }, [2, 1])), roughness: .15, clearcoat: 1 }) },
};
const FKEYS = ['metalness', 'roughness', 'iridescence', 'iridescenceIOR', 'emissiveIntensity', 'sheen', 'clearcoat'];
function applyColor(R, c) {
  const m = R.mainMat;
  if (!m.userData.orig) { const o = {}; FKEYS.forEach(k => o[k] = m[k]); o.map = m.map; o.emissiveMap = m.emissiveMap; o.emissive = m.emissive.clone(); m.userData.orig = o; }
  const o = m.userData.orig;
  FKEYS.forEach(k => { if (o[k] !== undefined) m[k] = o[k]; }); m.map = o.map; m.emissiveMap = o.emissiveMap; m.emissive.copy(o.emissive);
  const f = FINISH[c], p = f ? f.p() : null, col = p ? p.color : c;
  if (p) for (const k in p) { if (k === 'color') continue; if (k === 'emissiveColor') m.emissive.set(p[k]); else m[k] = p[k]; }
  m.color.set(col);
  if (m.transmission > 0 && m.attenuationColor) m.attenuationColor.set(col);
  if (m.userData.glow && !(p && p.emissiveColor)) m.emissive.set(col);
  if (R.light) R.light.color.set(col);
  m.needsUpdate = true;
}


/* ====================================================================================
   Engine for the site: avatar tokens, still pictures for lists, and the live picker stage.
   A 3D avatar is stored as the token "3d:<character>.<accessory>.<colour>", where colour is
   "x" (the character's own colour), a finish name ("gold", "galaxy", …) or 6 hex digits.
   ==================================================================================== */
export const SWATCHES = ['#4f8cff', '#22d3ee', '#2fe08a', '#8be04e', '#ffcc33', '#ff7a1a', '#ff4d5e', '#ff8fc8', '#a37bff', '#f4f6fb', '#2b2f3a', ...Object.keys(FINISH)];
export const CHAR_LIST = CHARS.map(({ id, name, color }) => ({ id, name, color }));
export const ACC_LIST = ACCS.map(({ id, name }) => ({ id, name }));
export const FINISH_LIST = Object.fromEntries(Object.entries(FINISH).map(([k, f]) => [k, { name: f.name, css: f.css }]));

export function parseToken(tok) {
  const m = /^3d:([a-z]+)\.([a-z]+)\.([a-z]+|[0-9a-f]{6})$/.exec(tok || '');
  if (!m || !CHARS.some(c => c.id === m[1]) || !ACCS.some(a => a.id === m[2])) return null;
  const col = m[3] === 'x' ? null : /^[0-9a-f]{6}$/.test(m[3]) ? '#' + m[3] : FINISH[m[3]] ? m[3] : null;
  return { char: m[1], acc: m[2], color: col };
}
export function makeToken({ char, acc = 'none', color = null }) {
  return `3d:${char}.${acc || 'none'}.${!color ? 'x' : color[0] === '#' ? color.slice(1).toLowerCase() : color}`;
}
export function buildAvatar(cfg) {
  const d = CHARS.find(c => c.id === cfg.char) || CHARS[0];
  const R = d.build(d.color);
  if (cfg.color) applyColor(R, cfg.color);
  attachAcc(R, cfg.acc || 'none');
  return R;
}
function disposeTree(o) {
  o.traverse(m => {
    if (m.geometry && m.geometry !== SPH) m.geometry.dispose();
    const mats = m.material ? [].concat(m.material) : [];
    mats.forEach(x => { if (x.map && !Object.values(texCache).includes(x.map)) x.map.dispose(); });
  });
}

/* ---------- scene ---------- */
function setupScene(r) {
  const s = new THREE.Scene();
  s.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), .04).texture;
  const key = new THREE.DirectionalLight('#ffffff', 2.0); key.position.set(3, 6, 4); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -3, right: 3, top: 4, bottom: -2, near: .5, far: 20 });
  key.shadow.bias = -.0004; key.shadow.radius = 4; s.add(key);
  const rim = new THREE.DirectionalLight('#ffb27a', 2.0); rim.position.set(-4, 3, -4); s.add(rim);
  const rim2 = new THREE.DirectionalLight('#c58bff', 1.3); rim2.position.set(4, 2, -3); s.add(rim2);
  s.add(new THREE.HemisphereLight('#ffe3cc', '#2a1d18', .5));
  return s;
}
function makeRenderer(opts) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, ...opts });
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; return r;
}

/* ---------- still pictures (one shared offscreen renderer, cached per token) ---------- */
let tR = null, tS = null;
const tC = new THREE.PerspectiveCamera(30, 1, .1, 50);
const thumbs = new Map();
function thumbRenderer(px) {
  if (!tR) {
    tR = makeRenderer({ preserveDrawingBuffer: true }); tR.setPixelRatio(1); tS = setupScene(tR);
    tR.domElement.addEventListener('webglcontextlost', () => { tR = null; });
  }
  if (tR.domElement.width !== px) tR.setSize(px, px);
  return tR;
}
function shoot(obj, px, cam, target) {
  const r = thumbRenderer(px);
  tS.add(obj); obj.updateMatrixWorld(true);
  tC.position.copy(cam); tC.lookAt(target); r.render(tS, tC);
  const url = r.domElement.toDataURL('image/png');
  tS.remove(obj); return url;
}
/* mode "full": the whole character; "face": head and shoulders, for small badges */
export function cachedThumb(token, mode = 'full') { return thumbs.get(token + '|' + mode) || null; }
export function thumbFor(token, mode = 'full', px = 256) {
  const key = token + '|' + mode;
  if (thumbs.has(key)) return thumbs.get(key);
  const cfg = parseToken(token); if (!cfg) return null;
  const R = buildAvatar(cfg); R.update?.(.6); R.acc?.userData.update?.(.5);
  R.root.updateMatrixWorld(true);
  let url;
  if (mode === 'face') {
    const c = R.ctx, s = R.head.scale.x;
    const ctr = R.head.localToWorld(new V3(0, c.cy, 0)), rad = Math.max(c.r * s, .35);
    url = shoot(R.root, px, ctr.clone().add(new V3(rad * .9, rad * .35, rad * 5.6)), ctr.clone().add(new V3(0, -rad * .3, 0)));
  } else url = shoot(R.root, px, new V3(1.2, 1.9, 6.2), new V3(0, 1.28, 0));
  disposeTree(R.root);
  thumbs.set(key, url); return url;
}
/* picker grid pictures: a character in its own colour, an accessory on a plain grey head */
export function charThumb(id) { return thumbFor(makeToken({ char: id }), 'full', 200); }
const accThumbs = {};
export function accThumb(id) {
  if (accThumbs[id]) return accThumbs[id];
  const head = g(); ball(head, M('#d6d9e4', { roughness: .6 }), 1);
  attachAcc({ head, hide: [], ctx: { r: 1, topY: 1, cy: 0, eyeY: .15, faceZ: .93, fs: .92 } }, id);
  head.children.forEach(ch => ch.userData.update?.(.5));
  return (accThumbs[id] = shoot(head, 160, new V3(1.5, 1.3, 7.2), new V3(0, .5, 0)));
}

/* ---------- the live stage (avatar picker) ---------- */
const DUR = { pop: .55, hop: .4, jump: .9, wave: 1.6, dance: 2.4, spin: 1.0 };
const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const backOut = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const envl = a => Math.min(1, a * 5, (1 - a) * 5);
const ACT = {
  pop(R, a) { R.root.scale.setScalar(.4 + .6 * backOut(a)); },
  hop(R, a) { R.root.position.y = Math.sin(a * Math.PI) * .22; },
  jump(R, a) {
    const h = Math.sin(a * Math.PI); R.root.position.y = h * .9;
    const sq = a < .12 ? 1 - Math.sin(a / .12 * Math.PI) * .18 : a > .88 ? 1 - Math.sin((a - .88) / .12 * Math.PI) * .18 : 1 + h * .08;
    R.root.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    R.legs.forEach(l => l.rotation.x = -h * .5);
  },
  wave(R, a, t) {
    const e = envl(a);
    if (R.arms.length) { const ar = R.arms[0], s = ar.userData.side; ar.rotation.z = s * (.12 * (1 - e) + e * (R.waveAngle + Math.sin(t * 14) * .3)); R.head.rotation.z = -.12 * e; }
    else R.root.rotation.z = Math.sin(a * Math.PI * 6) * .18 * e;
  },
  dance(R, a) {
    const e = envl(a), b = a * Math.PI * 8;
    R.root.rotation.z = Math.sin(b) * .16 * e; R.root.position.x = Math.sin(a * Math.PI * 4) * .25 * e; R.root.position.y = Math.abs(Math.sin(b)) * .15 * e;
    R.arms.forEach((ar, i) => ar.rotation.z = ar.userData.side * (.12 + e * (1.2 + Math.sin(b + i * Math.PI) * .9) * (R.waveAngle / 2.5)));
    R.head.rotation.z = -Math.sin(b) * .15 * e;
    R.legs.forEach((l, i) => l.rotation.x = Math.sin(b + i * Math.PI) * .45 * e);
  },
  spin(R, a) { R.root.rotation.y = ease(a) * Math.PI * 2; R.root.position.y = Math.sin(a * Math.PI) * .35; },
};

export function createStage(el, cfg) {
  const renderer = makeRenderer();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'av3-canvas';
  el.prepend(renderer.domElement);
  const scene = setupScene(renderer);
  const decor = g(); scene.add(decor);
  const plat = add(decor, Cyl(1.45, 1.55, .2, 72), M('#2a211b', { metalness: .35, roughness: .3, clearcoat: 1 }), 0, -.1, 0); plat.castShadow = false;
  const ring = add(decor, new THREE.TorusGeometry(1.5, .025, 12, 96), Glow('#ff7a1a', 3)); ring.rotation.x = Math.PI / 2; ring.castShadow = false;

  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100); camera.position.set(0, 1.75, 6.6);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.25, 0); Object.assign(controls, { enablePan: false, enableZoom: false, enableDamping: true, minPolarAngle: 1.0, maxPolarAngle: 1.7, rotateSpeed: .7 });
  controls.update();
  const ro = new ResizeObserver(() => {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = camera.aspect < 1 ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(16)) / camera.aspect)) : 32;
    camera.updateProjectionMatrix();
  });
  ro.observe(el);

  const rigs = {}; let cur = null, state = { char: 'robot', acc: 'none', color: null };
  let T = 0, act = null, nextBlink = 1.5, blinkAt = -1, raf = 0;
  const look = new THREE.Vector2(), clock = new THREE.Clock();
  const play = name => { if (DUR[name]) act = { name, t0: T, dur: DUR[name] }; };
  function set(next) {
    const n = { ...state, ...next };
    if (!CHARS.some(c => c.id === n.char)) n.char = 'robot';
    if (!ACCS.some(a => a.id === n.acc)) n.acc = 'none';
    const charChanged = !cur || n.char !== state.char;
    if (charChanged) {
      if (cur) scene.remove(cur.root);
      cur = rigs[n.char] || (rigs[n.char] = CHARS.find(c => c.id === n.char).build(CHARS.find(c => c.id === n.char).color));
      scene.add(cur.root);
    }
    applyColor(cur, n.color || CHARS.find(c => c.id === n.char).color);
    if (charChanged || n.acc !== state.acc) attachAcc(cur, n.acc);
    state = n; play(charChanged ? 'pop' : 'hop');
  }
  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), .05); T += dt;
    const R = cur;
    if (R) {
      R.root.position.set(0, 0, 0); R.root.rotation.set(0, 0, 0); R.root.scale.setScalar(1);
      const fl = R.floatH;
      R.body.position.y = fl + Math.sin(T * 2.2) * (fl ? .07 : .02);
      R.body.scale.set(1, 1 + Math.sin(T * 2.2) * .012, 1);
      const k = 1 - Math.pow(.001, dt);
      R.head.rotation.y += (look.x * .5 - R.head.rotation.y) * k;
      R.head.rotation.x += (-look.y * .2 - R.head.rotation.x) * k;
      R.head.rotation.z += (0 - R.head.rotation.z) * k;
      R.arms.forEach(a => { a.rotation.z = a.userData.side * (.12 + Math.sin(T * 2.2 + a.userData.side) * .05); });
      R.legs.forEach((l, i) => l.rotation.set(fl ? Math.sin(T * 3 + i * Math.PI) * .25 : 0, 0, 0));
      if (T > nextBlink) { blinkAt = T; nextBlink = T + 2 + Math.random() * 3; }
      const ph = (T - blinkAt) / .16, v = ph >= 0 && ph < 1 ? 1 - Math.sin(ph * Math.PI) * .92 : 1;
      R.eyes.forEach(e => e.scale.y = v);
      if (act) { const a = (T - act.t0) / act.dur; if (a >= 1) act = null; else ACT[act.name](R, a, T); }
      R.update?.(T, dt);
      R.acc?.userData.update?.(T);
    }
    controls.update();
    renderer.render(scene, camera);
  }
  const onMove = e => {
    const r = el.getBoundingClientRect();
    look.set(THREE.MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1.5, 1.5), THREE.MathUtils.clamp(-(((e.clientY - r.top) / r.height) * 2 - 1), -1.5, 1.5));
  };
  addEventListener('pointermove', onMove);
  const ray = new THREE.Raycaster(); let down = null;
  renderer.domElement.addEventListener('pointerdown', e => down = [e.clientX, e.clientY]);
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || !cur) return; const d = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null; if (d > 6) return;
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), camera);
    if (ray.intersectObject(cur.root, true).length) play(['jump', 'spin', 'wave'][Math.random() * 3 | 0]);
  });
  set(cfg || {});
  frame();
  return {
    set, play,
    get state() { return { ...state }; },
    snapshot() { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); },
    destroy() {
      cancelAnimationFrame(raf); ro.disconnect(); removeEventListener('pointermove', onMove);
      controls.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
