export const environment = {
  production: false,
  apiUrl: 'https://quiz-backend.afdaliable.dev',
  corsConfig: {
    allowedOrigins: ['http://localhost:4200'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    allowCredentials: true
  }
}; 