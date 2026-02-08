FROM node:18-slim

# Install library untuk menjalankan browser (diperlukan beberapa library WA)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# WhatsApp bot butuh ini agar Koyeb tidak menganggap bot mati
EXPOSE 8080

CMD ["node", "index.js"]
