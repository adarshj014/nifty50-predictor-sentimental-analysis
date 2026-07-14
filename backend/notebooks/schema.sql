CREATE TABLE IF NOT EXISTS stock_prices (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    open_price NUMERIC(10,2),
    close_price NUMERIC(10,2),
    volume BIGINT,
    dma_20 NUMERIC(10,2),
    dma_50 NUMERIC(10,2),
    volume_spike BOOLEAN,
    rsi NUMERIC(5,2),
    macd NUMERIC(10,4),
    macd_signal NUMERIC(10,4),
    macd_hist NUMERIC(10,4),
    bb_position NUMERIC(5,4),
    return_1d NUMERIC(6,2),
    return_3d NUMERIC(6,2),
    return_5d NUMERIC(6,2),
    pct_from_20d_high NUMERIC(6,2),
    pct_from_20d_low NUMERIC(6,2),
    CONSTRAINT uq_stock_ticker_date UNIQUE (ticker, date)
);
CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker ON stock_prices (ticker);

CREATE TABLE IF NOT EXISTS news_articles (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(200),
    published_at TIMESTAMP,
    url TEXT,
    sentiment_label VARCHAR(20),
    sentiment_score NUMERIC(5,4),
    sentiment_compound NUMERIC(5,4)
);
CREATE INDEX IF NOT EXISTS idx_news_articles_ticker ON news_articles (ticker);

CREATE TABLE IF NOT EXISTS daily_sentiment (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    article_count INTEGER,
    avg_compound NUMERIC(5,4),
    max_compound NUMERIC(5,4),
    min_compound NUMERIC(5,4),
    std_compound NUMERIC(5,4),
    positive_count INTEGER,
    negative_count INTEGER,
    CONSTRAINT uq_sentiment_ticker_date UNIQUE (ticker, date)
);
CREATE INDEX IF NOT EXISTS idx_daily_sentiment_ticker ON daily_sentiment (ticker);