import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import api from "../api/client";
import TickerSelect from "../components/TickerSelect";
import StatCard from "../components/StatCard";
import { LoadingState, ErrorState } from "../components/StateViews";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="mono" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-bright)", borderRadius: 4, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "var(--text-faint)", marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
}

function AccuracyCard({ label, acc, rows, threshold = "1%" }) {
  if (acc == null) {
    return (
      <div style={{ flex: 1, border: "1px dashed var(--border-bright)", borderRadius: 4, padding: "16px 18px", color: "var(--text-faint)", fontSize: 13 }}>
        No per-stock model for {label} — global model used.
      </div>
    );
  }
  const note = acc > 60 ? ["Strong signal for this stock.", "var(--accent-up)"]
    : acc > 55 ? ["Moderate signal above baseline.", "var(--accent-amber)"]
    : ["Weak signal — near random.", "var(--accent-down)"];

  return (
    <div style={{ flex: 1, minWidth: 220, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "16px 18px" }}>
      <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 8 }}>{label.toUpperCase()}</div>
      <div className="mono" style={{ fontSize: 24, fontWeight: 600 }}>{acc.toFixed(1)}%</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 8px" }}>
        {acc >= 50 ? "+" : ""}{(acc - 50).toFixed(1)}% vs baseline · trained on {rows} strong-move days (&gt;{threshold})
      </div>
      <div style={{ fontSize: 12.5, color: note[1] }}>{note[0]}</div>
    </div>
  );
}

