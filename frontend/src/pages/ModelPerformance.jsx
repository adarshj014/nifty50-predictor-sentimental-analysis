import { useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, ReferenceLine,
} from "recharts";
import api from "../api/client";
import StatCard from "../components/StatCard";
import { LoadingState, ErrorState } from "../components/StateViews";

const BAR_COLORS = ["var(--text-muted)", "var(--accent-amber)", "var(--accent-blue)", "var(--accent-up)", "#00A0FF"];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="mono" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-bright)", borderRadius: 4, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "var(--text-faint)", marginBottom: 4 }}>{label}</div>
      <div style={{ color: "var(--accent-amber)" }}>{payload[0].value.toFixed(2)}%</div>
    </div>
  );
}

export default function ModelPerformance() {
  const [comparison, setComparison] = useState(null);
  const [perStock, setPerStock] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getModelComparison(), api.getPerStockAccuracy(), api.getDatasetStats()])
      .then(([c, p, s]) => {
        if (!cancelled) {
          setComparison(c);
          setPerStock(p);
          setStats(s);
        }
      })
      .catch((err) => !cancelled && setError(err.response?.data?.detail || err.message));
    return () => { cancelled = true; };
  }, []);

  if (error) return <div style={{ padding: 28 }}><ErrorState message={error} /></div>;
  if (!comparison || !perStock || !stats) return <LoadingState label="Loading model metrics" />;

  const above55_1d = perStock.filter((r) => r.accuracy_1d != null && r.accuracy_1d > 55).length;
  const above60_1d = perStock.filter((r) => r.accuracy_1d != null && r.accuracy_1d > 60).length;
  const above55_5d = perStock.filter((r) => r.accuracy_5d != null && r.accuracy_5d > 55).length;
  const above60_5d = perStock.filter((r) => r.accuracy_5d != null && r.accuracy_5d > 60).length;

  const sortedPerStock = [...perStock].sort((a, b) => (b.accuracy_1d || 0) - (a.accuracy_1d || 0));

  return (
    <div style={{ padding: "24px 28px 40px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: "0 0 4px" }}>📊 Model Performance</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginBottom: 24 }}>
        Honest and transparent reporting on how the models actually perform
      </p>

      <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 8 }}>GLOBAL MODEL COMPARISON</div>
      <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
        {comparison.map((c) => (
          <StatCard key={c.model_name} label={c.model_name} value={`${c.accuracy.toFixed(2)}%`} />
        ))}
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "16px 12px", marginBottom: 32 }}>
        {comparison.length === 0 ? (
          <div style={{ color: "var(--text-faint)", fontSize: 13, padding: "20px 8px" }}>
            No model comparison data — check that model_comparison.pkl loaded correctly.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparison}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="model_name" tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} angle={-20} textAnchor="end" height={60} />
              <YAxis domain={[45, 70]} tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-raised)" }} />
              <ReferenceLine y={50} stroke="var(--accent-down)" strokeDasharray="4 3" label={{ value: "Random baseline 50%", fill: "var(--accent-down)", fontSize: 11, position: "insideTopRight" }} />
              <Bar dataKey="accuracy" radius={[3, 3, 0, 0]}>
                {comparison.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 8 }}>DATASET STATISTICS</div>
      <div style={{ display: "flex", gap: 14, marginBottom: 32, flexWrap: "wrap" }}>
        <StatCard label="Total News-Days Analyzed" value={stats.total_news_days.toLocaleString()} />
        <StatCard label="Stocks Covered" value={stats.stocks_covered} />
      </div>

      <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 8 }}>
        XGBOOST ACCURACY BY STOCK — 1 DAY VS 5 DAY
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "16px 12px", marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={sortedPerStock}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="ticker" tick={{ fill: "var(--text-faint)", fontSize: 9 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} angle={-90} textAnchor="end" height={90} interval={0} />
            <YAxis domain={[40, 80]} tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-raised)" }} />
            <ReferenceLine y={50} stroke="var(--accent-down)" strokeDasharray="4 3" />
            <Bar dataKey="accuracy_1d" name="1 Day Accuracy" fill="var(--accent-blue)" />
            <Bar dataKey="accuracy_5d" name="5 Day Accuracy" fill="var(--accent-up)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 32, flexWrap: "wrap" }}>
        <StatCard label="1D — stocks above 55%" value={`${above55_1d} / ${perStock.length}`} />
        <StatCard label="1D — stocks above 60%" value={`${above60_1d} / ${perStock.length}`} />
        <StatCard label="5D — stocks above 55%" value={`${above55_5d} / ${perStock.length}`} />
        <StatCard label="5D — stocks above 60%" value={`${above60_5d} / ${perStock.length}`} />
      </div>

      <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden", marginBottom: 32 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface)" }}>
              {["Ticker", "Acc 1D", "Acc 5D"].map((h) => (
                <th key={h} className="mono" style={{ textAlign: h === "Ticker" ? "left" : "right", padding: "10px 16px", fontSize: 11, color: "var(--text-faint)", borderBottom: "1px solid var(--border)" }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPerStock.map((r) => (
              <tr key={r.ticker} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "10px 16px", fontWeight: 500 }}>{r.ticker}</td>
                <td className="mono" style={{ padding: "10px 16px", textAlign: "right" }}>{r.accuracy_1d != null ? `${r.accuracy_1d.toFixed(1)}%` : "—"}</td>
                <td className="mono" style={{ padding: "10px 16px", textAlign: "right" }}>{r.accuracy_5d != null ? `${r.accuracy_5d.toFixed(1)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mono" style={{ fontSize: 11, color: "var(--accent-down)", marginBottom: 10 }}>⚠️ HONEST LIMITATIONS</div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "18px 20px", fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.7 }}>
        <p><strong style={{ color: "var(--text-primary)" }}>1-Day Prediction Accuracy (51–53%)</strong><br />Barely above random chance. Consistent with the Efficient Market Hypothesis.</p>
        <p><strong style={{ color: "var(--text-primary)" }}>5-Day Prediction Accuracy (56%)</strong><br />Modestly better. Some upward bias from the bull market training period.</p>
        <p><strong style={{ color: "var(--text-primary)" }}>Per-Stock Variance</strong><br />Some stocks show 60–65% accuracy on significant move days. Others perform near random due to thin news coverage.</p>
        <p><strong style={{ color: "var(--text-primary)" }}>Sentiment Bias</strong><br />Nifty 50 news skews positive. Per-ticker centering partially corrects this.</p>
        <p><strong style={{ color: "var(--text-primary)" }}>What this tool is useful for</strong><br />Combining sentiment context with technical signals for research purposes.</p>
        <p style={{ marginBottom: 0 }}><strong style={{ color: "var(--text-primary)" }}>What this tool should NOT be used for</strong><br />Actual trading decisions, precise price targets, or financial advice.</p>
      </div>
    </div>
  );
}
