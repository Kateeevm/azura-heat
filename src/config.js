// AZURA HEAT — identity, districts, missions, moods. All names are original.
// The boulevard runs along Z. Sea is at negative X, city at positive X.
export const CITY = {
  name: 'Azura Bay',
  boulevard: 'Azura Boulevard',
  roadHalf: 8,            // asphalt half-width (m)
  roadZ: [-640, 640],     // boulevard extent
  promenadeX: -13.5,
  sandX: -24,
  seaX: -58,
  buildingX: 17,
  crossStreets: [-480, -320, -160, 0, 160, 320, 480],
};

export const DISTRICTS = [
  { name: 'LIGHTHOUSE END', z: -560 },
  { name: 'HARBOR EAST', z: -400 },
  { name: 'OLD CANNERY', z: -240 },
  { name: 'MARINA ROW', z: -80 },
  { name: 'PELICAN PIER', z: 60 },
  { name: 'CORAL POINT', z: 220 },
  { name: 'SUNSET FLATS', z: 380 },
  { name: 'AZURE HEIGHTS', z: 540 },
];
export function districtAt(z) {
  let best = DISTRICTS[0];
  for (const d of DISTRICTS) if (Math.abs(d.z - z) < Math.abs(best.z - z)) best = d;
  return best.name;
}

export const CREW = [
  { name: 'Nico Ferreira', role: 'LEAD', tag: '“SALTLORD”', color: '#2ec4b6' },
  { name: 'Dario Venn', role: 'WHEELMAN', tag: '“DEADEYE”', color: '#e8a33d' },
  { name: 'Priya Anand', role: 'FIXER', tag: '“COMPASS”', color: '#7fb069' },
  { name: 'Marta Ilves', role: 'LOOKOUT', tag: '“GLASS”', color: '#c39bff' },
];

export const ABILITIES = [
  { key: 'Q', name: 'Adrenaline', cd: 18 },
  { key: 'G', name: 'Crew Smoke', cd: 24 },
  { key: 'X', name: 'Bribe Dispatch', cd: 40 },
  { key: 'C', name: 'Nitro Surge', cd: 12 },
];

export const WEAPONS = [
  { icon: '✊', name: 'Fists', ammo: '—' },
  { icon: '🔫', name: 'P9 Pistol', ammo: '48' },
  { icon: '💥', name: 'Scattergun', ammo: '14' },
  { icon: '◎', name: 'Carbine', ammo: '120' },
  { icon: '🧨', name: 'Pipe Bomb', ammo: '3' },
  { icon: '🔪', name: 'Harbor Knife', ammo: '—' },
];

export const RADIO = [
  { name: 'TIDE 101.3 AZURA FM', track: 'The Breakwaters — “Salt in the Wound”' },
  { name: 'GLASSWAVE 94.7', track: 'Neon Cannery — “Low Water”' },
  { name: 'PIER NIGHTS 88.1', track: 'Marta & The Gulls — “Blue Mile”' },
];

