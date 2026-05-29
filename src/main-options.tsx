import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OptionsPage } from './pages/OptionsPage';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OptionsPage />
  </StrictMode>
);
