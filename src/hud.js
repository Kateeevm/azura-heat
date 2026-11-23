// AZURA HEAT — HUD: every panel is fed by real game state; the minimap draws the
// real street grid + shoreline + blips + search radius. Includes the overlap probe.
import { ABILITIES, WEAPONS, DISPATCH_POOL, TACTICS, CITY, districtAt } from './config.js';

const $ = id => document.getElementById(id);
const PANEL_IDS = ['hud-mission', 'hud-dispatch', 'hud-vitals', 'hud-minimap', 'hud-district',
  'hud-wanted', 'hud-money', 'hud-radio', 'hud-abilities', 'hud-speed', 'hud-vehicle',
  'hud-weapons', 'hud-dialogue'];

export function buildStaticHud() {
  $('hud-abilities').innerHTML = ABILITIES.map((a, i) =>
    `<div class="ab"><span class="key">${a.key}</span><div class="aname">${a.name}</div><div class="acd" id="ab-${i}">READY</div></div>`).join('');
  $('hud-weapons').innerHTML = WEAPONS.map((w, i) =>
    `<div class="wp${i === 1 ? ' sel' : ''}" id="wp-${i}"><span class="wico">${w.icon}</span>${w.name}<br><span class="wammo">${w.ammo}</span></div>`).join('');
  drawPortrait('#e8a33d', '#2a2320');
}
export function drawPortrait(skinCss, hairCss) {
  const g = $('portrait').getContext('2d');
  g.fillStyle = '#20303e'; g.fillRect(0, 0, 104, 104);
  g.fillStyle = skinCss; g.beginPath(); g.arc(52, 44, 21, 0, 7); g.fill();
  g.fillStyle = hairCss; g.beginPath(); g.arc(52, 36, 21, Math.PI, 0); g.fill(); g.fillRect(31, 30, 42, 8);
  g.fillStyle = '#14707a'; g.fillRect(28, 68, 48, 36);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(28, 68, 48, 6);
}

export function setDialogue(who, roleTag, line, skinCss, hairCss) {
  $('dlg-who').innerHTML = `${who} <span>· ${roleTag}</span>`;
  $('dlg-line').textContent = line;
  if (skinCss) drawPortrait(skinCss, hairCss || '#2a2320');
}

