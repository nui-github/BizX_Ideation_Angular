import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DesignProcessPage } from './components/DesignProcessPage';
import { DocsPage } from './components/DocsPage';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// /design-process and /docs are standalone pages with no menu entry in the app — they are reached by
// typing the URL. Everything else is the normal app (App.tsx handles its own sub-routes like /ocr-turning).
const path = window.location.pathname.replace(/\/+$/, '');
const isDesignProcessPage = path === '/design-process';
const isDocsPage = path === '/docs';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isDesignProcessPage ? <DesignProcessPage /> : isDocsPage ? <DocsPage /> : <App />}
  </React.StrictMode>
);
