FROM node:18-alpine

WORKDIR /app

# Copy built app and server
COPY dist/quiz-frontend/browser ./dist/quiz-frontend/browser
COPY server.js .

# Install only production dependencies
RUN npm init -y && \
    npm install express --production && \
    npm install http-proxy-middleware --production
    

EXPOSE 4200

CMD ["node", "server.js"]