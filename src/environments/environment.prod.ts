export const environment = {
  production: true,
  apiUrl: '/api',
  withCredentials: true,
  corsConfig: {
    allowedOrigins: ['https://kuis.canducation.com'],
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['*'],
    exposedHeaders: ['Authorization'],
    allowCredentials: true,
    maxAge: 3600
  },
  // Replace this with your actual Google Client ID
  googleClientId: '122895789472-5ppmksj8nnha9nhlktuikl4tggdal0pf.apps.googleusercontent.com'
};   

  