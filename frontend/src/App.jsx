
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';

import ErrorBoundary from './components/ErrorBoundary';
import Nav from './components/Nav';

function Home() {
  return <div style={{padding: 40, fontSize: 24}}>Hello from Home route!</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Nav />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
