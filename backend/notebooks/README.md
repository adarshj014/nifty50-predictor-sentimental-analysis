# Pipeline Notebooks

Run these **in order**, from inside this `notebooks/` folder (so the relative
paths `../utils`, `../ml_models`, `../app` resolve correctly):

1. **01_fetch_prices.ipynb** — pulls OHLCV + technical indicators from
   `yfinance` for all Nifty50 tickers, upserts into `stock_prices`.
2. **02_fetch_news.ipynb** — loads `data/nifty50_news_final.csv` (your
   recovered, already ticker-matched news dataset), explodes multi-ticker
   rows, inserts into `news_articles`.
3. **03_score_sentiment_and_combine.ipynb** — scores every unscored article
   with FinBERT, aggregates into `daily_sentiment`, and does a sentiment/price
   signal sanity check.
4. **04_train_models.ipynb** — merges prices + sentiment, engineers features,
   trains all models (baselines, XGBoost binary/3-class/regression, per-stock
   models), saves everything to `../ml_models/`.

## Setup

```bash
cd backend
python -m venv venv          # if you haven't already, from the main setup
venv\Scripts\activate         # Windows
pip install -r notebooks/requirements-notebooks.txt
cd notebooks
jupyter notebook
```

Make sure `backend/.env` has your `DATABASE_URL` set (same one the FastAPI
app uses) before running any notebook — `utils/db.py` reads from it.

## Notes

- All 4 are safe to re-run: prices upsert, news/sentiment insertion skips
  already-seeded tickers/dates, and model training just overwrites the
  `.pkl` files in `../ml_models/`.
- `02_fetch_news.ipynb` uses the recovered CSV rather than a fresh raw dump,
  since the original raw source predates ticker-matching and wasn't
  recoverable. If you get a fresh raw news dump later, the original
  keyword-matching logic can be re-added as a step before this one.
- Fine-tuning FinBERT on Indian financial news is intentionally out of scope
  right now — `utils/finbert.py` automatically uses the base
  `ProsusAI/finbert` model. Swapping in a fine-tuned model later requires
  no changes to notebook 3 or 4.
- After notebook 4 finishes, restart the FastAPI backend
  (`uvicorn app.main:app --reload`) so it picks up the freshly trained models.
