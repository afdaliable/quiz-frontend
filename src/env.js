// Environment configuration for the application
(function(window) {
  window.env = window.env || {};
  
  // OAuth configuration
  window.env.googleOAuth = {
    // Replace this with your actual Google OAuth client ID from the Google Cloud Console
    clientId: '122895789472-gocvg1rrno40s8h8mlg9lnhkg20r763l.apps.googleusercontent.com',
    redirectUri: window.location.origin + '/auth/callback'
  };
  
  // API configuration
  window.env.apiUrl = window.location.origin;
  
  console.log('Environment configuration loaded');
})(this); 