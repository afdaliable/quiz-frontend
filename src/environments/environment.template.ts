export const environment = {
  production: false,
  frontendOnly: false, // Set to true for development without backend
  apiUrl: '/api',
  withCredentials: true,
  corsConfig: {
    allowedOrigins: ['http://localhost:4200'],
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['*'],
    exposedHeaders: ['Authorization'],
    allowCredentials: true,
    maxAge: 3600
  },
  // Replace with your Google Client ID
  googleClientId: 'YOUR_GOOGLE_CLIENT_ID',
  // JWT secret for frontend-only mode (development only)
  jwtSecret: 'YOUR_JWT_SECRET_HERE'
};