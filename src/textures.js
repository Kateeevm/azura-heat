// AZURA HEAT — procedural canvas textures + a seeded RNG (deterministic world).
import * as THREE from 'three';

export function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// Dark warm-grey asphalt with fine noise — never pale. Markings are geometry, not texture.
export function asphaltTexture() {
  const [c, g] = canvas(256, 256); const rnd = makeRng(41);
  g.fillStyle = '#35322f'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) {
    const v = 38 + rnd() * 30;
    g.fillStyle = `rgba(${v + 14},${v + 8},${v},${0.16 + rnd() * 0.2})`;
    g.fillRect(rnd() * 256, rnd() * 256, 1.6, 1.6);
  }
  for (let i = 0; i < 26; i++) { // faint patching / wear blotches
    g.fillStyle = `rgba(20,18,16,${0.05 + rnd() * 0.07})`;
    g.beginPath(); g.ellipse(rnd() * 256, rnd() * 256, 14 + rnd() * 34, 8 + rnd() * 20, rnd() * 3, 0, 7); g.fill();
  }
  return tex(c, 1, 8);
}

export function sandTexture() {
  const [c, g] = canvas(256, 256); const rnd = makeRng(97);
  g.fillStyle = '#c9a06d'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) {
    const v = rnd(); g.fillStyle = v < 0.5 ? 'rgba(160,124,78,.25)' : 'rgba(232,198,148,.25)';
    g.fillRect(rnd() * 256, rnd() * 256, 1.5, 1.5);
  }
  return tex(c, 6, 40);
}

export function promenadeTexture() {
  const [c, g] = canvas(256, 256); const rnd = makeRng(7);
  g.fillStyle = '#9d9186'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(70,62,54,${rnd() * 0.14})`; g.fillRect(rnd() * 256, rnd() * 256, 1.5, 1.5); }
  g.strokeStyle = 'rgba(60,52,44,.55)'; g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); }
  return tex(c, 1, 32);
}

// Building facade: window grid with per-window tint; a second emissive canvas lights a
// deterministic share of windows (litRatio) in amber/cyan for dusk & night.
const FACADE_BASES = ['#d8c6a8', '#c99e7d', '#e3ddd2', '#b7c3c9', '#d3a58e', '#cbb59a', '#a8b8ad', '#e0cfae'];
export function facadeTextures(seed, floors, cols) {
  const rnd = makeRng(seed);
  const base = FACADE_BASES[Math.floor(rnd() * FACADE_BASES.length)];
  const W = 32 * cols, H = 32 * floors;
  const [c, g] = canvas(W, H);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(0, 0, W, 6); // parapet shade line
  const [ec, eg] = canvas(W, H);
  eg.fillStyle = '#000'; eg.fillRect(0, 0, W, H);
  const lit = [];
  for (let f = 0; f < floors; f++) for (let col = 0; col < cols; col++) {
    const x = 6 + col * 32, y = 10 + f * 32, w = 19, h = 21;
    const t = rnd();
    g.fillStyle = t < 0.3 ? '#5d6d7d' : t < 0.6 ? '#71808c' : '#49565f';
    g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.20)'; g.fillRect(x, y, w, 5);
    g.strokeStyle = 'rgba(40,32,24,0.5)'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
    const isLit = rnd() < 0.5; lit.push(isLit);
    if (isLit) { eg.fillStyle = rnd() < 0.72 ? '#ffb45e' : '#9fe4e0'; eg.fillRect(x, y, w, h); }
  }
  const map = tex(c); const emissive = tex(ec);
  return { map, emissive, litSeed: seed };
}

// Vertical gradient sky with a soft sun glow baked near the horizon (drawn per mood).
export function skyTexture(mood, sunSide = -1) {
  const [c, g] = canvas(1024, 512);
  // canvas top = zenith, canvas middle (y=256) = horizon: the warm band must live
  // between y≈150 and y≈256 or it never enters the frame.
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, mood.skyTop); grad.addColorStop(0.38, mood.skyMid);
  grad.addColorStop(0.47, mood.skyLow); grad.addColorStop(0.5, mood.skyBot);
  grad.addColorStop(0.56, mood.skyLow); grad.addColorStop(1, mood.skyTop);
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
  const sx = sunSide < 0 ? 256 : 768, sy = 246;
  const glow = g.createRadialGradient(sx, sy, 8, sx, sy, 190);
  glow.addColorStop(0, 'rgba(255,214,150,0.32)'); glow.addColorStop(0.4, 'rgba(255,170,90,0.14)');
  glow.addColorStop(1, 'rgba(255,150,80,0)');
  g.fillStyle = glow; g.fillRect(0, 0, 1024, 512);
  // no baked disc: the sun disc/halo are world sprites in main.js, placed by the real sun direction
  const t = tex(c); t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Soft radial blob — contact shadows (prompt-4 AO grounding) and lamp light pools.
export function blobTexture(inner = 'rgba(0,0,0,0.5)') {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, inner); grad.addColorStop(0.7, inner.replace(/[\d.]+\)$/, '0.22)')); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
export function glowTexture(color = '255,190,90') {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, `rgba(${color},0.9)`); grad.addColorStop(0.3, `rgba(${color},0.32)`); grad.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// Ground-floor shop sign with a real name (canvas text — crisp, original names only).
export function signTexture(text, bg, fg) {
  const [c, g] = canvas(512, 96);
  g.fillStyle = bg; g.fillRect(0, 0, 512, 96);
  g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(5, 5, 502, 86);
  g.fillStyle = fg; g.font = '800 44px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 52);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export const SHOP_NAMES = ['TIDEPOOL DINER', 'AZURA HOTEL', 'SALT & SONS', 'PIER 9 CAFE',
  'THE GLASS GULL', 'MARINA PHARMACY', 'CORAL CUTS', 'BLUE MILE BAR', 'GULLWING GYM', 'HOTEL AZURA'];
