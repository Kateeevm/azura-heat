// AZURA HEAT — engine: renderer, moods, driving/walking, traffic, police, combat,
// missions, save. Shot staging lives in shots.js; HUD in hud.js; city in world.js.
import * as THREE from 'three';
import { CITY, MOODS, RADIO, ABILITIES, SAVE_KEY, districtAt } from './config.js';
import { skyTexture, glowTexture } from './textures.js';
import { buildWorld, worldRefs } from './world.js';
import { makeCar, makeHelicopter } from './vehicles.js';
import { makePerson, makeGun, poseWalk, poseAim } from './people.js';
import { MissionEngine } from './missions.js';
import { SynthAudio } from './audio.js';
import { buildStaticHud, updateHud, probeOverlap, panelCount, setDialogue } from './hud.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const SEED = parseInt(params.get('seed') || '7', 10);
window.__errors = [];
window.addEventListener('error', e => window.__errors.push(String(e.message)));

// ---------- renderer / scene ----------
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xd98a5e, 0.0015);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 3, 20);

const hemi = new THREE.HemisphereLight(0x8a7bd8, 0xcaa06a, 0.55); scene.add(hemi);
// warm bounce fill from behind the camera (prompt 4: soft indirect/bounce light) —
// keeps shaded faces readable instead of crushed or env-tinted. No shadows.
const fill = new THREE.DirectionalLight(0xffd9b0, 0.5); scene.add(fill, fill.target);
// visible sun disc + halo, repositioned each frame along the mood's sun direction
const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('255,205,130'), transparent: true, opacity: 0.95, fog: false, depthWrite: false }));
sunSprite.scale.setScalar(58); scene.add(sunSprite);
const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('255,240,205'), transparent: true, opacity: 1, fog: false, depthWrite: false }));
sunCore.scale.setScalar(21); scene.add(sunCore);
const sun = new THREE.DirectionalLight(0xffb36b, 2.7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -55; sun.shadow.camera.right = 55;
sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55;
sun.shadow.camera.near = 10; sun.shadow.camera.far = 420;
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

// gradient sky dome + PMREM environment from the same sky (per-mood env intensity
// is applied per material, so the pink-leak failure mode of flat env light is avoided)
const skyMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, depthWrite: false });
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), skyMat);
scene.add(sky);
const pmrem = new THREE.PMREMGenerator(renderer);

function applyMood(name) {
  const m = MOODS[name]; state.mood = name;
  renderer.toneMappingExposure = m.exposure;
  sun.color.set(m.sunColor); sun.intensity = m.sunInt;
  hemi.color.set(m.hemiSky); hemi.groundColor.set(m.hemiGround); hemi.intensity = m.hemiInt;
  scene.fog.color.set(m.fogColor); scene.fog.density = m.fogDensity;
  skyMat.map = skyTexture(m); skyMat.needsUpdate = true;
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 16, 10),
    new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: skyMat.map }));
  envScene.add(envSky);
  const envGround = new THREE.Mesh(new THREE.CircleGeometry(40, 16),
    new THREE.MeshBasicMaterial({ color: m.hemiGround }));
  envGround.rotation.x = -Math.PI / 2; envGround.position.y = -4; envScene.add(envGround);
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  // per-material env intensity by kind (asphalt low, paint mid, glass high; night ≪ dusk).
  // EVERY standard material gets an explicit value — a saturated sky env at the default
  // intensity of 1 is exactly what washed earlier builds pink/purple.
  scene.traverse(o => {
    if (!o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mt of mats) {
      if (!mt.isMeshStandardMaterial) continue;
      if (mt === worldRefs.roadMat) mt.envMapIntensity = m.envAsphalt;
      else if (mt.isMeshPhysicalMaterial) mt.envMapIntensity = m.envPaint * 0.45;
      else if (mt.roughness < 0.2) mt.envMapIntensity = m.envGlass;
      else mt.envMapIntensity = m.envPaint * (mt.userData.envK ?? 0.32);
    }
  });
  if (worldRefs.sea) worldRefs.sea.material.color.set(m.seaColor);
  if (worldRefs.glint) worldRefs.glint.material.opacity = m.seaGlint * 0.55;
  const lit = name === 'night' ? 1.15 : name === 'dusk' ? 0.6 : 0.14;
  for (const mt of worldRefs.litMats) mt.emissiveIntensity = lit;
  if (worldRefs.bulbMat) worldRefs.bulbMat.emissiveIntensity = m.lampsOn ? 2.4 : 0;
  for (const p of worldRefs.lampPools) p.material.opacity = m.lampsOn ? 0.8 : 0;
  if (worldRefs.beaconMat) worldRefs.beaconMat.opacity = name === 'night' ? 0.16 : 0;
  state.lampsOn = m.lampsOn;
}

