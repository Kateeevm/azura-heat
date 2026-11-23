// AZURA HEAT — the coastal city: boulevard spine, sea/sand/promenade on one side,
// named districts, palms, lamps, landmarks and a 3-layer skyline on the other.
// Prompt-4 grounding: AO gradient strips at every building base, blob shadows under
// palms/props, parapet caps and roof props give every structure thickness and bevel.
import * as THREE from 'three';
import { CITY } from './config.js';
import { makeRng, asphaltTexture, sandTexture, promenadeTexture, facadeTextures, signTexture, SHOP_NAMES, blobTexture } from './textures.js';
import { contactShadow } from './vehicles.js';

export const worldRefs = { lamps: [], lampPools: [], litMats: [], sea: null, wheel: null, beacon: null, beaconLight: null, glint: null };

const std = (color, rough = 0.85, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

export function buildWorld(scene, seed = 7) {
  const rnd = makeRng(seed);
  const W = new THREE.Group(); scene.add(W);
  const Z0 = CITY.roadZ[0], Z1 = CITY.roadZ[1], ZLEN = Z1 - Z0;

  // ---- ground planes: sea, sand, promenade, road, city slab
  const seaMat = new THREE.MeshStandardMaterial({ color: 0x3a4a8c, roughness: 0.32, metalness: 0.1, envMapIntensity: 0.5 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(150, ZLEN + 300, 24, 96), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.rotation.z = Math.PI / 2;
  sea.position.set(CITY.seaX - 40, 0.02, 0); W.add(sea); worldRefs.sea = sea;
  const seaBase = sea.geometry.attributes.position.array.slice();

  const sand = new THREE.Mesh(new THREE.PlaneGeometry(17, ZLEN + 60),
    new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 0.95 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(CITY.sandX, 0.04, 0); sand.receiveShadow = true; W.add(sand);

  const prom = new THREE.Mesh(new THREE.PlaneGeometry(6.4, ZLEN + 60),
    new THREE.MeshStandardMaterial({ map: promenadeTexture(), roughness: 0.8 }));
  prom.rotation.x = -Math.PI / 2; prom.position.set(CITY.promenadeX, 0.06, 0); prom.receiveShadow = true; W.add(prom);

  const roadMat = new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.62, metalness: 0.05, envMapIntensity: 0.25 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadHalf * 2, ZLEN), roadMat);
  road.rotation.x = -Math.PI / 2; road.position.y = 0.08; road.receiveShadow = true; W.add(road);
  worldRefs.roadMat = roadMat;
  // wheel-track sheen: two long, slightly glossier strips (sun sheen on asphalt)
  const sheenMat = new THREE.MeshStandardMaterial({ color: 0x38322c, roughness: 0.45, metalness: 0.05, envMapIntensity: 0.5, transparent: true, opacity: 0.4 });
  sheenMat.userData.envK = 0.05; // faint sheen only — a strong sky mirror here turns the road violet
  for (const lx of [-4.1, 4.1]) {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, ZLEN), sheenMat);
    sh.rotation.x = -Math.PI / 2; sh.position.set(lx, 0.095, 0); W.add(sh);
  }
  const slab = new THREE.Mesh(new THREE.PlaneGeometry(150, ZLEN + 60), std(0x8d8378, 0.95));
  slab.rotation.x = -Math.PI / 2; slab.position.set(CITY.buildingX + 62, 0.02, 0); slab.receiveShadow = true; W.add(slab);

  // ---- road markings: centre dashes, edge lines, crosswalks (thin boxes, worn white)
  const markMat = new THREE.MeshStandardMaterial({ color: 0xd8d4c4, roughness: 0.7, transparent: true, opacity: 0.82 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd8a83c, roughness: 0.7, transparent: true, opacity: 0.85 });
  const dashGeo = new THREE.BoxGeometry(0.18, 0.012, 3.2);
  for (let z = Z0 + 4; z < Z1; z += 7) {
    const d = new THREE.Mesh(dashGeo, markMat); d.position.set(0, 0.1, z); W.add(d);
  }
  for (const lx of [-CITY.roadHalf + 0.4, CITY.roadHalf - 0.4]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, ZLEN), markMat);
    e.position.set(lx, 0.1, 0); W.add(e);
  }
  const cwGeo = new THREE.BoxGeometry(1.1, 0.012, 0.55);
  for (const cz of CITY.crossStreets) { // cross street slab + zebra
    const cs = new THREE.Mesh(new THREE.PlaneGeometry(120, 11), roadMat);
    cs.rotation.x = -Math.PI / 2; cs.position.set(CITY.buildingX + 40, 0.07, cz); cs.receiveShadow = true; W.add(cs);
    for (let i = -3; i <= 3; i++) {
      const s = new THREE.Mesh(cwGeo, markMat); s.position.set(i * 2.05, 0.1, cz - 4.4); W.add(s);
      const s2 = s.clone(); s2.position.z = cz + 4.4; W.add(s2);
    }
    const stop = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 10.6), goldMat);
    stop.position.set(8.6, 0.1, cz); W.add(stop);
  }

  // ---- sun glint strip on the water (additive, subtle)
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffbe78, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  const glint = new THREE.Mesh(new THREE.PlaneGeometry(17, ZLEN * 0.92), glintMat);
  glint.rotation.x = -Math.PI / 2; glint.position.set(CITY.seaX - 6, 0.16, 0); W.add(glint); worldRefs.glint = glint;
  // foam line at the sand edge
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xe8f2ee, transparent: true, opacity: 0.5, depthWrite: false });
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(1.6, ZLEN + 40), foamMat);
  foam.rotation.x = -Math.PI / 2; foam.position.set(CITY.sandX - 8.2, 0.1, 0); W.add(foam); worldRefs.foam = foam;

  buildBuildings(W, rnd);
  buildPalmsAndLamps(W, rnd);
  buildLandmarks(W, rnd);
  buildSkyline(W, rnd);
  return W;
}

