export const environment = {
  production: true,
  apiUrl: 'https://quiz-backend.afdaliable.dev',
  withCredentials: true,
  corsConfig: {
    allowedOrigins: ['https://kuis.canducation.com'],
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
    exposedHeaders: ['Authorization'],
    allowCredentials: true,
    maxAge: 3600
  }
};   