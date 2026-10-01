import { For, Show } from "solid-js";
import { guides } from "../guides.js";

export default function GuideView(props) {
  const { tab, pan, tilt } = props.model;
  return (
    <Show when={tab() === "Guides"}>
      <div class="guides">
        <For each={guides}>
          {(g) => (
            <article class="panel">
              <span class="eyebrow">{g.tag}</span>
              <h2>{g.title}</h2>
              <ol>
                <For each={g.steps}>{(s) => <li>{s}</li>}</For>
              </ol>
            </article>
          )}
        </For>
        <article class="panel">
          <h2>One request. Two offsets.</h2>
          <pre>{`POST /move\nX-CAMX-Request: 1\nAuthorization: Bearer YOUR_TOKEN\nContent-Type: application/json\n\n{"pan":15,"tilt":-5}`}</pre>
          <p>
            Offsets are absolute degrees from calibrated center, not increments.
            Both targets are accepted atomically. Automatic face tracking
            requires a separate host application.
          </p>
          <a
            href="https://worxbend.github.io/camx/guide/firmware-api.html"
            target="_blank"
            rel="noreferrer"
          >
            Full firmware API ↗
          </a>
        </article>
      </div>
    </Show>
  );
}
