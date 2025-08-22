# Environment Setup

## Initial Setup

1. Copy the template files to create your environment configuration:

```bash
cp src/environments/environment.template.ts src/environments/environment.ts
cp src/environments/environment.prod.template.ts src/environments/environment.prod.ts
```

2. Update the values in your environment files:

### Development (environment.ts)
- Set `frontendOnly: true` for development without backend
- Add your Google Client ID
- Add JWT secret for frontend-only mode

### Production (environment.prod.ts)
- Set `frontendOnly: false` 
- Add your production Google Client ID
- Update domain in corsConfig

## Frontend-Only Mode

When `frontendOnly: true`:
- Login page shows username/password form
- Generates real JWT tokens for API calls
- Google OAuth is disabled
- Perfect for frontend development without running backend

## Environment Files Security

The environment files are gitignored to prevent:
- Accidental commit of API keys/secrets
- Environment-specific configuration conflicts
- Security vulnerabilities

Always use the template files as your starting point.