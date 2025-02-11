export const environment = {
  production: false,
  apiUrl: 'https://quiz-backend.afdaliable.dev',
  withCredentials: true,
  corsConfig: {
    allowedOrigins: ['http://localhost:4200'],
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['*'],
    exposedHeaders: ['Authorization'],
    allowCredentials: true,
    maxAge: 3600
  }
}; 