// 10 missions, 3 chapters. Each stage: {kind: reach|chase|fight|deliver, z, text, time}
export const CHAPTERS = ['SALT IN THE WOUND', 'GLASS WATER', 'THE LONG BLUE MILE'];
export const MISSIONS = [
  { ch: 0, name: 'First Salt', pay: 2400, stages: [
    { kind: 'reach', z: 60, text: 'Meet Dario at Pelican Pier', time: 150 },
    { kind: 'reach', z: -80, text: 'Drive the Ventura to Marina Row', time: 150 },
    { kind: 'chase', z: -240, text: 'Lose the ABPD tail at Old Cannery', time: 170 }] },
  { ch: 0, name: 'Cannery Row', pay: 3100, stages: [
    { kind: 'reach', z: -240, text: 'Enter the Old Cannery yard', time: 150 },
    { kind: 'fight', z: -240, text: 'Drive off the Cannery crew', time: 180 },
    { kind: 'deliver', z: 60, text: 'Bring the crates back to Pelican Pier', time: 170 }] },
  { ch: 0, name: 'Glass Money', pay: 3900, stages: [
    { kind: 'reach', z: 220, text: 'Pick up Priya at Coral Point', time: 150 },
    { kind: 'chase', z: 380, text: 'Outrun the interceptors to Sunset Flats', time: 180 }] },
  { ch: 1, name: 'Low Water', pay: 4600, stages: [
    { kind: 'reach', z: -80, text: 'Meet the marina contact', time: 150 },
    { kind: 'fight', z: -80, text: 'Hold the marina until the boat leaves', time: 190 },
    { kind: 'reach', z: -400, text: 'Escape to Harbor East', time: 170 }] },
  { ch: 1, name: 'Harbor Lights', pay: 5200, stages: [
    { kind: 'reach', z: -400, text: 'Tail the courier through Harbor East', time: 180 },
    { kind: 'deliver', z: -560, text: 'Deliver the ledger to Lighthouse End', time: 180 }] },
  { ch: 1, name: 'The Quiet Dock', pay: 5900, stages: [
    { kind: 'reach', z: -560, text: 'Scope the lighthouse dock', time: 150 },
    { kind: 'fight', z: -560, text: 'Clear the dock guards', time: 190 },
    { kind: 'chase', z: -80, text: 'Run the boulevard back to Marina Row', time: 180 }] },
  { ch: 2, name: 'Neon Ledger', pay: 6800, stages: [
    { kind: 'reach', z: -80, text: 'Collect the first dead drop', time: 150 },
    { kind: 'reach', z: 220, text: 'Collect the Coral Point drop', time: 160 },
    { kind: 'reach', z: 540, text: 'Collect the Azure Heights drop', time: 180 }] },
  { ch: 2, name: 'TALON Down', pay: 7600, stages: [
    { kind: 'chase', z: 380, text: 'Outrun TALON-2 down Azura Boulevard', time: 190 },
    { kind: 'reach', z: 60, text: 'Ditch the car at Pelican Pier', time: 150 }] },
  { ch: 2, name: 'Salt Road Kings', pay: 8400, stages: [
    { kind: 'fight', z: 380, text: 'Beat the Salt Road Kings at Sunset Flats', time: 200 },
    { kind: 'deliver', z: 540, text: 'Take the crown car to Azure Heights', time: 170 }] },
  { ch: 2, name: 'The Long Blue Mile', pay: 12000, stages: [
    { kind: 'reach', z: 540, text: 'Assemble the crew at Azure Heights', time: 160 },
    { kind: 'chase', z: -560, text: 'Run the whole boulevard to Lighthouse End', time: 240 },
    { kind: 'deliver', z: -560, text: 'Board the boat. End the night.', time: 120 }] },
];

export const DISPATCH_POOL = [
  { unit: 'Unit 7', who: 'Sgt. Hale' }, { unit: 'Unit 12', who: 'Ofc. Tran' },
  { unit: 'TALON-2', who: 'Air Support' }, { unit: 'Unit 21', who: 'Ofc. Okafor' },
  { unit: 'Unit 4', who: 'Det. Calloway' }, { unit: 'Unit 18', who: 'Ofc. Reyes' },
];
export const TACTICS = ['PURSUIT', 'RAMMING', 'SPOTLIGHT', 'ROADBLOCK', 'PURSUIT', 'HOLD'];

// Mood rig — the single source of truth for lighting. ITERATION-LOG mirrors these numbers.
export const MOODS = {
  golden: {
    exposure: 1.12, sunColor: 0xffb36b, sunInt: 3.0, sunElev: 13, sunAzim: -38,
    hemiSky: 0x6f639e, hemiGround: 0xcaa06a, hemiInt: 0.45,
    fogColor: 0xd98a5e, fogDensity: 0.0015,
    envAsphalt: 0.1, envPaint: 0.95, envGlass: 1.4,
    skyTop: '#3d2f6e', skyMid: '#b65a7d', skyLow: '#ff9a4d', skyBot: '#ffd98a',
    litRatio: 0.25, lampsOn: false, seaColor: 0x3a4a8c, seaGlint: 0.5,
  },
  dusk: {
    exposure: 1.06, sunColor: 0xff9a55, sunInt: 2.1, sunElev: 7, sunAzim: -38,
    hemiSky: 0x6a5bb0, hemiGround: 0x9a7a52, hemiInt: 0.5,
    fogColor: 0xb06a72, fogDensity: 0.0017,
    envAsphalt: 0.2, envPaint: 0.8, envGlass: 1.2,
    skyTop: '#2c2560', skyMid: '#8a4a78', skyLow: '#f07f45', skyBot: '#ffc478',
    litRatio: 0.32, lampsOn: true, seaColor: 0x2e3c74, seaGlint: 0.35,
  },
  night: {
    exposure: 0.98, sunColor: 0x7d94c8, sunInt: 0.55, sunElev: 32, sunAzim: 40,
    hemiSky: 0x24365e, hemiGround: 0x0c1220, hemiInt: 0.42,
    fogColor: 0x0a1428, fogDensity: 0.0021,
    envAsphalt: 0.12, envPaint: 0.28, envGlass: 0.45,
    skyTop: '#060d22', skyMid: '#0d1c3d', skyLow: '#1c3464', skyBot: '#2a4a7d',
    litRatio: 0.42, lampsOn: true, seaColor: 0x14264f, seaGlint: 0.12,
  },
};

export const SAVE_KEY = 'azura-heat-save-v1';
