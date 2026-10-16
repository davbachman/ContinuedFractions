export function PlaybackSpeed({
  value,
  onChange,
  label = "Playback speed",
}: {
  value: number;
  onChange: (speed: number) => void;
  label?: string;
}) {
  return (
    <label className="playback-speed">
      Speed{" "}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {[0.25, 0.5, 1, 2, 4].map((speed) => (
          <option key={speed} value={speed}>
            {speed}×
          </option>
        ))}
      </select>
    </label>
  );
}