// ---------- world & actors ----------
buildWorld(scene, SEED);
const heroCar = makeCar({ kind: 'hero' }); heroCar.position.set(3.2, 0, 52); heroCar.rotation.y = Math.PI; scene.add(heroCar);
const traffic = [];
for (let i = 0; i < 8; i++) {
  const c = makeCar({ kind: i % 3 === 2 ? 'suv' : 'sedan' });
  c.userData.lane = i % 2 === 0 ? -4.2 : 4.2;
  c.userData.dir = i % 2 === 0 ? 1 : -1;
  c.userData.speed = 7 + (i % 4);
  c.position.set(c.userData.lane, 0, -420 + i * 110);
  c.rotation.y = c.userData.dir > 0 ? Math.PI : 0; // nose follows the direction of travel
  scene.add(c); traffic.push(c);
}
const police = [];
for (let i = 0; i < 4; i++) {
  const p = makeCar({ kind: 'police' }); p.visible = false; p.userData.active = false;
  scene.add(p); police.push(p);
}
const heli = makeHelicopter(); heli.visible = false; scene.add(heli);
const playerPerson = makePerson({ faction: 'crew', seed: 1 }); scene.add(playerPerson);
const playerGun = makeGun(); playerGun.visible = false; playerPerson.add(playerGun);
playerGun.position.set(0.3, 1.32, 0.2); playerGun.rotation.y = Math.PI / 2;
const peds = [];
for (let i = 0; i < 16; i++) {
  const p = makePerson({ seed: i + 3 });
  p.userData.walkZ = -500 + i * 65; p.userData.walkDir = i % 2 ? 1 : -1;
  p.position.set(i % 2 ? -12.4 : 12.6, 0, p.userData.walkZ);
  scene.add(p); peds.push(p);
}
const enemies = [];
for (let i = 0; i < 4; i++) {
  const e = makePerson({ faction: 'enemy', seed: i + 20 });
  const g = makeGun(); e.add(g); g.position.set(0.3, 1.32, 0.2); g.rotation.y = Math.PI / 2;
  e.visible = false; scene.add(e); enemies.push(e);
}
// spotlight ground pool (shared, moved by staging / heli AI)
const poolTex = glowTexture('255,233,184');
const spotPool = new THREE.Mesh(new THREE.PlaneGeometry(11, 11),
  new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
spotPool.rotation.x = -Math.PI / 2; spotPool.position.y = 0.14; spotPool.renderOrder = 4; scene.add(spotPool);

// ---------- effects (tracers / flashes / sparks — small and capped, prompt 3/4) ----------
const effects = [];
const flashTex = glowTexture('255,210,110');
function spawnTracer(a, b, color = 0xffd98a, life = 0.09) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  scene.add(line); effects.push({ obj: line, left: life, max: life, kind: 'tracer' });
}
function spawnFlash(pos, scale = 1, color = 0xffffff) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color, transparent: true, opacity: 0.85, depthWrite: false }));
  sp.position.copy(pos); sp.scale.setScalar(0.7 * scale);
  scene.add(sp); effects.push({ obj: sp, left: 0.07, max: 0.07, kind: 'flash' });
}
function spawnSparks(pos) {
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: 0xffc478, transparent: true, opacity: 0.8, depthWrite: false }));
    sp.position.copy(pos); sp.scale.setScalar(0.16);
    sp.userData.vel = new THREE.Vector3((Math.sin(i * 2.4)) * 1.6, 1.4 + (i % 3) * 0.5, Math.cos(i * 2.4) * 1.6);
    scene.add(sp); effects.push({ obj: sp, left: 0.3, max: 0.3, kind: 'spark' });
  }
}

