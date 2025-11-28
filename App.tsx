
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Certify } from './pages/Certify';
import { Verify } from './pages/Verify';
import { Capture } from './pages/Capture';
import { Batch } from './pages/Batch';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/certify" element={<Certify />} />
          <Route path="/batch" element={<Batch />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/capture" element={<Capture />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
