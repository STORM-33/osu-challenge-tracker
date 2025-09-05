import '../styles/globals.css';
import { AuthProvider } from '../lib/AuthContext';
import { SettingsProvider } from '../lib/SettingsContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from '../components/ErrorBoundary';

function MyApp({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SettingsProvider>
          <Component {...pageProps} />
          <Toaster 
            position="bottom-right"
            toastOptions={{
              className: 'glass-2 text-white font-medium',
              style: {
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              },
              duration: 4000,
            }}
          />
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default MyApp;