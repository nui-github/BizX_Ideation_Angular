import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DesignProcessPage } from './components/DesignProcessPage';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// /design-process is a standalone page with no menu entry in the app — it's reached by typing the
// URL. Everything else is the normal app (App.tsx handles its own sub-routes like /ocr-turning).
const isDesignProcessPage = window.location.pathname.replace(/\/+$/, '') === '/design-process';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isDesignProcessPage ? <DesignProcessPage /> : <App />}
  </React.StrictMode>
);
