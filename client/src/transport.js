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
  firmware: "0.4.0-demo",
});
export class Transport {
  constructor({
    onStatus = () => {},
    onError = () => {},
    onLog = () => {},
    fetcher = globalThis.fetch.bind(globalThis),
  } = {}) {
    Object.assign(this, { onStatus, onError, onLog, fetcher });
    this.generation = 0;
    this.sequence = 0;
    this.appliedSequence = 0;
    this.controllers = new Set();
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
  }
  cancel() {
    this.generation++;
    this.pending = null;
    this.moving = false;
    for (const c of this.controllers) c.abort();
    this.controllers.clear();
  }
  async request(path, body, method = "POST") {
    const sequence = ++this.sequence,
      generation = this.generation,
      controller = new AbortController();
    this.controllers.add(controller);
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
      if (generation !== this.generation)
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
        this.onStatus(state);
      }
      return state;
    } catch (e) {
      if (generation === this.generation) {
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
  stop() {
    this.cancel();
    return this.request("/stop");
  }
  mock(path, body) {
    const s = this.demoState;
    if (s.armed && !s.stopped && Date.now() - this.demoLast > 5000)
      s.stopped = true;
    if (path === "/arm") {
      s.armed = true;
      s.stopped = false;
      this.demoLast = Date.now();
    }
    if (path === "/stop") s.stopped = true;
    if (path === "/disarm") {
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
      s.pan = s.pan_target = p.pan;
      s.tilt = s.tilt_target = p.tilt;
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
