export function LoadingState({ label = "Loading data" }) {
  return (
    <div
      className="mono"
      style={{
        padding: "60px 20px",
        textAlign: "center",
        color: "var(--text-faint)",
        fontSize: 13,
        letterSpacing: "0.04em",
      }}
    >
      {label}…
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div
      style={{
        padding: "24px",
        border: "1px solid var(--accent-down-dim)",
        background: "rgba(242,73,92,0.06)",
        borderRadius: 4,
        color: "var(--text-muted)",
        fontSize: 13.5,
      }}
    >
      <div style={{ color: "var(--accent-down)", fontWeight: 600, marginBottom: 4 }}>
        Couldn't load this data.
      </div>
      {message || "Check that the backend is running and the database is seeded."}
    </div>
  );
}