function buildBuildings(W, rnd) {
  const aoTex = blobTexture('rgba(0,0,0,0.62)');
  const aoMat = new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, opacity: 0.85, depthWrite: false });
  let shopIdx = 0;
  for (let side = 0; side < 2; side++) {
    const bx = side === 0 ? CITY.buildingX + 6 : CITY.buildingX + 34;
    for (let z = CITY.roadZ[0] + 16; z < CITY.roadZ[1] - 10; z += 26 + rnd() * 8) {
      if (CITY.crossStreets.some(cz => Math.abs(cz - z) < 9)) continue;
      const floors = 3 + Math.floor(rnd() * (side === 0 ? 7 : 11));
      const cols = 4 + Math.floor(rnd() * 3);
      const wdt = 15 + rnd() * 5, dep = 13, hgt = floors * 3.1;
      const { map, emissive } = facadeTextures(1000 + Math.floor(rnd() * 9000), floors, cols);
      const mat = new THREE.MeshStandardMaterial({ map, emissiveMap: emissive, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.82 });
      worldRefs.litMats.push(mat);
      const b = new THREE.Mesh(new THREE.BoxGeometry(dep, hgt, wdt), mat);
      b.position.set(bx, hgt / 2, z); b.castShadow = true; b.receiveShadow = true; W.add(b);
      // parapet cap (thickness/bevel) + roof props
      const cap = new THREE.Mesh(new THREE.BoxGeometry(dep + 0.7, 0.42, wdt + 0.7), std(0x6e6257, 0.9));
      cap.position.set(bx, hgt + 0.2, z); cap.castShadow = true; W.add(cap);
      if (rnd() < 0.75) {
        const ac = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.6), std(0x9aa0a4, 0.7, 0.3));
        ac.position.set(bx + (rnd() - 0.5) * 6, hgt + 0.85, z + (rnd() - 0.5) * 7); ac.castShadow = true; W.add(ac);
      }
      // AO gradient strip at the base (building↔ground, prompt 4)
      const ao = new THREE.Mesh(new THREE.PlaneGeometry(wdt + 3.5, 4.6), aoMat);
      ao.rotation.x = -Math.PI / 2; ao.rotation.z = Math.PI / 2;
      ao.position.set(bx - dep / 2 - 1.1, 0.09, z); ao.renderOrder = 1; W.add(ao);
      // ground-floor shop sign on boulevard-facing row
      if (side === 0 && rnd() < 0.62) {
        const name = SHOP_NAMES[shopIdx++ % SHOP_NAMES.length];
        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.05, 6.4),
          new THREE.MeshStandardMaterial({ map: signTexture(name, '#14202e', '#ffd98a'), emissive: 0xffc46a, emissiveIntensity: 0.0, roughness: 0.6 }));
        sign.position.set(bx - dep / 2 - 0.16, 3.4, z);
        sign.rotation.y = 0; W.add(sign); worldRefs.litMats.push(sign.material);
        const awn = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.09, 6.6), std(shopIdx % 2 ? 0x2e6e5e : 0x9e4038, 0.8));
        awn.position.set(bx - dep / 2 - 0.85, 2.85, z); awn.rotation.z = 0.22; W.add(awn);
      }
    }
  }
}

