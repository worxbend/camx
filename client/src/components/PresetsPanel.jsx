import { For, Show, createSignal } from "solid-js";

export default function PresetsPanel(props) {
  const {
    status,
    pan,
    tilt,
    presets,
    name,
    editing,
    setName,
    setPan,
    setTilt,
    setEditing,
    setError,
    movable,
    send,
    persist,
    savePose,
    backup,
    importBackup,
  } = props.model;
  const [creating, setCreating] = createSignal(false);
  return (
    <section class="panel">
      <h2>Position presets</h2>
      <div class="preset-list">
        <For each={presets()}>
          {(p, i) => (
            <div class="preset">
              <button
                disabled={!movable()}
                onClick={() => {
                  if (
                    p.pan < status().pan_min ||
                    p.pan > status().pan_max ||
                    p.tilt < status().tilt_min ||
                    p.tilt > status().tilt_max
                  ) {
                    setError(
                      "Preset exceeds current calibrated limits. Edit it before moving.",
                    );
                    return;
                  }
                  send(p.pan, p.tilt);
                }}
              >
                {p.name}
                <span>
                  {p.pan}° / {p.tilt}°
                </span>
              </button>
              <button
                class="icon"
                aria-label={`Edit ${p.name}`}
                onClick={() => {
                  setName(p.name);
                  setPan(p.pan);
                  setTilt(p.tilt);
                  setEditing(i());
                  setCreating(true);
                }}
              >
                ✎
              </button>
              <button
                class="icon"
                aria-label={`Delete ${p.name}`}
                onClick={() => {
                  persist(presets().filter((_, j) => j !== i()));
                  setEditing(-1);
                  setName("");
                }}
              >
                ×
              </button>
            </div>
          )}
        </For>
      </div>
      <Show
        when={creating() || editing() >= 0}
        fallback={
          <button onClick={() => setCreating(true)}>+ Save current pose</button>
        }
      >
        <label>
          Preset name
          <input
            maxlength="40"
            value={name()}
            onInput={(e) => setName(e.target.value)}
            placeholder="Give this angle a name"
          />
        </label>
        <button
          disabled={!name().trim() || (presets().length >= 24 && editing() < 0)}
          onClick={() => {
            savePose();
            setCreating(false);
          }}
        >
          {editing() < 0 ? "+ Save current pose" : "Save preset changes"}
        </button>
        <Show when={creating() || editing() >= 0}>
          <button
            onClick={() => {
              setEditing(-1);
              setName("");
              setCreating(false);
            }}
          >
            Cancel preset edit
          </button>
        </Show>
      </Show>
      <div class="row">
        <button onClick={backup}>Export backup</button>
        <button onClick={importBackup}>Import backup</button>
      </div>
    </section>
  );
}
