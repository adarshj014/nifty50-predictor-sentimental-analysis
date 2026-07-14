from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
import pandas as pd

from app.core.database import get_db
from app.core.ml_loader import load_models
from app.core.finbert_loader import score_headline
from app.core.live_features import fetch_live_features
from app.models.models import StockPrice, DailySentiment
from app.schemas.schemas import PredictionOut, LivePredictionRequest, LivePredictionOut, ShapFeatureImpact, ArticleWithReturnsOut

router = APIRouter(prefix="/predictions", tags=["predictions"])


def _build_feature_row(ticker: str, db: Session, feature_names: list) -> dict:
    """Assembles the latest feature vector for a ticker from stock_prices +
    daily_sentiment, keyed by whatever names the trained model expects
    (features.pkl). Missing fields are filled with 0.0 rather than failing,
    since not every deployment will have every feature source populated."""
    price = (
        db.query(StockPrice)
        .filter(StockPrice.ticker == ticker)
        .order_by(StockPrice.date.desc())
        .first()
    )
    sentiment = (
        db.query(DailySentiment)
        .filter(DailySentiment.ticker == ticker)
        .order_by(DailySentiment.date.desc())
        .first()
    )
    if not price:
        return None

    available = {}
    available.update({k: v for k, v in vars(price).items() if not k.startswith("_")})
    if sentiment:
        available.update({k: v for k, v in vars(sentiment).items() if not k.startswith("_")})

    return {name: float(available.get(name) or 0.0) for name in feature_names}


@router.get("/{ticker}", response_model=PredictionOut)
def predict(ticker: str, db: Session = Depends(get_db)):
    models = load_models()
    required = ["clf_1d", "clf_5d", "features"]
    missing = [k for k in required if k not in models]
    if missing:
        raise HTTPException(
            status_code=503,
            detail=f"Model artifacts not loaded: {missing}. "
                   f"Run 'git lfs pull' in the repo and confirm ml_models/ is populated.",
        )

    feature_row = _build_feature_row(ticker, db, models["features"])
    if feature_row is None:
        raise HTTPException(status_code=404, detail=f"No price data for {ticker} to build features from")

    X = pd.DataFrame([feature_row])[models["features"]]

    clf_1d, clf_5d = models["clf_1d"], models["clf_5d"]
    pred_1d = clf_1d.predict(X)[0]
    proba_1d = max(clf_1d.predict_proba(X)[0])
    pred_5d = clf_5d.predict(X)[0]
    proba_5d = max(clf_5d.predict_proba(X)[0])

    reg_1d = models.get("reg_1d")
    reg_5d = models.get("reg_5d")

    return PredictionOut(
        ticker=ticker,
        direction_1d="up" if pred_1d == 1 else "down",
        confidence_1d=round(float(proba_1d), 4),
        direction_5d="up" if pred_5d == 1 else "down",
        confidence_5d=round(float(proba_5d), 4),
        predicted_return_1d=round(float(reg_1d.predict(X)[0]), 3) if reg_1d is not None else None,
        predicted_return_5d=round(float(reg_5d.predict(X)[0]), 3) if reg_5d is not None else None,
    )