// Curved-trunk palm: stacked leaning segments + arched frond planes (never flat triangles).
export function makePalm(rnd, h = 7.5) {
  const g = new THREE.Group();
  const bark = std(0x6e5136, 0.95);
  const lean = (rnd() - 0.5) * 0.35;
  let x = 0, y = 0;
  const segGeo = new THREE.CylinderGeometry(0.13, 0.19, 1.05, 7);
  for (let i = 0; i < Math.floor(h); i++) {
    const seg = new THREE.Mesh(segGeo, bark);
    x += lean * 0.32; y += 0.98;
    seg.position.set(x, y, 0); seg.rotation.z = -lean; seg.castShadow = true; g.add(seg);
  }
  const green = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.29 + rnd() * 0.05, 0.5, 0.3 + rnd() * 0.1), roughness: 0.9, side: THREE.DoubleSide });
  const frondGeo = new THREE.PlaneGeometry(3.9, 0.52, 6, 1);
  const pos = frondGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const fx = pos.getX(i); pos.setY(i, pos.getY(i) - Math.pow(Math.abs(fx) / 1.95, 2) * 0.95); }
  frondGeo.computeVertexNormals();
  for (let i = 0; i < 9; i++) {
    const f = new THREE.Mesh(frondGeo, green);
    f.position.set(x, y + 0.45, 0);
    f.rotation.y = (i / 9) * Math.PI * 2 + rnd() * 0.4;
    f.rotation.z = 0.1 + rnd() * 0.18;
    f.translateX(1.7); f.castShadow = true; g.add(f);
  }
  g.add(contactShadow(1.7, 1.7, 0.4));
  return g;
}

