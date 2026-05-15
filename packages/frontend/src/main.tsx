// main.tsx
// Application entry point. Boots i18next then renders the router.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/globals.css';
import './i18n';
import { App } from './App';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root is missing from index.html');
}

// `import.meta.env.BASE_URL` is derived from Vite's `base` config (e.g. "/happycash/").
// React Router expects a basename without a trailing slash.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
