import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './lib/authContext';
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

import TurtleOpenTrades from './pages/TurtleOpenTrades';
import TurtleTriggers from './pages/TurtleTriggers';
import TurtleSignals from './pages/TurtleSignals';
import GrailTrade from './pages/GrailTrade';
import OdidBreakout from './pages/OdidBreakout';
import Home from './pages/Home';
import FundPerformance from './pages/FundPerformance';
import Register from './pages/Register';
import Login from './pages/Login';
import CreatePassword from './pages/CreatePassword';
import ForgotPassword from './pages/ForgotPassword';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Navigation />
          
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/nasdaq100" element={<ProtectedRoute><Nasdaq100Results /></ProtectedRoute>} />
            <Route path="/midcap400" element={<ProtectedRoute><MidCap400Results /></ProtectedRoute>} />
            <Route path="/iv-rankings" element={<ProtectedRoute><IVRankings /></ProtectedRoute>} />

            <Route path="/turtle" element={<ProtectedRoute><TurtleSignals /></ProtectedRoute>} />
            <Route path="/turtle/open-trades" element={<ProtectedRoute><TurtleOpenTrades /></ProtectedRoute>} />
            <Route path="/turtle/triggers" element={<ProtectedRoute><TurtleTriggers /></ProtectedRoute>} />

            <Route path="/grail" element={<ProtectedRoute><GrailTrade /></ProtectedRoute>} />
            <Route path="/odid" element={<ProtectedRoute><OdidBreakout /></ProtectedRoute>} />

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
          
          <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>© 2025 @ozcta. For educational purposes only. Questions? Contact me on X.</p>
          </footer>
        </div>

        {/* Floating Social Links */}
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <a
            href="https://x.com/OzCTA"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
            title="Follow @OzCTA on X"
            aria-label="Follow @OzCTA on X"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-12 w-12 text-slate-900 dark:text-slate-100 transition-transform duration-300 group-hover:scale-110"
              fill="currentColor"
            >
              <path d="M18.244 2H21.5l-7.11 8.128L22.75 22h-6.543l-5.12-6.7L5.2 22H1.94l7.605-8.69L1.5 2h6.708l4.628 6.11L18.244 2Zm-1.143 18.035h1.804L7.264 3.861H5.329l11.772 16.174Z" />
            </svg>
          </a>

          <a
            href="https://discord.gg/dZYZCeAbK"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
            title="Join OzCTA on Discord"
            aria-label="Join OzCTA on Discord"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-12 w-12 text-slate-900 dark:text-slate-100 transition-transform duration-300 group-hover:scale-110"
              fill="currentColor"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.249.077.077 0 0 0-.08-.037A19.736 19.736 0 0 0 3.68 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.027c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.105 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.1.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.04.106c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .031-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.211 0 2.176 1.094 2.157 2.418 0 1.334-.955 2.419-2.157 2.419Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.211 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419Z" />
            </svg>
          </a>
        </div>
      </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
