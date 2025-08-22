export const environment = {
  production: true,
  frontendOnly: false, // Should be false in production
  apiUrl: '/api',
  withCredentials: true,
  corsConfig: {
    allowedOrigins: ['https://your-domain.com'],
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['*'],
    exposedHeaders: ['Authorization'],
    allowCredentials: true,
    maxAge: 3600
  },
  // Replace with your production Google Client ID
  googleClientId: 'YOUR_PRODUCTION_GOOGLE_CLIENT_ID',
  // JWT secret not needed in production (OAuth used instead)
  jwtSecret: ''
};