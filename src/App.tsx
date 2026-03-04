import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './hooks/useToast';
import { ToastContainer } from './components/ToastContainer';
import { Home } from './pages/Home';
import { Setup } from './pages/Setup';
import { Measure } from './pages/Measure';
import { Results } from './pages/Results';

function App() {
  const baseUrl = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

  return (
    <Router basename={baseUrl} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/measure" element={<Measure />} />
          <Route path="/results" element={<Results />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </ToastProvider>
    </Router>
  );
}

export default App;
