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
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default MyApp;