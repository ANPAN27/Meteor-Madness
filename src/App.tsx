import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Landing } from './components/Landing';
import { Dashboard } from './Dashboard';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}
