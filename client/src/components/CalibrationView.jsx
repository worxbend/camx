import { For, Show } from "solid-js";
import { validCalibration, calibrationFromStatus } from "../transport.js";

export default function CalibrationView(props) {
  const {
    tab,
    status,
    connected,
    pan,
    tilt,
    step,
    calibration,
    selectedAxis,
    wizard,
    setSelectedAxis,
    setWizard,
    action,
    backup,
    importBackup,
    updateCal,
    saveCal,
    transport,
    run,
    setCalibration,
  } = props.model;
  return (
    <Show when={tab() === "Calibration"}>
      <div class="cal-stepper">
        <For each={["Center", "Direction", "Limits", "Verify"]}>
          {(label, i) => (
            <button
              class={wizard() === i() ? "active" : ""}
              onClick={() => setWizard(i())}
            >
              <b>{i() + 1}</b>
              {label}
            </button>
          )}
        </For>
      </div>
      <div class="calibration-grid">
        <section class="panel">
          <div class="panel-heading">
            <h2>Servo calibration</h2>
            <span class="cal-state">
              <i class="dot amber" />
              {status().armed
                ? "PWM armed · disable to save"
                : "PWM disabled · edit settings"}
            </span>
          </div>
          <div class="axis-tabs">
            <button
              class={selectedAxis() === 0 ? "active" : ""}
              onClick={() => setSelectedAxis(0)}
            >
              Pan axis
            </button>
            <button
              class={selectedAxis() === 1 ? "active" : ""}
              onClick={() => setSelectedAxis(1)}
            >
              Tilt axis
            </button>
          </div>
          <For each={[0, 1]}>
            {(axis) => {
              const title = axis === 0 ? "Pan" : "Tilt";
              return (
                <Show when={selectedAxis() === axis}>
                  <div class="cal-fields">
                    <For
                      each={[
                        ["center", "center pulse", "µs"],
                        ["low", "low pulse", "µs"],
                        ["high", "high pulse", "µs"],
                        ["minimum", "minimum angle", "°"],
                        ["maximum", "maximum angle", "°"],
                        ["speed", "speed", "°/s"],
                      ]}
                    >
                      {([field, label, unit]) => (
                        <label>
                          {label}
                          <span>{unit}</span>
                          <input
                            aria-label={`${title} ${label}`}
                            type="number"
                            step={
                              field === "minimum" ||
                              field === "maximum" ||
                              field === "speed"
                                ? "0.1"
                                : "1"
                            }
                            value={calibration()[axis][field]}
                            onInput={(e) =>
                              updateCal(axis, field, e.target.valueAsNumber)
                            }
                          />
                        </label>
                      )}
                    </For>
                  </div>
                  <label class="check">
                    <input
                      aria-label={`${title} reverse direction`}
                      type="checkbox"
                      checked={calibration()[axis].invert}
                      onChange={(e) =>
                        updateCal(axis, "invert", e.target.checked)
                      }
                    />
                    Reverse direction
                  </label>
                  <p class="hint">
                    Reverse servo direction if movement is opposite to your
                    chosen convention.
                  </p>
                  <Show when={calibration()[axis].high - calibration()[axis].low <= 200}>
                    <p class="hint" role="note">
                      Narrow startup pulse range: angle labels are not yet proof of physical travel.
                      At 1400–1600 µs, a displayed 60° can produce only a small real rotation.
                      Measure each endpoint unloaded and enter its actual angle. Expand pulses in
                      10–20 µs steps, disabling PWM before each save; stop before binding or buzzing.
                    </p>
                  </Show>
                  <h3>Pulse range (µs)</h3>
                  <div class="pulse-diagram">
                    <For each={["low", "center", "high"]}>
                      {(field) => (
                        <div>
                          <i class={field === "center" ? "mint" : "amber"} />
                          <strong>{calibration()[axis][field]}</strong>
                          <span>{field}</span>
                        </div>
                      )}
                    </For>
                  </div>
                  <p
                    class={
                      validCalibration(calibration()[axis]) ? "hint" : "invalid"
                    }
                  >
                    {validCalibration(calibration()[axis])
                      ? "Low < center < high · values must match measured travel."
                      : "Use pulses 700–2300 µs, low < center < high, signed limits inside CAD range, speed 1–60°/s."}
                  </p>
                  <div class="row">
                    <button
                      class="primary"
                      disabled={
                        !connected() ||
                        status().armed ||
                        !validCalibration(calibration()[axis])
                      }
                      onClick={() => saveCal(axis)}
                    >
                      Save {title} calibration
                    </button>
                    <button
                      disabled={!connected()}
                      onClick={async () => {
                        const s = await run(() =>
                          transport.request("/status", undefined, "GET"),
                        );
                        if (s)
                          setCalibration([
                            calibrationFromStatus(s, 0),
                            calibrationFromStatus(s, 1),
                          ]);
                      }}
                    >
                      Read device calibration
                    </button>
                  </div>
                </Show>
              );
            }}
          </For>
          <div class="row">
            <button onClick={backup}>Export backup</button>
            <button onClick={importBackup}>Import backup</button>
            <button disabled={!connected()} onClick={() => action("/disarm")}>
              Disable PWM for calibration
            </button>
          </div>
        </section>
        <section class="panel calibration-guide">
          <h2>
            {
              [
                "01 — Center the servos",
                "02 — Choose direction",
                "03 — Measure safe limits",
                "04 — Verify and save",
              ][wizard()]
            }
          </h2>
          <ol>
            <For
              each={
                [
                  [
                    "Remove the camera and servo horns. Start unloaded with the base secured.",
                    "Use a narrow pulse range first, while PWM is disabled. New devices start at 1400 / 1500 / 1600 µs.",
                    "ARM explicitly to center, mark shaft positions, then disconnect power before fitting centered horns.",
                  ],
                  [
                    "Test a small offset on one axis at a time, from the Control page.",
                    "Choose your convention: positive pan right and positive tilt up. Actual movement depends on horn orientation.",
                    "Disable PWM before changing reverse direction. Inspect before each explicit ARM.",
                  ],
                  [
                    "Use a protractor to measure actual angle, not just commanded labels.",
                    "Expand endpoints in 10–20 µs trials; disable PWM before every calibration save.",
                    "Keep clear of cable tension, mechanical collisions, and buzzing servo end stops. CAD maximum is ±60° pan / ±25° tilt; yours may be smaller.",
                  ],
                  [
                    "Save each axis explicitly and reread the device status. Export a backup.",
                    "Test slow cycles and 15-minute dwells with a tethered dummy matching camera mass and balance.",
                    "Check heat, flex, bearing binding, cables, STOP, Wi-Fi loss, and timeout on real hardware.",
                  ],
                ][wizard()]
              }
            >
              {(line) => <li>{line}</li>}
            </For>
          </ol>
          <p class="hint">Example commands (USB serial)</p>
          <pre>{`DISARM\nCAL 0 1500 1400 1600 -10 10 0 5\nARM`}</pre>
          <div class="notice">
            Applying settings never arms or moves the camera. Keep PWM disabled
            while fitting hardware.
          </div>
          <div class="row">
            <button
              disabled={wizard() === 0}
              onClick={() => setWizard(wizard() - 1)}
            >
              Previous step
            </button>
            <button
              class="primary"
              disabled={wizard() === 3}
              onClick={() => setWizard(wizard() + 1)}
            >
              Next step
            </button>
          </div>
        </section>
      </div>
      <section class="panel preflight">
        <h2>Before you move</h2>
        <div>
          <label class="check">
            <input type="checkbox" />
            Camera supported
          </label>
          <label class="check">
            <input type="checkbox" />
            Cable slack checked
          </label>
          <label class="check">
            <input type="checkbox" />
            Horns and bearings secured
          </label>
        </div>
        <p class="hint">
          This checklist is a reminder, not a sensor interlock. Commanded
          degrees are estimates, not encoder measurements.
        </p>
      </section>
    </Show>
  );
}
