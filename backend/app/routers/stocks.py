from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import distinct, text
from typing import List

from app.core.database import get_db
from app.models.models import StockPrice, DailySentiment, NewsArticle
from app.schemas.schemas import StockPriceOut, DailySentimentOut, NewsArticleOut, ArticleWithReturnsOut

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("", response_model=List[str])
def list_tickers(db: Session = Depends(get_db)):
    rows = db.query(distinct(StockPrice.ticker)).order_by(StockPrice.ticker).all()
    tickers = [r[0] for r in rows]
    if not tickers:
        raise HTTPException(status_code=404, detail="No tickers found — has the DB been seeded?")
    return tickers


@router.get("/{ticker}/prices", response_model=List[StockPriceOut])
def get_prices(ticker: str, days: int = Query(180, le=1000), db: Session = Depends(get_db)):
    rows = (
        db.query(StockPrice)
        .filter(StockPrice.ticker == ticker)
        .order_by(StockPrice.date.desc())
        .limit(days)
        .all()
    )
    if not rows:
        raise HTTPException(status_code=404, detail=f"No price data for {ticker}")
    return list(reversed(rows))


@router.get("/{ticker}/sentiment", response_model=List[DailySentimentOut])
def get_sentiment(ticker: str, days: int = Query(180, le=1000), db: Session = Depends(get_db)):
    rows = (
        db.query(DailySentiment)
        .filter(DailySentiment.ticker == ticker)
        .order_by(DailySentiment.date.desc())
        .limit(days)
        .all()
    )
    if not rows:
        raise HTTPException(status_code=404, detail=f"No sentiment data for {ticker}")
    return list(reversed(rows))


@router.get("/{ticker}/news", response_model=List[NewsArticleOut])
def get_news(ticker: str, limit: int = Query(10, le=100), db: Session = Depends(get_db)):
    rows = (
        db.query(NewsArticle)
        .filter(NewsArticle.ticker == ticker)
        .order_by(NewsArticle.published_at.desc())
        .limit(limit)
        .all()
    )
    return rows


@router.get("/{ticker}/articles-with-returns", response_model=List[ArticleWithReturnsOut])
def get_articles_with_returns(ticker: str, db: Session = Depends(get_db)):
    """Ported exactly from the original app_utils/db.py get_articles_with_returns():
    for each article, finds the closing price on/after the news date (base),
    the next trading day's close (1D return), and the 5th trading day's close
    (5D return)."""
    query = text("""
        WITH article_dates AS (
            SELECT
                n.id, n.published_at, n.content, n.sentiment_label,
                n.sentiment_compound, n.source, n.url,
                DATE(n.published_at) AS news_date
            FROM news_articles n
            WHERE n.ticker = :ticker
              AND n.sentiment_label IS NOT NULL
        ),
        base_prices AS (
            SELECT a.id, MIN(sp.date) AS base_date
            FROM article_dates a
            JOIN stock_prices sp ON sp.ticker = :ticker AND sp.date >= a.news_date
            GROUP BY a.id
        ),
        next_prices AS (
            SELECT bp.id, MIN(sp.date) AS next_date
            FROM base_prices bp
            JOIN stock_prices sp ON sp.ticker = :ticker AND sp.date > bp.base_date
            GROUP BY bp.id
        ),
        fifth_prices AS (
            SELECT bp.id,
                (SELECT sp2.date FROM stock_prices sp2
                 WHERE sp2.ticker = :ticker AND sp2.date > bp.base_date
                 ORDER BY sp2.date LIMIT 1 OFFSET 4) AS fifth_date
            FROM base_prices bp
        )
        SELECT
            a.published_at, a.content, a.sentiment_label, a.sentiment_compound,
            a.source, a.url,
            ROUND(((p_next.close_price - p_base.close_price) / NULLIF(p_base.close_price, 0) * 100)::numeric, 2) AS return_1d,
            ROUND(((p_5d.close_price - p_base.close_price) / NULLIF(p_base.close_price, 0) * 100)::numeric, 2) AS return_5d
        FROM article_dates a
        JOIN base_prices bp ON a.id = bp.id
        JOIN next_prices np ON a.id = np.id
        JOIN fifth_prices fp ON a.id = fp.id
        LEFT JOIN stock_prices p_base ON p_base.ticker = :ticker AND p_base.date = bp.base_date
        LEFT JOIN stock_prices p_next ON p_next.ticker = :ticker AND p_next.date = np.next_date
        LEFT JOIN stock_prices p_5d ON p_5d.ticker = :ticker AND p_5d.date = fp.fifth_date
        ORDER BY a.published_at DESC
        LIMIT 200
    """)
    result = db.execute(query, {"ticker": ticker})
    return [dict(row._mapping) for row in result]
