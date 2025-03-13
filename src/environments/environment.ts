export const environment = {
  production: false,
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
  googleClientId: '122895789472-eia69vo0e28t043on78v2qk4raplov4b.apps.googleusercontent.com'
}; 