@router.post("/live", response_model=LivePredictionOut)
def predict_live(request: LivePredictionRequest, db: Session = Depends(get_db)):
    """Ported from the original 2_Live_Prediction.py: takes a ticker + a
    headline, pulls live yfinance technical data, scores the headline with
    FinBERT, and runs the trained XGBoost models to produce a 1-day and
    5-day directional prediction — plus a SHAP explanation and similar past
    articles with the same sentiment label."""
    models = load_models()
    required = ["clf_1d", "clf_5d", "reg_1d", "reg_5d", "features"]
    missing = [k for k in required if k not in models]
    if missing:
        raise HTTPException(
            status_code=503,
            detail=f"Model artifacts not loaded: {missing}. Run notebook 04 first.",
        )

    live_data = fetch_live_features(request.ticker)
    if live_data is None:
        raise HTTPException(status_code=404, detail=f"Could not fetch live data for {request.ticker}")

    sentiment_result = score_headline(request.headline)

    feature_values = {
        "avg_compound_centered": sentiment_result["compound"],
        "sentiment_3d_centered": sentiment_result["compound"],
        "sentiment_momentum": 0,
        "article_count": 1,
        "positive_count": 1 if sentiment_result["label"] == "positive" else 0,
        "negative_count": 1 if sentiment_result["label"] == "negative" else 0,
        "max_compound": sentiment_result["compound"],
        "min_compound": sentiment_result["compound"],
        "std_compound": 0,
        "rsi": live_data["rsi"],
        "rsi_oversold": 1 if live_data["rsi"] < 30 else 0,
        "rsi_overbought": 1 if live_data["rsi"] > 70 else 0,
        "price_above_dma20": 1 if live_data["close_price"] > live_data["dma_20"] else 0,
        "price_above_dma50": 1 if live_data["close_price"] > live_data["dma_50"] else 0,
        "dma20_above_dma50": 1 if live_data["dma_20"] > live_data["dma_50"] else 0,
        "volume_spike": live_data["volume_spike"],
        "macd": live_data["macd"],
        "macd_signal": live_data["macd_signal"],
        "macd_hist": live_data["macd_hist"],
        "macd_bullish": 1 if live_data["macd"] > live_data["macd_signal"] else 0,
        "macd_bearish": 1 if live_data["macd"] < live_data["macd_signal"] else 0,
        "bb_position": live_data["bb_position"],
        "bb_oversold": 1 if live_data["bb_position"] < 0.2 else 0,
        "bb_overbought": 1 if live_data["bb_position"] > 0.8 else 0,
        "return_1d": live_data["return_1d"],
        "return_3d": live_data["return_3d"],
        "return_5d": live_data["return_5d"],
        "pct_from_20d_high": live_data["pct_from_20d_high"],
        "pct_from_20d_low": live_data["pct_from_20d_low"],
    }

    model_features = models["features"]
    feature_row = pd.DataFrame([feature_values])
    for col in model_features:
        if col not in feature_row.columns:
            feature_row[col] = 0
    feature_row = feature_row[model_features]

    dir_1d = models["clf_1d"].predict(feature_row)[0]
    prob_1d = max(models["clf_1d"].predict_proba(feature_row)[0])
    pct_1d = models["reg_1d"].predict(feature_row)[0]

    dir_5d = models["clf_5d"].predict(feature_row)[0]
    prob_5d = max(models["clf_5d"].predict_proba(feature_row)[0])
    pct_5d = models["reg_5d"].predict(feature_row)[0]

    top_factors = []
    try:
        import shap
        explainer = shap.TreeExplainer(models["clf_1d"])
        shap_values = explainer.shap_values(feature_row)
        shap_row = shap_values[0] if hasattr(shap_values, "__len__") else shap_values
        shap_df = pd.DataFrame({"feature": model_features, "impact": shap_row})
        shap_df = shap_df.reindex(shap_df["impact"].abs().sort_values(ascending=False).index).head(10)
        top_factors = [ShapFeatureImpact(feature=r["feature"], impact=round(float(r["impact"]), 4))
                       for _, r in shap_df.iterrows()]
    except Exception:
        top_factors = []

    similar_query = text("""
        SELECT published_at, content, sentiment_label, sentiment_compound, source, url
        FROM news_articles
        WHERE ticker = :ticker AND sentiment_label = :label
        ORDER BY published_at DESC
        LIMIT 5
    """)
    similar_rows = db.execute(similar_query, {"ticker": request.ticker, "label": sentiment_result["label"]})
    similar_events = [ArticleWithReturnsOut(**dict(row._mapping)) for row in similar_rows]

    return LivePredictionOut(
        ticker=request.ticker,
        close_price=round(live_data["close_price"], 2),
        rsi=round(live_data["rsi"], 2),
        macd_bullish=live_data["macd"] > live_data["macd_signal"],
        return_1d=round(live_data["return_1d"], 2),
        sentiment_label=sentiment_result["label"],
        sentiment_score=sentiment_result["score"],
        sentiment_compound=sentiment_result["compound"],
        direction_1d="up" if dir_1d == 1 else "down",
        confidence_1d=round(float(prob_1d), 4),
        expected_move_1d=round(float(pct_1d), 3),
        direction_5d="up" if dir_5d == 1 else "down",
        confidence_5d=round(float(prob_5d), 4),
        expected_move_5d=round(float(pct_5d), 3),
        top_factors=top_factors,
        similar_events=similar_events,
    )
