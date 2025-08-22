export const environment = {
  production: false,
  frontendOnly: false, // Enable frontend-only mode for development
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
  // Replace this with your actual Google Client ID
  googleClientId: '122895789472-eia69vo0e28t043on78v2qk4raplov4b.apps.googleusercontent.com',
  // JWT secret for frontend-only mode (development only)
  jwtSecret: 'w+fWySaviI5P2LTNx120xYc75QyCdbrWAofU/uhzgRvtY+vuoD6XrbxJGcqZK08E/ruYMGM5tEISDGXwAT2Q8A=='
}; 