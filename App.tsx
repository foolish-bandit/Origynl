
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Certify } from './pages/Certify';
import { Verify } from './pages/Verify';
import { Capture } from './pages/Capture';
import { Demo } from './pages/Demo';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/certify" element={<Certify />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/demo" element={<Demo />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