function buildPalmsAndLamps(W, rnd) {
  for (let z = CITY.roadZ[0] + 8; z < CITY.roadZ[1]; z += 21) {
    for (const px of [-10.6, 11.4]) {
      if (rnd() < 0.14) continue;
      const p = makePalm(rnd, 6.8 + rnd() * 1.8);
      p.position.set(px + (rnd() - 0.5) * 0.8, 0.05, z + (rnd() - 0.5) * 5);
      p.rotation.y = rnd() * 6.28; W.add(p);
    }
  }
  const poleMat = std(0x23272e, 0.55, 0.6);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffc478, emissiveIntensity: 0 });
  const poolTex = blobTexture('rgba(255,180,90,0.55)');
  for (let z = CITY.roadZ[0] + 14; z < CITY.roadZ[1]; z += 32) {
    for (const lx of [-9.6, 9.6]) {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 5.6, 8), poleMat);
      pole.position.y = 2.8; pole.castShadow = true; lamp.add(pole);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), poleMat);
      arm.rotation.z = Math.PI / 2; arm.position.set(lx < 0 ? 0.7 : -0.7, 5.55, 0); lamp.add(arm);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), bulbMat);
      bulb.position.set(lx < 0 ? 1.4 : -1.4, 5.45, 0); lamp.add(bulb);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(11, 11),
        new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(lx < 0 ? 2.8 : -2.8, 0.12, 0); pool.renderOrder = 3; // pool lands ON the asphalt
      lamp.add(pool); worldRefs.lampPools.push(pool);
      lamp.position.set(lx, 0, z); W.add(lamp); worldRefs.lamps.push(bulbMat);
    }
  }
  worldRefs.bulbMat = bulbMat;
  // promenade dressing: benches + kiosks with blob shadows
  for (let z = CITY.roadZ[0] + 30; z < CITY.roadZ[1]; z += 55) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 2.2), std(0x74563a, 0.85));
    bench.position.set(-12.2, 0.3, z); bench.castShadow = true; W.add(bench);
    bench.add(contactShadow(1.2, 2.6, 0.35));
    if (rnd() < 0.5) {
      const kiosk = new THREE.Group();
      const kb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 2.2), std(0xd8c6a8, 0.85));
      kb.position.y = 1.2; kb.castShadow = true; kiosk.add(kb);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2, 0.8, 4), std(0x9e4038, 0.8));
      roof.position.y = 2.8; roof.rotation.y = Math.PI / 4; kiosk.add(roof);
      kiosk.add(contactShadow(3, 3, 0.45));
      kiosk.position.set(-12.6, 0, z + 18); W.add(kiosk);
    }
  }
}

