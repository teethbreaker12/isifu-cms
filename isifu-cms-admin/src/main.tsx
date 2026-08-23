import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { ToastProvider } from './components/Toast';
import { ThemeProvider } from './theme';
import './styles.css';

const slug = (import.meta.env.VITE_ADMIN_SLUG || 'admin').replace(/^\/+|\/+$/g, '');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter basename={`/${slug}`}>
          <App />
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
);
