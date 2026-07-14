from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.core.database import get_db
from app.core.ml_loader import load_models
from app.models.models import DailySentiment
from app.schemas.schemas import ModelComparisonOut, PerStockAccuracyOut, DatasetStatsOut

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/model-comparison", response_model=List[ModelComparisonOut])
def model_comparison():
    models = load_models()
    comparison = models.get("comparison", {})
    return [
        ModelComparisonOut(model_name=name, accuracy=round(float(acc) * 100, 2))
        for name, acc in comparison.items()
    ]


@router.get("/per-stock-accuracy", response_model=List[PerStockAccuracyOut])
def per_stock_accuracy():
    models = load_models()
    r1d = models.get("per_stock_1d", {})
    r5d = models.get("per_stock_5d", {})
    tickers = set(r1d.keys()) | set(r5d.keys())

    out = []
    for t in sorted(tickers):
        out.append(PerStockAccuracyOut(
            ticker=t,
            accuracy_1d=round(float(r1d[t]["accuracy"]) * 100, 2) if t in r1d else None,
            accuracy_5d=round(float(r5d[t]["accuracy"]) * 100, 2) if t in r5d else None,
            rows_1d=int(r1d[t]["rows"]) if t in r1d else None,
            rows_5d=int(r5d[t]["rows"]) if t in r5d else None,
        ))
    return out


@router.get("/dataset-stats", response_model=DatasetStatsOut)
def dataset_stats(db: Session = Depends(get_db)):
    total_news_days = db.query(func.count(DailySentiment.id)).scalar() or 0
    stocks_covered = db.query(func.count(func.distinct(DailySentiment.ticker))).scalar() or 0
    return DatasetStatsOut(total_news_days=total_news_days, stocks_covered=stocks_covered)