function buildLandmarks(W, rnd) {
  // Pelican Pier at z=60: deck over the water + posts + ferris wheel
  const pier = new THREE.Group();
  const deckMat = std(0x8a6a48, 0.9);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(64, 0.5, 13), deckMat);
  deck.position.set(-46, 1.6, 0); deck.castShadow = true; deck.receiveShadow = true; pier.add(deck);
  const postGeo = new THREE.CylinderGeometry(0.22, 0.22, 2.2, 7);
  for (let px = -74; px <= -18; px += 7) for (const pz of [-5.4, 5.4]) {
    const post = new THREE.Mesh(postGeo, deckMat); post.position.set(px, 0.4, pz); pier.add(post);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(64, 0.09, 0.09), std(0xd8d3c8, 0.7));
  rail.position.set(-46, 2.75, -6.4); pier.add(rail);
  const rail2 = rail.clone(); rail2.position.z = 6.4; pier.add(rail2);
  pier.position.z = 95; W.add(pier);
  // ferris wheel at the pier head
  const wheel = new THREE.Group();
  const rimMat = std(0xe8e2d2, 0.5, 0.4);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(10.5, 0.28, 8, 36), rimMat);
  wheel.add(rim);
  const spokeGeo = new THREE.CylinderGeometry(0.09, 0.09, 20.6, 6);
  for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(spokeGeo, rimMat); sp.rotation.z = i * Math.PI / 4; wheel.add(sp); }
  const cabinCols = [0xd8574a, 0x3d7ea6, 0xe8c84a, 0x5da65d, 0xe88ab0, 0xf0f0ea];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 1.2),
      new THREE.MeshStandardMaterial({ color: cabinCols[i % 6], roughness: 0.6, emissive: cabinCols[i % 6], emissiveIntensity: 0 }));
    cab.position.set(Math.cos(a) * 10.5, Math.sin(a) * 10.5, 0);
    cab.userData.wheelCabin = true; wheel.add(cab); worldRefs.litMats.push(cab.material);
  }
  const legGeo = new THREE.CylinderGeometry(0.22, 0.3, 13, 8);
  for (const dz of [-1.6, 1.6]) {
    const leg = new THREE.Mesh(legGeo, rimMat);
    leg.position.set(-46, 6, 95 + dz); leg.rotation.x = dz > 0 ? 0.12 : -0.12; W.add(leg);
  }
  wheel.position.set(-46, 12.6, 95); wheel.rotation.order = 'YXZ'; wheel.rotation.y = Math.PI / 2; W.add(wheel);
  worldRefs.wheel = wheel;
  // marina at z=-80: bobbing sailboats (hull + mast + triangular sail)
  worldRefs.boats = [];
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.85, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.35, 4.6, 6), std([0xb03030, 0x2a6db0, 0xe8e2d2, 0x2e7d5b][i % 4], 0.6));
    hull.rotation.z = Math.PI / 2; hull.rotation.y = Math.PI / 2; hull.scale.z = 0.55; hull.position.y = 0.35; boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5.6, 6), std(0x8a8f94, 0.4, 0.7));
    mast.position.y = 3; boat.add(mast);
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(0, 4.6); shape.lineTo(2.2, 0.3); shape.closePath();
    const sail = new THREE.Mesh(new THREE.ShapeGeometry(shape), sailMat);
    sail.position.set(0.06, 0.9, 0); boat.add(sail);
    boat.position.set(-44 - (i % 3) * 9 - rnd() * 3, 0.1, -108 + Math.floor(i / 3) * 26 + rnd() * 6);
    boat.userData.bobPhase = rnd() * 6.28;
    W.add(boat); worldRefs.boats.push(boat);
  }
  // lighthouse at Lighthouse End (z=-560), rotating beam at night
  const lh = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.5, 15, 14),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.7 }));
  tower.position.y = 7.5; tower.castShadow = true; lh.add(tower);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(2.06, 2.2, 2.6, 14), std(0xb03030, 0.65));
  band.position.y = 9.6; lh.add(band);
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 1.7, 10),
    new THREE.MeshStandardMaterial({ color: 0xffe9b8, emissive: 0xffd98a, emissiveIntensity: 0.4, roughness: 0.3 }));
  lampRoom.position.y = 15.8; lh.add(lampRoom);
  const roofC = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.3, 10), std(0x2b3644, 0.6));
  roofC.position.y = 17.3; lh.add(roofC);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(3.2, 34, 14, 1, true), beamMat);
  beam.rotation.z = Math.PI / 2; beam.position.set(17, 15.8, 0);
  const beamPivot = new THREE.Group(); beamPivot.add(beam); lh.add(beamPivot);
  lh.position.set(-19, 0, -560); W.add(lh);
  worldRefs.beacon = beamPivot; worldRefs.beaconMat = beamMat;
}

// 3 depth layers: near facades (built above), mid blocks, far hazy silhouettes.
function buildSkyline(W, rnd) {
  const midMat = std(0x9a8a76, 0.95);
  for (let z = CITY.roadZ[0]; z < CITY.roadZ[1]; z += 55) {
    const h = 26 + rnd() * 26;
    const b = new THREE.Mesh(new THREE.BoxGeometry(17, h, 20), midMat);
    b.position.set(88 + rnd() * 14, h / 2, z + rnd() * 16); W.add(b);
  }
  const farMat = new THREE.MeshBasicMaterial({ color: 0x6a5a80, transparent: true, opacity: 0.55, fog: true });
  for (let z = CITY.roadZ[0] - 60; z < CITY.roadZ[1] + 60; z += 85) {
    const h = 44 + rnd() * 40;
    const b = new THREE.Mesh(new THREE.BoxGeometry(24, h, 30), farMat);
    b.position.set(135 + rnd() * 30, h / 2, z + rnd() * 30); W.add(b);
  }
  // distant headland across the water (sea-side depth)
  const head = new THREE.Mesh(new THREE.ConeGeometry(90, 26, 7),
    new THREE.MeshBasicMaterial({ color: 0x54456e, transparent: true, opacity: 0.5, fog: true }));
  head.position.set(-215, 4, -420); W.add(head);
  const head2 = head.clone(); head2.position.set(-230, 2, 480); head2.scale.setScalar(1.3); W.add(head2);
}
