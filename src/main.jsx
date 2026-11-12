import { createRoot } from 'react-dom/client';
import { installHashRouting } from './lib/router.js';
import './styles/global.css';
import { App } from './App.jsx';

installHashRouting();

// The WebGL meadow owns an explicit setup/dispose lifecycle. Avoid React's
// development-only StrictMode double mount, which builds the full scene twice.
createRoot(document.getElementById('root')).render(<App />);
