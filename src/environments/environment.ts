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
  supabaseUrl: 'https://bdsqeiopylntrzneohgr.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkc3FlaW9weWxudHJ6bmVvaGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0OTgxODMsImV4cCI6MjA1NzA3NDE4M30.ZdXNXGbGCsohm1aSrozn3R77KKMzEIRF_oszhlMisUk',
  resendapikey:'re_6Q1e5r9q_DHAXq1wruvH2tqVLzSpX9JBv'
}; 