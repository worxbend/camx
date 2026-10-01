import { validCalibration } from "./transport.js";
const defaults = [
  { name: "Front and center", pan: 0, tilt: 0 },
  { name: "Desk left", pan: -20, tilt: -5 },
  { name: "Desk right", pan: 20, tilt: -5 },
];
export function loadPresets() {
  try {
    const value = JSON.parse(localStorage.getItem("camx.presets") || "null");
    return sanitizePresets(value) || defaults;
  } catch {
    return defaults;
  }
}
export function sanitizePresets(value) {
  if (!Array.isArray(value) || value.length > 24) return null;
  const output = [];
  for (const p of value) {
    if (
      !p ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      p.name.length > 40 ||
      !Number.isFinite(p.pan) ||
      !Number.isFinite(p.tilt) ||
      Math.abs(p.pan) > 60 ||
      Math.abs(p.tilt) > 25
    )
      return null;
    output.push({ name: p.name.trim(), pan: p.pan, tilt: p.tilt });
  }
  return output;
}
export function savePresets(value) {
  try {
    localStorage.setItem("camx.presets", JSON.stringify(value));
  } catch {
    /* Private browsers may deny storage; current-tab presets still work. */
  }
}
export function parseBackup(text) {
  if (text.length > 32768) throw new Error("Backup exceeds 32 KB");
  const data = JSON.parse(text);
  if (data.schema !== "camx-control-v1")
    throw new Error("Unsupported backup format");
  const presets = sanitizePresets(data.presets);
  if (!presets) throw new Error("Invalid presets");
  if (
    !Array.isArray(data.calibration) ||
    data.calibration.length !== 2 ||
    !data.calibration.every((c, i) => c.axis === i && validCalibration(c))
  )
    throw new Error("Invalid calibration");
  return {
    presets,
    calibration: data.calibration.map((c) => ({
      axis: c.axis,
      center: c.center,
      low: c.low,
      high: c.high,
      minimum: c.minimum,
      maximum: c.maximum,
      invert: c.invert,
      speed: c.speed,
    })),
  };
}
export function downloadBackup(presets, calibration) {
  const text = JSON.stringify(
    { schema: "camx-control-v1", presets, calibration },
    null,
    2,
  );
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "camx-control-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