export default function HistoricalAnalysis() {
  const [tickers, setTickers] = useState(null);
  const [ticker, setTicker] = useState(null);
  const [days, setDays] = useState(180);
  const [prices, setPrices] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [articles, setArticles] = useState(null);
  const [sentimentFilter, setSentimentFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getTickers()
      .then((t) => {
        setTickers(t);
        setTicker(t.includes("RELIANCE.NS") ? "RELIANCE.NS" : t[0]);
      })
      .catch((err) => setError(err.response?.data?.detail || err.message));
    api.getPerStockAccuracy().then(setAccuracy).catch(() => setAccuracy([]));
  }, []);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    setPrices(null);
    setSentiment(null);
    setArticles(null);
    Promise.all([
      api.getPrices(ticker, days),
      api.getSentiment(ticker, days),
      api.getArticlesWithReturns(ticker).catch(() => []),
    ]).then(([p, s, a]) => {
      if (!cancelled) {
        setPrices(p);
        setSentiment(s);
        setArticles(a);
      }
    }).catch((err) => !cancelled && setError(err.response?.data?.detail || err.message));
    return () => { cancelled = true; };
  }, [ticker, days]);

  if (error) return <div style={{ padding: 28 }}><ErrorState message={error} /></div>;
  if (!tickers || !ticker) return <LoadingState label="Loading tickers" />;

  const tickerAcc = accuracy ? accuracy.find((a) => a.ticker === ticker) : null;

  let filteredArticles = articles || [];
  if (sentimentFilter !== "All") {
    filteredArticles = filteredArticles.filter((a) => a.sentiment_label === sentimentFilter);
  }
  if (search.trim()) {
    filteredArticles = filteredArticles.filter((a) =>
      a.content.toLowerCase().includes(search.toLowerCase())
    );
  }

  return (
    <div style={{ padding: "24px 28px 40px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: "0 0 4px" }}>📈 Historical Analysis</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginBottom: 20 }}>
        Past news sentiment vs price movement for any Nifty 50 stock
      </p>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 6 }}>SELECT STOCK</div>
          <TickerSelect tickers={tickers} value={ticker} onChange={setTicker} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 6 }}>
            DAYS OF HISTORY: {days}
          </div>
          <input
            type="range" min={30} max={730} step={30} value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent-amber)" }}
          />
        </div>
      </div>

      {!prices ? (
        <LoadingState label={`Loading ${ticker}`} />
      ) : prices.length === 0 ? (
        <ErrorState message="No data available for this stock." />
      ) : (
        <>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 8 }}>PRICE MOVEMENT</div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "16px 12px", marginBottom: 24 }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={prices.map((p) => ({ date: p.date, close: p.close_price, dma20: p.dma_20, dma50: p.dma_50 }))}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={50} />
                <YAxis tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="close" name="Close Price" stroke="var(--accent-blue)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="dma20" name="DMA 20" stroke="var(--accent-amber)" dot={false} strokeWidth={1} strokeDasharray="4 3" />
                <Line type="monotone" dataKey="dma50" name="DMA 50" stroke="var(--accent-down)" dot={false} strokeWidth={1} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 8 }}>DAILY SENTIMENT TREND</div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "16px 12px", marginBottom: 8 }}>
            {sentiment && sentiment.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={sentiment.map((s) => ({ date: s.date, sentiment: s.avg_compound }))}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={50} />
                  <YAxis tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={false} tickLine={false} domain={[-1, 1]} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={0} stroke="var(--text-faint)" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="sentiment" name="Sentiment" stroke="var(--accent-up)" fill="var(--accent-up-dim)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: "var(--text-faint)", fontSize: 13, padding: "20px 0" }}>No sentiment data for this period.</div>
            )}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 0, marginBottom: 28 }}>
            Above 0 = positive sentiment period · Below 0 = negative sentiment period
          </p>

          <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 8 }}>
            XGBOOST MODEL ACCURACY — {ticker}
          </div>
          <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
            <AccuracyCard label="1 Day Direction Accuracy" acc={tickerAcc?.accuracy_1d} rows={tickerAcc?.rows_1d} threshold="1%" />
            <AccuracyCard label="5 Day Direction Accuracy" acc={tickerAcc?.accuracy_5d} rows={tickerAcc?.rows_5d} threshold="1.5%" />
          </div>

          <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>
            HISTORICAL ARTICLES — {ticker}
          </div>
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 0, marginBottom: 12 }}>
            Each article shown with its sentiment score and how the stock moved after
          </p>

          <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="mono"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border-bright)", color: "var(--text-primary)", borderRadius: 4, padding: "8px 12px", fontSize: 13 }}
            >
              {["All", "positive", "negative", "neutral"].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <input
              type="text" placeholder="Search e.g. profit, NPA"
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border-bright)", color: "var(--text-primary)", borderRadius: 4, padding: "8px 12px", fontSize: 13, flex: 1, minWidth: 200 }}
            />
          </div>

          {!articles ? (
            <LoadingState label="Loading articles" />
          ) : filteredArticles.length === 0 ? (
            <div style={{ color: "var(--text-faint)", fontSize: 13 }}>No articles found for this stock.</div>
          ) : (
            <>
              <p style={{ fontSize: 12, color: "var(--text-faint)" }}>
                Showing {Math.min(50, filteredArticles.length)} of {filteredArticles.length.toLocaleString()} articles
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filteredArticles.slice(0, 50).map((a, i) => {
                  const isOpen = expanded === i;
                  const icon = a.sentiment_label === "positive" ? "🟢" : a.sentiment_label === "negative" ? "🔴" : "⚪";
                  const dateStr = a.published_at ? new Date(a.published_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Unknown";
                  return (
                    <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
                      <button
                        onClick={() => setExpanded(isOpen ? null : i)}
                        style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "var(--text-primary)", padding: "12px 16px", cursor: "pointer", fontSize: 13.5 }}
                      >
                        {icon} {dateStr} — {a.content.slice(0, 80)}...
                      </button>
                      {isOpen && (
                        <div style={{ padding: "0 16px 16px" }}>
                          <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>{a.content}</p>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 8 }}>
                            <StatCard label="Sentiment" value={(a.sentiment_label || "—").toUpperCase()} />
                            <StatCard label="Compound" value={a.sentiment_compound != null ? `${a.sentiment_compound >= 0 ? "+" : ""}${a.sentiment_compound.toFixed(3)}` : "—"} />
                            <StatCard label="Next Day Return" value={a.return_1d != null ? `${a.return_1d >= 0 ? "+" : ""}${a.return_1d.toFixed(2)}%` : "N/A"} accent={a.return_1d >= 0 ? "var(--accent-up)" : "var(--accent-down)"} />
                            <StatCard label="5 Day Return" value={a.return_5d != null ? `${a.return_5d >= 0 ? "+" : ""}${a.return_5d.toFixed(2)}%` : "N/A"} accent={a.return_5d >= 0 ? "var(--accent-up)" : "var(--accent-down)"} />
                          </div>
                          {a.url ? (
                            <a href={a.url} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 12, color: "var(--accent-blue)" }}>Read article →</a>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--text-faint)" }}>URL not available</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}