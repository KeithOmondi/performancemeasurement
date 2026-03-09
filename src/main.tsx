import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast'; // Import the Toaster
import App from './App';
import './index.css'; 
import { store } from './store/store';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      {/* 🔹 Add Toaster here */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#334155',
            color: '#fff',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#eab308', // Matches your yellow theme
              secondary: '#fff',
            },
          },
        }}
      />
      <App />
    </Provider>
  </React.StrictMode>
);