// ---------- state ----------
const audio = new SynthAudio();
const missions = new MissionEngine(scene);
const state = {
  mood: 'golden', lampsOn: false, mode: SHOT ? 'shot' : 'menu',
  playerPos: new THREE.Vector3(0, 0, 58), playerHeading: Math.PI, speed: 0,
  driving: false, vehicleName: 'On Foot', vehicleCond: 100, inCar: null,
  wanted: 0, inSight: false, heat: 0,
  money: 1240, health: 100, armor: 50, crewMorale: 80,
  radio: RADIO[0], radioIdx: 0,
  abilities: ABILITIES.map(a => ({ ...a, left: 0 })),
  units: [], heliPos: null, objectivePos: { x: 2.5, z: 60 },
  mission: missions.hudState(0), enemiesDown: 0, enemiesNeeded: 3,
  keys: {}, now: 0, walkPhase: 0, shotLife: 0,
};
try { // save: money + mission index persist locally
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) { const s = JSON.parse(raw); state.money = s.money ?? state.money; if (s.mission) missions.load(Math.min(s.mission, 9)); }
} catch { /* fresh save */ }
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ money: state.money, mission: missions.index })); } catch { } }

// ---------- staging context (used by shots.js) ----------
const G = {
  state, heroCar, traffic, heli, playerPerson, V3: THREE.Vector3,
  applyMood, spawnTracer, spawnFlash,
  playerPos: state.playerPos, cameraMode: 'chase', camOverride: null,
  placePolice(i, x, z, rotY) { const p = police[i]; p.visible = true; p.userData.active = true; p.position.set(x, 0, z); p.rotation.y = rotY; },
  placeTraffic(i, x, z, rotY) { const c = traffic[i]; c.position.set(x, 0, z); c.rotation.y = rotY; c.userData.speed = 0; },
  setSpotlightPool(x, z, op = 0.5) { spotPool.position.set(x, 0.14, z); spotPool.material.opacity = op; if (op > 0) heli.visible = true; },
  aimCone(from, to) { // free-standing spotlight cone aimed from the heli housing at a target
    if (G._cone) { scene.remove(G._cone); G._cone.geometry.dispose(); }
    heli.userData.cone.visible = false;
    const len = from.distanceTo(to);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.8, len, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffe9b8, transparent: true, opacity: 0.055, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    cone.position.copy(from).add(to).multiplyScalar(0.5);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), from.clone().sub(to).normalize());
    scene.add(cone); G._cone = cone;
  },
  stagePeds(zc, n) { peds.forEach((p, i) => { p.visible = i < n + 6; if (i < n) { p.position.set(i % 2 ? -12.3 : 12.7, 0, zc - 26 + i * 7); } }); },
  aimPlayer() { poseAim(playerPerson); playerGun.visible = true; },
  placeEnemies(list) { enemies.forEach((e, i) => { if (list[i]) { e.visible = true; e.position.set(list[i][0], 0, list[i][1]); e.rotation.y = Math.PI + 0.3; poseAim(e); } }); },
};

