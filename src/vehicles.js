// AZURA HEAT — vehicles: extruded-profile cars with bevels, and the TALON-2 helicopter.
// Every vehicle carries a soft blob contact shadow (prompt-4 AO: wheel↔asphalt grounding).
import * as THREE from 'three';
import { blobTexture } from './textures.js';

let blobTex = null;
export function contactShadow(w, l, opacity = 0.5) {
  if (!blobTex) blobTex = blobTexture();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.renderOrder = 2;
  return m;
}

// Side profile (x = length axis, y = height) extruded across the width: sloped hood & trunk.
function bodyGeometry(len, hBody, hNose, hTail) {
  const s = new THREE.Shape();
  s.moveTo(-len / 2, 0.18);
  s.lineTo(len / 2, 0.18);
  s.lineTo(len / 2, hTail);
  s.lineTo(len * 0.18, hBody);
  s.lineTo(-len * 0.30, hBody);
  s.lineTo(-len / 2, hNose);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1.62, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.09, bevelSegments: 2, steps: 1 });
  g.translate(0, 0, -0.9);
  return g;
}
function cabinGeometry(len) {
  const s = new THREE.Shape();
  s.moveTo(-len * 0.30, 0); s.lineTo(len * 0.10, 0);
  s.lineTo(-len * 0.02, 0.46); s.lineTo(-len * 0.18, 0.46);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, steps: 1 });
  g.translate(0, 0, -0.76);
  return g;
}

const PAINTS = [0xb03030, 0x2a6db0, 0xd8d3c8, 0x30343a, 0x3f9e63, 0xd88f2e, 0x7a4a9e, 0x9e2f4e, 0x4a6d8c];
let paintIdx = 0;
export function nextPaint() { return PAINTS[(paintIdx++) % PAINTS.length]; }
export function makeCar(opts = {}) {
  const kind = opts.kind || 'sedan';
  const grp = new THREE.Group();
  const inner = new THREE.Group(); // profile is modelled along X; rotate so the nose faces local -Z
  inner.rotation.y = -Math.PI / 2; grp.add(inner);
  const isPolice = kind === 'police';
  const isHero = kind === 'hero';
  const len = kind === 'suv' ? 4.6 : 4.4, bodyH = kind === 'suv' ? 0.78 : 0.62;
  const paint = isHero
    ? new THREE.MeshPhysicalMaterial({ color: 0x1c4fb4, metalness: 0.5, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.95 })
    : new THREE.MeshStandardMaterial({ color: isPolice ? 0xe8e8e6 : (opts.color ?? nextPaint()), metalness: 0.5, roughness: 0.42, envMapIntensity: 0.8 });
  const body = new THREE.Mesh(bodyGeometry(len, bodyH, bodyH * 0.72, bodyH * 0.98), paint);
  body.position.y = 0.28; body.castShadow = true; inner.add(body);
  const glass = new THREE.MeshStandardMaterial({ color: 0x10161f, metalness: 0.4, roughness: 0.16, envMapIntensity: 1.4 });
  const cabin = new THREE.Mesh(cabinGeometry(len), glass);
  cabin.position.set(-0.35, 0.28 + bodyH - 0.04, 0); cabin.castShadow = true; inner.add(cabin);
  if (isPolice) { // black doors band + lightbar
    const band = new THREE.Mesh(new THREE.BoxGeometry(len * 0.52, 0.3, 1.86),
      new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.5, metalness: 0.3 }));
    band.position.set(-0.1, 0.52, 0); inner.add(band);
    const bar = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.09, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 }));
    bar.add(base);
    const lb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.11, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x2244ff, emissiveIntensity: 2.2 }));
    lb.position.x = -0.3; bar.add(lb);
    const rb = lb.clone(); rb.material = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2.2 });
    rb.position.x = 0.3; bar.add(rb);
    bar.position.set(-0.42, 0.28 + bodyH + 0.44, 0); inner.add(bar);
    grp.userData.lightbar = [lb, rb];
  }
  if (isHero) { // rear spoiler on two pylons
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 1.66), paint);
    sp.position.set(len / 2 - 0.22, 1.16, 0); inner.add(sp);
    for (const dz of [-0.6, 0.6]) {
      const py = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.07),
        new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.4, metalness: 0.6 }));
      py.position.set(len / 2 - 0.22, 1.0, dz); inner.add(py);
    }
  }
  // wheels: tyre + alloy hub; front pair steers visually via userData
  const tyre = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.92, metalness: 0 });
  const hub = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.3, metalness: 0.85 });
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18);
  const hubGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.26, 10);
  grp.userData.wheels = [];
  for (const [wx, wz] of [[-len / 2 + 0.85, 0.86], [-len / 2 + 0.85, -0.86], [len / 2 - 0.85, 0.86], [len / 2 - 0.85, -0.86]]) {
    const w = new THREE.Group();
    const t = new THREE.Mesh(wheelGeo, tyre); t.rotation.x = Math.PI / 2; t.castShadow = true; w.add(t);
    const h = new THREE.Mesh(hubGeo, hub); h.rotation.x = Math.PI / 2; w.add(h);
    w.position.set(wx, 0.34, wz); inner.add(w); grp.userData.wheels.push(w);
  }
  // mirrors, lights (emissive, kept small — no blown glow, prompt 4)
  const mirror = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.4 });
  for (const dz of [-0.98, 0.98]) {
    const mi = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.16), mirror);
    mi.position.set(-0.72, 1.02, dz); inner.add(mi);
  }
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 1.3),
    new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: 0xffedb8, emissiveIntensity: 1.1 }));
  head.position.set(-len / 2 - 0.03, 0.62, 0); inner.add(head);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 1.34),
    new THREE.MeshStandardMaterial({ color: 0xaa1414, emissive: 0xd81f1f, emissiveIntensity: 2.1 }));
  tail.position.set(len / 2 + 0.03, 0.68, 0); inner.add(tail);
  grp.add(contactShadow(2.6, len + 0.7, 0.55));
  grp.userData.kind = kind; grp.userData.len = len;
  return grp;
}

