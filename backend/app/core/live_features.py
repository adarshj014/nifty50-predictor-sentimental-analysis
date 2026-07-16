"""Fetches live technical indicators for a ticker via yfinance, ported
exactly from the original Streamlit 2_Live_Prediction.py fetch_live_features()."""
import yfinance as yf
import requests

_session = requests.Session()
_session.headers.update({"User-Agent": "Mozilla/5.0"})


def fetch_live_features(ticker: str):
    stock = yf.Ticker(ticker, session=_session)
    df = stock.history(period="60d")

    if df.empty or len(df) < 20:
        return None

    df = df.reset_index()

    df["dma_20"] = df["Close"].rolling(20).mean()
    df["dma_50"] = df["Close"].rolling(50).mean()

    delta = df["Close"].diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = (-delta.clip(upper=0)).rolling(14).mean()
    df["rsi"] = 100 - (100 / (1 + gain / loss))

    ema_12 = df["Close"].ewm(span=12, adjust=False).mean()
    ema_26 = df["Close"].ewm(span=26, adjust=False).mean()
    df["macd"] = ema_12 - ema_26
    df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
    df["macd_hist"] = df["macd"] - df["macd_signal"]

    roll_mean = df["Close"].rolling(20).mean()
    roll_std = df["Close"].rolling(20).std()
    bb_upper = roll_mean + (2 * roll_std)
    bb_lower = roll_mean - (2 * roll_std)
    df["bb_position"] = ((df["Close"] - bb_lower) / (bb_upper - bb_lower)).clip(0, 1)

    df["return_1d"] = df["Close"].pct_change(1) * 100
    df["return_3d"] = df["Close"].pct_change(3) * 100
    df["return_5d"] = df["Close"].pct_change(5) * 100

    df["pct_from_20d_high"] = (df["Close"] / df["Close"].rolling(20).max() - 1) * 100
    df["pct_from_20d_low"] = (df["Close"] / df["Close"].rolling(20).min() - 1) * 100

    df["volume_spike"] = (df["Volume"] > df["Volume"].rolling(20).mean() * 2).astype(int)

    latest = df.dropna().iloc[-1]

    return {
        "close_price": float(latest["Close"]),
        "dma_20": float(latest["dma_20"]),
        "dma_50": float(latest["dma_50"]),
        "rsi": float(latest["rsi"]),
        "macd": float(latest["macd"]),
        "macd_signal": float(latest["macd_signal"]),
        "macd_hist": float(latest["macd_hist"]),
        "bb_position": float(latest["bb_position"]),
        "return_1d": float(latest["return_1d"]),
        "return_3d": float(latest["return_3d"]),
        "return_5d": float(latest["return_5d"]),
        "pct_from_20d_high": float(latest["pct_from_20d_high"]),
        "pct_from_20d_low": float(latest["pct_from_20d_low"]),
        "volume_spike": int(latest["volume_spike"]),
    }