// ---------- input ----------
addEventListener('keydown', e => { state.keys[e.code] = true; onKey(e.code); });
addEventListener('keyup', e => { state.keys[e.code] = false; });
function onKey(code) {
  audio.init();
  if (state.mode === 'menu' && (code === 'Enter' || code === 'Space')) startPlay();
  if (code === 'KeyE') toggleCar();
  if (code === 'KeyR') { state.radioIdx = (state.radioIdx + 1) % RADIO.length; state.radio = RADIO[state.radioIdx]; }
  if (code === 'KeyF') shoot();
  ABILITIES.forEach((a, i) => { if (code === 'Key' + a.key) useAbility(i); });
}
document.getElementById('btn-continue').addEventListener('click', () => { audio.init(); startPlay(); });
document.getElementById('btn-new').addEventListener('click', () => { audio.init(); state.money = 1240; missions.load(0); persist(); startPlay(); });
document.getElementById('btn-free').addEventListener('click', () => { audio.init(); startPlay(true); });
function startPlay(free = false) {
  state.mode = 'play';
  document.getElementById('start-screen').style.display = 'none';
  document.querySelectorAll('.panel').forEach(p => { if (p.id !== 'hud-prompt' && p.id !== 'hud-banner') p.style.display = ''; });
  if (free) missions.active = false;
}
function toggleCar() {
  if (state.mode !== 'play' && state.mode !== 'shot') return;
  if (state.driving) { // step out beside the car
    state.driving = false; state.inCar = null; playerPerson.visible = true;
    playerPerson.position.set(state.playerPos.x - 1.6, 0, state.playerPos.z);
    state.playerPos.copy(playerPerson.position); audio.engine(false, 0);
    return;
  }
  let best = null, bd = 4.5;
  for (const c of [heroCar, ...traffic]) {
    const d = c.position.distanceTo(state.playerPos);
    if (d < bd) { bd = d; best = c; }
  }
  if (best) {
    state.driving = true; state.inCar = best; playerPerson.visible = false;
    state.vehicleName = best === heroCar ? 'Ventura GT-S' : (best.userData.kind === 'suv' ? 'Harbor SUV' : 'Azura Sedan');
    state.vehicleCond = 96;
    if (best !== heroCar) addCrime(1, 'A car was stolen on Azura Boulevard');
    document.getElementById('hud-prompt').style.display = 'none';
  }
}
function addCrime(n, why) {
  state.wanted = Math.min(5, state.wanted + n); state.heat = 1;
  setDialogue('Det. Ruth Calloway', 'ABPD · MAJOR CRIMES', why + '. All units, converge on Azura Boulevard.', '#e8b88a', '#3a2c22');
}
function useAbility(i) {
  const a = state.abilities[i]; if (a.left > 0) return;
  a.left = a.cd;
  if (i === 0) state.health = Math.min(100, state.health + 25);
  if (i === 1) { state.inSight = false; state.heat = Math.max(0, state.heat - 0.5); }
  if (i === 2) state.wanted = Math.max(0, state.wanted - 1);
  if (i === 3 && state.driving) state.speed += 9;
  audio.blip(660 + i * 110);
}
function shoot() {
  if (state.driving || (state.mode !== 'play' && state.mode !== 'shot')) return;
  poseAim(playerPerson); playerGun.visible = true;
  const from = state.playerPos.clone(); from.y = 1.35;
  const dir = new THREE.Vector3(Math.sin(state.playerHeading + Math.PI / 2), 0, Math.cos(state.playerHeading + Math.PI / 2));
  let target = null, td = 34;
  for (const e of enemies) { if (!e.visible) continue; const d = e.position.distanceTo(from); if (d < td) { td = d; target = e; } }
  const end = target ? target.position.clone().setY(1.25) : from.clone().add(dir.multiplyScalar(26));
  spawnTracer(from.clone().add(new THREE.Vector3(0.35, 0, 0.1)), end);
  spawnFlash(from.clone().add(new THREE.Vector3(0.45, 0.02, 0)), 0.9);
  audio.shot(false);
  if (target) { spawnSparks(end); target.visible = false; state.enemiesDown++; addCrime(1, 'Shots fired — suspect is armed'); }
}

