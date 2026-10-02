// A single motion lane, disposable sessions, and bounded reads prevent stale work
// from arming or replaying movement after STOP or connection changes.
export class DeviceError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}
export const initialStatus = () => ({
  armed: false,
  stopped: true,
  estop: false,
  pan: 0,
  tilt: 0,
  pan_target: 0,
  tilt_target: 0,
  pan_min: -60,
  pan_max: 60,
  tilt_min: -25,
  tilt_max: 25,
  pan_center: 1500,
  tilt_center: 1500,
  pan_low: 1400,
  pan_high: 1600,
  tilt_low: 1400,
  tilt_high: 1600,
  pan_speed: 25,
  tilt_speed: 15,
  pan_invert: false,
  tilt_invert: false,
  firmware: "0.5.0-demo",
  control_epoch: 1,
  jog_seq: 0,
  jog_pan: 0,
  jog_tilt: 0,
  jog_active: false,
  jog_lease_ms: 500,
});
export class Transport {
  constructor({
    onStatus = () => {},
    onError = () => {},
    onLog = () => {},
    onEpochChange = () => {},
    fetcher = globalThis.fetch.bind(globalThis),
  } = {}) {
    Object.assign(this, { onStatus, onError, onLog, onEpochChange, fetcher });
    this.generation = 0;
    this.sequence = 0;
    this.appliedSequence = 0;
    this.controllers = new Set();
    this.jogControllers = new Set();
    this.jogGeneration = 0;
    this.jogPending = null;
    this.jogSending = false;
    this.jogEpoch = null;
    this.jogSeq = 0;
    this.demoVelocity = { pan: 0, tilt: 0 };
    this.demoTick = Date.now();
    this.demoJogLast = 0;
    this.demoState = initialStatus();
    this.demoLast = Date.now();
    this.pending = null;
    this.moving = false;
    this.token = "";
    this.base = "";
    this.demo = false;
  }
  configure({ base = "", token = "", demo = false }) {
    this.cancel();
    this.base = base.replace(/\/$/, "");
    this.token = token;
    this.demo = demo;
    this.demoState = initialStatus();
    this.demoLast = Date.now();
    this.demoTick = Date.now();
    this.demoVelocity = { pan: 0, tilt: 0 };
    this.jogEpoch = null;
    this.jogSeq = 0;
  }
  cancel() {
    this.cancelJog();
    this.generation++;
    this.pending = null;
    this.moving = false;
    for (const c of this.controllers) c.abort();
    this.controllers.clear();
  }
  async request(path, body, method = "POST", options = {}) {
    const sequence = ++this.sequence,
      generation = this.generation,
      controller = new AbortController();
    this.controllers.add(controller);
    const laneGeneration = this.jogGeneration;
    if (options.lane === "jog") this.jogControllers.add(controller);
    const timer = setTimeout(() => controller.abort(), 2200);
    const start = performance.now();
    try {
      let state;
      if (this.demo) {
        await new Promise((r) => setTimeout(r, 45));
        if (controller.signal.aborted)
          throw new DOMException("Cancelled", "AbortError");
        state = this.mock(path, body);
      } else {
        const headers = {};
        if (method === "POST") {
          headers["X-CAMX-Request"] = "1";
          if (this.token) headers.Authorization = `Bearer ${this.token}`;
          if (body !== undefined) headers["Content-Type"] = "application/json";
        }
        const response = await this.fetcher(`${this.base}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
          cache: "no-store",
          keepalive: !!options.keepalive,
        });
        const data = await response.json();
        if (!response.ok)
          throw new DeviceError(
            data.error || `HTTP ${response.status}`,
            response.status,
          );
        state = data;
      }
      if (!validStatus(state))
        throw new DeviceError("Invalid device status response");
      if (
        generation !== this.generation ||
        (options.lane === "jog" && laneGeneration !== this.jogGeneration)
      )
        throw new DOMException("Cancelled session", "AbortError");
      this.onLog({
        path,
        method,
        ok: true,
        elapsed: Math.round(performance.now() - start),
        body,
      });
      if (sequence >= this.appliedSequence) {
        this.appliedSequence = sequence;
        this.syncJog(state);
        this.onStatus(state);
      }
      return state;
    } catch (e) {
      if (
        generation === this.generation &&
        (options.lane !== "jog" || laneGeneration === this.jogGeneration)
      ) {
        this.onLog({
          path,
          method,
          ok: false,
          message:
            e.name === "AbortError" ? "Request deadline reached" : e.message,
        });
        if (!e.status)
          this.onError(
            "Connection unavailable. Motion requests were cancelled; reconnect never arms automatically.",
          );
      }
      throw e;
    } finally {
      clearTimeout(timer);
      this.controllers.delete(controller);
      this.jogControllers.delete(controller);
    }
  }
  async move(pan, tilt) {
    this.pending = { pan, tilt };
    if (this.moving) return;
    this.moving = true;
    const generation = this.generation;
    try {
      while (this.pending && generation === this.generation) {
        const next = this.pending;
        this.pending = null;
        await this.request("/move", next);
      }
    } catch (e) {
      if (generation === this.generation) this.pending = null;
      throw e;
    } finally {
      if (generation === this.generation) this.moving = false;
    }
  }
  syncJog(state) {
    if (!supportsJog(state)) {
      this.cancelJog();
      this.jogEpoch = null;
      return;
    }
    if (this.jogEpoch !== state.control_epoch) {
      this.cancelJog();
      this.jogEpoch = state.control_epoch;
      this.jogSeq = state.jog_seq;
      this.onEpochChange(state.control_epoch);
    } else this.jogSeq = Math.max(this.jogSeq, state.jog_seq);
  }
  cancelJog() {
    this.jogGeneration++;
    this.jogPending = null;
    this.jogSending = false;
    for (const c of this.jogControllers) c.abort();
    this.jogControllers.clear();
  }
  nextJog(pan, tilt) {
    if (this.jogEpoch === null)
      throw new DeviceError(
        "Hold controls require newer firmware with /jog support",
        409,
      );
    if (
      !Number.isFinite(pan) ||
      !Number.isFinite(tilt) ||
      Math.abs(pan) > 1 ||
      Math.abs(tilt) > 1
    )
      throw new DeviceError("Invalid jog direction", 400);
    if (this.jogSeq >= 0xffffffff)
      throw new DeviceError(
        "Jog sequence exhausted; explicitly ARM again for a new session",
        409,
      );
    return { pan, tilt, epoch: this.jogEpoch, seq: ++this.jogSeq };
  }
  async jog(pan, tilt) {
    this.jogPending = this.nextJog(pan, tilt);
    if (this.jogSending) return;
    this.jogSending = true;
    const generation = this.jogGeneration;
    try {
      while (this.jogPending && generation === this.jogGeneration) {
        const body = this.jogPending;
        this.jogPending = null;
        await this.request("/jog", body, "POST", { lane: "jog" });
      }
    } catch (e) {
      if (generation === this.jogGeneration) this.jogPending = null;
      throw e;
    } finally {
      if (generation === this.jogGeneration) this.jogSending = false;
    }
  }
  releaseJog() {
    if (this.jogEpoch === null) {
      this.cancelJog();
      return Promise.resolve(null);
    }
    const body = this.nextJog(0, 0);
    this.cancelJog();
    return this.request("/jog", body, "POST", { lane: "jog", keepalive: true });
  }
  demoAdvance() {
    const s = this.demoState,
      now = Date.now();
    let remaining = Math.min(0.4, (now - this.demoTick) / 1000);
    this.demoTick = now;
    if (s.jog_active && now - this.demoJogLast > s.jog_lease_ms) {
      this.demoInvalidate();
      s.stopped = true;
    }
    while (remaining > 0) {
      const dt = Math.min(0.01, remaining);
      remaining -= dt;
      for (const axis of ["pan", "tilt"]) {
        const target =
          s.armed && !s.stopped ? s["jog_" + axis] * s[axis + "_speed"] : 0;
        // Damped acceleration is a visual mock, not a model of the actual mechanics.
        this.demoVelocity[axis] +=
          (target - this.demoVelocity[axis]) * Math.min(1, dt / 0.12);
        if (Math.abs(this.demoVelocity[axis]) < 0.015)
          this.demoVelocity[axis] = 0;
        s[axis] = Math.max(
          s[axis + "_min"],
          Math.min(s[axis + "_max"], s[axis] + this.demoVelocity[axis] * dt),
        );
        if (this.demoVelocity[axis] !== 0) s[axis + "_target"] = s[axis];
      }
    }
  }
  demoInvalidate() {
    const s = this.demoState;
    s.control_epoch = (s.control_epoch + 1) >>> 0 || 1;
    s.jog_seq = 0;
    s.jog_pan = 0;
    s.jog_tilt = 0;
    s.jog_active = false;
    this.demoVelocity = { pan: 0, tilt: 0 };
  }
  stop() {
    this.cancel();
    return this.request("/stop");
  }
  mock(path, body) {
    this.demoAdvance();
    const s = this.demoState;
    if (s.armed && !s.stopped && Date.now() - this.demoLast > 5000) {
      this.demoInvalidate();
      s.stopped = true;
    }
    if (path === "/arm") {
      this.demoInvalidate();
      s.armed = true;
      s.stopped = false;
      this.demoLast = Date.now();
    }
    if (path === "/stop") {
      this.demoInvalidate();
      s.stopped = true;
    }
    if (path === "/disarm") {
      this.demoInvalidate();
      s.armed = false;
      s.stopped = true;
    }
    if (path === "/heartbeat") {
      if (!s.armed || s.stopped) throw new DeviceError("Not armed", 409);
      this.demoLast = Date.now();
    }
    if (path === "/move" || path === "/home") {
      if (!s.armed || s.stopped)
        throw new DeviceError("Arm explicitly before moving", 409);
      const p = path === "/home" ? { pan: 0, tilt: 0 } : body;
      if (
        !Number.isFinite(p.pan) ||
        !Number.isFinite(p.tilt) ||
        p.pan < s.pan_min ||
        p.pan > s.pan_max ||
        p.tilt < s.tilt_min ||
        p.tilt > s.tilt_max
      )
        throw new DeviceError("Outside calibrated limits", 409);
      this.demoInvalidate();
      s.pan = s.pan_target = p.pan;
      s.tilt = s.tilt_target = p.tilt;
      this.demoLast = Date.now();
    }
    if (path === "/jog") {
      if (!s.armed || s.stopped || s.estop)
        throw new DeviceError("Arm explicitly before jogging", 409);
      if (
        !body ||
        body.epoch !== s.control_epoch ||
        !Number.isInteger(body.seq) ||
        body.seq <= s.jog_seq ||
        body.seq > 0xffffffff ||
        !Number.isFinite(body.pan) ||
        !Number.isFinite(body.tilt) ||
        Math.abs(body.pan) > 1 ||
        Math.abs(body.tilt) > 1
      )
        throw new DeviceError("Stale or invalid jog", 409);
      s.jog_seq = body.seq;
      s.jog_pan = body.pan;
      s.jog_tilt = body.tilt;
      s.jog_active = body.pan !== 0 || body.tilt !== 0;
      this.demoJogLast = Date.now();
      this.demoLast = Date.now();
    }
    if (path === "/calibration") {
      if (s.armed) throw new DeviceError("Disable PWM before calibration", 409);
      if (!validCalibration(body))
        throw new DeviceError("Invalid calibration", 400);
      const a = body.axis === 0 ? "pan" : "tilt";
      for (const [field, key] of Object.entries({
        center: "center",
        low: "low",
        high: "high",
        minimum: "min",
        maximum: "max",
        invert: "invert",
        speed: "speed",
      }))
        s[`${a}_${key}`] = body[field];
    }
    return { ...s };
  }
}
export function validCalibration(c) {
  if (!c || (c.axis !== 0 && c.axis !== 1)) return false;
  const envelope = c.axis === 0 ? 60 : 25;
  return (
    [c.center, c.low, c.high, c.minimum, c.maximum, c.speed].every(
      Number.isFinite,
    ) &&
    Number.isInteger(c.low) &&
    Number.isInteger(c.center) &&
    Number.isInteger(c.high) &&
    c.low >= 700 &&
    c.high <= 2300 &&
    c.low < c.center &&
    c.center < c.high &&
    c.minimum < 0 &&
    c.maximum > 0 &&
    c.minimum >= -envelope &&
    c.maximum <= envelope &&
    c.speed >= 1 &&
    c.speed <= 60 &&
    typeof c.invert === "boolean"
  );
}
export const calibrationFromStatus = (s, axis) => {
  const a = axis === 0 ? "pan" : "tilt";
  return {
    axis,
    center: s[`${a}_center`],
    low: s[`${a}_low`],
    high: s[`${a}_high`],
    minimum: s[`${a}_min`],
    maximum: s[`${a}_max`],
    invert: s[`${a}_invert`],
    speed: s[`${a}_speed`],
  };
};

export function validStatus(s) {
  if (
    s &&
    [
      "control_epoch",
      "jog_seq",
      "jog_pan",
      "jog_tilt",
      "jog_active",
      "jog_lease_ms",
    ].some((k) => k in s) &&
    !supportsJog(s)
  )
    return false;
  if (
    !s ||
    !["armed", "stopped", "estop", "pan_invert", "tilt_invert"].every(
      (k) => typeof s[k] === "boolean",
    ) ||
    typeof s.firmware !== "string"
  )
    return false;
  for (const axis of [0, 1]) {
    const a = axis === 0 ? "pan" : "tilt";
    const c = calibrationFromStatus(s, axis);
    if (
      !validCalibration(c) ||
      !Number.isFinite(s[a]) ||
      !Number.isFinite(s[`${a}_target`]) ||
      s[`${a}_target`] < c.minimum ||
      s[`${a}_target`] > c.maximum
    )
      return false;
  }
  return true;
}

export function supportsJog(s) {
  return (
    s &&
    Number.isInteger(s.control_epoch) &&
    s.control_epoch >= 0 &&
    s.control_epoch <= 0xffffffff &&
    Number.isInteger(s.jog_seq) &&
    s.jog_seq >= 0 &&
    s.jog_seq <= 0xffffffff &&
    Number.isFinite(s.jog_pan) &&
    Math.abs(s.jog_pan) <= 1 &&
    Number.isFinite(s.jog_tilt) &&
    Math.abs(s.jog_tilt) <= 1 &&
    typeof s.jog_active === "boolean" &&
    s.jog_lease_ms === 500
  );
}
