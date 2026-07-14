from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import stocks, predictions, metrics

app = FastAPI(
    title="Nifty50 Sentiment Predictor API",
    description="FinBERT sentiment + XGBoost direction prediction for Nifty 50 stocks",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # add prod frontend URL after deploy
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks.router)
app.include_router(predictions.router)
app.include_router(metrics.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "nifty50-sentiment-predictor-api"}


@app.get("/health")
def health():
    return {"status": "healthy"}