// ---------- per-frame updates ----------
const clock = new THREE.Clock();
let frames = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  state.now += dt;
  const t = state.now;
  if (state.mode !== 'menu' || SHOT) stepGame(dt, t);
  updateCamera(dt, t);
  // sun + shadow frustum follow the player; sun sits low over the sea at golden hour
  const m = MOODS[state.mood];
  const az = THREE.MathUtils.degToRad(m.sunAzim), el = THREE.MathUtils.degToRad(m.sunElev);
  sun.position.set(state.playerPos.x + Math.sin(az) * 190, Math.sin(el) * 190 + 12, state.playerPos.z + Math.cos(az) * 190);
  sun.target.position.copy(state.playerPos);
  sky.position.copy(camera.position);
  const sunDir = new THREE.Vector3(Math.sin(az), Math.sin(el) + 0.02, Math.cos(az));
  sunSprite.position.copy(camera.position).addScaledVector(sunDir, 830);
  sunCore.position.copy(sunSprite.position);
  const sunVis = state.mood === 'night' ? 0 : 1;
  sunSprite.material.opacity = 0.55 * sunVis; sunCore.material.opacity = 0.95 * sunVis;
  fill.position.copy(camera.position).add(new THREE.Vector3(-Math.sin(az) * 60, 34, -Math.cos(az) * 60));
  fill.target.position.copy(state.playerPos);
  fill.intensity = state.mood === 'night' ? 0.25 : 0.5; // cool moon-bounce at night keeps car rears readable
  fill.color.set(state.mood === 'night' ? 0x8fb4e8 : 0xffd9b0);
  // sea waves + foam pulse + glint shimmer
  if (worldRefs.sea) {
    const pos = worldRefs.sea.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++)
      pos.setZ(i, Math.sin(t * 1.1 + pos.getX(i) * 0.24 + pos.getY(i) * 0.1) * 0.16);
    pos.needsUpdate = true;
  }
  if (worldRefs.foam) worldRefs.foam.material.opacity = 0.38 + Math.sin(t * 0.9) * 0.14;
  if (worldRefs.wheel) { worldRefs.wheel.rotation.z = t * 0.12; } // rim spins on its own axis (order YXZ)
  if (worldRefs.beacon) worldRefs.beacon.rotation.y = t * 0.7;
  if (worldRefs.boats) for (const b of worldRefs.boats) { b.position.y = 0.1 + Math.sin(t * 1.3 + b.userData.bobPhase) * 0.12; b.rotation.z = Math.sin(t * 0.9 + b.userData.bobPhase) * 0.04; }
  if (heli.visible) {
    heli.userData.rotor.rotation.y = t * 28;
    heli.userData.tailRotor.rotation.x = t * 34;
  }
  for (const p of police) if (p.userData.lightbar) {
    const ph = Math.sin(t * 9) > 0;
    p.userData.lightbar[0].material.emissiveIntensity = ph ? 2.6 : 0.3;
    p.userData.lightbar[1].material.emissiveIntensity = ph ? 0.3 : 2.6;
  }
  updateHud(state);
  renderer.render(scene, camera);
  frames++;
  if (SHOT && frames === 14) { window.__ready = true; window.__probe = probeOverlap(); window.__panels = panelCount(); }
}

