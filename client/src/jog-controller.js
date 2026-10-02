// Input ownership lives outside rendering. No angles are integrated in the browser:
// normalized intent is leased to the device, which owns acceleration and braking.
export class JogController {
  constructor({ canJog, send, release, onChange = () => {}, fraction = 0.25 }) {
    Object.assign(this, { canJog, send, release, onChange, fraction });
    this.inputs = new Map();
    this.timer = null;
    this.releasePending = null;
  }
  vector() {
    let pan = 0,
      tilt = 0;
    for (const v of this.inputs.values()) {
      pan += v.pan;
      tilt += v.tilt;
    }
    return {
      pan: Math.max(-1, Math.min(1, pan)) * this.fraction,
      tilt: Math.max(-1, Math.min(1, tilt)) * this.fraction,
    };
  }
  start(id, pan, tilt) {
    if (!this.canJog() || this.inputs.has(id)) return false;
    this.inputs.set(id, { pan, tilt });
    this.update();
    if (!this.timer) this.timer = setInterval(() => this.pulse(), 100);
    return true;
  }
  end(id) {
    if (!this.inputs.delete(id)) return;
    this.update();
  }
  setFraction(value) {
    if (![0.25, 0.5, 1].includes(value)) return;
    this.fraction = value;
    if (this.inputs.size) this.update();
  }
  update() {
    const v = this.vector();
    this.onChange(v, this.inputs.size > 0);
    if (!this.inputs.size) {
      this.stopTimer();
      this.releaseIntent();
    } else this.pulse();
  }
  pulse() {
    if (!this.inputs.size) return;
    if (!this.canJog()) {
      this.clear(false);
      return;
    }
    const v = this.vector();
    this.send(v.pan, v.tilt);
  }
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  releaseIntent() {
    let pending;
    try {
      // Call immediately so normal release remains higher priority than holds.
      pending = Promise.resolve(this.release());
    } catch (error) {
      // Pointer/key cleanup must finish even for a synchronously failing adapter.
      pending = Promise.reject(error);
    }
    this.releasePending = pending;
    const settled = () => {
      if (this.releasePending === pending) this.releasePending = null;
    };
    pending.then(settled, settled);
    return pending;
  }
  clear(sendRelease = true) {
    const had = this.inputs.size > 0;
    this.inputs.clear();
    this.stopTimer();
    this.onChange({ pan: 0, tilt: 0 }, false);
    if (had && sendRelease) return this.releaseIntent();
    if (sendRelease) return this.releasePending;
  }
  dispose() {
    this.clear();
  }
}
