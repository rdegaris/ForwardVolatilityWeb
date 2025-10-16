import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Calculator from './pages/Calculator';
import ScannerResults from './pages/ScannerResults';
import Nasdaq100Results from './pages/Nasdaq100Results';
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
            <Route path="/calculator" element={<Calculator />} />
          </Routes>
          
          <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>© 2025 @ozcta. For educational purposes only. Questions? Contact me on X.</p>
          </footer>
        </div>
      </div>
    </Router>
  );
}

export default App;