function stepGame(dt, t) {
  const K = state.keys;
  // abilities cooldown
  for (const a of state.abilities) a.left = Math.max(0, a.left - dt);
  // traffic
  for (const c of traffic) {
    if (c === state.inCar || !c.userData.speed) continue;
    c.position.z += c.userData.dir * c.userData.speed * dt;
    if (c.position.z > 660) c.position.z = -660;
    if (c.position.z < -660) c.position.z = 660;
    spinWheels(c, c.userData.dir * c.userData.speed * dt);
  }
  // pedestrians stroll the promenade / sidewalk
  for (const p of peds) {
    if (!p.visible) continue;
    p.userData.walkZ += p.userData.walkDir * 0.85 * dt;
    if (p.userData.walkZ > 620) p.userData.walkDir = -1;
    if (p.userData.walkZ < -620) p.userData.walkDir = 1;
    p.position.z = p.userData.walkZ;
    p.rotation.y = p.userData.walkDir > 0 ? 0 : Math.PI;
    poseWalk(p, t * 5.4 + p.position.z, 0.42);
  }
  if (state.mode === 'shot') { refreshUnits(); return; }
  // player movement
  const sprint = K.ShiftLeft ? 1.7 : 1;
  if (state.driving && state.inCar) {
    const car = state.inCar;
    if (K.KeyW) state.speed = Math.min(state.speed + 14 * dt, 46);
    else if (K.KeyS) state.speed = Math.max(state.speed - 18 * dt, -9);
    else state.speed *= (1 - 0.55 * dt);
    const steer = (K.KeyA ? 1 : 0) - (K.KeyD ? 1 : 0);
    car.rotation.y += steer * dt * (0.55 + Math.abs(state.speed) * 0.012) * Math.sign(state.speed || 1);
    car.position.x += -Math.sin(car.rotation.y) * state.speed * dt;
    car.position.z += -Math.cos(car.rotation.y) * state.speed * dt;
    car.position.x = THREE.MathUtils.clamp(car.position.x, -CITY.roadHalf + 1.2, CITY.roadHalf - 1.2);
    car.position.z = THREE.MathUtils.clamp(car.position.z, -630, 630);
    state.playerPos.copy(car.position); state.playerHeading = car.rotation.y;
    spinWheels(car, state.speed * dt);
    audio.engine(true, Math.abs(state.speed) / 46); audio.radioTick(dt, true);
    if (Math.abs(state.speed) > 26 && state.wanted === 0 && Math.random() < dt * 0.2) addCrime(1, 'Reckless driving on the boulevard');
  } else {
    const mv = new THREE.Vector3((K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0), 0, (K.KeyS ? 1 : 0) - (K.KeyW ? 1 : 0));
    if (mv.lengthSq() > 0) {
      mv.normalize().multiplyScalar(4.4 * sprint * dt);
      state.playerPos.add(mv);
      state.playerPos.x = THREE.MathUtils.clamp(state.playerPos.x, -16, 15);
      state.playerPos.z = THREE.MathUtils.clamp(state.playerPos.z, -630, 630);
      state.playerHeading = Math.atan2(mv.x, mv.z);
      state.walkPhase += dt * 9 * sprint;
      poseWalk(playerPerson, state.walkPhase, 0.55);
    }
    playerPerson.position.copy(state.playerPos);
    playerPerson.rotation.y = state.playerHeading - Math.PI / 2; // model faces local +X
    // enter-car prompt
    let near = null;
    for (const c of [heroCar, ...traffic]) if (c.position.distanceTo(state.playerPos) < 4.5) near = c;
    const pr = document.getElementById('hud-prompt');
    if (near && state.mode === 'play') {
      pr.style.display = ''; document.getElementById('prompt-text').textContent =
        near === heroCar ? 'Enter Ventura GT-S' : 'Steal this car';
    } else pr.style.display = 'none';
  }
  // police response
  updatePolice(dt, t);
  // mission engine
  const ev = missions.update(dt, state.playerPos, { now: t, wanted: state.wanted, enemiesDown: state.enemiesDown, enemiesNeeded: state.enemiesNeeded });
  if (ev?.advanced) { audio.blip(990); setDialogue('Priya Anand', 'FIXER · “COMPASS”', 'Stage done. Next marker is lit — keep moving.', '#8a5a34', '#0e0c0a'); }
  if (ev?.missionComplete) {
    state.money += ev.pay; persist(); audio.blip(1180, 0.14, 0.25);
    setDialogue('Marta Ilves', 'LOOKOUT · “GLASS”', `Job closed. $${ev.pay.toLocaleString('en-US')} to the crew cut.`, '#e8b88a', '#241a30');
  }
  if (ev?.failed) setDialogue('Dario Venn', 'WHEELMAN · “DEADEYE”', 'Clock beat us — the stage resets. Go again.', '#c98d5f', '#14100c');
  state.mission = missions.hudState(0);
  state.objectivePos = { x: 2.5, z: missions.stageDef.z };
  // fight stages reveal their enemies near the marker
  if (missions.stageDef.kind === 'fight') {
    enemies.forEach((e, i) => { if (!e.visible && state.enemiesDown + enemies.filter(x => x.visible).length < 4) {
      e.visible = true; e.position.set(7 + i * 1.8, 0, missions.stageDef.z - 9 + i * 3); e.rotation.y = Math.PI; poseAim(e); } });
  }
  refreshUnits();
}

