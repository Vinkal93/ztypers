import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SuperAdminProvider } from './context/SuperAdminContext';
import { GlobalSettingsProvider } from './context/GlobalSettingsContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <SuperAdminProvider>
            <GlobalSettingsProvider>
              <App />
            </GlobalSettingsProvider>
          </SuperAdminProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