// TALON-2: rounded fuselage, sloped cockpit glass, tail boom + fin + rotors, skids,
// spotlight housing + soft cone + ground pool. Built to read whole inside the frame.
export function makeHelicopter() {
  const grp = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: 0x2b3644, metalness: 0.55, roughness: 0.38, envMapIntensity: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0d1218, metalness: 0.4, roughness: 0.2, envMapIntensity: 1.1 });
  const fus = new THREE.Mesh(new THREE.SphereGeometry(1.05, 20, 14), hull);
  fus.scale.set(1.9, 0.95, 0.92); fus.castShadow = true; grp.add(fus);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.78, 16, 12), dark);
  nose.scale.set(1.05, 0.8, 0.95); nose.position.set(-1.35, 0.08, 0); nose.rotation.z = -0.18; grp.add(nose);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 4.6, 10), hull);
  boom.rotation.z = Math.PI / 2 - 0.05; boom.position.set(3.6, 0.28, 0); grp.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.05, 0.5), hull);
  fin.position.set(5.75, 0.72, 0); grp.add(fin);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.15, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.5 }));
  tailRotor.position.set(5.78, 0.72, 0.3); grp.add(tailRotor);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.42, 8), dark);
  mast.position.y = 1.05; grp.add(mast);
  const rotor = new THREE.Group();
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.045, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.45 }));
    blade.rotation.y = a; rotor.add(blade);
  }
  rotor.position.y = 1.28; grp.add(rotor);
  for (const dz of [-0.72, 0.72]) { // skids
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.9, 8), dark);
    skid.rotation.z = Math.PI / 2; skid.position.set(-0.1, -1.12, dz); grp.add(skid);
    for (const dx of [-0.8, 0.7]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6), dark);
      strut.position.set(dx, -0.85, dz); strut.rotation.x = dz > 0 ? 0.35 : -0.35; grp.add(strut);
    }
  }
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 1.9),
    new THREE.MeshStandardMaterial({ color: 0xf0c46a, roughness: 0.4, metalness: 0.3 }));
  stripe.position.set(0.1, -0.12, 0); grp.add(stripe);
  // spotlight: housing + translucent cone + pool (soft, alpha-capped — prompt 4)
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.3, 10), dark);
  housing.position.set(-0.9, -0.82, 0); grp.add(housing);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xffe9b8, transparent: true, opacity: 0.085,
    depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.4, 15, 20, 1, true), coneMat);
  cone.position.set(-0.9, -8.3, 0); grp.add(cone);
  grp.userData.rotor = rotor; grp.userData.tailRotor = tailRotor; grp.userData.cone = cone;
  grp.add(contactShadow(4.5, 7.5, 0.3));
  return grp;
}
