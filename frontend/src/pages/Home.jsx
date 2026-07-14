import { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import api from "../api/client";
import TickerSelect from "../components/TickerSelect";
import StatCard from "../components/StatCard";
import { LoadingState, ErrorState } from "../components/StateViews";

const FEATURE_CARDS = [
  { icon: "📰", title: "Sentiment Analysis", body: "FinBERT scores Indian financial news headlines for market sentiment." },
  { icon: "📈", title: "Technical Indicators", body: "MACD, DMA crossovers, RSI, Bollinger Bands, and volume spikes." },
  { icon: "🤖", title: "ML Predictions", body: "XGBoost models generate 1-day and 5-day directional signals." },
  { icon: "🔍", title: "Explainability", body: "SHAP values show which factors drove each prediction." },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="mono" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-bright)", borderRadius: 4, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "var(--text-faint)", marginBottom: 4 }}>{label}</div>
      <div style={{ color: "var(--accent-amber)" }}>₹{payload[0].value.toFixed(2)}</div>
    </div>
  );
}

export default function Home() {
  const [tickers, setTickers] = useState(null);
  const [ticker, setTicker] = useState(null);
  const [prices, setPrices] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getTickers()
      .then((t) => {
        setTickers(t);
        setTicker(t.includes("RELIANCE.NS") ? "RELIANCE.NS" : t[0]);
      })
      .catch((err) => setError(err.response?.data?.detail || err.message));
  }, []);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    setPrices(null);
    setSentiment(null);
    Promise.all([api.getPrices(ticker, 30), api.getSentiment(ticker, 30)])
      .then(([p, s]) => {
        if (!cancelled) {
          setPrices(p);
          setSentiment(s);
        }
      })
      .catch((err) => !cancelled && setError(err.response?.data?.detail || err.message));
    return () => { cancelled = true; };
  }, [ticker]);

  if (error) return <div style={{ padding: 28 }}><ErrorState message={error} /></div>;
  if (!tickers || !ticker) return <LoadingState label="Loading tickers" />;

  const latest = prices && prices.length > 0 ? prices[prices.length - 1] : null;
  const prev = prices && prices.length > 1 ? prices[prices.length - 2] : latest;
  const change = latest && prev ? latest.close_price - prev.close_price : null;
  const pctChange = change != null && prev ? (change / prev.close_price) * 100 : null;

  const avgSent = sentiment && sentiment.length > 0
    ? sentiment.reduce((sum, s) => sum + (s.avg_compound || 0), 0) / sentiment.length
    : 0;
  const sentLabel = avgSent > 0.05 ? "Bullish" : avgSent < -0.05 ? "Bearish" : "Neutral";
  const totalArticles = sentiment ? sentiment.reduce((sum, s) => sum + (s.article_count || 0), 0) : 0;

  const startDate = prices && prices.length > 0 ? prices[0].date : null;
  const endDate = prices && prices.length > 0 ? prices[prices.length - 1].date : null;

  return (
    <div style={{ padding: "24px 28px 40px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, margin: "0 0 8px" }}>
        📊 Nifty 50 Sentiment Signal Generator
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 700, marginBottom: 20 }}>
        A research tool that combines FinBERT sentiment analysis on Indian financial news
        with technical indicators to analyze directional signals for Nifty 50 stocks.
      </p>

      <div style={{ marginBottom: 20 }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 6 }}>
          SEARCH ANY NIFTY 50 STOCK
        </div>
        <TickerSelect tickers={tickers} value={ticker} onChange={setTicker} />
      </div>

      {!prices ? (
        <LoadingState label={`Loading ${ticker}`} />
      ) : latest ? (
        <>
          {endDate && (
            <div
              style={{
                background: "rgba(232,179,57,0.08)",
                border: "1px solid var(--accent-amber-dim)",
                borderRadius: 4,
                padding: "10px 16px",
                fontSize: 13,
                color: "var(--text-muted)",
                marginBottom: 16,
              }}
            >
              ⚠️ Disclaimer: this dashboard uses historical data stored in the database.
              Latest available data is <strong style={{ color: "var(--text-primary)" }}>{endDate}</strong>.
              This is NOT real-time market data.
            </div>
          )}

          <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
            <StatCard
              label="Last Recorded Close"
              value={`₹${latest.close_price?.toFixed(2)}`}
              sub={pctChange != null ? `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(2)}%` : undefined}
              accent={pctChange >= 0 ? "var(--accent-up)" : "var(--accent-down)"}
            />
            <StatCard
              label="Avg Sentiment (shown period)"
              value={sentLabel}
              sub={`${avgSent >= 0 ? "+" : ""}${avgSent.toFixed(3)}`}
              accent={sentLabel === "Bullish" ? "var(--accent-up)" : sentLabel === "Bearish" ? "var(--accent-down)" : "var(--text-muted)"}
            />
            <StatCard label="News Coverage" value={`${totalArticles} articles`} />
          </div>

          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "16px 12px",
              marginBottom: 28,
            }}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={prices.map((p) => ({ date: p.date, close: p.close_price }))}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={40} />
                <YAxis tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="close" stroke="var(--accent-up)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <ErrorState message="No stock price data available for selected ticker." />
      )}

      <div
        className="mono"
        style={{ fontSize: 11, color: "var(--text-faint)", letterSpacing: "0.06em", marginBottom: 14 }}
      >
        WHAT THIS TOOL DOES
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {FEATURE_CARDS.map((c) => (
          <div
            key={c.title}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "16px 18px",
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}