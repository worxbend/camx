import { Show, For } from "solid-js";
export default function ActivityPanel(props) {
  const { logs, setLogs } = props.model;
  return (
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
              Your commands will appear here. Tokens and credentials are never
              logged.
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
  );
}
