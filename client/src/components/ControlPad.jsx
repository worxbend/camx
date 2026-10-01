import { For, Show } from "solid-js";

export default function ControlPad(props) {
  const {
    status,
    connected,
    pan,
    tilt,
    step,
    keyboard,
    setKeyboard,
    setStep,
    setPan,
    setTilt,
    movable,
    action,
    nudge,
    send,
    setPad,
  } = props.model;
  return (
    <section class="panel control">
      <div class="panel-heading">
        <div>
          <h2>Pan + tilt</h2>
          <p>Drag to aim. Both axes move together.</p>
        </div>
      </div>
      <div class="pad-wrap">
        <span class="axis-top">+{status().tilt_max}°</span>
        <div
          ref={setPad}
          class={`pad ${movable() ? "ready" : "locked"}`}
          role="application"
          aria-label="Pan and tilt aiming pad"
          tabIndex="0"
          onPointerDown={(e) => {
            if (!movable()) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            padMove(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) padMove(e);
          }}
        >
          <div class="cross-x" />
          <div class="cross-y" />
          <span class="axis-left">{status().pan_min}°</span>
          <span class="axis-right">+{status().pan_max}°</span>
          <div
            class="aim"
            style={{
              left: `${(100 * (pan() - status().pan_min)) / (status().pan_max - status().pan_min)}%`,
              top: `${(100 * (status().tilt_max - tilt())) / (status().tilt_max - status().tilt_min)}%`,
            }}
          />
          <Show when={!movable()}>
            <span class="pad-message">
              {connected() ? "ARM explicitly to move" : "Connect to start"}
            </span>
          </Show>
        </div>
        <span class="axis-bottom">{status().tilt_min}°</span>
      </div>
      <div class="axes">
        <For each={["pan", "tilt"]}>
          {(axis) => (
            <div class="axis-control">
              <label for={`${axis}-range`}>
                {axis === "pan" ? "Pan" : "Tilt"}
                <strong>{(axis === "pan" ? pan() : tilt()).toFixed(1)}°</strong>
              </label>
              <input
                id={`${axis}-range`}
                aria-label={`${axis === "pan" ? "Pan" : "Tilt"} slider`}
                type="range"
                min={status()[`${axis}_min`]}
                max={status()[`${axis}_max`]}
                step="0.1"
                value={axis === "pan" ? pan() : tilt()}
                disabled={!movable()}
                onInput={(e) =>
                  send(
                    axis === "pan" ? +e.target.value : pan(),
                    axis === "tilt" ? +e.target.value : tilt(),
                  )
                }
              />
              <div class="numeric">
                <button
                  aria-label={`Decrease ${axis}`}
                  disabled={!movable()}
                  onClick={() => nudge(axis, -1)}
                >
                  −
                </button>
                <input
                  aria-label={`${axis === "pan" ? "Pan" : "Tilt"} offset`}
                  type="number"
                  min={status()[`${axis}_min`]}
                  max={status()[`${axis}_max`]}
                  step="0.1"
                  value={axis === "pan" ? pan() : tilt()}
                  disabled={!movable()}
                  onInput={(e) => {
                    const value = e.target.valueAsNumber;
                    if (axis === "pan") setPan(value);
                    else setTilt(value);
                  }}
                />
                <button
                  aria-label={`Increase ${axis}`}
                  disabled={!movable()}
                  onClick={() => nudge(axis, 1)}
                >
                  +
                </button>
              </div>
            </div>
          )}
        </For>
      </div>
      <div class="fine-bar">
        <span>Fine step</span>
        <div class="segments">
          <For each={[1, 5, 10]}>
            {(s) => (
              <button
                class={step() === s ? "chosen" : ""}
                onClick={() => setStep(s)}
              >
                {s}°
              </button>
            )}
          </For>
        </div>
        <button
          disabled={
            !movable() ||
            !Number.isFinite(pan()) ||
            !Number.isFinite(tilt()) ||
            pan() < status().pan_min ||
            pan() > status().pan_max ||
            tilt() < status().tilt_min ||
            tilt() > status().tilt_max
          }
          onClick={() => send()}
        >
          Send offsets
        </button>
        <button disabled={!movable()} onClick={() => action("/home")}>
          Home
        </button>
        <label class="check">
          <input
            type="checkbox"
            checked={keyboard()}
            onChange={(e) => setKeyboard(e.target.checked)}
          />
          Keyboard arrows
        </label>
      </div>
      <p class="hint">
        Degrees are commanded estimates. Escape sends STOP. Arrow keys ignore
        form fields.
      </p>
    </section>
  );
}
