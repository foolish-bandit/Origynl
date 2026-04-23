import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { Home } from './pages/Home';
import { Certify } from './pages/Certify';
import { Verify } from './pages/Verify';
import { Capture } from './pages/Capture';
import { Proof } from './pages/Proof';

const App: React.FC = () => (
  <ErrorBoundary>
    <Router>
      <Layout>
        <OfflineBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/certify" element={<Certify />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/proof/:id" element={<Proof />} />
        </Routes>
      </Layout>
    </Router>
  </ErrorBoundary>
);

export default App;
