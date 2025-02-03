export const environment = {
  production: false,
  apiUrl: '/api',
  withCredentials: true,
  corsConfig: {
    allowedOrigins: ['http://localhost:4200'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    allowCredentials: true
  }
}; 