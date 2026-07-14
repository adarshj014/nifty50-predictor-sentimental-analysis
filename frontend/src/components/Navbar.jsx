import { NavLink } from "react-router-dom";

const linkStyle = ({ isActive }) => ({
  padding: "8px 14px",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  letterSpacing: "0.03em",
  color: isActive ? "var(--bg)" : "var(--text-muted)",
  background: isActive ? "var(--accent-amber)" : "transparent",
  borderRadius: 3,
  transition: "background 0.15s, color 0.15s",
  whiteSpace: "nowrap",
});

export default function Navbar() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 28px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 19,
            letterSpacing: "-0.01em",
          }}
        >
          N50<span style={{ color: "var(--accent-amber)" }}>/</span>SENTIMENT
        </span>
        <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>
          v2.0
        </span>
      </div>
      <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <NavLink to="/" end style={linkStyle}>
          HOME
        </NavLink>
        <NavLink to="/historical" style={linkStyle}>
          HISTORICAL ANALYSIS
        </NavLink>
        <NavLink to="/live-prediction" style={linkStyle}>
          LIVE PREDICTION
        </NavLink>
        <NavLink to="/model-performance" style={linkStyle}>
          MODEL PERFORMANCE
        </NavLink>
      </nav>
    </header>
  );
}
