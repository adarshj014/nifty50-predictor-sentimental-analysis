import psycopg2
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()


def get_connection():
    """Supports either a single DATABASE_URL (used by the FastAPI backend's
    .env) or the original individual DB_HOST/DB_NAME/... vars — whichever
    is present. This lets the notebooks reuse backend/.env as-is."""
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        result = urlparse(database_url)
        return psycopg2.connect(
            host=result.hostname,
            database=result.path.lstrip("/"),
            user=result.username,
            password=result.password,
            port=result.port or 5432,
        )
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT"),
    )


from psycopg2.extras import execute_values

def insert_prices(prices):
    if not prices:
        return

    conn = get_connection()
    cur = conn.cursor()

    rows = [(
        p["ticker"], p["date"],
        p["open_price"], p["close_price"], p["volume"],
        p["dma_20"], p["dma_50"],
        p["volume_spike"], p["rsi"],
        p["macd"], p["macd_signal"], p["macd_hist"], p["bb_position"],
        p["return_1d"], p["return_3d"], p["return_5d"],
        p["pct_from_20d_high"], p["pct_from_20d_low"]
    ) for p in prices]

    BATCH_SIZE = 300
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        execute_values(cur, """
            INSERT INTO stock_prices
                (ticker, date, open_price, close_price, volume,
                 dma_20, dma_50, volume_spike, rsi,
                 macd, macd_signal, macd_hist, bb_position,
                 return_1d, return_3d, return_5d,
                 pct_from_20d_high, pct_from_20d_low)
            VALUES %s
            ON CONFLICT (ticker, date) DO UPDATE SET
                macd              = EXCLUDED.macd,
                macd_signal       = EXCLUDED.macd_signal,
                macd_hist         = EXCLUDED.macd_hist,
                bb_position       = EXCLUDED.bb_position,
                return_1d         = EXCLUDED.return_1d,
                return_3d         = EXCLUDED.return_3d,
                return_5d         = EXCLUDED.return_5d,
                pct_from_20d_high = EXCLUDED.pct_from_20d_high,
                pct_from_20d_low  = EXCLUDED.pct_from_20d_low
        """, batch)
        conn.commit()

    cur.close()
    conn.close()


def insert_news(articles):
    conn = get_connection()
    cur = conn.cursor()

    for a in articles:
        cur.execute("""
            INSERT INTO news_articles
                (ticker, content, source, published_at, url)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            a["ticker"], a["content"],
            a["source"], a["published_at"], a["url"]
        ))

    conn.commit()
    cur.close()
    conn.close()
