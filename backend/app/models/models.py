from sqlalchemy import (
    Column, Integer, String, Date, DateTime, Boolean,
    Numeric, BigInteger, Text, UniqueConstraint
)
from app.core.database import Base


class StockPrice(Base):
    __tablename__ = "stock_prices"

    id = Column(Integer, primary_key=True)
    ticker = Column(String(20), nullable=False, index=True)
    date = Column(Date, nullable=False)
    open_price = Column(Numeric(10, 2))
    close_price = Column(Numeric(10, 2))
    volume = Column(BigInteger)
    dma_20 = Column(Numeric(10, 2))
    dma_50 = Column(Numeric(10, 2))
    volume_spike = Column(Boolean)
    rsi = Column(Numeric(5, 2))
    macd = Column(Numeric(10, 4))
    macd_signal = Column(Numeric(10, 4))
    macd_hist = Column(Numeric(10, 4))
    bb_position = Column(Numeric(5, 4))
    return_1d = Column(Numeric(6, 2))
    return_3d = Column(Numeric(6, 2))
    return_5d = Column(Numeric(6, 2))
    pct_from_20d_high = Column(Numeric(6, 2))
    pct_from_20d_low = Column(Numeric(6, 2))

    __table_args__ = (UniqueConstraint("ticker", "date", name="uq_stock_ticker_date"),)


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True)
    ticker = Column(String(20), nullable=False, index=True)
    content = Column(Text, nullable=False)
    source = Column(String(200))
    published_at = Column(DateTime)
    url = Column(Text)
    sentiment_label = Column(String(20))
    sentiment_score = Column(Numeric(5, 4))
    sentiment_compound = Column(Numeric(5, 4))


class DailySentiment(Base):
    __tablename__ = "daily_sentiment"

    id = Column(Integer, primary_key=True)
    ticker = Column(String(20), nullable=False, index=True)
    date = Column(Date, nullable=False)
    article_count = Column(Integer)
    avg_compound = Column(Numeric(5, 4))
    max_compound = Column(Numeric(5, 4))
    min_compound = Column(Numeric(5, 4))
    std_compound = Column(Numeric(5, 4))
    positive_count = Column(Integer)
    negative_count = Column(Integer)

    __table_args__ = (UniqueConstraint("ticker", "date", name="uq_sentiment_ticker_date"),)
