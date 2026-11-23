// AZURA HEAT — mission engine: 10 missions / 3 chapters, staged objectives,
// short tapered marker cones (≤3.5 m) + ground rings — never light columns.
import * as THREE from 'three';
import { MISSIONS, CHAPTERS } from './config.js';

export class MissionEngine {
  constructor(scene) {
    this.index = 0; this.stage = 0; this.timeLeft = 0; this.active = false; this.done = false;
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xffc46a, transparent: true, opacity: 0.85 });
    this.marker = new THREE.Mesh(new THREE.ConeGeometry(0.85, 3.2, 14), coneMat);
    this.marker.rotation.x = Math.PI; // tapered point down, hovering low
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc46a, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.7, 28), ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    scene.add(this.marker, this.ring);
    this.load(0);
  }
  get def() { return MISSIONS[this.index]; }
  get stageDef() { return this.def.stages[this.stage]; }
  load(i) {
    this.index = Math.min(i, MISSIONS.length - 1); this.stage = 0;
    this.timeLeft = this.stageDef.time; this.active = true;
    this.placeMarker();
  }
  placeMarker() {
    const z = this.stageDef.z;
    this.marker.position.set(2.5, 2.1, z);
    this.ring.position.set(2.5, 0.14, z);
  }
  // returns events: {advanced} / {missionComplete, pay} / {failed}
  update(dt, playerPos, ctx) {
    if (!this.active || this.done) return null;
    this.timeLeft -= dt;
    this.marker.position.y = 2.1 + Math.sin(ctx.now * 2.2) * 0.22;
    this.ring.scale.setScalar(1 + Math.sin(ctx.now * 2.2) * 0.07);
    if (this.timeLeft <= 0) { this.timeLeft = this.stageDef.time; return { failed: true }; }
    const dz = playerPos.z - this.stageDef.z, dx = playerPos.x - 2.5;
    const near = Math.hypot(dx, dz) < 7;
    let complete = false;
    if (this.stageDef.kind === 'reach' || this.stageDef.kind === 'deliver') complete = near;
    else if (this.stageDef.kind === 'chase') complete = near && ctx.wanted === 0;
    else if (this.stageDef.kind === 'fight') complete = near && ctx.enemiesDown >= ctx.enemiesNeeded;
    if (!complete) return null;
    this.stage++;
    if (this.stage >= this.def.stages.length) {
      const pay = this.def.pay;
      if (this.index >= MISSIONS.length - 1) { this.done = true; this.active = false; this.marker.visible = this.ring.visible = false; }
      else this.load(this.index + 1);
      return { missionComplete: true, pay };
    }
    this.timeLeft = this.stageDef.time; this.placeMarker();
    return { advanced: true };
  }
  hudState(stageFrac) {
    return {
      ch: this.def.ch, chapterName: CHAPTERS[this.def.ch], name: this.def.name,
      objective: this.done ? 'Story complete — free roam Azura Bay' : this.stageDef.text,
      index: this.index, stage: this.stage, stageCount: this.def.stages.length,
      stageFrac: stageFrac ?? 0, timeLeft: this.done ? 9999 : this.timeLeft,
    };
  }
}
