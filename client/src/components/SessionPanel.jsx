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
      <button class="danger" disabled={!connected()} onClick={emergency}>
        STOP · hold
      </button>
      <button
        disabled={!connected() || busy()}
        onClick={() => action("/disarm")}
      >
        Disable PWM
      </button>
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
      <p class="caution">
        ARM may jump to center. Support the camera before disabling PWM.
      </p>
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
