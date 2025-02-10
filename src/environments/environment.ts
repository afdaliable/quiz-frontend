export const environment = {
  production: false,
  apiUrl: 'https://quiz-backend.afdaliable.dev',
  corsConfig: {
    allowedOrigins: ['http://localhost:4200'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Authorization'],
    allowCredentials: true,
    maxAge: 7200
  },
  withCredentials: true
}; 