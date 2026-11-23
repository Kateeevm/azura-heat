// AZURA HEAT — screenshot staging. Each shot is a real render of the live game
// with state arranged deterministically (seed 7): no compositing, no edits.
import { setDialogue } from './hud.js';

// G = game context from main.js (scene refs, state, actors, effect spawners).
export function stageShot(G, name) {
  const S = G.state;
  document.querySelectorAll('.panel').forEach(p => { if (p.id !== 'hud-prompt' && p.id !== 'hud-banner') p.style.display = ''; });
  document.getElementById('start-screen').style.display = 'none';
  if (name === 'chase') stageChase(G, S);
  else if (name === 'gunfight') stageGunfight(G, S);
  else if (name === 'start') stageStart(G, S);
  else if (name === 'night') stageNight(G, S);
}

function baseChaseState(S) {
  S.money = 48260; S.wanted = 4; S.inSight = true; S.health = 92; S.armor = 64; S.crewMorale = 78;
  S.driving = true; S.vehicleName = 'Ventura GT-S'; S.vehicleCond = 96;
  S.radio = { name: 'TIDE 101.3 AZURA FM', track: 'The Breakwaters — “Salt in the Wound”' };
}

function stageChase(G, S) {
  G.applyMood('golden');
  baseChaseState(S);
  S.speed = 43; // ≈ 96 MPH on the speedometer
  S.mission = { ch: 2, chapterName: 'THE LONG BLUE MILE', name: 'TALON Down', objective: 'Outrun TALON-2 down Azura Boulevard',
    index: 7, stage: 0, stageCount: 2, stageFrac: 0.4, timeLeft: 97 };
  const hero = G.heroCar; hero.position.set(2.4, 0, 36); hero.rotation.y = Math.PI; // heading -Z
  G.playerPos.set(2.4, 0, 36); S.playerHeading = Math.PI;
  G.placePolice(0, 6.6, 46, Math.PI - 0.16);   // flanking right of the hero, angled in
  G.placePolice(1, -3.2, 44, Math.PI + 0.12);  // flanking left, beside the hero
  G.placePolice(2, 3.4, 74, Math.PI);          // third unit further up the road
  G.placeTraffic(0, -4.2, -26, 0);             // oncoming lane car behind camera lane
  G.placeTraffic(1, 4.4, -64, Math.PI);        // same-direction traffic far behind
  G.placeTraffic(2, -4.4, 96, 0);              // oncoming far ahead, near the pier
  // TALON-2: ahead on the sea side, WHOLE inside the frame; its cone is aimed at the car
  G.heli.position.set(-6, 11, 64); G.heli.rotation.set(0.1, Math.PI * 0.78, 0.05);
  G.setSpotlightPool(2.4, 36);
  G.aimCone(new G.V3(-6.7, 10.1, 63), new G.V3(2.4, 0.2, 36));
  G.stagePeds(36, 9);
  G.cameraMode = 'chase';
  setDialogue('Dario Venn', 'WHEELMAN · “DEADEYE”', 'TALON-2 has us lit. Keep the sea on your left and do not slow down.', '#c98d5f', '#14100c');
}

