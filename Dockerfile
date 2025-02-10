# Stage 1: Build the Angular application
FROM node:20 as builder

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

# Create necessary directories and set permissions
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx && \
    chmod 777 /var/cache/nginx /var/run /var/log/nginx

# Copy the built application from stage 1
COPY --from=builder /app/dist/quiz-frontend /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Set environment variable
ENV API_URL=https://quiz-backend.afdaliable.dev

# Verify nginx configuration
RUN nginx -t

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 4200
EXPOSE 4200

# Switch to non-root user
USER nginx

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]