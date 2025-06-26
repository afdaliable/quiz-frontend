# =================================================================
# Stage 1: Build the Angular Application
# =================================================================
# Menggunakan image Node.js sebagai 'builder'
FROM node:18-alpine AS builder

# Set direktori kerja
WORKDIR /app

# Copy file package.json dan package-lock.json terlebih dahulu
# Ini memanfaatkan Docker layer caching, sehingga 'npm ci' hanya berjalan jika ada perubahan dependensi
COPY package.json package-lock.json ./

# Install semua dependensi (termasuk devDependencies untuk build)
# 'npm ci' lebih cepat dan aman untuk lingkungan CI/CD
RUN npm ci

# Copy sisa source code aplikasi Anda
COPY . .

# Jalankan skrip build produksi dari package.json Anda
RUN npm run build:prod

# =================================================================
# Stage 2: Setup The Final Production Image
# =================================================================
# Memulai dari image Node.js yang bersih dan ringan lagi
FROM node:18-alpine

WORKDIR /app

# Copy package.json dan package-lock.json untuk menginstall dependensi server
COPY package.json package-lock.json ./

# Install HANYA dependensi yang dibutuhkan untuk menjalankan server.js
# Flag --omit=dev akan melewatkan devDependencies seperti @angular/cli, dll.
RUN npm ci --omit=dev

# Copy server.js Anda
COPY server.js .

# Copy hasil build aplikasi Angular dari stage 'builder'
COPY --from=builder /app/dist/quiz-frontend/browser ./dist/quiz-frontend/browser

# Buka port yang digunakan oleh server
EXPOSE 4200

# Perintah untuk menjalankan server saat container dimulai
CMD ["node", "server.js"]