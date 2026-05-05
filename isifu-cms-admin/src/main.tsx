import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './theme';
import './styles.css';

const slug = import.meta.env.VITE_ADMIN_SLUG || 'admin-xyz';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter basename={`/${slug}`}>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
