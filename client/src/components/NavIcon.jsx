const paths = {
  Control: "M12 3v3m0 12v3M3 12h3m12 0h3M12 8v8M8 12h8",
  Calibration: "M5 4v16M12 4v16M19 4v16M2 8h6m1 8h6m1-6h6",
  Guides: "M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2Z",
  Connection: "M9 3v5m6-5v5M7 8h10v4a5 5 0 0 1-10 0Zm5 9v4",
  Presets: "M5 4h14v17l-7-4-7 4Z",
  Settings: "m9 3-1 3-3 1-2 3 2 2-1 3 3 2 2-1 3 1 2-2 3-1 1-3-2-2 1-3-3-2-2 1Z",
};
export default function NavIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="23"
      height="23"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={paths[props.name]} />
      {props.name === "Control" ? (
        <circle cx="12" cy="12" r="7" />
      ) : props.name === "Settings" ? (
        <circle cx="12" cy="12" r="3" />
      ) : null}
    </svg>
  );
}
