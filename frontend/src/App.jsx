import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import HistoricalAnalysis from "./pages/HistoricalAnalysis";
import LivePrediction from "./pages/LivePrediction";
import ModelPerformance from "./pages/ModelPerformance";

export default function App() {
  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/historical" element={<HistoricalAnalysis />} />
        <Route path="/live-prediction" element={<LivePrediction />} />
        <Route path="/model-performance" element={<ModelPerformance />} />
      </Routes>
    </div>
  );
}
