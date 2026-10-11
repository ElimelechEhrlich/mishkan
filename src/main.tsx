import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerAppUpdates } from './lib/pwa';
import './index.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Root element #root was not found in index.html');
}

registerAppUpdates();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
