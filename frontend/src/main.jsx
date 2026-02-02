import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// Force rebuild - updated 2026-02-02
const App = () => {
  return React.createElement('div', { className: 'min-h-screen flex items-center justify-center' },
    React.createElement('h1', { className: 'text-2xl' }, 'Security Dashboard - Test')
  );
};

createRoot(document.getElementById("root")).render(React.createElement(App));
