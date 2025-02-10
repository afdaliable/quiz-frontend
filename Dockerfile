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

# Copy the built application from stage 1
COPY --from=builder /app/dist/quiz-frontend /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Set environment variable
ENV API_URL=https://quiz-backend.afdaliable.dev


# Expose port 4200
EXPOSE 4200

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]