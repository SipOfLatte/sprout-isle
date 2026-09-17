import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/pixelify-sans/500.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles/app.css';
import App from './App';
import { FxProvider } from './state/fx';
import { StoreProvider } from './state/store';

// Dev-only: `?demo` seeds sample data into an empty browser for screenshots.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) {
  const { seedDemo } = await import('./lib/demo');
  seedDemo();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <FxProvider>
        <App />
      </FxProvider>
    </StoreProvider>
  </StrictMode>,
);
