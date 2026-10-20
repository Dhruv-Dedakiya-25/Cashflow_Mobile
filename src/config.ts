import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Demo mode shows sample data and never calls the server; live mode talks to the CashFlow API.
 * Both are fixed when the app is built, like VITE_AUTH_MODE in the web app.
 */
export const authMode: 'demo' | 'api' = process.env.EXPO_PUBLIC_AUTH_MODE === 'api' ? 'api' : 'demo';

/**
 * The API's address in live mode, ending in /api: EXPO_PUBLIC_API_URL when set, such as the
 * live site's. Otherwise, in development, the dev server's own /api, which metro.config.js
 * forwards to the API on the Mac; the phone reaches it at the address it loaded the app from.
 */
export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'web' ? '/api' : Constants.expoConfig?.hostUri ? `http://${Constants.expoConfig.hostUri}/api` : '');