export function updateHud(S) {
  const m = S.mission;
  $('mchapter').textContent = `CHAPTER ${['I', 'II', 'III'][m.ch]} · ${m.chapterName}`;
  $('mname').textContent = m.name;
  $('mobj').textContent = m.objective;
  $('mstage').textContent = `MISSION ${m.index + 1} / 10 · STAGE ${m.stage + 1}/${m.stageCount}`;
  $('stagefill').style.width = `${Math.round(((m.stage + m.stageFrac) / m.stageCount) * 100)}%`;
  const t = Math.max(0, Math.ceil(m.timeLeft));
  $('mtimer').textContent = m.timeLeft > 900 ? 'NO LIMIT' : `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  $('stars').textContent = '★'.repeat(S.wanted) + '☆'.repeat(5 - S.wanted);
  $('wstatus').textContent = S.wanted === 0 ? '○ NO ACTIVE PURSUIT' :
    S.inSight ? '● IN SIGHT — ABPD CLOSING IN' : '● SEARCHING — BREAK LINE OF SIGHT';
  $('wstatus').style.color = S.inSight ? '#ff9a7a' : '#ffd34d';
  $('money').textContent = '$' + S.money.toLocaleString('en-US');
  $('radio-name').textContent = S.radio.name;
  $('radio-track').textContent = S.radio.track;
  $('district-name').textContent = districtAt(S.playerPos.z);
  $('v-health').style.width = `${Math.round(S.health)}%`;
  $('v-armor').style.width = `${Math.round(S.armor)}%`;
  $('v-crew').style.width = `${Math.round(S.crewMorale)}%`;
  S.abilities.forEach((a, i) => {
    const el = $(`ab-${i}`);
    el.textContent = a.left > 0 ? `${Math.ceil(a.left)}s` : 'READY';
    el.className = 'acd' + (a.left > 0 ? ' cool' : '');
  });
  const mph = Math.round(Math.abs(S.speed) * 2.237);
  $('speednum').innerHTML = S.driving ? `${mph} <small>MPH</small>` : `0 <small>MPH</small>`;
  $('veh-name').textContent = S.driving ? S.vehicleName : 'On Foot';
  $('veh-sub').textContent = S.driving ? `CONDITION ${Math.round(S.vehicleCond)}% · DRIVING` : 'WASD MOVE · E ENTER CAR';
  $('condfill').style.width = `${S.driving ? Math.round(S.vehicleCond) : 100}%`;
  // dispatch: nearest units first, live distances, tactic chips
  const rows = S.units.slice(0, 6).map((u, i) => {
    const pool = DISPATCH_POOL[i % DISPATCH_POOL.length];
    const dist = u.dist == null ? '—' : `${Math.round(u.dist)} m`;
    const tac = u.tactic || TACTICS[i % TACTICS.length];
    const chipCls = { PURSUIT: 'chip-pursuit', RAMMING: 'chip-ram', SPOTLIGHT: 'chip-spot', ROADBLOCK: 'chip-block', HOLD: 'chip-hold', SHADOW: 'chip-shadow' }[tac] || 'chip-pursuit';
    return `<div class="dunit"><span>${pool.unit} · ${pool.who}</span><span class="dist">${dist}</span><span class="chip ${chipCls}">${tac}</span></div>`;
  }).join('');
  $('dispatch-list').innerHTML = rows || '<div class="dunit"><span>No units dispatched</span></div>';
  drawMinimap(S);
}

function drawMinimap(S) {
  const cv = $('minimap'), g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  g.fillStyle = '#20344a'; g.fillRect(0, 0, W, H);          // city blocks base
  g.fillStyle = '#274b73'; g.fillRect(0, 0, 74, H);          // sea
  g.fillStyle = '#c9a06d'; g.fillRect(74, 0, 20, H);         // sand strip
  const world2map = (x, z) => [118 + x * 0.55, H / 2 + (z - S.playerPos.z) * 0.24];
  // street grid
  g.strokeStyle = 'rgba(230,238,248,.55)'; g.lineWidth = 5;
  g.beginPath(); let [bx] = world2map(0, 0); g.moveTo(bx, 0); g.lineTo(bx, H); g.stroke();
  g.lineWidth = 3;
  for (const cz of CITY.crossStreets) {
    const [, y] = world2map(0, cz); if (y < -4 || y > H + 4) continue;
    g.beginPath(); g.moveTo(bx, y); g.lineTo(W, y); g.stroke();
  }
  g.strokeStyle = 'rgba(240,196,106,.8)'; g.lineWidth = 1.6; // shoreline curve
  g.beginPath(); for (let y = 0; y <= H; y += 8) { const sx = 84 + Math.sin(y * 0.05) * 4; y === 0 ? g.moveTo(sx, y) : g.lineTo(sx, y); } g.stroke();
  // search radius at wanted >= 3
  if (S.wanted >= 3) {
    const [px, py] = world2map(S.playerPos.x, S.playerPos.z);
    g.strokeStyle = 'rgba(255,80,60,.85)'; g.lineWidth = 2;
    g.beginPath(); g.arc(px, py, 34, 0, 7); g.stroke();
  }
  const blip = (x, z, color, r = 4) => {
    const [mx, my] = world2map(x, z); if (mx < 0 || mx > W || my < 0 || my > H) return;
    g.fillStyle = color; g.beginPath(); g.arc(mx, my, r, 0, 7); g.fill();
  };
  for (const u of S.units) blip(u.x, u.z, '#4da3ff');
  if (S.heliPos) blip(S.heliPos.x, S.heliPos.z, '#6ee7e0', 3.4);
  if (S.objectivePos) blip(S.objectivePos.x, S.objectivePos.z, '#ffd34d', 5);
  // player arrow (centre)
  const [px, py] = world2map(S.playerPos.x, S.playerPos.z);
  g.save(); g.translate(px, py); g.rotate(-S.playerHeading);
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -8); g.lineTo(5.5, 6); g.lineTo(0, 3); g.lineTo(-5.5, 6); g.closePath(); g.fill(); g.restore();
  g.fillStyle = '#f3ead8'; g.font = '700 13px Arial'; g.fillText('N', W - 18, 16);
}

// Overlap probe: returns overlapping panel pairs among visible HUD panels.
export function probeOverlap() {
  const rects = PANEL_IDS.map(id => { const el = $(id); return { id, r: el.getBoundingClientRect(), vis: el.offsetParent !== null || el.style.display !== 'none' }; })
    .filter(p => p.vis && p.r.width > 0);
  const hits = [];
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i].r, b = rects[j].r;
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1)
      hits.push(`${rects[i].id}×${rects[j].id}`);
  }
  return hits;
}
export function panelCount() { return PANEL_IDS.length; }
