// AZURA HEAT — WebAudio synth: engine hum, radio arpeggios, gunshot, siren blips.
// Everything is synthesised; no audio files, no network.
export class SynthAudio {
  constructor() { this.ctx = null; this.master = null; this.engineOsc = null; this.radioTimer = 0; this.station = 0; }
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
    } catch { this.ctx = null; }
  }
  engine(on, speed01) {
    if (!this.ctx) return;
    if (on && !this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator(); this.engineOsc.type = 'sawtooth';
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
      const g = this.ctx.createGain(); g.gain.value = 0.05;
      this.engineOsc.connect(f); f.connect(g); g.connect(this.master); this.engineOsc.start();
      this.engineFilter = f;
    }
    if (this.engineOsc) {
      this.engineOsc.frequency.value = 55 + speed01 * 130;
      if (this.engineFilter) this.engineFilter.frequency.value = 280 + speed01 * 700;
      if (!on) { this.engineOsc.stop(); this.engineOsc = null; }
    }
  }
  shot(enemy = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, 2205, 44100); const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = enemy ? 1400 : 2100;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
  }
  blip(freq = 880, dur = 0.09, vol = 0.2) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    o.connect(g); g.connect(this.master); o.start(); o.stop(this.ctx.currentTime + dur);
  }
  radioTick(dt, playing) { // gentle synthwave arp while driving
    if (!this.ctx || !playing) return;
    this.radioTimer -= dt;
    if (this.radioTimer <= 0) {
      this.radioTimer = 0.24;
      const scale = [220, 261.6, 329.6, 392, 329.6, 261.6];
      const n = scale[Math.floor(this.ctx.currentTime * 4.16) % scale.length];
      this.blip(n * (this.station === 1 ? 1.5 : 1), 0.16, 0.07);
    }
  }
}
