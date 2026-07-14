export default function TickerSelect({ tickers, value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mono"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border-bright)",
        color: "var(--text-primary)",
        borderRadius: 4,
        padding: "9px 14px",
        fontSize: 13.5,
        minWidth: 200,
        cursor: "pointer",
      }}
    >
      {tickers.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
