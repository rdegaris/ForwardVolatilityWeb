import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Calculator from './pages/Calculator';
import ScannerResults from './pages/ScannerResults';
import Nasdaq100Results from './pages/Nasdaq100Results';
import MidCap400Results from './pages/MidCap400Results';
import IVRankings from './pages/IVRankings';
import logo from './assets/IMG_5896.jpg';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Navigation />
          
          <Routes>
            <Route path="/" element={<ScannerResults />} />
            <Route path="/nasdaq100" element={<Nasdaq100Results />} />
            <Route path="/midcap400" element={<MidCap400Results />} />
            <Route path="/iv-rankings" element={<IVRankings />} />
            <Route path="/calculator" element={<Calculator />} />
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
              className="w-16 h-16 rounded-full object-cover border-3 border-blue-500 dark:border-blue-400 shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl"
            />
            <div className="absolute inset-0 rounded-full bg-blue-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
              X
            </div>
          </div>
        </a>
      </div>
    </Router>
  );
}

export default App;
