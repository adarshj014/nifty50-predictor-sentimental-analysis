from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class StockPriceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticker: str
    date: date
    open_price: Optional[float] = None
    close_price: Optional[float] = None
    volume: Optional[int] = None
    dma_20: Optional[float] = None
    dma_50: Optional[float] = None
    volume_spike: Optional[bool] = None
    rsi: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None
    bb_position: Optional[float] = None
    return_1d: Optional[float] = None
    return_3d: Optional[float] = None
    return_5d: Optional[float] = None
    pct_from_20d_high: Optional[float] = None
    pct_from_20d_low: Optional[float] = None


class DailySentimentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticker: str
    date: date
    article_count: Optional[int] = None
    avg_compound: Optional[float] = None
    max_compound: Optional[float] = None
    min_compound: Optional[float] = None
    std_compound: Optional[float] = None
    positive_count: Optional[int] = None
    negative_count: Optional[int] = None


class NewsArticleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticker: str
    content: str
    source: Optional[str] = None
    published_at: Optional[datetime] = None
    url: Optional[str] = None
    sentiment_label: Optional[str] = None
    sentiment_compound: Optional[float] = None


class PredictionOut(BaseModel):
    ticker: str
    direction_1d: str
    confidence_1d: float
    direction_5d: str
    confidence_5d: float
    predicted_return_1d: Optional[float] = None
    predicted_return_5d: Optional[float] = None


class ModelComparisonOut(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    model_name: str
    accuracy: float


class PerStockAccuracyOut(BaseModel):
    ticker: str
    accuracy_1d: Optional[float] = None
    accuracy_5d: Optional[float] = None
    rows_1d: Optional[int] = None
    rows_5d: Optional[int] = None


class DatasetStatsOut(BaseModel):
    total_news_days: int
    stocks_covered: int
    finbert_accuracy: float = 82.4


class LivePredictionRequest(BaseModel):
    ticker: str
    headline: str


class ShapFeatureImpact(BaseModel):
    feature: str
    impact: float


class ArticleWithReturnsOut(BaseModel):
    published_at: Optional[datetime] = None
    content: str
    sentiment_label: Optional[str] = None
    sentiment_compound: Optional[float] = None
    source: Optional[str] = None
    url: Optional[str] = None
    return_1d: Optional[float] = None
    return_5d: Optional[float] = None


class LivePredictionOut(BaseModel):
    ticker: str
    # live snapshot
    close_price: float
    rsi: float
    macd_bullish: bool
    return_1d: float
    # sentiment
    sentiment_label: str
    sentiment_score: float
    sentiment_compound: float
    # 1-day
    direction_1d: str
    confidence_1d: float
    expected_move_1d: float
    # 5-day
    direction_5d: str
    confidence_5d: float
    expected_move_5d: float
    # explainability
    top_factors: List[ShapFeatureImpact]
    # similar past events
    similar_events: List[ArticleWithReturnsOut]
