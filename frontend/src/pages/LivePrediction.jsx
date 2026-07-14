import { useEffect, useState } from "react";
import api from "../api/client";
import TickerSelect from "../components/TickerSelect";
import StatCard from "../components/StatCard";
import { ErrorState } from "../components/StateViews";

const EXAMPLES = [
  { label: "Reliance profit rises 20%", text: "Reliance Q4 profit rises 20% beating analyst estimates" },
  { label: "TCS announces layoffs", text: "TCS announces massive layoffs amid global cost cutting" },
  { label: "SBI record quarterly profit", text: "SBI reports record quarterly profit on strong loan recovery" },
];

function DirectionCard({ label, direction, confidence, expectedMove }) {
  const bullish = direction === "up";
  return (
    <div style={{ flex: 1, minWidth: 240, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "18px 20px" }}>
      <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 10 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: bullish ? "var(--accent-up)" : "var(--accent-down)", marginBottom: 10 }}>
        {bullish ? "BULLISH ↑" : "BEARISH ↓"}
      </div>
      <div style={{ background: "var(--surface-raised)", borderRadius: 3, height: 6, marginBottom: 6, overflow: "hidden" }}>
        <div style={{ width: `${confidence * 100}%`, height: "100%", background: bullish ? "var(--accent-up)" : "var(--accent-down)" }} />
      </div>
      <div className="mono" style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
        Confidence: {(confidence * 100).toFixed(1)}%
      </div>
      <StatCard label="Expected Move" value={`${expectedMove >= 0 ? "+" : ""}${expectedMove.toFixed(2)}%`} accent={expectedMove >= 0 ? "var(--accent-up)" : "var(--accent-down)"} />
    </div>
  );
}

