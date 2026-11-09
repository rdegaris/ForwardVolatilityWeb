import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './lib/authContext';
import Calculator from './pages/Calculator';
import Nasdaq100Results from './pages/Nasdaq100Results';
import MidCap400Results from './pages/MidCap400Results';
import IVRankings from './pages/IVRankings';
import TradeTracker from './pages/TradeTracker';
import EarningsCrush from './pages/EarningsCrush';
import EarningsCrushTrades from './pages/EarningsCrushTrades';
import PreEarningsStraddles from './pages/PreEarningsStraddles';
import PreEarningsTrades from './pages/PreEarningsTrades';

import TurtleOpenTrades from './pages/TurtleOpenTrades';
import TurtleTriggers from './pages/TurtleTriggers';
import TurtleSignals from './pages/TurtleSignals';
import GrailTrade from './pages/GrailTrade';
import OdidBreakout from './pages/OdidBreakout';
import TaylorTrade from './pages/TaylorTrade';
import LindaTrade from './pages/LindaTrade';
import Home from './pages/Home';
import ExecutedTrades from './pages/ExecutedTrades';
import ScanRunner from './pages/ScanRunner';
import FundPerformance from './pages/FundPerformance';
import Register from './pages/Register';
import Login from './pages/Login';
import CreatePassword from './pages/CreatePassword';
import ForgotPassword from './pages/ForgotPassword';
import { ArrowUpRightIcon } from './components/Icons';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-desk-bg text-desk-text flex flex-col">
          <Navigation />

          <main className="flex-1 w-full max-w-[1520px] mx-auto px-6 md:px-8 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/executed-trades" element={<ProtectedRoute><ExecutedTrades /></ProtectedRoute>} />
              <Route path="/paper-trades" element={<ProtectedRoute><ExecutedTrades /></ProtectedRoute>} />
              <Route path="/scan-runner" element={<ProtectedRoute><ScanRunner /></ProtectedRoute>} />
              <Route path="/admin/runner" element={<ProtectedRoute><ScanRunner /></ProtectedRoute>} />
              <Route path="/nasdaq100" element={<ProtectedRoute><Nasdaq100Results /></ProtectedRoute>} />
              <Route path="/midcap400" element={<ProtectedRoute><MidCap400Results /></ProtectedRoute>} />
              <Route path="/iv-rankings" element={<ProtectedRoute><IVRankings /></ProtectedRoute>} />

              <Route path="/trendorama" element={<ProtectedRoute><TurtleSignals /></ProtectedRoute>} />
              <Route path="/trendorama/open-trades" element={<ProtectedRoute><TurtleOpenTrades /></ProtectedRoute>} />
              <Route path="/trendorama/triggers" element={<ProtectedRoute><TurtleTriggers /></ProtectedRoute>} />
              <Route path="/turtle" element={<ProtectedRoute><TurtleSignals /></ProtectedRoute>} />
              <Route path="/turtle/open-trades" element={<ProtectedRoute><TurtleOpenTrades /></ProtectedRoute>} />

              <Route path="/grail" element={<ProtectedRoute><GrailTrade /></ProtectedRoute>} />
              <Route path="/odid" element={<ProtectedRoute><OdidBreakout /></ProtectedRoute>} />
              <Route path="/taylor" element={<ProtectedRoute><TaylorTrade /></ProtectedRoute>} />
              <Route path="/linda" element={<LindaTrade />} />

              <Route path="/pre-earnings" element={<ProtectedRoute><PreEarningsStraddles /></ProtectedRoute>} />
              <Route path="/pre-earnings/open-trades" element={<ProtectedRoute><PreEarningsTrades /></ProtectedRoute>} />

              <Route path="/earnings-crush" element={<ProtectedRoute><EarningsCrush /></ProtectedRoute>} />
              <Route path="/earnings-crush/trades" element={<ProtectedRoute><EarningsCrushTrades /></ProtectedRoute>} />
              <Route path="/calculator" element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
              <Route path="/trade-tracker" element={<ProtectedRoute><TradeTracker /></ProtectedRoute>} />
              <Route path="/fund" element={<FundPerformance />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/create-password" element={<CreatePassword />} />
            </Routes>
          </main>

          <footer className="border-t border-hairline bg-desk-deep mt-16">
            <div className="max-w-[1520px] mx-auto px-6 md:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-desk-muted">
              <div className="space-y-1">
                <p className="text-desk-secondary">
                  © {new Date().getFullYear()} OzCTA · NFA-registered Commodity Trading Advisor
                </p>
                <p>
                  Published signals and hypothetical ledger records are for research and educational reference only, not solicitation or individualized advice.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-5 shrink-0">
                <Link to="/fund" className="text-desk-secondary hover:text-desk-text transition-colors duration-150 ease-desk">
                  Program profile
                </Link>
                <a
                  href="https://x.com/OzCTA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-desk-secondary hover:text-desk-text transition-colors duration-150 ease-desk"
                >
                  X (@OzCTA)
                  <ArrowUpRightIcon className="w-3.5 h-3.5 text-desk-muted" />
                </a>
                <a
                  href="https://discord.gg/W3G2TpJQvP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-desk-secondary hover:text-desk-text transition-colors duration-150 ease-desk"
                >
                  Discord
                  <ArrowUpRightIcon className="w-3.5 h-3.5 text-desk-muted" />
                </a>
              </div>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
