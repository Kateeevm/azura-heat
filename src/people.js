// AZURA HEAT — articulated people: head, torso, arms, legs as separate parts,
// faction colours, walk swing. Each figure gets a blob contact shadow (prompt-4 AO).
import * as THREE from 'three';
import { contactShadow } from './vehicles.js';

const SKIN = [0xe8b88a, 0xc98d5f, 0x8a5a34, 0xf0c8a0, 0x6e4525];
const SHIRTS = [0xd8574a, 0x3d7ea6, 0xe8c84a, 0x5da65d, 0xd8d3c8, 0x9e5fa6, 0xe88ab0, 0x4a4f57];
const PANTS = [0x2e3a4a, 0x5a4632, 0x22262c, 0x746a5a, 0x33455c];

export function makePerson(opts = {}) {
  const grp = new THREE.Group();
  const faction = opts.faction || 'civilian';
  const skin = new THREE.MeshStandardMaterial({ color: opts.skin ?? SKIN[opts.seed % SKIN.length], roughness: 0.75 });
  const shirtColor = faction === 'police' ? 0x1d2f52 : faction === 'crew' ? 0x14707a :
    faction === 'enemy' ? 0x59222a : (opts.shirt ?? SHIRTS[opts.seed % SHIRTS.length]);
  const shirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: faction === 'police' ? 0x141c2e : PANTS[opts.seed % PANTS.length], roughness: 0.9 });
  const mk = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; grp.add(m); return m; };
  // legs (pivot at hip for the walk swing)
  const legGeo = new THREE.BoxGeometry(0.15, 0.78, 0.17); legGeo.translate(0, -0.39, 0);
  const legL = mk(legGeo, pants, 0, 0.8, 0.11), legR = mk(legGeo, pants, 0, 0.8, -0.11);
  // torso with slight shoulder width
  mk(new THREE.BoxGeometry(0.3, 0.62, 0.46), shirt, 0, 1.11, 0);
  if (faction === 'police') mk(new THREE.BoxGeometry(0.32, 0.2, 0.48),
    new THREE.MeshStandardMaterial({ color: 0xf0c46a, roughness: 0.6 }), 0, 1.28, 0); // hi-vis band
  // arms (pivot at shoulder)
  const armGeo = new THREE.BoxGeometry(0.11, 0.66, 0.12); armGeo.translate(0, -0.3, 0);
  const armL = mk(armGeo, shirt, 0, 1.38, 0.3), armR = mk(armGeo, shirt, 0, 1.38, -0.3);
  // head + hair/cap
  mk(new THREE.SphereGeometry(0.145, 12, 10), skin, 0, 1.58, 0);
  const cap = mk(new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, 1.25),
    new THREE.MeshStandardMaterial({ color: faction === 'police' ? 0x16263f : 0x2a2320, roughness: 0.85 }), 0, 1.6, 0);
  cap.scale.y = 0.8;
  grp.add(contactShadow(0.85, 0.85, 0.42));
  grp.userData.parts = { legL, legR, armL, armR };
  grp.userData.faction = faction;
  return grp;
}

export function poseWalk(person, phase, amp = 0.5) {
  const p = person.userData.parts; if (!p) return;
  const s = Math.sin(phase);
  p.legL.rotation.z = s * amp; p.legR.rotation.z = -s * amp;
  p.armL.rotation.z = -s * amp * 0.7; p.armR.rotation.z = s * amp * 0.7;
}
export function poseAim(person) { // both arms forward, holding a weapon
  const p = person.userData.parts; if (!p) return;
  p.armL.rotation.z = -1.35; p.armR.rotation.z = -1.5;
  p.legL.rotation.z = 0.22; p.legR.rotation.z = -0.3;
}
export function makeGun(color = 0x14161a) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.07), mat); g.add(body);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.2, 0.06), mat);
  grip.position.set(0.14, -0.12, 0); grip.rotation.z = 0.3; g.add(grip);
  return g;
}
