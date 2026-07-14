import os
import joblib
from functools import lru_cache

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ml_models")


@lru_cache(maxsize=1)
def load_models():
    """Loads trained model artifacts once at startup (cached).
    FinBERT fine-tuning is intentionally excluded for now — sentiment
    scores are read from the DB (already scored) rather than computed live.
    """
    models = {}

    def _try_load(key, filename):
        path = os.path.join(MODELS_DIR, filename)
        if os.path.exists(path):
            models[key] = joblib.load(path)

    _try_load("clf_1d", "xgb_clf_1d.pkl")
    _try_load("clf_5d", "xgb_clf_5d.pkl")
    _try_load("reg_1d", "xgb_reg_1d.pkl")
    _try_load("reg_5d", "xgb_reg_5d.pkl")
    _try_load("features", "features.pkl")
    _try_load("comparison", "model_comparison.pkl")
    _try_load("per_stock_1d", "per_stock_1d_results.pkl")
    _try_load("per_stock_5d", "per_stock_5d_results.pkl")

    return models
