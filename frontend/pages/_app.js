import '../styles/globals.css';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Ensure light theme is applied
    document.documentElement.classList.remove('dark');
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;