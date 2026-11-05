import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { PreferencesProvider } from './common/preferences/PreferencesContext.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PreferencesProvider>
      <App />
    </PreferencesProvider>
  </React.StrictMode>,
);