function spinWheels(car, dist) { for (const w of car.userData.wheels) w.rotation.z -= dist / 0.34; }

function refreshUnits() {
  state.units = police.filter(p => p.userData.active).map((p, i) => ({
    x: p.position.x, z: p.position.z, dist: p.position.distanceTo(state.playerPos),
    tactic: ['PURSUIT', 'RAMMING', 'ROADBLOCK', 'PURSUIT'][i % 4],
  }));
  if (heli.visible && state.wanted >= 3)
    state.units.push({ x: heli.position.x, z: heli.position.z, dist: heli.position.distanceTo(state.playerPos), tactic: 'SPOTLIGHT' });
  state.units.sort((a, b) => a.dist - b.dist);
  state.heliPos = heli.visible ? { x: heli.position.x, z: heli.position.z } : null;
}

function updatePolice(dt, t) {
  const want = state.wanted;
  police.forEach((p, i) => {
    const should = want >= 1 && i < Math.min(4, want + (want >= 4 ? 1 : 0));
    if (should && !p.userData.active) { // dispatch: spawn behind the player
      p.userData.active = true; p.visible = true;
      p.position.set(state.playerPos.x + (i % 2 ? 6 : -6), 0, state.playerPos.z + (state.playerHeading > Math.PI / 2 ? -46 : 46) + i * 9);
    }
    if (!should) { p.userData.active = false; p.visible = false; return; }
    const to = state.playerPos.clone().sub(p.position); to.y = 0;
    const d = to.length();
    const targetRot = Math.atan2(to.x, to.z) + Math.PI;
    let diff = targetRot - p.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
    p.rotation.y += THREE.MathUtils.clamp(diff, -1.6 * dt, 1.6 * dt);
    const spd = d > 26 ? 24 : d > 9 ? 15 : 5;
    p.position.x += Math.sin(p.rotation.y) * spd * dt;
    p.position.z += Math.cos(p.rotation.y) * spd * dt;
    p.position.x = THREE.MathUtils.clamp(p.position.x, -7, 7);
    spinWheels(p, spd * dt);
    if (d < 4.2 && Math.abs(state.speed) < 2 && !state.driving) { state.health -= 6 * dt; }
    state.inSight = d < 60;
  });
  // roadblock at wanted >= 4: two units parked across the road ahead
  if (want >= 4) {
    const rb = police[3];
    if (rb.userData.active) { rb.position.set(2.5, 0, state.playerPos.z - Math.sign(Math.cos(state.playerHeading)) * 55); rb.rotation.y = Math.PI / 2; }
  }
  // helicopter joins at wanted >= 3
  heli.visible = want >= 3;
  if (heli.visible) {
    const target = new THREE.Vector3(state.playerPos.x - 7, 15, state.playerPos.z - 16);
    heli.position.lerp(target, 1 - Math.pow(0.0015, dt));
    heli.rotation.y = Math.PI * 0.78;
    spotPool.position.set(state.playerPos.x, 0.14, state.playerPos.z);
    spotPool.material.opacity = 0.5;
  } else if (state.mode === 'play') spotPool.material.opacity = 0;
  // heat decay
  if (!state.inSight && want > 0) { state.heat -= dt * 0.05; if (state.heat <= 0) { state.wanted--; state.heat = 1; } }
  // enemy return fire during fight stages
  if (missions.stageDef?.kind === 'fight' && Math.random() < dt * 0.7) {
    const shooters = enemies.filter(e => e.visible);
    if (shooters.length && !state.driving) {
      const e = shooters[Math.floor(Math.random() * shooters.length)];
      const a = e.position.clone(); a.y = 1.32;
      const b = state.playerPos.clone(); b.y = 1.15; b.x += (Math.random() - 0.5) * 1.6;
      spawnTracer(a, b, 0xff9a7a); spawnFlash(a, 0.8); audio.shot(true);
      if (Math.random() < 0.4) { if (state.armor > 0) state.armor = Math.max(0, state.armor - 3); else state.health = Math.max(0, state.health - 3); }
    }
  }
  // effects decay
  for (let i = effects.length - 1; i >= 0; i--) {
    const fx = effects[i]; fx.left -= dt;
    if (fx.kind === 'tracer') fx.obj.material.opacity = 0.9 * Math.max(0, fx.left / fx.max);
    if (fx.kind === 'spark') { fx.obj.position.add(fx.obj.userData.vel.clone().multiplyScalar(dt)); fx.obj.material.opacity = 0.8 * Math.max(0, fx.left / fx.max); }
    if (fx.left <= 0) { scene.remove(fx.obj); effects.splice(i, 1); }
  }
}

