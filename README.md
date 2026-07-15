# Nifty50 Sentiment Intelligence Platform: FinBERT + XGBoost Market Signals

## Introduction

Sentifty looks at financial news and stock prices together, and tries to
predict whether a Nifty 50 stock will go up or down. It reads news headlines
using FinBERT — an AI model trained specifically to understand financial
language, not just generic sentiment — combines that with technical price
indicators, and feeds it all into a machine learning model that makes the
final prediction.

I originally built this as a single messy Streamlit script. This is the
rebuilt version, done properly: a real backend, a real database, and a React
frontend, structured the way I'd actually want to build something like this
for a job, not just to make it work once and forget about it.

## Why this exists

I wanted a project that showed I could take an idea all the way from raw data
to something actually deployed and working — not just a notebook that trains
a model and stops there. I also didn't want to oversell what it does. A lot of
"AI predicts stocks" projects quietly hide how well they actually perform. I
didn't want to do that here. The Model Performance page shows the real
numbers, including that predicting 1-day price direction is only slightly
better than a coin flip — which honestly makes sense, since markets react to
news almost instantly. What's more interesting is that some individual stocks
perform noticeably better than others on big move days, which says something
real about how news affects different companies differently.

## App layout

- **Home** — pick any Nifty 50 stock and get a quick snapshot: last price,
  how positive or negative recent news has been, how much coverage it's
  getting, and a price chart.
- **Historical Analysis** — a deeper look at one stock: price movement next
  to its moving averages, a sentiment trend over time, how accurate the model
  actually is for that specific stock, and a searchable list of past articles
  along with what the stock actually did afterward.
- **Live Prediction** — paste in any headline for a stock, and it scores the
  sentiment live, pulls the stock's current price data, and runs the trained
  model to predict what might happen over the next 1 and 5 days — along with
  which factors drove that prediction.
- **Model Performance** — the honest report card: global and per-stock
  accuracy, dataset stats, and a plain-language limitations section instead
  of cherry-picked numbers.

## How I built the data pipeline

The news data itself came from a Kaggle dataset of Indian financial news
headlines spanning 2016 to 2026. I went through it and matched each headline
to the Nifty 50 stocks it was actually about, using a keyword list I built for
each company (ticker symbol, company name, common nicknames — since one
headline can mention more than one company, I split those into separate rows,
one per stock).

For prices, I pulled OHLCV data straight from Yahoo Finance for all 50 stocks,
then calculated the technical indicators myself on top of that — moving
averages, RSI, MACD, Bollinger Bands, and rolling returns.

Once both were in place, I ran every headline through FinBERT to score its
sentiment, and rolled those scores up into a daily sentiment summary per
stock (average, highest, lowest, how spread out the sentiment was that day,
and how many positive vs negative articles there were). Before trusting any
of it, I did a quick sanity check: do stocks with positive news actually go
up more often than stocks with negative news? They did — not by a huge
margin, but enough to know the data wasn't garbage before spending time
training models on it.

From there, I matched each day's sentiment to the next trading day's price
(accounting for weekends and holidays), engineered around 30 features
combining sentiment and technical signals, and trained the models on a
strict chronological split — meaning the model never sees the future when
it's learning from the past, which is an easy mistake to make if you're not
careful with time-series data. I trained one global model across all stocks,
and separately trained 50 individual per-stock models, but only on each
stock's "strong move" days, since that's where a model actually has a
reasonable chance of being useful.

One practical thing I learned the hard way: inserting 150,000 headlines into
the database one row at a time was on track to take almost a full day. Once I
switched to batched inserts, the same job finished in under 5 minutes.

## Backend

FastAPI serves historical price/sentiment/news data, pre-trained predictions,
and a live-prediction endpoint that pulls real-time price data, scores an
arbitrary headline with FinBERT on the spot, and runs it through the trained
XGBoost models — along with SHAP values explaining which factors actually
drove that specific prediction.

## Database design

Three tables in Postgres — `stock_prices`, `news_articles`, and
`daily_sentiment` — with indicators and daily aggregates pre-computed and
stored, rather than calculated fresh every time someone loads a page. The
schema is written as plain SQL (`schema.sql`), and mirrored with SQLAlchemy
models for the API side.

## Honest limitations & what I'd improve

- 1-day prediction accuracy is barely above random — it's shown plainly in
  the app, not hidden.
- The FinBERT model used here is the base pretrained version, not fine-tuned
  on Indian financial news specifically — that was out of scope for this
  rebuild.
- News sentiment skews positive overall (Nifty 50 companies just generate
  more good-news coverage), and I only partially corrected for this.
- Some stocks have thin news coverage, which makes their individual models
  less reliable than others.
- If I kept going: fine-tune FinBERT on Indian financial text specifically,
  add live news ingestion instead of relying on historical data only, and
  test more prediction horizons beyond 1-day and 5-day.

## Tech stack

**Backend:** FastAPI, SQLAlchemy, PostgreSQL (Supabase), XGBoost, FinBERT
(Transformers), SHAP, yfinance
**Pipeline:** Jupyter, pandas, psycopg2
**Frontend:** React, Vite, Recharts
