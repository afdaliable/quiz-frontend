export const environment = {
  production: true,
  apiUrl: 'https://quiz-backend.afdaliable.dev',  // Direct backend URL for production
  withCredentials: true,
  corsConfig: {
    allowedOrigins: ['https://kuis.canducation.com'],
    allowedMethods: ['GET', 'POST'],
    allowedHeaders: [
      'Authorization',
      'Accept',
      'Content-Type'
    ],
    exposedHeaders: ['Authorization'],
    allowCredentials: true,
    maxAge: 3600
  }
};