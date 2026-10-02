import { For, Show } from "solid-js";
import { supportsJog } from "../transport.js";
const directions = [
  {
    id: "up",
    label: "Hold tilt up",
    pan: 0,
    tilt: 1,
    arrow: "M10 29 22 10 34 29Z",
  },
  {
    id: "left",
    label: "Hold pan left",
    pan: -1,
    tilt: 0,
    arrow: "M29 10 10 22 29 34Z",
  },
  {
    id: "right",
    label: "Hold pan right",
    pan: 1,
    tilt: 0,
    arrow: "M10 10 29 22 10 34Z",
  },
  {
    id: "down",
    label: "Hold tilt down",
    pan: 0,
    tilt: -1,
    arrow: "M10 10 22 29 34 10Z",
  },
];
export default function RemotePanel(props) {
  const {
    status,
    connected,
    canJog,
    holding,
    heldVector,
    jogFraction,
    setJogSpeed,
    startHold,
    endHold,
    action,
    keyboard,
    setKeyboard,
  } = props.model;
  const held = (d) =>
    holding() &&
    ((d.pan && Math.sign(heldVector().pan) === d.pan) ||
      (d.tilt && Math.sign(heldVector().tilt) === d.tilt));
  const releasePointer = (e) => endHold("pointer:" + e.pointerId);
  return (
    <section class="panel remote-panel">
      <h2>Camera Control</h2>
      <div class="commanded-readouts">
        <div>
          <span>
            Pan <small>(commanded)</small>
          </span>
          <strong>{status().pan.toFixed(1)}°</strong>
        </div>
        <div>
          <span>
            Tilt <small>(commanded)</small>
          </span>
          <strong>{status().tilt.toFixed(1)}°</strong>
        </div>
      </div>
      <div class="mobile-arming">
        <button
          class="primary"
          disabled={!connected() || status().estop || props.model.busy()}
          onClick={() => action("/arm")}
        >
          Arm / resume
        </button>
        <button
          disabled={!connected() || props.model.busy()}
          onClick={() => action("/disarm")}
        >
          Disable PWM
        </button>
      </div>
      <div class="direction-pad" aria-label="Directional camera remote">
        <svg class="pad-silhouette" viewBox="0 0 500 500" aria-hidden="true">
          <defs>
            <linearGradient id="remote-material" x1="0" y1="0" x2="1" y2="1">
              <stop stop-color="#333c43" />
              <stop offset=".45" stop-color="#1b232a" />
              <stop offset="1" stop-color="#2b343c" />
            </linearGradient>
            <filter
              id="remote-shadow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="11"
                stdDeviation="8"
                flood-color="#000"
                flood-opacity=".65"
              />
            </filter>
          </defs>
          <path
            d="M250 18 C326 18 330 47 339 112 C345 150 364 163 403 167 C466 173 482 197 482 250 C482 303 466 327 403 333 C364 337 345 350 339 388 C330 453 326 482 250 482 C174 482 170 453 161 388 C155 350 136 337 97 333 C34 327 18 303 18 250 C18 197 34 173 97 167 C136 163 155 150 161 112 C170 47 174 18 250 18Z"
            fill="url(#remote-material)"
            stroke="#0a0e12"
            stroke-width="10"
            filter="url(#remote-shadow)"
          />
          <path
            d="M250 24 C321 24 323 52 332 113 C339 155 361 169 404 174 C461 179 475 201 475 250 C475 299 461 321 404 326 C361 331 339 345 332 387 C323 448 321 476 250 476 C179 476 177 448 168 387 C161 345 139 331 96 326 C39 321 25 299 25 250 C25 201 39 179 96 174 C139 169 161 155 168 113 C177 52 179 24 250 24Z"
            fill="none"
            stroke="#5b656c"
            stroke-opacity=".55"
            stroke-width="2"
          />
        </svg>
        <For each={directions}>
          {(d) => (
            <button
              class={`direction direction-${d.id} ${held(d) ? "held" : ""}`}
              aria-label={d.label}
              aria-pressed={held(d)}
              disabled={!canJog()}
              onPointerDown={(e) => {
                if (e.button !== 0 || !canJog()) return;
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                startHold("pointer:" + e.pointerId, d.pan, d.tilt);
              }}
              onPointerUp={releasePointer}
              onPointerCancel={releasePointer}
              onLostPointerCapture={releasePointer}
              onKeyDown={(e) => {
                if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                  e.preventDefault();
                  startHold("button:" + d.id + ":" + e.key, d.pan, d.tilt);
                }
              }}
              onKeyUp={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  endHold("button:" + d.id + ":" + e.key);
                }
              }}
              onBlur={() => {
                endHold("button:" + d.id + ": ");
                endHold("button:" + d.id + ":Enter");
              }}
            >
              <svg
                viewBox="0 0 44 44"
                width="48"
                height="48"
                aria-hidden="true"
              >
                <path
                  d={d.arrow}
                  fill="currentColor"
                  stroke="currentColor"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
            </button>
          )}
        </For>
        <button
          class="home-center"
          aria-label="Center / Home"
          disabled={!props.model.movable() || props.model.busy()}
          onClick={() => action("/home")}
        >
          <svg viewBox="0 0 36 36" width="51" height="51" aria-hidden="true">
            <path
              d="M5 16 18 5l13 11v15H22V21h-8v10H5Z"
              fill="currentColor"
              stroke="currentColor"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
        </button>
      </div>
      <div class="jog-speed" role="group" aria-label="Jog speed">
        <For
          each={[
            { value: 0.25, label: "Slow", rate: "25%" },
            { value: 0.5, label: "Normal", rate: "50%" },
            { value: 1, label: "Fast", rate: "100%" },
          ]}
        >
          {(s) => (
            <button
              class={jogFraction() === s.value ? "active" : ""}
              aria-pressed={jogFraction() === s.value}
              onClick={() => setJogSpeed(s.value)}
            >
              <strong>{s.label}</strong>
              <span>{s.rate}</span>
            </button>
          )}
        </For>
      </div>
      <label class="check remote-keyboard">
        <input
          type="checkbox"
          checked={keyboard()}
          onChange={(e) => {
            if (!e.target.checked) props.model.clearHeld();
            setKeyboard(e.target.checked);
          }}
        />
        Keyboard arrows
      </label>
      <p class="hint keyboard-help">
        Hold arrow keys for directions and diagonals. Space or Enter holds a
        focused direction.
      </p>
      <Show when={connected() && !supportsJog(status())}>
        <p class="notice">
          Upgrade to firmware 0.5.0 or newer for hold controls. Precision
          offsets remain available.
        </p>
      </Show>
      <p class="remote-timing">Refresh 100 ms · device lease 500 ms</p>
    </section>
  );
}
