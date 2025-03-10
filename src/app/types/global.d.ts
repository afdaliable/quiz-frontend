// Global type declarations
interface GoogleOAuthConfig {
  clientId: string;
  redirectUri: string;
}

interface EnvConfig {
  googleOAuth?: GoogleOAuthConfig;
  apiUrl?: string;
}

interface Window {
  env?: EnvConfig;
} 