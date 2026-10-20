// https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const http = require('node:http');

const config = getDefaultConfig(__dirname);

// In development the app reaches the API through this server's own /api, as the web app does
// through Vite's proxy: the phone needs no separate address for the API, the browser preview
// makes no cross-site call, and the API itself stays on the Mac's localhost.
const devApi = process.env.CASHFLOW_DEV_API ?? 'http://localhost:5100';

config.server.enhanceMiddleware = (metroMiddleware) => (req, res, next) => {
  if (!req.url?.startsWith('/api/')) return metroMiddleware(req, res, next);

  const target = new URL(req.url, devApi);
  const upstream = http.request(target, { method: req.method, headers: { ...req.headers, host: target.host } }, (answer) => {
    res.writeHead(answer.statusCode ?? 502, answer.headers);
    answer.pipe(res);
  });
  upstream.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Cannot reach the API. Check that it is running.');
  });
  req.pipe(upstream);
};

module.exports = config;
