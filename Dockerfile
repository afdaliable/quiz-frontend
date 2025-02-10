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

# Create necessary directories with correct permissions
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx && \
    chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx && \
    chmod -R 755 /var/cache/nginx /var/run /var/log/nginx && \
    # Remove default nginx static assets
    rm -rf /usr/share/nginx/html/* && \
    # Fix nginx tmp permissions
    chmod -R 755 /var/lib/nginx && \
    chown -R nginx:nginx /var/lib/nginx

# Copy the built application from stage 1
COPY --from=builder /app/dist/quiz-frontend /usr/share/nginx/html/
RUN chown -R nginx:nginx /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN chown -R nginx:nginx /etc/nginx/conf.d/default.conf

# Expose port 4200
EXPOSE 4200

# Switch to non-root user
USER nginx

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]