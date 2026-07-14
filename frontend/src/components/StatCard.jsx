export default function StatCard({ label, value, sub, accent }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        padding: "18px 20px",
        flex: 1,
        minWidth: 160,
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 11,
          color: "var(--text-faint)",
          letterSpacing: "0.06em",
          marginBottom: 8,
        }}
      >
        {label.toUpperCase()}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 26,
          fontWeight: 600,
          color: accent || "var(--text-primary)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
