import { For, Show } from "solid-js";

export default function SessionPanel(props) {
  const {
    tab,
    status,
    connected,
    demo,
    pan,
    tilt,
    lease,
    busy,
    setLease,
    movable,
    stateLabel,
    action,
    emergency,
    holding,
    heldVector,
  } = props.model;
  return (
    <section class="panel session">
      <h2>Session</h2>
      <p class="state">
        <i class={movable() ? "dot mint" : "dot amber"} />
        {stateLabel()}
        {demo() ? " · demo" : ""}
      </p>
      <button
        class="primary"
        disabled={!connected() || status().estop || busy()}
        onClick={() => action("/arm")}
      >
        Arm / resume
      </button>
      <button
        aria-label="Session STOP"
        class="danger"
        disabled={!connected()}
        onClick={emergency}
      >
        STOP · hold
      </button>
      <button
        disabled={!connected() || busy()}
        onClick={() => action("/disarm")}
      >
        Disable PWM
      </button>
      <Show when={tab() !== "Remote"}>
        <label class="check">
          <input
            type="checkbox"
            checked={lease()}
            disabled={!movable()}
            onChange={(e) => setLease(e.target.checked)}
          />
          Maintain control
        </label>
        <p class="hint">
          Renew the 5-second lease while this tab is visible. Starts off; never
          arms or resumes.
        </p>
      </Show>
      <p class="caution">
        ARM may jump to center. Support the camera before disabling PWM.
      </p>
      <Show when={tab() === "Remote"}>
        <div class="jog-state">
          Jog:
          <strong>
            {holding()
              ? [
                  heldVector().pan < 0
                    ? "left"
                    : heldVector().pan > 0
                      ? "right"
                      : "",
                  heldVector().tilt < 0
                    ? "down"
                    : heldVector().tilt > 0
                      ? "up"
                      : "",
                ]
                  .filter(Boolean)
                  .join(" + ") || "opposing directions held"
              : status().jog_active
                ? "Device jogging"
                : "Released · holding / easing to rest"}
          </strong>
        </div>
      </Show>
      <dl>
        <dt>Commanded position</dt>
        <dd>
          {status().pan.toFixed(1)}° / {status().tilt.toFixed(1)}°
        </dd>
        <dt>Firmware</dt>
        <dd>{status().firmware}</dd>
      </dl>
    </section>
  );
}
