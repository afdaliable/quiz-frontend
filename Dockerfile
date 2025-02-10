# Stage 1: Build the Angular application
FROM node:18 as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application in production mode
RUN npm run build:prod

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy the built application from stage 1
COPY --from=builder /app/dist/quiz-frontend /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy environment script
COPY src/assets/env.js /usr/share/nginx/html/assets/env.js

# Copy and make the entrypoint script executable
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

# Expose port 4200
EXPOSE 4200

# Set environment variable
ENV API_URL=https://quiz-backend.afdaliable.dev

# Use the entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]