function updateCamera(dt, t) {
  if (G.camOverride) {
    camera.position.set(...G.camOverride.pos);
    camera.lookAt(...G.camOverride.look);
    return;
  }
  if (state.mode === 'menu' && !SHOT) { // slow vista drift behind the start screen
    camera.position.set(7.5 + Math.sin(t * 0.05) * 2, 9.5, 138);
    camera.lookAt(-16, 3.5, 30);
    return;
  }
  if (state.driving || G.cameraMode === 'chase') {
    const car = state.inCar || heroCar;
    const back = new THREE.Vector3(Math.sin(car.rotation.y), 0, Math.cos(car.rotation.y));
    const want = car.position.clone().add(back.multiplyScalar(7.2));
    want.y = 1.3; want.x += Math.cos(car.rotation.y) * 1.2;
    camera.position.lerp(want, SHOT ? 1 : 1 - Math.pow(0.0001, dt));
    const ahead = car.position.clone(); ahead.y = 1.1;
    ahead.x -= Math.sin(car.rotation.y) * 9; ahead.z -= Math.cos(car.rotation.y) * 9;
    camera.lookAt(ahead);
  } else { // on foot: close third person
    const back = new THREE.Vector3(Math.sin(state.playerHeading), 0, Math.cos(state.playerHeading));
    const want = state.playerPos.clone().add(back.multiplyScalar(5.2)); want.y = 2.3;
    camera.position.lerp(want, SHOT ? 1 : 1 - Math.pow(0.0001, dt));
    const ahead = state.playerPos.clone(); ahead.y = 1.3;
    camera.lookAt(ahead);
  }
}

// ---------- boot ----------
buildStaticHud();
applyMood('golden');
if (SHOT) {
  state.mode = 'shot';
  stageShot(G, SHOT);
  refreshUnits();
  updateHud(state);
} else {
  document.getElementById('start-screen').style.display = 'flex';
  document.querySelectorAll('.panel').forEach(p => { p.style.display = 'none'; });
  heroCar.position.set(3.2, 0, 52);
  state.playerPos.set(0, 0, 58);
  playerPerson.position.copy(state.playerPos);
}
window.__game = { state, missions, toggleCar, startPlay, heroCar, police, traffic, probeOverlap, panelCount, districtAt };
animate();
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
