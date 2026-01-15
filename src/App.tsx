import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Calculator from './pages/Calculator';
import ScannerResults from './pages/ScannerResults';
import Nasdaq100Results from './pages/Nasdaq100Results';
import MidCap400Results from './pages/MidCap400Results';
import IVRankings from './pages/IVRankings';
import TradeTracker from './pages/TradeTracker';
import EarningsCrush from './pages/EarningsCrush';
import EarningsCrushTrades from './pages/EarningsCrushTrades';
import PreEarningsStraddles from './pages/PreEarningsStraddles';
import PreEarningsTrades from './pages/PreEarningsTrades';
import TurtleSuggested from './pages/TurtleSuggested';
import TurtleOpenTrades from './pages/TurtleOpenTrades';
import TurtleTriggers from './pages/TurtleTriggers';
import TurtleSignals from './pages/TurtleSignals';
import GrailTrade from './pages/GrailTrade';
import logo from './assets/IMG_5896.jpg';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Navigation />
          
          <Routes>
            <Route path="/" element={<Navigate to="/trade-tracker" replace />} />
            <Route path="/nasdaq100" element={<Nasdaq100Results />} />
            <Route path="/midcap400" element={<MidCap400Results />} />
            <Route path="/iv-rankings" element={<IVRankings />} />

            <Route path="/turtle" element={<TurtleSuggested />} />
            <Route path="/turtle/signals" element={<TurtleSignals />} />
            <Route path="/turtle/open-trades" element={<TurtleOpenTrades />} />
            <Route path="/turtle/triggers" element={<TurtleTriggers />} />

            <Route path="/grail" element={<GrailTrade />} />

            <Route path="/pre-earnings" element={<PreEarningsStraddles />} />
            <Route path="/pre-earnings/open-trades" element={<PreEarningsTrades />} />

            <Route path="/earnings-crush" element={<EarningsCrush />} />
            <Route path="/earnings-crush/trades" element={<EarningsCrushTrades />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/trade-tracker" element={<TradeTracker />} />
          </Routes>
          
          <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>© 2025 @ozcta. For educational purposes only. Questions? Contact me on X.</p>
          </footer>
        </div>

        {/* Floating Profile Badge */}
        <a
          href="https://x.com/OzCTA"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 group"
          title="Follow @OzCTA on X"
        >
          <div className="relative">
            <img
              src={logo}
              alt="OzCTA"
              className="w-16 h-16 rounded-full object-cover border-3 border-slate-300 dark:border-slate-600 shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl"
            />
            <div className="absolute inset-0 rounded-full bg-slate-900 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-slate-900 dark:bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
              X
            </div>
          </div>
        </a>
      </div>
    </Router>
  );
}

export default App;
