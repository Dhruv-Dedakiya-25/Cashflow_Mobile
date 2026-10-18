/**
 * Demo mode shows sample data and never calls the server; live mode talks to the CashFlow API.
 * Both are fixed when the app is built, like VITE_AUTH_MODE in the web app.
 */
export const authMode: 'demo' | 'api' = process.env.EXPO_PUBLIC_AUTH_MODE === 'api' ? 'api' : 'demo';

/** The API's address in live mode, for example https://cashflow-sactech.runasp.net */
export const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
