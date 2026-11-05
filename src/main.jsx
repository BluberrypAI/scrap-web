import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installHashRouting } from './lib/router.js';
import './styles/global.css';
import { App } from './App.jsx';

installHashRouting();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
