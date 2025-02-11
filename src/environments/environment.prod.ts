export const environment = {
  production: true,
  apiUrl: 'https://quiz-backend.afdaliable.dev',  // Direct backend URL for production
  withCredentials: false,
  corsConfig: {
    allowedOrigins: ['https://kuis.canducation.com'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    allowCredentials: true
  }
};