function stageGunfight(G, S) {
  G.applyMood('dusk');
  S.money = 31540; S.wanted = 3; S.inSight = true; S.health = 74; S.armor = 41; S.crewMorale = 66;
  S.driving = false; S.speed = 0; S.vehicleName = 'On Foot';
  S.radio = { name: 'GLASSWAVE 94.7', track: 'Neon Cannery — “Low Water”' };
  S.mission = { ch: 1, chapterName: 'GLASS WATER', name: 'The Quiet Dock', objective: 'Clear the dock guards',
    index: 5, stage: 1, stageCount: 3, stageFrac: 0.5, timeLeft: 143 };
  // player behind a cover car on the boulevard at Old Cannery, enemies CLOSE across the road
  G.playerPerson.visible = true;
  G.playerPerson.position.set(-3.2, 0, -225); G.playerPerson.rotation.y = 0.55; // faces the enemies
  G.playerPos.set(-3.2, 0, -225); S.playerHeading = -Math.PI / 2;
  G.aimPlayer();
  const cover = G.traffic[3]; cover.position.set(-0.8, 0, -228.5); cover.rotation.y = Math.PI / 2 - 0.15;
  const cover2 = G.traffic[4]; cover2.position.set(7, 0, -237.5); cover2.rotation.y = Math.PI / 2 + 0.1;
  G.placeEnemies([ [5.6, -235], [8.2, -239], [4.4, -241], [10.5, -233] ]);
  G.placePolice(0, -4.6, -205, Math.PI); G.placePolice(1, 5.8, -200, Math.PI);
  G.heli.position.set(-14, 20, -252); G.heli.rotation.y = Math.PI * 0.7;
  G.setSpotlightPool(-3.2, -225, 0.35);
  G.stagePeds(-232, 5);
  // staged combat effects: tracers both ways + muzzle flashes, intensities capped (prompt 3/4)
  G.spawnTracer(new G.V3(-2.4, 1.35, -225.4), new G.V3(5.2, 1.25, -234.6), 0xffd98a, 999);
  G.spawnTracer(new G.V3(-2.4, 1.42, -225.2), new G.V3(5.2, 1.3, -234.4), 0xffe9b8, 999);
  G.spawnTracer(new G.V3(-2.4, 1.28, -225.6), new G.V3(5.2, 1.18, -234.8), 0xffc478, 999);
  G.spawnTracer(new G.V3(5.4, 1.3, -235), new G.V3(-2.8, 1.2, -225.8), 0xff9a7a, 999);
  G.spawnTracer(new G.V3(5.4, 1.38, -234.8), new G.V3(-2.8, 1.26, -225.6), 0xffb49a, 999);
  G.spawnFlash(new G.V3(-1.9, 1.38, -225.6), 2.6);
  G.spawnFlash(new G.V3(5, 1.32, -234.6), 2.0);
  G.spawnFlash(new G.V3(5.2, 1.25, -234.6), 1.1); // hit sparks on the cover car
  G.cameraMode = 'foot'; G.camOverride = { pos: [-8.4, 2.0, -217.5], look: [3.5, 1.15, -238] };
  setDialogue('Priya Anand', 'FIXER · “COMPASS”', 'Four guards, two cars for cover. Drop them clean, Nico.', '#8a5a34', '#0e0c0a');
}

function stageStart(G, S) {
  G.applyMood('golden');
  document.querySelectorAll('.panel').forEach(p => { p.style.display = 'none'; });
  const ss = document.getElementById('start-screen'); ss.style.display = 'flex';
  G.heroCar.position.set(3.4, 0, 96); G.heroCar.rotation.y = Math.PI;
  G.placeTraffic(0, -4.2, 30, 0); G.placeTraffic(1, 4.4, 150, Math.PI);
  G.stagePeds(70, 8);
  G.heli.position.set(-26, 20, -30); G.heli.rotation.y = Math.PI * 0.8;
  // elevated three-layer vista: sea + pier + wheel left, boulevard centre, city right
  G.cameraMode = 'fixed';
  G.camOverride = { pos: [7.5, 9.5, 138], look: [-16, 3.5, 30] };
  S.playerPos.set(3.4, 0, 96);
}

function stageNight(G, S) {
  G.applyMood('night');
  S.money = 51230; S.wanted = 1; S.inSight = false; S.health = 88; S.armor = 57; S.crewMorale = 71;
  S.driving = true; S.vehicleName = 'Ventura GT-S'; S.vehicleCond = 100; S.speed = 15.2; // ≈ 34 MPH
  S.radio = { name: 'PIER NIGHTS 88.1', track: 'Marta & The Gulls — “Blue Mile”' };
  S.mission = { ch: 2, chapterName: 'THE LONG BLUE MILE', name: 'Neon Ledger', objective: 'Collect the three dead drops',
    index: 6, stage: 0, stageCount: 3, stageFrac: 0.3, timeLeft: 9999 };
  const hero = G.heroCar; hero.position.set(2.6, 0, -52); hero.rotation.y = Math.PI; // staged under a street lamp
  G.playerPos.set(2.6, 0, -52); S.playerHeading = Math.PI;
  G.placePolice(0, 3.1, -24, Math.PI); // one unit up the road, lightbar glowing
  G.placeTraffic(0, -4.2, -120, 0); G.placeTraffic(1, 4.2, -150, Math.PI); G.placeTraffic(2, -4.4, -6, 0);
  G.heli.position.set(-20, 26, -106); G.heli.rotation.y = Math.PI * 0.75;
  G.setSpotlightPool(2.6, -52, 0); // spotlight off at wanted 1
  // taillight glow so the hero car reads at night (rear faces the camera; small, capped — prompt 4)
  G.spawnFlash(new G.V3(1.5, 0.72, -54.4), 1.15, 0xff2a22);
  G.spawnFlash(new G.V3(3.7, 0.72, -54.4), 1.15, 0xff2a22);
  G.stagePeds(-70, 7);
  G.cameraMode = 'chase';
  setDialogue('Priya Anand', 'FIXER · “COMPASS”', 'Drops are lit across the bay tonight. Neon means money, Nico.', '#8a5a34', '#0e0c0a');
}
