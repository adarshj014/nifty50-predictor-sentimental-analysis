import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const client = axios.create({ baseURL: BASE_URL, timeout: 15000 });

export const api = {
  getTickers: () => client.get("/stocks").then((r) => r.data),
  getPrices: (ticker, days = 180) =>
    client.get(`/stocks/${ticker}/prices`, { params: { days } }).then((r) => r.data),
  getSentiment: (ticker, days = 180) =>
    client.get(`/stocks/${ticker}/sentiment`, { params: { days } }).then((r) => r.data),
  getNews: (ticker, limit = 10) =>
    client.get(`/stocks/${ticker}/news`, { params: { limit } }).then((r) => r.data),
  getArticlesWithReturns: (ticker) =>
    client.get(`/stocks/${ticker}/articles-with-returns`).then((r) => r.data),
  getPrediction: (ticker) => client.get(`/predictions/${ticker}`).then((r) => r.data),
  getLivePrediction: (ticker, headline) =>
    client.post("/predictions/live", { ticker, headline }).then((r) => r.data),
  getModelComparison: () => client.get("/metrics/model-comparison").then((r) => r.data),
  getPerStockAccuracy: () => client.get("/metrics/per-stock-accuracy").then((r) => r.data),
  getDatasetStats: () => client.get("/metrics/dataset-stats").then((r) => r.data),
};

export default api;