export default function LivePrediction() {
  const [tickers, setTickers] = useState(null);
  const [ticker, setTicker] = useState(null);
  const [headline, setHeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getTickers()
      .then((t) => {
        setTickers(t);
        setTicker(t.includes("RELIANCE.NS") ? "RELIANCE.NS" : t[0]);
      })
      .catch((err) => setError(err.response?.data?.detail || err.message));
  }, []);

  const runPrediction = async () => {
    if (!headline.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.getLivePrediction(ticker, headline);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!tickers || !ticker) return null;

  return (
    <div style={{ padding: "24px 28px 40px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: "0 0 4px" }}>🔮 Live Prediction</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginBottom: 16 }}>
        Enter a headline to get a real-time sentiment-driven prediction using live stock data
      </p>

      <div style={{ background: "rgba(242,73,92,0.06)", border: "1px solid var(--accent-down-dim)", borderRadius: 4, padding: "12px 16px", fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
        ⚠️ <strong style={{ color: "var(--text-primary)" }}>Risk Disclaimer:</strong> for educational and research purposes only — not financial advice.
        1-day prediction accuracy is approximately 51–53%. 5-day is approximately 56–58%.
        Do not use this for actual trading decisions.
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 6 }}>SELECT STOCK</div>
        <TickerSelect tickers={tickers} value={ticker} onChange={setTicker} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 6 }}>ENTER HEADLINE OR PASTE ARTICLE</div>
        <textarea
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. Reliance Q4 profit rises 20% beating analyst estimates"
          rows={4}
          style={{ width: "100%", background: "var(--surface-raised)", border: "1px solid var(--border-bright)", color: "var(--text-primary)", borderRadius: 4, padding: "12px 14px", fontSize: 14, fontFamily: "inherit", resize: "vertical" }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            onClick={() => setHeadline(ex.text)}
            className="mono"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-bright)", color: "var(--text-muted)", borderRadius: 4, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}
          >
            {ex.label}
          </button>
        ))}
      </div>

      <button
        onClick={runPrediction}
        disabled={loading || !headline.trim()}
        className="mono"
        style={{
          width: "100%", padding: "12px", borderRadius: 4, border: "none",
          background: loading || !headline.trim() ? "var(--surface-raised)" : "var(--accent-amber)",
          color: loading || !headline.trim() ? "var(--text-faint)" : "var(--bg)",
          fontSize: 13, fontWeight: 600, letterSpacing: "0.03em",
          cursor: loading || !headline.trim() ? "default" : "pointer", marginBottom: 24,
        }}
      >
        {loading ? "ANALYZING…" : "🔍 ANALYZE AND PREDICT"}
      </button>

      {error && <ErrorState message={error} />}

      {result && (
        <>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 8 }}>LIVE DATA — {result.ticker}</div>
          <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
            <StatCard label="Current Price" value={`₹${result.close_price.toFixed(2)}`} />
            <StatCard label="RSI" value={result.rsi.toFixed(1)} sub={result.rsi > 70 ? "Overbought" : result.rsi < 30 ? "Oversold" : undefined} />
            <StatCard label="MACD Signal" value={result.macd_bullish ? "Bullish" : "Bearish"} accent={result.macd_bullish ? "var(--accent-up)" : "var(--accent-down)"} />
            <StatCard label="1D Return" value={`${result.return_1d >= 0 ? "+" : ""}${result.return_1d.toFixed(2)}%`} accent={result.return_1d >= 0 ? "var(--accent-up)" : "var(--accent-down)"} />
          </div>

          <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 8 }}>SENTIMENT ANALYSIS</div>
          <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
            <StatCard label="Sentiment" value={result.sentiment_label.toUpperCase()} accent={result.sentiment_label === "positive" ? "var(--accent-up)" : result.sentiment_label === "negative" ? "var(--accent-down)" : "var(--text-muted)"} />
            <StatCard label="Confidence" value={`${(result.sentiment_score * 100).toFixed(1)}%`} />
            <StatCard label="Compound Score" value={`${result.sentiment_compound >= 0 ? "+" : ""}${result.sentiment_compound.toFixed(3)}`} />
          </div>

          <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 8 }}>BULL / BEAR INDICATOR</div>
          <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
            <DirectionCard label="Short Term — 1 Day" direction={result.direction_1d} confidence={result.confidence_1d} expectedMove={result.expected_move_1d} />
            <DirectionCard label="Long Term — 5 Days" direction={result.direction_5d} confidence={result.confidence_5d} expectedMove={result.expected_move_5d} />
          </div>

          {result.top_factors.length > 0 && (
            <>
              <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 8 }}>EXPLAIN PREDICTION</div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "16px 18px", marginBottom: 24 }}>
                <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 0 }}>Top factors driving this prediction (green = bullish push, red = bearish push)</p>
                {result.top_factors.map((f) => (
                  <div key={f.feature} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span className="mono" style={{ fontSize: 12, width: 180, color: "var(--text-muted)" }}>{f.feature}</span>
                    <div style={{ flex: 1, background: "var(--surface-raised)", height: 14, borderRadius: 2, position: "relative", overflow: "hidden" }}>
                      <div
                        style={{
                          position: "absolute",
                          left: f.impact >= 0 ? "50%" : `${50 - Math.min(Math.abs(f.impact) * 200, 50)}%`,
                          width: `${Math.min(Math.abs(f.impact) * 200, 50)}%`,
                          height: "100%",
                          background: f.impact >= 0 ? "var(--accent-up)" : "var(--accent-down)",
                        }}
                      />
                    </div>
                    <span className="mono" style={{ fontSize: 12, width: 60, textAlign: "right", color: f.impact >= 0 ? "var(--accent-up)" : "var(--accent-down)" }}>
                      {f.impact >= 0 ? "+" : ""}{f.impact.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 8 }}>SIMILAR PAST EVENTS WITH OUTCOMES</div>
          {result.similar_events.length === 0 ? (
            <div style={{ color: "var(--text-faint)", fontSize: 13 }}>No similar past events found.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {result.similar_events.map((e, i) => {
                const icon = e.sentiment_label === "positive" ? "🟢" : e.sentiment_label === "negative" ? "🔴" : "⚪";
                const dateStr = e.published_at ? new Date(e.published_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Unknown";
                return (
                  <div key={i} style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {icon} <strong style={{ color: "var(--text-primary)" }}>{dateStr}</strong> — {e.content.slice(0, 160)}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}