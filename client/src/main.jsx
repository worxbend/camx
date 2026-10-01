import { createSignal, For, Show, onCleanup } from "solid-js";
import { render } from "@solidjs/web";
import {
  Transport,
  initialStatus,
  calibrationFromStatus,
  validCalibration,
} from "./transport.js";
import {
  loadPresets,
  savePresets,
  parseBackup,
  downloadBackup,
} from "./storage.js";
import SessionPanel from "./components/SessionPanel.jsx";
import PresetsPanel from "./components/PresetsPanel.jsx";
import ControlPad from "./components/ControlPad.jsx";
import CalibrationView from "./components/CalibrationView.jsx";
import GuideView from "./components/GuideView.jsx";
import "./style.css";
import NavIcon from "./components/NavIcon.jsx";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function App() {
  const [tab, setTab] = createSignal("Control"),
    [status, setStatus] = createSignal(initialStatus()),
    [connected, setConnected] = createSignal(false),
    [demo, setDemo] = createSignal(
      new URLSearchParams(location.search).get("demo") === "1" ||
        location.hostname.endsWith("github.io"),
    ),
    [token, setToken] = createSignal(""),
    [address, setAddress] = createSignal(""),
    [error, setError] = createSignal(""),
    [logs, setLogs] = createSignal([]),
    [pan, setPan] = createSignal(0),
    [tilt, setTilt] = createSignal(0),
    [step, setStep] = createSignal(1),
    [keyboard, setKeyboard] = createSignal(false),
    [lease, setLease] = createSignal(false),
    [presets, setPresets] = createSignal(loadPresets()),
    [name, setName] = createSignal(""),
    [editing, setEditing] = createSignal(-1),
    [calibration, setCalibration] = createSignal([
      calibrationFromStatus(initialStatus(), 0),
      calibrationFromStatus(initialStatus(), 1),
    ]),
    [selectedAxis, setSelectedAxis] = createSignal(0),
    [wizard, setWizard] = createSignal(0),
    [busy, setBusy] = createSignal(false);
  let pollBusy = false,
    lastMove = 0,
    pad,
    imported;
  const transport = new Transport({
    onStatus: (s) => {
      setStatus(s);
      setConnected(true);
      if (!s.armed || s.stopped || s.estop) setLease(false);
    },
    onError: (m) => {
      setConnected(false);
      setLease(false);
      setError(m);
      transport.cancel();
    },
    onLog: (l) =>
      setLogs((old) =>
        [{ ...l, time: new Date().toLocaleTimeString() }, ...old].slice(0, 40),
      ),
  });
  const movable = () =>
    connected() &&
    status().armed &&
    !status().stopped &&
    !status().estop &&
    tab() !== "Calibration";
  const run = async (fn) => {
    setError("");
    try {
      return await fn();
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
      return null;
    }
  };
  const connect = async () => {
    setLease(false);
    setConnected(false);
    let base = address().trim();
    if (base) {
      try {
        const url = new URL(base);
        if (url.origin !== location.origin)
          throw new Error(
            "Open the device’s /control/ page directly, or use the local bridge. Cross-origin device control is intentionally disabled.",
          );
        base = url.origin;
      } catch (e) {
        setError(e.message);
        return;
      }
    }
    transport.configure({ base, token: token(), demo: demo() });
    const s = await run(() => transport.request("/status", undefined, "GET"));
    if (s) {
      setPan(s.pan_target);
      setTilt(s.tilt_target);
      setCalibration([
        calibrationFromStatus(s, 0),
        calibrationFromStatus(s, 1),
      ]);
    }
  };
  const disconnect = () => {
    transport.cancel();
    setConnected(false);
    setLease(false);
    setError(
      "Disconnected. Device command timeout will latch STOP; use STOP first if reachable.",
    );
  };
  const send = (p = pan(), t = tilt()) => {
    if (
      !movable() ||
      !Number.isFinite(p) ||
      !Number.isFinite(t) ||
      p < status().pan_min ||
      p > status().pan_max ||
      t < status().tilt_min ||
      t > status().tilt_max
    )
      return;
    lastMove = Date.now();
    setPan(p);
    setTilt(t);
    return run(() => transport.move(p, t));
  };
  const nudge = (axis, d) => {
    if (!movable()) return;
    send(
      axis === "pan"
        ? clamp(pan() + d * step(), status().pan_min, status().pan_max)
        : pan(),
      axis === "tilt"
        ? clamp(tilt() + d * step(), status().tilt_min, status().tilt_max)
        : tilt(),
    );
  };
  const action = async (path) => {
    if (!connected() || busy()) return;
    setBusy(true);
    if (path === "/stop" || path === "/disarm") setLease(false);
    if (path === "/disarm" || path === "/home") transport.cancel();
    const s = await run(() =>
      path === "/stop" ? transport.stop() : transport.request(path),
    );
    if (s && path === "/home") {
      setPan(0);
      setTilt(0);
    }
    setBusy(false);
  };
  const emergency = () => {
    setLease(false);
    setBusy(false);
    if (connected()) run(() => transport.stop());
  };
  const timer = setInterval(async () => {
    if (!connected() || pollBusy || transport.moving || busy()) return;
    pollBusy = true;
    try {
      if (
        lease() &&
        movable() &&
        document.visibilityState === "visible" &&
        Date.now() - lastMove > 1000
      )
        await run(() => transport.request("/heartbeat"));
      else await run(() => transport.request("/status", undefined, "GET"));
    } finally {
      pollBusy = false;
    }
  }, 1000);
  const visibility = () => {
    if (document.visibilityState !== "visible") {
      setLease(false);
      transport.pending = null;
    }
  };
  document.addEventListener("visibilitychange", visibility);
  const key = (e) => {
    if (e.key === "Escape") {
      emergency();
      return;
    }
    if (
      !keyboard() ||
      tab() !== "Control" ||
      !movable() ||
      /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName) ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    )
      return;
    const directions = {
      ArrowLeft: ["pan", -1],
      ArrowRight: ["pan", 1],
      ArrowUp: ["tilt", 1],
      ArrowDown: ["tilt", -1],
    };
    if (directions[e.key]) {
      e.preventDefault();
      nudge(...directions[e.key]);
    }
  };
  window.addEventListener("keydown", key);
  onCleanup(() => {
    clearInterval(timer);
    transport.cancel();
    window.removeEventListener("keydown", key);
    document.removeEventListener("visibilitychange", visibility);
  });
  const updateCal = (axis, field, value) =>
    setCalibration((old) =>
      old.map((c, i) => (i === axis ? { ...c, [field]: value } : c)),
    );
  const saveCal = async (axis) => {
    const c = calibration()[axis];
    if (status().armed || !connected() || !validCalibration(c)) return;
    const saved = await run(() => transport.request("/calibration", c));
    if (saved) {
      const latest = await run(() =>
        transport.request("/status", undefined, "GET"),
      );
      if (latest)
        setCalibration((old) =>
          old.map((v, i) =>
            i === axis ? calibrationFromStatus(latest, axis) : v,
          ),
        );
    }
  };
  const persist = (value) => {
    setPresets(value);
    savePresets(value);
  };
  const savePose = () => {
    if (
      !name().trim() ||
      !Number.isFinite(pan()) ||
      !Number.isFinite(tilt()) ||
      Math.abs(pan()) > 60 ||
      Math.abs(tilt()) > 25 ||
      (presets().length >= 24 && editing() < 0)
    )
      return;
    const pose = { name: name().trim().slice(0, 40), pan: pan(), tilt: tilt() };
    persist(
      editing() < 0
        ? [...presets(), pose]
        : presets().map((p, i) => (i === editing() ? pose : p)),
    );
    setName("");
    setEditing(-1);
  };
  const backup = () => downloadBackup(presets(), calibration());
  const importFile = async (e) => {
    try {
      const f = e.target.files[0];
      if (!f) return;
      const data = parseBackup(await f.text());
      persist(data.presets);
      setCalibration(data.calibration);
      setError(
        "Backup loaded into the editor. Save each axis explicitly while PWM is disabled; nothing moved.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      e.target.value = "";
    }
  };
  const selectTab = (t) => {
    setTab(t);
    if (t === "Calibration") {
      setLease(false);
      setKeyboard(false);
    }
  };
  const stateLabel = () =>
    !connected()
      ? "Disconnected"
      : status().estop
        ? "Hardware STOP pressed"
        : !status().armed
          ? "PWM disabled"
          : status().stopped
            ? "Stopped · ARM to resume"
            : "Armed";
  const padMove = (e) => {
    if (!movable()) return;
    const r = pad.getBoundingClientRect();
    send(
      Math.round(
        (status().pan_min +
          clamp((e.clientX - r.left) / r.width, 0, 1) *
            (status().pan_max - status().pan_min)) *
          10,
      ) / 10,
      Math.round(
        (status().tilt_max -
          clamp((e.clientY - r.top) / r.height, 0, 1) *
            (status().tilt_max - status().tilt_min)) *
          10,
      ) / 10,
    );
  };

  const importBackup = () => imported.click(),
    setPad = (node) => (pad = node);
  const model = {
    tab,
    selectTab,
    status,
    connected,
    demo,
    token,
    address,
    error,
    pan,
    tilt,
    step,
    keyboard,
    lease,
    presets,
    name,
    editing,
    calibration,
    selectedAxis,
    wizard,
    busy,
    setLease,
    setKeyboard,
    setStep,
    setName,
    setPan,
    setTilt,
    setEditing,
    setSelectedAxis,
    setWizard,
    setError,
    movable,
    stateLabel,
    action,
    emergency,
    nudge,
    send,
    persist,
    savePose,
    backup,
    importBackup,
    updateCal,
    saveCal,
    transport,
    run,
    setCalibration,
    setPad,
    padMove,
  };

  return (
    <div class="shell">
      <aside class="nav">
        <a class="brand" href="#" onClick={(e) => e.preventDefault()}>
          CAM<span>X</span>
          <small>Control desk</small>
        </a>
        <nav aria-label="Main navigation">
          <For
            each={["Control", "Calibration", "Guides", "Connection", "Presets"]}
          >
            {(t) => (
              <button
                class={tab() === t ? "selected" : ""}
                onClick={() => selectTab(t)}
              >
                <NavIcon name={t} />
                {t}
              </button>
            )}
          </For>
        </nav>
        <a
          class="studio"
          href="https://worxbend.github.io/camx/"
          target="_blank"
          rel="noreferrer"
        >
          ◇ &nbsp;3D studio ↗
        </a>
        <small class="runtime">SolidJS 2 · rc.13</small>
      </aside>
      <main>
        <header>
          <div>
            <h1>
              {tab() === "Control"
                ? "Make your move."
                : tab() === "Calibration"
                  ? "Find your center."
                  : tab() === "Guides"
                    ? "Build. Balance. Begin."
                    : tab() === "Connection"
                      ? "Stay connected."
                      : "Your angles, saved."}
            </h1>
            <p>
              <i class={connected() && !demo() ? "dot mint" : "dot amber"} />
              {demo()
                ? "Demo mode · no hardware connected"
                : connected()
                  ? "Device connected · local control"
                  : "Device offline · connect to begin"}
            </p>
          </div>
          <button class="text-button" onClick={() => selectTab("Connection")}>
            <NavIcon name="Settings" /> <span>Connection settings</span>
          </button>
        </header>
        <Show when={error()}>
          <div class="notice" role="alert">
            {error()}
            <button aria-label="Dismiss message" onClick={() => setError("")}>
              ×
            </button>
          </div>
        </Show>
        <Show when={tab() === "Control"}>
          <div class="control-grid">
            <ControlPad model={model} />
            <aside class="right-column">
              <SessionPanel model={model} />
              <PresetsPanel model={model} />
            </aside>
          </div>
        </Show>
        <Show when={tab() === "Connection"}>
          <div class="two-col">
            <section class="panel">
              <h2>Connection</h2>
              <p>Use the device’s own HTTP page or the local bridge.</p>
              <label>
                Device address
                <input
                  aria-label="Device address"
                  placeholder="Same origin (recommended)"
                  value={address()}
                  onInput={(e) => setAddress(e.target.value)}
                />
              </label>
              <label>
                Connection token
                <input
                  type="password"
                  autocomplete="off"
                  value={token()}
                  onInput={(e) => setToken(e.target.value)}
                  placeholder="Optional bearer token"
                />
              </label>
              <p class="hint">
                Token stays in this tab’s memory. It is never saved or exported.
                Changes take effect on Connect.
              </p>
              <label class="check">
                <input
                  type="checkbox"
                  checked={demo()}
                  onChange={(e) => {
                    disconnect();
                    setDemo(e.target.checked);
                  }}
                />
                Demo mode
              </label>
              <div class="row">
                <button class="primary" onClick={connect}>
                  Connect
                </button>
                <button onClick={disconnect} disabled={!connected()}>
                  Disconnect
                </button>
              </div>
              <dl>
                <dt>Client origin</dt>
                <dd>{location.origin}</dd>
                <dt>Connection</dt>
                <dd>{stateLabel()}</dd>
              </dl>
            </section>
            <section class="panel">
              <h2>Keep it local.</h2>
              <p>
                Open <code>http://DEVICE_IP/control/</code> on the same trusted
                LAN as your ESP32.
              </p>
              <p>For development or a desktop control station:</p>
              <pre>CAMX_DEVICE_URL=http://DEVICE_IP npm run bridge</pre>
              <p>
                GitHub Pages uses demo mode. Browsers block HTTPS-to-HTTP LAN
                requests, and the device has no cross-origin control API.
              </p>
              <p>
                Wi-Fi retries indefinitely on the device. The client polls while
                connected; a lost link cancels queued movement. Connect again
                after recovery, inspect the mechanism, then ARM explicitly.
              </p>
              <button onClick={() => selectTab("Guides")}>
                Read connection guide
              </button>
            </section>
          </div>
        </Show>
        <CalibrationView model={model} />
        <GuideView model={model} />
        <Show when={tab() === "Presets"}>
          <div class="two-col">
            <PresetsPanel model={model} />
            <section class="panel">
              <h2>Portable poses.</h2>
              <p>
                Presets are stored in this browser. Export a JSON backup
                containing presets and the calibration editor. Tokens, Wi-Fi
                credentials, and device addresses are excluded.
              </p>
              <p>
                Import only populates editors. It never applies calibration,
                moves, or arms the mount. Each preset is checked against your
                device’s current limits before moving.
              </p>
            </section>
          </div>
        </Show>
        <section class="panel activity">
          <div class="panel-heading">
            <h2>Activity</h2>
            <button class="text-button" onClick={() => setLogs([])}>
              Clear activity
            </button>
          </div>
          <div class="activity-table">
            <div class="activity-head">
              <span>Time</span>
              <span>Command</span>
              <span>Status</span>
            </div>
            <Show
              when={logs().length}
              fallback={
                <p class="hint">
                  Your commands will appear here. Tokens and credentials are
                  never logged.
                </p>
              }
            >
              <For each={logs()}>
                {(l) => (
                  <div class="activity-row">
                    <time>{l.time}</time>
                    <code>
                      {l.method} {l.path}
                      {l.body && l.path === "/move"
                        ? ` ${l.body.pan}° / ${l.body.tilt}°`
                        : ""}
                    </code>
                    <span class={l.ok ? "accepted" : "invalid"}>
                      {l.ok ? `accepted · ${l.elapsed} ms` : l.message}
                    </span>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </section>
        <footer>
          CAMX · Built to move with intention.{" "}
          <span>Commanded estimates · no encoder feedback</span>
        </footer>
        <input
          ref={imported}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={importFile}
        />
        <div class="sr-only" role="status" aria-live="polite">
          {stateLabel()}
        </div>
      </main>
    </div>
  );
}
render(() => <App />, document.getElementById("app"));
